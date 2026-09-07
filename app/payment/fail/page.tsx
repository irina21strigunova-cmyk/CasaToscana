import { Suspense } from "react";
import PaymentFailClient from "./PaymentFailClient";

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm text-muted">
          Загрузка…
        </div>
      }
    >
      <PaymentFailClient />
    </Suspense>
  );
}
