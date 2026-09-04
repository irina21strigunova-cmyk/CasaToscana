# Casa Toscana

Премиальное Telegram Mini App для продажи итальянской косметики Idea Toscana в России.

## Стек

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand (корзина)

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Структура

- `app/` — страницы (главная, каталог, корзина, профиль)
- `components/` — UI-компоненты и layout
- `data/products.json` — mock-данные товаров
- `lib/cart/store.ts` — состояние корзины (localStorage)
- `types/` — TypeScript-типы

## Фаза 1 (текущая)

- Базовый layout с нижней навигацией
- Главная страница с hero и избранными товарами
- Каталог с фильтрацией по категориям
- Корзина с persist в localStorage
- Placeholder-страницы профиля и заказов

## Следующие этапы

- Supabase (товары, заказы, пользователи)
- Telegram Mini Apps SDK (авторизация)
- Оформление заказа с оплатой по СБП
- Страница товара, checkout, доставка
