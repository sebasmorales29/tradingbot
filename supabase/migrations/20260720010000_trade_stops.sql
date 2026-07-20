-- Add stop/take-profit to trades for paper/live management
alter table public.trades
  add column if not exists stop_loss numeric,
  add column if not exists take_profit numeric;

alter table public.signals
  add column if not exists strength numeric;
