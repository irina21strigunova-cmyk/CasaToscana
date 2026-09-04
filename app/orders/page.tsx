export default function OrdersPage() {
  return (
    <div className="px-4 py-6">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Мои заказы
      </h2>
      <p className="mt-2 text-sm text-muted">
        История заказов появится после подключения базы данных.
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-milk-dark bg-cream/50 p-8 text-center">
        <p className="text-sm text-muted">Заказов пока нет</p>
      </div>
    </div>
  );
}
