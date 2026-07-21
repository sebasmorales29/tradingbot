import { getStrategyCopy } from "@/lib/i18n/strategy-copy";

export type RiskConfig = {
  equity: number;
  riskPercent: number;
  maxDailyLossPercent: number;
  dayPnl: number;
  killSwitch: boolean;
  price: number;
  stopLoss: number;
  locale?: "es" | "en";
};

export type PositionSizeResult = {
  allowed: boolean;
  qty: number;
  riskAmount: number;
  reason?: string;
};

/**
 * Size position so that stop distance ≈ riskPercent of equity.
 * Spot long only; qty in base asset.
 */
export function sizePosition(cfg: RiskConfig): PositionSizeResult {
  const copy = getStrategyCopy(cfg.locale ?? "es");

  if (cfg.killSwitch) {
    return { allowed: false, qty: 0, riskAmount: 0, reason: copy.riskKill };
  }

  const maxDailyLoss = (cfg.equity * cfg.maxDailyLossPercent) / 100;
  if (cfg.dayPnl <= -maxDailyLoss) {
    return {
      allowed: false,
      qty: 0,
      riskAmount: 0,
      reason: copy.riskDaily,
    };
  }

  const stopDistance = cfg.price - cfg.stopLoss;
  if (stopDistance <= 0) {
    return { allowed: false, qty: 0, riskAmount: 0, reason: copy.riskStop };
  }

  const riskAmount = (cfg.equity * cfg.riskPercent) / 100;
  let qty = riskAmount / stopDistance;

  // Cap: never use more than 25% of equity in one spot position notional
  const maxNotional = cfg.equity * 0.25;
  const notional = qty * cfg.price;
  if (notional > maxNotional) {
    qty = maxNotional / cfg.price;
  }

  // Round to reasonable precision
  qty = Math.floor(qty * 1e6) / 1e6;

  if (qty <= 0) {
    return { allowed: false, qty: 0, riskAmount: 0, reason: copy.riskQty };
  }

  return { allowed: true, qty, riskAmount };
}
