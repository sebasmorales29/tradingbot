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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
