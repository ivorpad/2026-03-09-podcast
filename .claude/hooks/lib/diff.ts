import type { DiffFile } from "./types";

export function parseDiffFiles(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let currentFile = "";
  let currentLines: string[] = [];
  for (const line of diff.split("\n")) {
    const m = line.match(/^diff --git a\/(.+) b\//);
    if (m) {
      if (currentFile && currentLines.length > 0) files.push({ path: currentFile, content: currentLines.join(" ") });
      currentFile = m[1];
      currentLines = [];
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      currentLines.push(line.slice(1));
    }
  }
  if (currentFile && currentLines.length > 0) files.push({ path: currentFile, content: currentLines.join(" ") });
  return files;
}

export function extractChangedFiles(diff: string): string[] {
  const files: string[] = [];
  for (const line of diff.split("\n")) {
    const match = line.match(/^diff --git a\/(.+) b\//);
    if (match) files.push(match[1]);
  }
  return files;
}

export function testPattern(pattern: string, files: DiffFile[], filePattern?: string): boolean {
  const regex = new RegExp(pattern);
  const fp = filePattern ? new RegExp(filePattern) : null;
  return files.some((f) => (!fp || fp.test(f.path)) && regex.test(f.content));
}
