/**
 * Ensures category images exist in public/categories/.
 * Run: node scripts/ensure-category-placeholders.mjs
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dir = join(root, "public", "categories");
const required = [
  "Уход за телом.jpg",
  "Уход за лицом.jpg",
  "Линия Prima Fioritura.jpg",
  "Линия Bio Le Veneri.jpg",
  "Косметика для дома.jpg",
  "Ароматы.jpg",
  "Аромадиффузоры для авто.jpg",
  "Парфюмированная бумага.jpg",
  "Аксессуары для тела.jpg",
  "Подарочный набор.jpg",
];

const missing = required.filter((file) => !existsSync(join(dir, file)));

if (missing.length > 0) {
  console.error("Missing category images:");
  for (const file of missing) console.error(`  - public/categories/${file}`);
  process.exit(1);
}

console.log("All category images present:");
for (const file of required) console.log(`  ✓ public/categories/${file}`);
