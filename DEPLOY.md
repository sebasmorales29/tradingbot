# Deploy 24/7 (sin PC encendida)

El bot en la nube llama a `/api/cron/tick` cada 15 minutos y procesa todos los usuarios con bot **Activo**.

## 1. Service Role Key (Supabase)

1. Supabase → **Project Settings** → **API**
2. Copia **`service_role`** (secret) — **nunca la compartas en público**
3. Añádela en `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=HOKHNyhhTpchXqv4BNuusYLs5YTl7qqeMOWH0jPuF9Q
```

(El `CRON_SECRET` ya puede estar en tu `.env.local`.)

## 2. Deploy en Vercel

```bash
npx vercel login
npx vercel --prod
```

En Vercel → Project → **Settings → Environment Variables**, añade:

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | tu project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `CRON_SECRET` | el mismo de arriba |

Redeploy después de guardar las variables.

## 3. Cron gratis cada 15 min (recomendado)

El plan gratis de Vercel a veces limita el cron interno. Usa [cron-job.org](https://cron-job.org) (gratis):

- **URL:** `https://TU-APP.vercel.app/api/cron/tick`
- **Schedule:** every 15 minutes
- **Header:** `Authorization` = `Bearer TU_CRON_SECRET`

Así el bot corre aunque apagues la computadora.

## 4. Comprobar

Con el bot **Activo** en el dashboard, espera ~15 min o llama:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://TU-APP.vercel.app/api/cron/tick
```

Debes ver `"ok": true` y `processed: 1` (o más).
