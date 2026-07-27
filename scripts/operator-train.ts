/**
 * Entrena el Operador Keelra con histórico real de Binance.
 * Run: npm run bot:operator-train
 *
 * Reescribe src/lib/trading/operator/models/operator_model_v1.json
 * (contrato scoreSetup estable; version field → v2).
 */
import { trainOperatorFromMarket } from "../src/lib/trading/operator/train";

async function main() {
  console.log("Training Keelra operator from Binance history…");
  const model = await trainOperatorFromMarket();
  console.log(
    `Done. model ${model.version} @ ${model.trainedAt} · samples ${model.sampleWins}W / ${model.sampleLosses}L`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
