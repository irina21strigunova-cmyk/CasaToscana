# Постоянные заказы Casa Toscana

Неоплаченные заказы СДЭК принимаются только при подключённом Supabase.
Письма уходят через Resend. Без почты заказ всё равно сохраняется.

## 1. Supabase

1. Откройте [https://supabase.com/dashboard](https://supabase.com/dashboard) и создайте проект.
2. SQL Editor → New query → вставьте файл `supabase/migrations/001_orders.sql` → Run.
3. Project Settings → API:
   - Project URL → `SUPABASE_URL`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`
4. Добавьте оба значения в Vercel Production (Environment Variables). Не коммитьте ключи.
5. Redeploy после сохранения переменных.

Ключ `anon` для заказов не используйте.

## 2. Письма (Resend)

1. Зарегистрируйтесь на [https://resend.com](https://resend.com).
2. Добавьте и подтвердите домен `casatoscana.ru`.
3. Создайте API key.
4. В Vercel:
   - `RESEND_API_KEY`
   - `EMAIL_FROM=Casa Toscana <noreply@casatoscana.ru>`
   - `ORDER_NOTIFY_EMAIL=CasaToscana@outlook.com`

## 3. Админка

Адрес: `/admin/login`. Секрет — существующий `TBANK_OPS_SECRET` (уже должен быть в Vercel). Он не вшивается в клиентский JS: вводится в форму и сохраняется в HttpOnly cookie.
