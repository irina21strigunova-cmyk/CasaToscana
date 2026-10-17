import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminNewOrderEmail,
  buildBuyerOrderEmail,
  buildBuyerPaymentLinkEmail,
  isEmailConfigured,
} from "./send";
import type { PendingOrderRecord } from "../orders/types";

const order: PendingOrderRecord = {
  orderId: "CT-MAIL-TEST",
  status: "AWAITING_DELIVERY_QUOTE",
  amountKopecks: 155000,
  totalRub: 1550,
  goodsRub: 1550,
  lines: [
    {
      productId: "430041",
      name: "Гель",
      quantity: 1,
      unitPriceRub: 1550,
      lineTotalRub: 1550,
    },
  ],
  customer: {
    name: "Ирина",
    phone: "+79000000000",
    email: "buyer@example.com",
  },
  delivery: {
    type: "pvz",
    cityName: "Москва",
    officeAddress: "ПВЗ тест",
    costRub: 0,
    awaitingQuote: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("admin and buyer templates include the order id; email is not faked as sent", () => {
  const admin = buildAdminNewOrderEmail(order);
  const pay = buildBuyerPaymentLinkEmail({
    ...order,
    paymentUrl: "https://securepay.tinkoff.ru/example",
    status: "NEW",
    totalRub: 2000,
  });
  assert.match(admin.subject, /CT-MAIL-TEST/);
  assert.match(admin.html, /buyer@example.com/);
  assert.match(pay.html, /securepay.tinkoff.ru\/example/);
  delete process.env.RESEND_API_KEY;
  assert.equal(isEmailConfigured(), false);
});

test("Yandex order emails show the selected city, carrier, address and pending delivery cost", () => {
  for (const city of [{ code: 439, name: "Ставрополь" }, { code: 44, name: "Москва" }]) {
    const yandexOrder: PendingOrderRecord = {
      ...order,
      delivery: {
        type: "yandex_courier",
        cityCode: city.code,
        cityName: city.name,
        address: "ул. Ленина, 1, кв. 2",
        costRub: 0,
        awaitingQuote: true,
      },
    };
    for (const mail of [buildAdminNewOrderEmail(yandexOrder), buildBuyerOrderEmail(yandexOrder)]) {
      assert.match(mail.html, /Яндекс Доставка/);
      assert.ok(mail.html.includes(`Город: ${city.name}`));
      if (city.name === "Москва") assert.doesNotMatch(mail.html, /Ставрополь/);
      assert.match(mail.html, /ул\. Ленина, 1, кв\. 2/);
      assert.match(mail.html, /Стоимость доставки будет рассчитана после оформления заказа/);
      assert.doesNotMatch(mail.html, /yandex_courier/);
    }
  }
});
