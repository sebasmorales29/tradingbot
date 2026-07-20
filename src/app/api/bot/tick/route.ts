import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runBotTick } from "@/lib/trading/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const result = await runBotTick(supabase, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en tick";
    console.error("[bot/tick]", err);
    const safe =
      message.includes("451") || message.toLowerCase().includes("restricted")
        ? "Mercado no disponible desde esta región del servidor"
        : message.length > 120
          ? "Error al escanear el mercado"
          : message;
    return NextResponse.json({ ok: false, message: safe }, { status: 500 });
  }
}
