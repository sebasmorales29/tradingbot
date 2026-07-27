/**
 * Entrena el Operador Keelra con histórico real de Binance.
 * Run: npm run bot:operator-train
 *
 * Reescribe src/lib/trading/operator/models/operator_model_v1.json
 * y, si hay SERVICE_ROLE, sincroniza operator_brain.
 */
import { trainOperatorFromMarket } from "../src/lib/trading/operator/train";

async function main() {
  console.log("Training Keelra operator from Binance history…");
  const model = await trainOperatorFromMarket();
  console.log(
    `Done. model ${model.version} @ ${model.trainedAt} · samples ${model.sampleWins}W / ${model.sampleLosses}L`,
  );

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const { createAdminClient } = await import("../src/lib/supabase/admin");
    const admin = createAdminClient();
    const { error } = await admin.from("operator_brain").upsert({
      id: "keelra",
      model_version: model.version,
      last_trained_at: model.trainedAt,
      train_sample_wins: model.sampleWins,
      train_sample_losses: model.sampleLosses,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Could not sync operator_brain:", error.message);
    } else {
      console.log("Synced operator_brain row.");
    }
  } else {
    console.log(
      "Skipped DB sync (no SERVICE_ROLE). Use Admin → Operador → Sync after deploy.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
