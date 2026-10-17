import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminNewOrderEmail,
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
