/**
 * Recalibra el Operador Keelra a partir de trades cerrados + meta de señales.
 * Run: npm run bot:operator-learn
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  ← Project Settings → API → service_role (secret)
 */
import { createAdminClient } from "../src/lib/supabase/admin";
import { recomputeAndUpsertCalibration } from "../src/lib/trading/operator/calibration";

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`
Falta SUPABASE_SERVICE_ROLE_KEY en .env.local

1. Abre Supabase → Project Settings → API
2. Copia la clave "service_role" (secret) — NO la anon
3. Añade esta línea a .env.local:

   SUPABASE_SERVICE_ROLE_KEY=eyJ...tu_clave...

4. Vuelve a correr: npm run bot:operator-learn
`);
    process.exit(1);
  }

  const admin = createAdminClient();
  const result = await recomputeAndUpsertCalibration(admin);
  console.log(
    `Operator learn OK — ${result.buckets} calibration bucket(s) upserted.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
