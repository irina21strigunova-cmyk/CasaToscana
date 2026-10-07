import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/LegalDocument";
import {
  ReturnBeforeTransfer,
  ReturnDefectiveGoods,
  ReturnQualityGoods,
  ReturnRequestProcedure,
  SellerEmailLink,
} from "@/components/legal/ReturnPolicy";
import { seller } from "@/data/seller";

export const metadata: Metadata = {
  title: "Реквизиты и контакты | Casa Toscana",
  description:
    "Реквизиты продавца Casa Toscana: ИП Стригунова Ирина Викторовна, ИНН, ОГРНИП и контакты магазина.",
};

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-foreground/10 py-3 last:border-b-0 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-foreground sm:max-w-[22rem] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <LegalDocument title="Реквизиты и контакты">
      <LegalSection title="Продавец">
        <dl className="rounded-3xl bg-cream px-5 py-2">
          <InfoRow
            label="Продавец"
            value={
              <>
                Индивидуальный предприниматель
                <br />
                Стригунова Ирина Викторовна
              </>
            }
          />
          <InfoRow label="ИНН" value={seller.inn} />
          <InfoRow label="ОГРНИП" value={seller.ogrnip} />
          <InfoRow label="Дата регистрации" value={seller.registeredAtLong} />
          <InfoRow label="Бренд" value={seller.brand} />
          <InfoRow label="Сайт" value={seller.siteUrl} />
        </dl>
      </LegalSection>

      <LegalSection title="Контакты">
        <dl className="rounded-3xl bg-cream px-5 py-2">
          <InfoRow
            label="Электронная почта"
            value={<SellerEmailLink />}
          />
        </dl>
        <p>
          Для любых обращений, включая вопросы заказа, оплаты, качества товара и
          возврата, используйте указанный адрес электронной почты.
        </p>
      </LegalSection>

      <LegalSection title="Возврат">
        <ReturnBeforeTransfer />
        <ReturnQualityGoods />
        <ReturnDefectiveGoods />
        <ReturnRequestProcedure />
      </LegalSection>
    </LegalDocument>
  );
}
