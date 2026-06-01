
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function addError(rule, file, message, line) {
  errors.push({ rule, file, message, ...(line ? { line } : {}) });
}

function addWarning(rule, file, message, line) {
  warnings.push({ rule, file, message, ...(line ? { line } : {}) });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function walk(dir) {
  const start = path.join(root, dir);
  if (!fs.existsSync(start)) {
    return [];
  }
  const result = [];
  for (const entry of fs.readdirSync(start, { withFileTypes: true })) {
    const fullPath = path.join(start, entry.name);
    const relative = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", "dist", "coverage", "styled-system"].includes(entry.name)) {
        result.push(...walk(relative));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      result.push(relative);
    }
  }
  return result;
}

function lineOf(content, pattern) {
  const index = content.search(pattern);
  if (index < 0) {
    return undefined;
  }
  return content.slice(0, index).split("\n").length;
}

const config = readJson("boilerplate.config.json");
const tsconfig = readJson("tsconfig.json");
const compilerOptions = tsconfig.compilerOptions ?? {};

if (compilerOptions.strict !== true) {
  addError("tsconfig-strict", "tsconfig.json", "compilerOptions.strict must be true");
}

if (compilerOptions.noImplicitAny !== true) {
  addError("tsconfig-no-implicit-any", "tsconfig.json", "compilerOptions.noImplicitAny must be true");
}

if (compilerOptions.paths?.["@/*"]?.[0] !== "src/*") {
  addError("src-alias", "tsconfig.json", "@/* must point to src/*");
}

if (config.stack === "react-vite") {
  for (const required of ["src/app", "src/domains", "src/shared"]) {
    if (!exists(required)) {
      addError("react-vite-structure", required, "React/Vite projects use domain-based colocated folders");
    }
  }
}

if (config.stack === "next-pages") {
  for (const required of ["pages", "src/domains", "src/shared"]) {
    if (!exists(required)) {
      addError("next-pages-structure", required, "Next page router projects keep pages thin and domains under src");
    }
  }
}

if (config.stack === "next-app") {
  if (!exists("src/app/(home)/page.tsx")) {
    addError("next-app-home-group", "src/app/(home)/page.tsx", "Root app-router page must live in src/app/(home)/page.tsx");
  }
  if (exists("app")) {
    addError("next-app-src-app", "app", "Next app-router projects must keep the app directory under src/app");
  }
  if (!exists("src/shared")) {
    addError("next-app-shared", "src/shared", "Shared code belongs under src/shared");
  }
}

for (const file of [...walk("src"), ...walk("app"), ...walk("pages")]) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  if (/\bany\b/.test(content)) {
    addError("no-explicit-any", file, "Explicit any is not allowed", lineOf(content, /\bany\b/));
  }
  if (/from\s+["']\.\.\/\.\.\//.test(content)) {
    addWarning("prefer-src-alias", file, "Prefer @ alias over deep parent imports", lineOf(content, /from\s+["']\.\.\/\.\.\//));
  }
  const imageMatches = content.match(/<img\b(?![^>]*\balt=)/g) ?? [];
  if (imageMatches.length > 0) {
    addError("img-alt", file, "img elements must include alt text", lineOf(content, /<img\b(?![^>]*\balt=)/));
  }
  const iconButtonMatches = content.match(/<button\b(?=[^>]*aria-label=["']\s*["'])/g) ?? [];
  if (iconButtonMatches.length > 0) {
    addError("button-name", file, "Buttons need a discernible accessible name", lineOf(content, /<button\b(?=[^>]*aria-label=["']\s*["'])/));
  }
}

const ok = errors.length === 0 && warnings.length === 0;
console.log(JSON.stringify({ ok, errors, warnings }, null, 2));
process.exit(ok ? 0 : 1);
