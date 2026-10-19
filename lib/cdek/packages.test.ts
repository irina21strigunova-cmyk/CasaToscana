import assert from "node:assert/strict";
import test from "node:test";
import { buildCdekPackages } from "./packages";

test("estimates a shippable carton for a 100 ml cosmetic item", () => {
  const packages = buildCdekPackages([{ productId: "430041", quantity: 1 }]);
  assert.equal(packages.length, 1);
  assert.ok(packages[0].weight >= 100);
  assert.ok(packages[0].length && packages[0].width && packages[0].height);
});

test("quantity increases estimated weight", () => {
  const one = buildCdekPackages([{ productId: "430041", quantity: 1 }]);
  const two = buildCdekPackages([{ productId: "430041", quantity: 2 }]);
  assert.ok(two.reduce((s, p) => s + p.weight, 0) > one[0].weight);
});

test("larger orders can use several cartons", () => {
  const packages = buildCdekPackages([{ productId: "430164", quantity: 20 }]);
  assert.ok(packages.length > 1);
  assert.ok(packages.every(p => p.weight > 0 && p.length && p.width && p.height));
});

test("rejects invalid quantities", () => {
  assert.throws(() => buildCdekPackages([{ productId: "430041", quantity: 0 }]));
  assert.throws(() => buildCdekPackages([{ productId: "430041", quantity: 101 }]));
});
