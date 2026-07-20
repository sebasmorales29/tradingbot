export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Pair = "BTC/USDT" | "ETH/USDT";

export type SignalSide = "long" | "flat";

export type StrategySignal = {
  pair: Pair;
  side: SignalSide;
  price: number;
  reason: string;
  stopLoss?: number;
  takeProfit?: number;
  atr?: number;
  strength?: number;
};
