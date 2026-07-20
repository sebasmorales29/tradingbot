# PulseTrade

Bot de trading crypto (Binance Spot) + producto web con Supabase.

## Arranque

```bash
npm install
cp .env.example .env.local
# Rellena SUPABASE URL + anon key
npm run dev
```

## SQL obligatorio (Supabase → SQL Editor)

1. [`supabase/migrations/20260720000000_initial.sql`](supabase/migrations/20260720000000_initial.sql)
2. [`supabase/migrations/20260720010000_trade_stops.sql`](supabase/migrations/20260720010000_trade_stops.sql) ← **necesitas este para el motor**

## Usar el bot (paper)

1. Entra a `/dashboard`
2. Pulsa **Activar bot**
3. Pulsa **Escanear mercado** (o espera 60s: escanea solo)
4. Trend Pulse lee BTC/ETH 4h en Binance (público) y opera en paper

## Backtest offline

```bash
npm run bot:backtest
```

## Motor

- Estrategia: **Trend Pulse** (EMA 20/50 + ATR stops + filtro de separación de tendencia)
- Riesgo: % fijo por trade, tope diario 3%, kill-switch, cap 25% notional
- Paper: slippage 0.05%, equity inicial $10,000

## Stack

Next.js · TypeScript · Tailwind · Supabase · ccxt (Binance)

## 24/7 sin PC

Ver guía completa: [`DEPLOY.md`](DEPLOY.md)

Resumen: Vercel + `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` + cron cada 15 min.
