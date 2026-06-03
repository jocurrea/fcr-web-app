import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const validEnvs = new Set(["staging", "production"]);
const targetEnv = process.argv[2];

if (!validEnvs.has(targetEnv)) {
  console.error("Usage: node scripts/set-env.mjs <staging|production>");
  process.exit(1);
}

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const sourcePath = path.join(rootDir, `.env.${targetEnv}`);
const targetPath = path.join(rootDir, ".env.local");

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing ${path.basename(sourcePath)}.`);
  console.error(
    `Create it from .env.${targetEnv}.example and add the correct Supabase values.`
  );
  process.exit(1);
}

fs.copyFileSync(sourcePath, targetPath);
console.log(`Environment switched to ${targetEnv}.`);
console.log(`Copied ${path.basename(sourcePath)} -> .env.local`);
