import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example");
}

execSync("pnpm install", { stdio: "inherit", cwd: root });
execSync("pnpm run typecheck", { stdio: "inherit", cwd: root });
console.log("Setup complete. Run the app with the configured workflows.");