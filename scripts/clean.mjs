import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function sleep(ms) {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Start-Sleep -Milliseconds ${ms}"`,
      { stdio: "ignore" }
    );
    return;
  }
  execSync(`sleep ${Math.ceil(ms / 1000)}`, { stdio: "ignore" });
}

function stopDevServer() {
  if (process.platform !== "win32") {
    try {
      execSync("lsof -ti:3000 | xargs kill -9 2>/dev/null || true", {
        stdio: "ignore",
        shell: true,
      });
    } catch {
      // No process on port 3000.
    }
    return;
  }

  try {
    execSync(
      'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
      { stdio: "ignore" }
    );
  } catch {
    // No process on port 3000.
  }

  // Allow Windows to release file handles on .next
  sleep(500);
}

function removePath(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) return;

  rmSync(absolutePath, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
  console.log(`Removed ${relativePath}`);
}

console.log("Stopping dev server on port 3000...");
stopDevServer();

const paths = [".next", "node_modules/.cache", ".turbo", "out"];

for (const relativePath of paths) {
  try {
    removePath(relativePath);
  } catch (error) {
    console.error(`Failed to remove ${relativePath}:`, error.message);
    process.exit(1);
  }
}

console.log("Clean complete.");
