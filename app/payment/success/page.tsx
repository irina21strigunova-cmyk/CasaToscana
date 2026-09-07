import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm text-muted">
          Проверяем оплату…
        </div>
      }
    >
      <PaymentSuccessClient />
    </Suspense>
  );
}
