import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function main() {
  const distDir = path.join(process.cwd(), "dist");
  const outputFile = path.join(distDir, "together-healthcare-agent-submission.zip");
  const candidatePaths = [
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
  ];

  await mkdir(distDir, { recursive: true });
  const includePaths: string[] = [];

  for (const candidatePath of candidatePaths) {
    try {
      await access(path.join(process.cwd(), candidatePath));
      includePaths.push(candidatePath);
    } catch {
      // Ignore missing optional paths like public/.
    }
  }

  await execFileAsync("zip", ["-r", outputFile, ...includePaths]);

  console.log(outputFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
