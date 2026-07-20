import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/identity";

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

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">Bots</h1>
      <p className="mt-2 text-snow/60">
        Configuración y métricas por bot. Abre uno para ver detalle completo.
      </p>

      <ul className="mt-8 divide-y divide-snow/10 rounded-xl border border-snow/10">
        {(bots ?? []).map((b) => {
          const p = profileById.get(b.user_id);
          const label =
            displayName(p?.first_name, p?.last_name, p?.full_name) !== "—"
              ? displayName(p?.first_name, p?.last_name, p?.full_name)
              : (p?.email ?? b.user_id.slice(0, 8));

          return (
            <li
              key={b.user_id}
              className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/bots/${b.user_id}`}
                  className="font-medium text-pulse hover:text-pulse/80"
                >
                  {label}
                </Link>
                <p className="truncate text-xs text-snow/40">
                  {p?.email}
                  {" · "}
                  Actualizado{" "}
                  {new Date(b.updated_at).toLocaleString("es-CR")}
                </p>
              </div>
              <div className="text-snow/80">
                {b.is_active ? (
                  <span className="text-emerald-300">Activo</span>
                ) : (
                  <span className="text-snow/50">Pausa</span>
                )}
                {" · "}
                {b.mode}
                {" · "}
                riesgo {b.risk_percent}%
                {b.kill_switch ? " · KILL" : ""}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-snow/45">
                  {(b.pairs ?? []).join(", ")}
                </p>
                <Link
                  href={`/admin/bots/${b.user_id}`}
                  className="inline-flex shrink-0 rounded-md border border-pulse/40 bg-pulse/10 px-3 py-1.5 text-xs font-semibold text-pulse transition hover:bg-pulse/20"
                >
                  Ver bot
                </Link>
              </div>
            </li>
          );
        })}
        {!bots?.length && (
          <li className="px-5 py-10 text-center text-snow/50">
            Sin bots configurados.
          </li>
        )}
      </ul>
    </div>
  );
}
