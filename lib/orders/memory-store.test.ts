import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryOrderStore } from "./memory-store";
import { publicOrderView } from "./types";

function sampleOrder(id: string) {
  return {
    orderId: id,
    amountKopecks: 155000,
    totalRub: 1550,
    goodsRub: 1550,
    lines: [
      {
        productId: "430041",
        name: "Увлажняющий гель для душа",
        quantity: 1,
        unitPriceRub: 1550,
        lineTotalRub: 1550,
      },
    ],
    customer: {
      name: "Тест",
      phone: "+79000000000",
      email: "buyer@example.com",
    },
    delivery: {
      type: "pvz" as const,
      cityName: "Москва",
      officeCode: "MSK1",
      costRub: 0,
      awaitingQuote: true,
    },
    status: "AWAITING_DELIVERY_QUOTE" as const,
  };
}

test("order survives a second read from the same store", async () => {
  const store = createMemoryOrderStore();
  await store.savePendingOrder(sampleOrder("CT-KEEP-1"));
  const first = await store.getOrderByOrderId("CT-KEEP-1");
  const second = await store.getOrderByOrderId("CT-KEEP-1");
  assert.equal(first?.orderId, "CT-KEEP-1");
  assert.equal(second?.customer.email, "buyer@example.com");
  assert.equal(first?.status, "AWAITING_DELIVERY_QUOTE");
});

test("lookup requires matching email", async () => {
  const store = createMemoryOrderStore();
  await store.savePendingOrder(sampleOrder("CT-MAIL-1"));
  const ok = await store.getOrderByOrderIdAndEmail("CT-MAIL-1", "Buyer@example.com");
  const denied = await store.getOrderByOrderIdAndEmail("CT-MAIL-1", "other@example.com");
  assert.ok(ok);
  assert.equal(denied, undefined);
});

test("Yandex method, address and pending price survive saving and customer lookup", async () => {
  const store = createMemoryOrderStore();
  await store.savePendingOrder({
    ...sampleOrder("CT-YANDEX-1"),
    delivery: {
      type: "yandex_courier",
      cityCode: 439,
      cityName: "Ставрополь",
      address: "ул. Ленина, 1, кв. 2",
      costRub: 0,
      awaitingQuote: true,
    },
  });
  const saved = await store.getOrderByOrderIdAndEmail("CT-YANDEX-1", "buyer@example.com");
  assert.ok(saved);
  const view = publicOrderView(saved);
  assert.equal(view.delivery?.type, "yandex_courier");
  assert.equal(view.delivery?.address, "ул. Ленина, 1, кв. 2");
  assert.equal(view.delivery?.awaitingQuote, true);
  assert.equal(view.status, "AWAITING_DELIVERY_QUOTE");
  assert.equal(view.paymentUrl, null);
});

test("parallel payment claims allow only one creator", async () => {
  const store = createMemoryOrderStore();
  await store.savePendingOrder(sampleOrder("CT-RACE-1"));
  const [a, b] = await Promise.all([
    store.claimOrderForPayment("CT-RACE-1"),
    store.claimOrderForPayment("CT-RACE-1"),
  ]);
  const creators = [a, b].filter((result) => result.ok && result.existing === false);
  const blocked = [a, b].filter((result) => !result.ok || result.existing);
  assert.equal(creators.length, 1);
  assert.equal(blocked.length, 1);

  const after = await store.getOrderByOrderId("CT-RACE-1");
  assert.equal(after?.status, "PAYMENT_CREATING");

  await store.updateOrderByOrderId("CT-RACE-1", {
    paymentId: "pay-1",
    paymentUrl: "https://securepay.tinkoff.ru/test",
    status: "NEW",
  });
  const restore = await store.claimOrderForPayment("CT-RACE-1");
  assert.equal(restore.ok, true);
  if (restore.ok) {
    assert.equal(restore.existing, true);
    assert.equal(restore.order.paymentUrl, "https://securepay.tinkoff.ru/test");
  }
});
