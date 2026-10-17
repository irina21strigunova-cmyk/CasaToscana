import { seller } from "@/data/seller";
import { getAppBaseUrl } from "@/lib/tbank/client";
import {
  orderStatusLabel,
  publicOrderView,
  type PendingOrderRecord,
} from "@/lib/orders/types";

export interface EmailSendResult {
  attempted: boolean;
  sent: boolean;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && getEmailFromAddress()
  );
}

export function getNotifyEmail(): string {
  return (
    process.env.ORDER_NOTIFY_EMAIL?.trim() || seller.email
  ).toLowerCase();
}

export function getEmailFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  return `Casa Toscana <noreply@${seller.siteHost}>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}

function orderLinesHtml(order: PendingOrderRecord): string {
  const rows = order.lines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${formatRub(line.lineTotalRub)}</td></tr>`
    )
    .join("");
  return `<table border="0" cellpadding="6" cellspacing="0"><thead><tr><th align="left">Товар</th><th>Кол-во</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function deliveryHtml(order: PendingOrderRecord): string {
  const delivery = order.delivery;
  if (!delivery) return "<p>Доставка не указана.</p>";
  const parts = [
    `Способ: ${escapeHtml(delivery.type)}`,
    delivery.cityName ? `Город: ${escapeHtml(delivery.cityName)}` : "",
    delivery.officeAddress
      ? `ПВЗ: ${escapeHtml(delivery.officeAddress)}`
      : "",
    delivery.address ? `Адрес: ${escapeHtml(delivery.address)}` : "",
    delivery.awaitingQuote
      ? "Стоимость доставки будет рассчитана после оформления заказа"
      : `Доставка: ${formatRub(delivery.costRub)}`,
  ].filter(Boolean);
  return `<p>${parts.join("<br>")}</p>`;
}

export function buildAdminNewOrderEmail(order: PendingOrderRecord): {
  subject: string;
  html: string;
} {
  const view = publicOrderView(order);
  const adminUrl = `${getAppBaseUrl()}/admin/orders`;
  return {
    subject: `Новый заказ ${order.orderId} · ${view.statusLabel}`,
    html: `
      <p>Новый заказ Casa Toscana.</p>
      <p><strong>${escapeHtml(order.orderId)}</strong><br>
      Статус: ${escapeHtml(view.statusLabel)}<br>
      Покупатель: ${escapeHtml(order.customer.name)}<br>
      Телефон: ${escapeHtml(order.customer.phone)}<br>
      Email: ${escapeHtml(order.customer.email)}</p>
      ${orderLinesHtml(order)}
      ${deliveryHtml(order)}
      <p>Товары: ${formatRub(order.goodsRub)}<br>
      Итого сейчас: ${formatRub(order.totalRub)}</p>
      <p><a href="${adminUrl}">Открыть заказы</a></p>
    `,
  };
}

export function buildBuyerOrderEmail(order: PendingOrderRecord): {
  subject: string;
  html: string;
} {
  const lookupUrl = `${getAppBaseUrl()}/orders?orderId=${encodeURIComponent(order.orderId)}`;
  const paymentBlock = order.paymentUrl
    ? `<p>Оплатить заказ: <a href="${escapeHtml(order.paymentUrl)}">${escapeHtml(order.paymentUrl)}</a></p>`
    : "<p>Заказ принят без оплаты. Ссылку на оплату отправим, когда рассчитаем доставку.</p>";
  return {
    subject: `Casa Toscana · заказ ${order.orderId}`,
    html: `
      <p>${escapeHtml(order.customer.name)}, заказ принят.</p>
      <p>Номер заказа: <strong>${escapeHtml(order.orderId)}</strong><br>
      Статус: ${escapeHtml(orderStatusLabel(order.status))}</p>
      ${orderLinesHtml(order)}
      ${deliveryHtml(order)}
      ${paymentBlock}
      <p>Посмотреть заказ: <a href="${lookupUrl}">${lookupUrl}</a><br>
      Для просмотра укажите этот номер и email ${escapeHtml(order.customer.email)}.</p>
    `,
  };
}

export function buildBuyerPaymentLinkEmail(order: PendingOrderRecord): {
  subject: string;
  html: string;
} {
  const lookupUrl = `${getAppBaseUrl()}/orders?orderId=${encodeURIComponent(order.orderId)}`;
  const paymentUrl = order.paymentUrl ?? lookupUrl;
  return {
    subject: `Casa Toscana · ссылка на оплату заказа ${order.orderId}`,
    html: `
      <p>${escapeHtml(order.customer.name)}, доставка рассчитана.</p>
      <p>Номер заказа: <strong>${escapeHtml(order.orderId)}</strong><br>
      К оплате: ${formatRub(order.totalRub)}</p>
      ${orderLinesHtml(order)}
      <p><a href="${escapeHtml(paymentUrl)}">Оплатить заказ</a></p>
      <p>Если ссылка потеряется, её можно открыть на <a href="${lookupUrl}">странице заказа</a>.</p>
    `,
  };
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { attempted: false, sent: false, error: "RESEND_API_KEY не задан" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      return {
        attempted: true,
        sent: false,
        error: `Resend HTTP ${response.status}: ${text.slice(0, 300)}`,
      };
    }
    return { attempted: true, sent: true };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      error: error instanceof Error ? error.message : "Ошибка отправки письма",
    };
  }
}

export async function notifyNewOrder(
  order: PendingOrderRecord
): Promise<{ admin: EmailSendResult; buyer: EmailSendResult }> {
  const adminMail = buildAdminNewOrderEmail(order);
  const buyerMail = buildBuyerOrderEmail(order);
  const admin = await sendResendEmail({
    to: getNotifyEmail(),
    ...adminMail,
  });
  const buyer = await sendResendEmail({
    to: order.customer.email,
    ...buyerMail,
  });
  if (!admin.sent) {
    console.error("[email] admin new-order", admin.error);
  }
  if (!buyer.sent) {
    console.error("[email] buyer new-order", buyer.error);
  }
  return { admin, buyer };
}

export async function notifyPaymentLink(
  order: PendingOrderRecord
): Promise<EmailSendResult> {
  const mail = buildBuyerPaymentLinkEmail(order);
  const result = await sendResendEmail({
    to: order.customer.email,
    ...mail,
  });
  if (!result.sent) {
    console.error("[email] buyer payment-link", result.error);
  }
  return result;
}
