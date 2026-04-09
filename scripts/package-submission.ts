import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function main() {
  const distDir = path.join(process.cwd(), "dist");
  const outputFile = path.join(distDir, "together-healthcare-agent-submission.zip");

  await mkdir(distDir, { recursive: true });

  await execFileAsync("zip", [
    "-r",
    outputFile,
    "app",
    "components",
    "data",
    "lib",
    "public",
    "scripts",
    "README.md",
    "SETUP.md",
    "DEPLOY_VERCEL.md",
    "SUBMISSION_WRITEUP.md",
    "EVAL_REPORT.md",
    ".env.example",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "next.config.ts",
    "components.json"
  ]);

  console.log(outputFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
