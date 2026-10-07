import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalList,
  LegalSection,
} from "@/components/legal/LegalDocument";
import { ReturnPolicyBlocks } from "@/components/legal/ReturnPolicy";
import { seller } from "@/data/seller";

export const metadata: Metadata = {
  title: "Оплата, доставка и возврат | Casa Toscana",
  description:
    "Как оплатить заказ в Casa Toscana, как происходит доставка и что делать при возврате товара.",
};

export default function PaymentDeliveryReturnPage() {
  return (
    <LegalDocument
      title="Оплата, доставка и возврат"
      updatedAt={seller.documentsUpdatedAt}
    >
      <p>
        Кратко о том, как купить, получить и при необходимости вернуть заказ в
        интернет-магазине {seller.brand}.
      </p>

      <section className="rounded-3xl bg-cream px-5 py-6 md:px-7 md:py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
          01
        </p>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground md:text-3xl">
          Оплата
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <p>
            Оплата производится онлайн доступными на сайте способами. Перед
            оплатой вы видите итоговую сумму заказа.
          </p>
          <p>
            Платёж обрабатывается платёжным провайдером на защищённой форме.
            Полные данные банковской карты магазину не передаются и не хранятся.
          </p>
          <p>
            После успешной оплаты на сайте отображается результат платежа. При
            необходимости формируется кассовый чек в соответствии с применимыми
            требованиями законодательства и направляется на указанные вами
            email и/или телефон.
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-cream px-5 py-6 md:px-7 md:py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
          02
        </p>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground md:text-3xl">
          Доставка
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <p>
            На текущем этапе оформления заказа на сайте указываются контактные
            данные покупателя. Отдельный выбор службы доставки в интерфейсе
            оформления пока не подключён, поэтому мы не заявляем СДЭК, Яндекс
            Доставку или иной конкретный способ как уже работающий на сайте.
          </p>
          <p>
            Стоимость и срок доставки, если доставка потребуется, рассчитываются
            и сообщаются при согласовании заказа. Срок зависит от региона и
            выбранного способа передачи товара.
          </p>
          <LegalList
            items={[
              "укажите верные имя, телефон и email — без них нельзя подтвердить заказ и передать его;",
              "если товар выдаётся в пункте выдачи, получите его в срок, сообщённый службой доставки, по документу, удостоверяющему личность, если это требуется;",
              "при получении осмотрите упаковку. Если она повреждена, зафиксируйте это при вручении и свяжитесь с продавцом.",
            ]}
          />
          {/* TODO: указать данные продавца */}
        </div>
      </section>

      <section className="rounded-3xl bg-cream px-5 py-6 md:px-7 md:py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
          03
        </p>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground md:text-3xl">
          Возврат
        </h2>
        <div className="mt-4">
          <ReturnPolicyBlocks />
        </div>
      </section>

      <LegalSection title="Подробные условия">
        <p>
          Полные условия договора содержатся в{" "}
          <Link href="/offer" className="underline underline-offset-4">
            Публичной оферте
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
