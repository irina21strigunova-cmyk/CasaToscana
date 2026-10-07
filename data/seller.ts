export const seller = {
  brand: "Casa Toscana",
  legalName: "Индивидуальный предприниматель Стригунова Ирина Викторовна",
  shortName: "ИП Стригунова Ирина Викторовна",
  inn: "261405647232",
  ogrnip: "326265100106381",
  registeredAt: "17.07.2026",
  registeredAtLong: "17 июля 2026 года",
  siteUrl: "https://casa-toscana-omega.vercel.app",
  siteHost: "casa-toscana-omega.vercel.app",
  documentsUpdatedAt: "07.10.2026",
  email: "CasaToscana@outlook.com",
  /**
   * TODO: указать данные продавца
   * Телефон, адрес для корреспонденции и адрес ПВЗ намеренно не публикуются.
   * TODO: добавить адрес для возврата товаров — публиковать только после
   * обращения покупателя по email и выдачи инструкций.
   */
  phone: null as string | null,
  correspondenceAddress: null as string | null,
  pickupPointAddress: null as string | null,
  returnAddress: null as string | null,
} as const;

export const legalNav = [
  { href: "/offer", label: "Публичная оферта" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  {
    href: "/personal-data-consent",
    label: "Согласие на обработку персональных данных",
  },
  { href: "/payment-delivery-return", label: "Оплата, доставка и возврат" },
  { href: "/contacts", label: "Реквизиты и контакты" },
] as const;

export const legalPaths = legalNav.map((item) => item.href);
