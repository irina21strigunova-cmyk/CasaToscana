import { Suspense } from "react";
import { OrdersLookup } from "./OrdersLookup";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 text-sm text-muted">Загружаем…</div>
      }
    >
      <OrdersLookup />
    </Suspense>
  );
}
