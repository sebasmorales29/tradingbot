import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/identity";
import { AdminBotsView } from "@/components/admin/views/AdminBotsView";

export default async function AdminBotsPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/bots");
  if (!access.can("admin_support_view") && !access.can("admin_telemetry")) {
    redirect("/admin");
  }

  const admin = createAdminClient();
  const [{ data: bots }, { data: profiles }] = await Promise.all([
    admin
      .from("bot_configs")
      .select(
        "user_id, is_active, mode, risk_percent, pairs, kill_switch, updated_at",
      )
      .order("updated_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, email, first_name, last_name, full_name"),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p] as const),
  );

  const rows = (bots ?? []).map((b) => {
    const p = profileById.get(b.user_id);
    const label =
      displayName(p?.first_name, p?.last_name, p?.full_name) !== "—"
        ? displayName(p?.first_name, p?.last_name, p?.full_name)
        : (p?.email ?? b.user_id.slice(0, 8));
    return {
      user_id: b.user_id,
      is_active: b.is_active,
      mode: b.mode,
      risk_percent: Number(b.risk_percent),
      pairs: b.pairs,
      kill_switch: b.kill_switch,
      updated_at: b.updated_at,
      label,
      email: p?.email ?? null,
    };
  });

  return <AdminBotsView bots={rows} />;
}
