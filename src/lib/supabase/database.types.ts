export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          date_of_birth: string | null;
          role: "user" | "admin" | "support" | "analyst";
          status: "active" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          role?: "user" | "admin" | "support" | "analyst";
          status?: "active" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          role?: "user" | "admin" | "support" | "analyst";
          status?: "active" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bot_configs: {
        Row: {
          id: string;
          user_id: string;
          mode: "paper" | "live";
          is_active: boolean;
          risk_percent: number;
          pairs: string[];
          kill_switch: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode?: "paper" | "live";
          is_active?: boolean;
          risk_percent?: number;
          pairs?: string[];
          kill_switch?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: "paper" | "live";
          is_active?: boolean;
          risk_percent?: number;
          pairs?: string[];
          kill_switch?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exchange_credentials: {
        Row: {
          id: string;
          user_id: string;
          exchange: string;
          api_key_encrypted: string;
          api_secret_encrypted: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exchange?: string;
          api_key_encrypted: string;
          api_secret_encrypted: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exchange?: string;
          api_key_encrypted?: string;
          api_secret_encrypted?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      signals: {
        Row: {
          id: string;
          user_id: string;
          pair: string;
          side: "long" | "flat";
          reason: string | null;
          price: number | null;
          strength: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pair: string;
          side: "long" | "flat";
          reason?: string | null;
          price?: number | null;
          strength?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pair?: string;
          side?: "long" | "flat";
          reason?: string | null;
          price?: number | null;
          strength?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          pair: string;
          side: "buy" | "sell";
          qty: number;
          entry_price: number;
          exit_price: number | null;
          pnl: number | null;
          mode: "paper" | "live";
          status: "open" | "closed";
          stop_loss: number | null;
          take_profit: number | null;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          pair: string;
          side: "buy" | "sell";
          qty: number;
          entry_price: number;
          exit_price?: number | null;
          pnl?: number | null;
          mode?: "paper" | "live";
          status?: "open" | "closed";
          stop_loss?: number | null;
          take_profit?: number | null;
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          pair?: string;
          side?: "buy" | "sell";
          qty?: number;
          entry_price?: number;
          exit_price?: number | null;
          pnl?: number | null;
          mode?: "paper" | "live";
          status?: "open" | "closed";
          stop_loss?: number | null;
          take_profit?: number | null;
          opened_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      equity_snapshots: {
        Row: {
          id: string;
          user_id: string;
          equity: number;
          mode: "paper" | "live";
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          equity: number;
          mode?: "paper" | "live";
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          equity?: number;
          mode?: "paper" | "live";
          recorded_at?: string;
        };
        Relationships: [];
      };
      strategy_settings: {
        Row: {
          id: string;
          name: string;
          timeframe: string;
          fast: number;
          slow: number;
          atr_period: number;
          stop_atr: number;
          tp_atr: number;
          min_atr_pct: number;
          max_atr_pct: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name?: string;
          timeframe?: string;
          fast?: number;
          slow?: number;
          atr_period?: number;
          stop_atr?: number;
          tp_atr?: number;
          min_atr_pct?: number;
          max_atr_pct?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          timeframe?: string;
          fast?: number;
          slow?: number;
          atr_period?: number;
          stop_atr?: number;
          tp_atr?: number;
          min_atr_pct?: number;
          max_atr_pct?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      sandbox_sessions: {
        Row: {
          user_id: string;
          session_id: string;
          is_active: boolean;
          live_on: boolean;
          tick_interval_ms: number;
          state: Json;
          market: Json | null;
          candles: Json | null;
          last_tick_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          session_id: string;
          is_active?: boolean;
          live_on?: boolean;
          tick_interval_ms?: number;
          state: Json;
          market?: Json | null;
          candles?: Json | null;
          last_tick_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          session_id?: string;
          is_active?: boolean;
          live_on?: boolean;
          tick_interval_ms?: number;
          state?: Json;
          market?: Json | null;
          candles?: Json | null;
          last_tick_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
