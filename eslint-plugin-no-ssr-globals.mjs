/**
 * Custom ESLint rule: no-ssr-globals
 * Flags `document`, `window`, `localStorage`, `sessionStorage` usage
 * at module scope or directly in React component render bodies.
 * Allows usage inside any nested function (event handlers, callbacks, etc.)
 * since those don't execute during SSR render.
 * Compatible with ESLint 9 flat config.
 */

const BROWSER_GLOBALS = new Set([
  "document",
  "window",
  "localStorage",
  "sessionStorage",
  "location",
  "navigator",
  "history",
]);

// Safe hooks whose callback args run only on client
const SAFE_HOOKS = new Set([
  "useEffect",
  "useLayoutEffect",
  "useCallback",
  "useSyncExternalStore",
]);

function isUnsafeScope(node) {
  let current = node.parent;
  let depth = 0; // how many function boundaries we've crossed

  while (current) {
    const isFnBoundary =
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression";

    if (isFnBoundary) {
      depth++;

      // depth 1 = first function we hit walking up from the global reference
      // If depth === 1, check if this function is:
      //   a) a React component (PascalCase function at module scope) — UNSAFE (render body)
      //   b) anything else (callback, helper, handler) — SAFE

      if (depth === 1) {
        // Is this function a React component? (PascalCase, at module level)
        const isComponent =
          current.type === "FunctionDeclaration" &&
          current.id?.name &&
          /^[A-Z]/.test(current.id.name) &&
          (current.parent?.type === "Program" ||
            current.parent?.type === "ExportNamedDeclaration" ||
            current.parent?.type === "ExportDefaultDeclaration");

        if (isComponent) {
          // Inside component render body directly — UNSAFE
          // But keep walking to see if we're actually inside a nested function
          // (we already know depth===1 so we're at the component level, not nested)
          return true;
        }

        // It's a non-component function — safe (callback, helper, etc.)
        return false;
      }

      // depth >= 2 means we're inside a nested function within a component — always safe
      if (depth >= 2) {
        return false;
      }
    }

    current = current.parent;
  }

  // Reached program root without hitting a function — module scope, UNSAFE
  return true;
}

function checkNode(node, name, context) {
  // Skip typeof guards
  if (
    node.parent?.type === "UnaryExpression" &&
    node.parent.operator === "typeof"
  ) {
    return;
  }

  if (isUnsafeScope(node)) {
    context.report({
      node,
      messageId: "noSSRGlobal",
      data: { name },
    });
  }
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow browser globals at module scope or in React component render bodies",
    },
    messages: {
      noSSRGlobal:
        "'{{name}}' is not available during SSR. Use it inside useEffect, an event handler, or guard with `typeof {{name}} !== 'undefined'`.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          BROWSER_GLOBALS.has(node.object.name)
        ) {
          checkNode(node.object, node.object.name, context);
        }
      },
      Identifier(node) {
        if (
          BROWSER_GLOBALS.has(node.name) &&
          node.parent?.type !== "MemberExpression" &&
          node.parent?.type !== "Property" &&
          node.parent?.type !== "ImportSpecifier"
        ) {
          checkNode(node, node.name, context);
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "no-ssr-globals", version: "1.0.0" },
  rules: { "no-ssr-globals": rule },
};

export default plugin;
