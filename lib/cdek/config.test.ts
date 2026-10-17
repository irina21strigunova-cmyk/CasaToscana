import assert from "node:assert/strict";
import test from "node:test";
import { isStavropolCity } from "./config";
import { parseDeliveryType } from "./quote";

test("Stavropol is detected by name and is not a CDEK-priced type", () => {
  assert.equal(isStavropolCity({ name: "Ставрополь" }), true);
  assert.equal(isStavropolCity({ name: "Москва" }), false);
  assert.equal(parseDeliveryType("stavropol_local"), "stavropol_local");
  assert.equal(parseDeliveryType("pvz"), "pvz");
  assert.equal(parseDeliveryType("courier"), "courier");
});
