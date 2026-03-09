#!/usr/bin/env bun
/**
 * Skill check server — un daemon persistente en bun+hono que actúa como
 * "linter inteligente" para Claude Code. Cada vez que Claude intenta usar
 * una herramienta (Write, Edit, etc.), el hook le pega a POST /check con
 * el directorio del proyecto. Este servidor entonces:
 *
 * 1. Saca el git diff (staged + unstaged)
 * 2. Descubre qué "skills" (guías de estilo) aplican a los archivos tocados
 * 3. Lanza sub-agentes en paralelo — cada uno revisa el diff contra un skill
 * 4. Si encuentra violaciones, bloquea la acción y le dice a Claude qué arreglar
 * 5. "Gradúa" las violaciones encontradas a reglas persistentes para no repetirlas
 *
 * La lógica pesada vive en lib/:
 *   - types.ts          → tipos compartidos (Violation, LearnedRule, DiffFile)
 *   - diff.ts           → parsing de git diff, funciones puras
 *   - dangerous-guard.ts → bloquea comandos bash peligrosos (rm -rf, git push, etc.)
 *   - learned-rules.ts  → persistencia y graduación de reglas aprendidas
 *   - skill-review.ts   → descubrimiento de skills y revisión con sub-agentes LLM
 */

import { Hono } from "hono";
import { config } from "./skill-check-config";
import type { Violation } from "./lib/types";
import { extractChangedFiles } from "./lib/diff";
import { loadRules, graduateViolations } from "./lib/learned-rules";
import { discoverSkills, matchSkills, reviewSkill } from "./lib/skill-review";

console.log(`[skill-check] provider: ${config.provider.name} (${config.provider.model})`);

// Safety net — el servidor no puede morir por un error no manejado,
// porque si muere, el hook falla silenciosamente y perdemos la revisión.
process.on("uncaughtException", (err) => {
  console.error(`[skill-check] uncaught:`, String(err).slice(0, 200));
});
process.on("unhandledRejection", (err) => {
  console.error(`[skill-check] unhandled rejection:`, String(err).slice(0, 200));
});

const PORT = 7483;
const app = new Hono();

/**
 * POST /check — el endpoint principal.
 * Recibe {cwd} del hook de Claude Code, revisa el diff, y decide si bloquear.
 * Retorna {} para permitir, o {decision: "block", reason: "..."} para bloquear.
 */
app.post("/check", async (c) => {
  const { cwd } = await c.req.json<{ cwd: string }>();
  if (!cwd) return c.json({ error: "missing cwd" }, 400);

  try {
    // Paso 1: Obtener el diff completo (staged + unstaged), excluyendo binarios y locks
    const unstaged = Bun.spawnSync(["git", "diff", "--no-color", "--", ".", ":!pnpm-lock.yaml", ":!*.db-wal", ":!*.db-shm", ":!*.db", ":!*.pyc"], { cwd });
    const staged = Bun.spawnSync(["git", "diff", "--cached", "--no-color", "--", ".", ":!pnpm-lock.yaml", ":!*.db-wal", ":!*.db-shm", ":!*.db", ":!*.pyc"], { cwd });
    const diff = unstaged.stdout.toString() + staged.stdout.toString();

    // Sin cambios → nada que revisar
    if (!diff.trim()) {
      console.log(`[skill-check] no diff, allowing`);
      return c.json({});
    }

    // Paso 2: Descubrir qué skills aplican a los archivos modificados.
    // Cada skill tiene file_patterns en su SKILL.md (ej: ".tsx", "src/server/")
    const changedFiles = extractChangedFiles(diff);
    const allSkills = await discoverSkills(cwd);
    const relevantSkills = await matchSkills(cwd, allSkills, changedFiles);

    if (relevantSkills.length === 0) {
      console.log(`[skill-check] no relevant skills for changed files: ${changedFiles.join(", ")}`);
      return c.json({});
    }

    // Cargar reglas ya aprendidas para no re-flaggear lo mismo
    const coveredRules = await loadRules();
    console.log(`[skill-check] ${changedFiles.length} files changed → ${relevantSkills.length} skills: ${relevantSkills.join(", ")} (${coveredRules.length} rules already learned)`);

    // Paso 3: Lanzar sub-agentes en paralelo (de a 2) para revisar cada skill.
    // Cada sub-agente es una llamada al Agent SDK que recibe el diff + las guías del skill
    // y devuelve un VERDICT con las violaciones encontradas.
    const CONCURRENCY = 2;
    const results: Violation[][] = [];
    for (let i = 0; i < relevantSkills.length; i += CONCURRENCY) {
      const batch = relevantSkills.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((skill) =>
          reviewSkill(cwd, diff, skill, coveredRules).catch((err) => {
            console.error(`[skill-check:${skill}] error:`, String(err).slice(0, 200));
            return [] as Violation[];
          })
        )
      );
      results.push(...batchResults);
    }

    const allViolations = results.flat();
    console.log(`[skill-check] ${allViolations.length} total violations from ${relevantSkills.length} skills`);
    for (const v of allViolations) {
      console.log(`[skill-check]   → [${v.skill}] ${v.rule.slice(0, 80)} | pattern: ${v.pattern ?? "NONE"}`);
    }

    // Sin violaciones → permitir la acción
    if (allViolations.length === 0) {
      console.log(`[skill-check] all clear for ${cwd}`);
      return c.json({});
    }

    // Paso 4: Formatear el mensaje de bloqueo — Claude lo ve como feedback
    // y corrige las violaciones antes de reintentar
    const lines = ["**Skill Check: Violations Found**", ""];
    for (const viol of allViolations) {
      lines.push(`- **[${viol.skill}]** ${viol.rule} in \`${viol.file}\``);
      lines.push(`  Fix: ${viol.fix}`);
      lines.push("");
    }
    const message = lines.join("\n");

    // Paso 5: Graduar violaciones a reglas persistentes.
    // Las que tienen regex se validan contra el diff real; las estructurales
    // se guardan como "LLM-only" para que el sub-agente las verifique siempre.
    // También pasan por un LLM dedup para no acumular reglas redundantes.
    const graduated = await graduateViolations(allViolations, diff);
    if (graduated > 0) {
      console.log(`[skill-check] graduated ${graduated} new lint rules`);
    }

    // Bloquear — Claude recibirá el mensaje y corregirá antes de reintentar
    console.log(`[skill-check] blocking with ${allViolations.length} violations`);
    return c.json({ decision: "block", reason: message, systemMessage: message });
  } catch (e) {
    // Fail-open: si algo explota, no bloquear a Claude — mejor perder una revisión
    // que trabarlo completamente
    console.error(`[skill-check] error:`, e);
    return c.json({});
  }
});

app.get("/health", (c) => c.json({ ok: true }));

console.log(`Skill check server on :${PORT}`);
const server = { port: PORT, fetch: app.fetch };
export default server;
