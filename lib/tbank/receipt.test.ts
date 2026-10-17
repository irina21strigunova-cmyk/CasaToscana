import assert from "node:assert/strict";
import test from "node:test";
import { attachDeliveryLine } from "../orders/calculate";
import { buildInitReceipt } from "./receipt";

test("init receipt amount equals goods plus delivery to the kopeck", () => {
  const order = attachDeliveryLine(
    [
      {
        productId: "430041",
        name: "Увлажняющий гель для душа",
        quantity: 1,
        unitPriceRub: 1550,
        lineTotalRub: 1550,
      },
    ],
    {
      type: "courier",
      cityName: "Москва",
      address: "Тверская 1 кв 1",
      costRub: 390.5,
    }
  );
  const receipt = buildInitReceipt(
    { name: "Тест", phone: "+79001234567", email: "buyer@example.com" },
    order.lines,
    order.amountKopecks
  );
  const sum = receipt.Items.reduce((total, item) => total + item.Amount, 0);
  assert.equal(sum, order.amountKopecks);
  assert.equal(order.amountKopecks, 194050);
  const delivery = receipt.Items.find((item) => item.PaymentObject === "service");
  assert.ok(delivery);
  assert.equal(delivery?.Amount, 39050);
});
