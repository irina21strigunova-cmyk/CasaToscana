import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCdekPackages,
  isCdekCatalogWeightMissingError,
} from "./packages";

test("missing catalog weight is not invented", () => {
  assert.throws(
    () => buildCdekPackages([{ productId: "430041", quantity: 1 }]),
    (error: unknown) => isCdekCatalogWeightMissingError(error)
  );
});
