import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { unpaidOrdersEnabled } from "@/lib/orders/store";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return <CheckoutForm unpaidOrdersEnabled={unpaidOrdersEnabled()} />;
}
