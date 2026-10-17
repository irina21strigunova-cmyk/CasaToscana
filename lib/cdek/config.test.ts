import assert from "node:assert/strict";
import test from "node:test";
import { CDEK_MOSCOW_CODE, CDEK_STAVROPOL_CODE, isStavropolCity } from "./config";
import { parseDeliveryType, quoteDelivery } from "./quote";

test("Stavropol is detected by name and is not a CDEK-priced type", () => {
  assert.equal(isStavropolCity({ name: "Ставрополь" }), true);
  assert.equal(isStavropolCity({ name: "Москва" }), false);
  assert.equal(isStavropolCity({ name: "Пятигорск", region: "Ставропольский край" }), false);
  assert.equal(isStavropolCity({ name: "Ставропольское" }), false);
  assert.equal(isStavropolCity({ code: 44, name: "Ставрополь" }), false);
  assert.equal(isStavropolCity({ code: CDEK_STAVROPOL_CODE, name: "Ставрополь" }), true);
  assert.equal(parseDeliveryType("stavropol_local"), "stavropol_local");
  assert.equal(parseDeliveryType("pvz"), "pvz");
  assert.equal(parseDeliveryType("courier"), "courier");
  assert.equal(parseDeliveryType("yandex_courier"), "yandex_courier");
});

test("Yandex delivery keeps the address and awaits an agreed price without calling CDEK", async () => {
  const quote = await quoteDelivery({
    type: "yandex_courier",
    cityCode: CDEK_STAVROPOL_CODE,
    cityName: "Ставрополь",
    address: "  ул. Ленина, 1, кв. 2  ",
    items: [{ productId: "430041", quantity: 1 }],
  });
  assert.equal(quote.delivery.type, "yandex_courier");
  assert.equal(quote.delivery.address, "ул. Ленина, 1, кв. 2");
  assert.equal(quote.delivery.awaitingQuote, true);
  assert.equal(quote.delivery.costRub, 0);
  assert.deepEqual(quote.tariffs, []);
});

test("Yandex delivery in Moscow keeps its city and awaits an agreed price", async () => {
  const quote = await quoteDelivery({
    type: "yandex_courier",
    cityCode: CDEK_MOSCOW_CODE,
    cityName: "Москва",
    address: "  ул. Тверская, 7  ",
    items: [{ productId: "430041", quantity: 1 }],
  });
  assert.equal(quote.delivery.type, "yandex_courier");
  assert.equal(quote.delivery.cityCode, CDEK_MOSCOW_CODE);
  assert.equal(quote.delivery.cityName, "Москва");
  assert.equal(quote.delivery.address, "ул. Тверская, 7");
  assert.equal(quote.delivery.awaitingQuote, true);
  assert.equal(quote.delivery.costRub, 0);
  assert.deepEqual(quote.tariffs, []);
});

test("Yandex delivery rejects a missing address and cities outside Moscow and Stavropol", async () => {
  const input = {
    type: "yandex_courier" as const,
    cityCode: CDEK_STAVROPOL_CODE,
    cityName: "Ставрополь",
    items: [{ productId: "430041", quantity: 1 }],
  };
  await assert.rejects(quoteDelivery(input), /Укажите улицу/);
  await assert.rejects(quoteDelivery({ ...input, cityCode: CDEK_MOSCOW_CODE }), /Укажите улицу/);
  await assert.rejects(
    quoteDelivery({ ...input, cityCode: 999, cityName: "Москва", address: "ул. Ленина, 1" }),
    /только по Москве и Ставрополю/
  );
});
