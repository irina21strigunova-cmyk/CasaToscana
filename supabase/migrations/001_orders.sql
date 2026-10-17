-- Casa Toscana durable orders. Run in Supabase SQL Editor as the project owner.
-- Service role bypasses RLS; anon/authenticated have no policies → no public access.

create table if not exists public.orders (
  order_id text primary key,
  status text not null,
  amount_kopecks integer not null check (amount_kopecks > 0),
  total_rub numeric(12, 2) not null check (total_rub > 0),
  goods_rub numeric(12, 2) not null check (goods_rub >= 0),
  delivery_cost_rub numeric(12, 2) not null default 0 check (delivery_cost_rub >= 0),
  lines jsonb not null,
  customer jsonb not null,
  delivery jsonb,
  payment_id text,
  payment_url text,
  cdek_uuid text,
  cdek_number text,
  cdek_status text,
  paid_at timestamptz,
  shipped_at timestamptz,
  closing_receipt_sent_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_lines_is_array check (jsonb_typeof(lines) = 'array'),
  constraint orders_customer_is_object check (jsonb_typeof(customer) = 'object')
);

create unique index if not exists orders_payment_id_uidx
  on public.orders (payment_id)
  where payment_id is not null;

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

create index if not exists orders_customer_email_idx
  on public.orders ((lower(customer ->> 'email')));

create table if not exists public.order_status_events (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders (order_id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_id_idx
  on public.order_status_events (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_status_events enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.order_status_events from anon, authenticated;

comment on table public.orders is
  'Server-only order records. Access via SUPABASE_SERVICE_ROLE_KEY from the Next.js app.';
