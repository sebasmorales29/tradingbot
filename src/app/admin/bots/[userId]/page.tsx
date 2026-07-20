import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminBotDetail } from "@/lib/admin-bots";
import { AdminStat } from "@/components/admin/AdminStat";
import { BotAdminControls } from "@/components/admin/BotAdminControls";

export default async function AdminBotDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const access = await getSessionAccess();
  if (!access) redirect(`/login?next=/admin/bots/${userId}`);
  if (!access.can("admin_support_view") && !access.can("admin_telemetry")) {
    redirect("/admin");
  }

  let detail;
  try {
    detail = await getAdminBotDetail(userId);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  const { bot, metrics } = detail;

  return (
    <div>
      <Link
        href="/admin/bots"
        className="text-sm text-snow/50 transition hover:text-snow"
      >
        ← Bots
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-pulse">Bot</p>
          <h1 className="font-display text-3xl font-bold text-snow">
            {detail.display_name !== "—"
              ? detail.display_name
              : detail.email || "Usuario"}
          </h1>
          <p className="mt-1 text-sm text-snow/55">{detail.email}</p>
          <p className="mt-1 text-xs text-snow/40">
            <span className={bot.is_active ? "text-emerald-300" : "text-amber-300"}>
              {bot.is_active ? "Activo" : "Pausa"}
            </span>
            {" · "}
            {bot.mode}
            {bot.kill_switch ? " · KILL SWITCH" : ""}
          </p>
        </div>
        <Link
          href={`/admin/usuarios/${userId}`}
          className="inline-flex h-9 items-center rounded-lg border border-snow/20 px-3.5 text-sm text-snow/70 transition hover:bg-snow/5 hover:text-snow"
        >
          Ver cuenta de usuario
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label="Equity"
          value={
            metrics.equity != null
              ? `$${metrics.equity.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}`
              : "—"
          }
          accent
        />
        <AdminStat label="Trades abiertos" value={String(metrics.open_trades)} />
        <AdminStat
          label="PnL cerrado"
          value={`${metrics.pnl_closed >= 0 ? "+" : ""}${metrics.pnl_closed.toFixed(2)}`}
        />
        <AdminStat
          label="Win rate"
          value={
            metrics.win_rate != null ? `${metrics.win_rate}%` : "—"
          }
        />
        <AdminStat label="Señales 24h" value={String(metrics.signals_24h)} />
        <AdminStat label="Señales total" value={String(metrics.signals_total)} />
        <AdminStat
          label="Trades cerrados"
          value={String(metrics.closed_trades)}
        />
        <AdminStat
          label="PnL promedio"
          value={
            metrics.avg_pnl != null
              ? `${metrics.avg_pnl >= 0 ? "+" : ""}${metrics.avg_pnl.toFixed(2)}`
              : "—"
          }
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">
          Configuración
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info
            label="Estado"
            value={bot.is_active ? "Activo" : "Pausado"}
            tone={bot.is_active ? "ok" : "warn"}
          />
          <Info label="Modo" value={bot.mode} />
          <Info label="Riesgo %" value={String(bot.risk_percent)} />
          <Info
            label="Kill switch"
            value={bot.kill_switch ? "Activado" : "Off"}
          />
          <Info label="Pares" value={bot.pairs.join(", ") || "—"} />
          <Info label="Bot id" value={bot.id} mono />
          <Info
            label="Creado"
            value={new Date(bot.created_at).toLocaleString("es-CR")}
          />
          <Info
            label="Actualizado"
            value={new Date(bot.updated_at).toLocaleString("es-CR")}
          />
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">
          Trades abiertos
        </h2>
        {!detail.open_trades.length ? (
          <p className="mt-4 text-sm text-snow/50">Ninguno abierto.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {detail.open_trades.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-snow/10 px-4 py-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-snow">
                    {t.pair} · {t.side} · qty {t.qty.toFixed(6)}
                  </span>
                  <span className="text-snow/50">
                    entry {t.entry_price.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-snow/40">
                  SL {t.stop_loss?.toFixed(2) ?? "—"} · TP{" "}
                  {t.take_profit?.toFixed(2) ?? "—"} ·{" "}
                  {new Date(t.opened_at).toLocaleString("es-CR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            Historial de trades
          </h2>
          {!detail.recent_trades.length ? (
            <p className="mt-4 text-sm text-snow/50">Sin trades.</p>
          ) : (
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
              {detail.recent_trades.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-snow/10 px-3 py-2"
                >
                  {t.pair} · {t.status}
                  {t.pnl != null
                    ? ` · pnl ${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`
                    : ""}
                  <div className="text-xs text-snow/40">
                    {new Date(t.opened_at).toLocaleString("es-CR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            Señales recientes
          </h2>
          {!detail.recent_signals.length ? (
            <p className="mt-4 text-sm text-snow/50">Sin señales.</p>
          ) : (
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
              {detail.recent_signals.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-snow/10 px-3 py-2"
                >
                  <span className="text-pulse">{s.side}</span> {s.pair}
                  {s.price != null ? ` @ ${s.price.toFixed(2)}` : ""}
                  <div className="text-xs text-snow/40">{s.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {detail.equity_history.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-snow">
            Equity (snapshots)
          </h2>
          <ul className="mt-4 max-h-60 space-y-1 overflow-y-auto text-sm text-snow/70">
            {detail.equity_history.map((e, i) => (
              <li
                key={`${e.recorded_at}-${i}`}
                className="flex justify-between border-b border-snow/5 py-2"
              >
                <span>
                  $
                  {e.equity.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-xs text-snow/40">
                  {new Date(e.recorded_at).toLocaleString("es-CR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BotAdminControls
        userId={userId}
        isActive={bot.is_active}
        killSwitch={bot.kill_switch}
        riskPercent={bot.risk_percent}
        mode={bot.mode}
        canEdit={access.can("admin_manage_users")}
      />
    </div>
  );
}

function Info({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  mono?: boolean;
}) {
  const valueClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-snow";
  return (
    <div className="rounded-lg border border-snow/10 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-snow/40">{label}</dt>
      <dd
        className={`mt-1 break-all ${valueClass} ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
