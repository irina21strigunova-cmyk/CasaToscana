import assert from "node:assert/strict";
import test from "node:test";
import {
  attachDeliveryLine,
  calculateOrderFromCartItems,
} from "./calculate";
import { deliveryCostFromRecord, goodsRubFromLines } from "./types";

test("catalog prices are used for goods, not client-supplied amounts", () => {
  const order = calculateOrderFromCartItems(
    [{ productId: "430041", quantity: 2 }],
    { type: "stavropol_local", cityName: "Ставрополь", costRub: 0 }
  );
  assert.equal(order.goodsRub, 3100);
  assert.equal(order.totalRub, 3100);
  assert.equal(order.amountKopecks, 310000);
  assert.equal(order.lines.length, 1);
});

test("confirmed CDEK delivery is a separate service line and matches the receipt total", () => {
  const goods = calculateOrderFromCartItems([{ productId: "430041", quantity: 1 }]);
  const withDelivery = attachDeliveryLine(goods.lines, {
    type: "pvz",
    cityName: "Москва",
    costRub: 450,
    tariffName: "Посылка склад-склад",
  });
  assert.equal(withDelivery.goodsRub, 1550);
  assert.equal(withDelivery.totalRub, 2000);
  assert.equal(withDelivery.amountKopecks, 200000);
  const deliveryLine = withDelivery.lines.find((line) => line.productId === "delivery-cdek");
  assert.ok(deliveryLine);
  assert.equal(deliveryLine?.paymentObject, "service");
  assert.equal(deliveryLine?.lineTotalRub, 450);
});

test("confirmed Yandex delivery has its own receipt line and is not counted twice", () => {
  const goods = calculateOrderFromCartItems([{ productId: "430041", quantity: 1 }]);
  const delivery = {
    type: "yandex_courier" as const,
    cityName: "Ставрополь",
    address: "ул. Ленина, 1",
    costRub: 350,
    awaitingQuote: false,
  };
  const first = attachDeliveryLine(goods.lines, delivery);
  const confirmed = attachDeliveryLine(first.lines, { ...delivery, costRub: 400 });
  assert.equal(confirmed.totalRub, 1950);
  assert.equal(confirmed.amountKopecks, 195000);
  assert.equal(goodsRubFromLines(confirmed.lines), 1550);
  assert.equal(deliveryCostFromRecord({ lines: confirmed.lines, delivery: null }), 400);
  const deliveryLines = confirmed.lines.filter((line) => line.productId === "delivery-yandex");
  assert.equal(deliveryLines.length, 1);
  assert.equal(deliveryLines[0].name, "Яндекс Доставка");
  assert.equal(deliveryLines[0].paymentObject, "service");
});
