import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

const clean = spawnSync(process.execPath, [join(root, "clean.mjs")], {
  cwd: join(root, ".."),
  stdio: "inherit",
});

if (clean.status !== 0) {
  process.exit(clean.status ?? 1);
}

const dev = spawnSync("npm", ["run", "dev"], {
  cwd: join(root, ".."),
  stdio: "inherit",
  shell: true,
});

process.exit(dev.status ?? 0);
