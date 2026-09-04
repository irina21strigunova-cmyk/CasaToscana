export default function ProfilePage() {
  return (
    <div className="px-4 py-6">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Профиль
      </h2>
      <p className="mt-2 text-sm text-muted">
        Авторизация через Telegram будет добавлена на следующем этапе.
      </p>

      <div className="mt-8 rounded-2xl bg-cream p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-milk-dark">
          <svg
            className="h-8 w-8 text-olive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 0 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </div>
        <p className="text-sm text-muted">
          Откройте приложение через Telegram, чтобы увидеть свой профиль.
        </p>
      </div>
    </div>
  );
}
