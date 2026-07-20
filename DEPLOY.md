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
| `ADMIN_EMAILS` | `moralesvega2909@hotmail.com` (bootstrap admin) |

Redeploy después de guardar las variables.

## Roles (mismo login)

Todos entran por `/login`. El rol en `profiles.role` decide el menú:

| Rol | Panel | Bot on/off | Consola `/admin` | Cambiar roles |
|-----|-------|------------|------------------|---------------|
| `user` | sí | sí | no | no |
| `support` | sí | sí | telemetría / bots | no |
| `analyst` | sí | no | métricas / estrategia | no |
| `admin` | sí | sí | todo | sí |

1. Ejecuta en Supabase → **SQL Editor**:
   - `supabase/migrations/20260720120000_roles.sql`
   - `supabase/migrations/20260720130000_profile_status.sql` (suspender cuentas)
   - `supabase/migrations/20260720140000_profile_identity_strategy.sql` (nombre, DOB, estrategia editable)
2. Registra o inicia sesión con `moralesvega2909@hotmail.com` (queda admin por SQL + `ADMIN_EMAILS`).
3. Consola en `/admin` con vistas: Resumen, Usuarios, Bots, Actividad, Estrategia.

## 3. Cron cada 15 min (gratis, recomendado)

El plan **Hobby** de Vercel solo permite 1 cron al día. Para escanear cada 15 min usa [cron-job.org](https://cron-job.org) (gratis):

- **URL:** `https://TU-APP.vercel.app/api/cron/tick`
- **Schedule:** every 15 minutes
- **Header:** `Authorization` = `Bearer TU_CRON_SECRET`

El cron diario de Vercel queda como respaldo; cron-job.org es el que mantiene el bot activo de verdad.

## 4. Comprobar

Con el bot **Activo** en el dashboard, espera ~15 min o llama:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://TU-APP.vercel.app/api/cron/tick
```

Debes ver `"ok": true` y `processed: 1` (o más).
