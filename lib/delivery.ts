export function deliveryTypeLabel(type: string): string {
  switch (type) {
    case "pvz":
      return "СДЭК — пункт выдачи";
    case "courier":
      return "СДЭК — курьер";
    case "yandex_courier":
      return "Яндекс Доставка — курьер";
    case "stavropol_local":
      return "Местная доставка по Ставрополю";
    default:
      return "Доставка";
  }
}

export function isDeliveryLineProductId(productId: string): boolean {
  return productId === "delivery-cdek" || productId === "delivery-yandex";
}
