/**
 * Согласия пациента на каналы связи (service / marketing).
 *
 * БЫЛО: GET/PUT /api/communications/consents/:patientId уже хранили per-channel
 * согласия (phone/sms/whatsapp/telegram/email/… × service|marketing →
 * granted|revoked), defaults service=granted / marketing=revoked, но **zero web
 * callers** — администратор не мог отметить отказ от рекламы или разрешение
 * на WhatsApp, а outbox/campaigns слали вслепую.
 *
 * ТЕПЕРЬ: на карточке пациента панель грузит согласия, даёт переключатели
 * «служебные» / «реклама» по основным каналам доставки, сохраняет PUT с
 * clinical mutation headers. Самодостаточная: auth из useAppLogicContext.
 */

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { operatorReadableErrorDetail } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	actionFailureToast,
	requestFailureCause,
} from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

const CHANNELS = [
	{ value: "sms", label: "SMS" },
	{ value: "whatsapp", label: "WhatsApp" },
	{ value: "telegram", label: "Telegram" },
	{ value: "email", label: "E-mail" },
	{ value: "phone", label: "Звонок" },
	{ value: "max", label: "MAX" },
	{ value: "vk", label: "VK" },
	{ value: "in_person", label: "Лично" },
] as const;

const SCOPES = [
	{ value: "service", label: "Служебные" },
	{ value: "marketing", label: "Реклама" },
] as const;

type Channel = (typeof CHANNELS)[number]["value"];
type Scope = (typeof SCOPES)[number]["value"];
type ConsentState = "granted" | "revoked";

type ConsentRow = {
	channel: Channel;
	scope: Scope;
	state: ConsentState;
	source?: string | undefined;
	evidence?: string | null | undefined;
	decidedAt?: string | null | undefined;
};

type ConsentMatrix = Record<string, ConsentState>; // key = `${channel}:${scope}`

function cellKey(channel: string, scope: string): string {
	return `${channel}:${scope}`;
}

function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	const t = raw.trim();
	if (!t) return null;
	try {
		const p: unknown = JSON.parse(t);
		return typeof p === "object" && p !== null && !Array.isArray(p)
			? (p as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function buildMatrix(
	consents: ConsentRow[],
	defaults: { service: ConsentState; marketing: ConsentState },
): ConsentMatrix {
	const m: ConsentMatrix = {};
	for (const ch of CHANNELS) {
		m[cellKey(ch.value, "service")] = defaults.service;
		m[cellKey(ch.value, "marketing")] = defaults.marketing;
	}
	for (const row of consents) {
		const ch = row.channel;
		const sc = row.scope;
		if (!CHANNELS.some((c) => c.value === ch)) continue;
		if (sc !== "service" && sc !== "marketing") continue;
		if (row.state !== "granted" && row.state !== "revoked") continue;
		m[cellKey(ch, sc)] = row.state;
	}
	return m;
}

export type PatientCommunicationConsentsPanelProps = {
	patientId?: string | null;
};

export const PatientCommunicationConsentsPanel: React.FC<
	PatientCommunicationConsentsPanelProps
> = ({ patientId }) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [matrix, setMatrix] = useState<ConsentMatrix>({});
	const [baseline, setBaseline] = useState<ConsentMatrix>({});
	const [loaded, setLoaded] = useState(false);

	const dirty = useMemo(() => {
		const keys = new Set([...Object.keys(matrix), ...Object.keys(baseline)]);
		for (const k of keys) {
			if ((matrix[k] ?? "revoked") !== (baseline[k] ?? "revoked")) return true;
		}
		return false;
	}, [matrix, baseline]);

	const load = useCallback(async () => {
		const pid = (patientId ?? "").trim();
		if (!pid) {
			setMatrix({});
			setBaseline({});
			setLoaded(false);
			setError(null);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: {};
			const res = await fetch(
				`/api/communications/consents/${encodeURIComponent(pid)}`,
				{
					method: "GET",
					headers,
				},
			);
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			if (!res.ok) {
				console.error(`[comm-consents] GET ${res.status} ${raw.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(
					typeof json?.message === "string" ? json.message : null,
				);
				const msg =
					detail ??
					(res.status === 404
						? "Пациент не найден — обновите карточку."
						: actionFailureToast("Согласия на связь не загружены", res.status));
				setError(msg);
				setLoaded(false);
				return;
			}
			const defaultsRaw = json?.defaults;
			const defaults = {
				service:
					defaultsRaw &&
					typeof defaultsRaw === "object" &&
					(defaultsRaw as { service?: string }).service === "revoked"
						? ("revoked" as const)
						: ("granted" as const),
				marketing:
					defaultsRaw &&
					typeof defaultsRaw === "object" &&
					(defaultsRaw as { marketing?: string }).marketing === "granted"
						? ("granted" as const)
						: ("revoked" as const),
			};
			const rows: ConsentRow[] = Array.isArray(json?.consents)
				? ((json?.consents ?? []) as unknown[])
						.filter(
							(r): r is Record<string, unknown> =>
								typeof r === "object" && r !== null,
						)
						.map((r) => {
							const row: ConsentRow = {
								channel: String(r.channel ?? "") as Channel,
								scope: String(r.scope ?? "") as Scope,
								state: (r.state === "granted"
									? "granted"
									: "revoked") as ConsentState,
							};
							if (typeof r.source === "string") row.source = r.source;
							if (typeof r.evidence === "string") row.evidence = r.evidence;
							else if (r.evidence === null) row.evidence = null;
							if (typeof r.decidedAt === "string") row.decidedAt = r.decidedAt;
							else if (r.decidedAt === null) row.decidedAt = null;
							return row;
						})
				: [];
			const next = buildMatrix(rows, defaults);
			setMatrix(next);
			setBaseline({ ...next });
			setLoaded(true);
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			console.error("[comm-consents] load failed", e);
			const msg = `Согласия не загружены: ${requestFailureCause(null)}.`;
			setError(msg);
			setLoaded(false);
		} finally {
			setLoading(false);
		}
	}, [auth, patientId]);

	useEffect(() => {
		void load();
	}, [load]);

	const toggle = useCallback((channel: Channel, scope: Scope) => {
		const k = cellKey(channel, scope);
		setMatrix((prev) => {
			const cur = prev[k] ?? "revoked";
			return { ...prev, [k]: cur === "granted" ? "revoked" : "granted" };
		});
	}, []);

	const save = useCallback(async () => {
		const pid = (patientId ?? "").trim();
		if (!pid) {
			showToast("Сначала выберите пациента.", "error", 8000);
			return;
		}
		const entries: Array<{
			channel: Channel;
			scope: Scope;
			state: ConsentState;
			source: string;
		}> = [];
		for (const ch of CHANNELS) {
			for (const sc of SCOPES) {
				const k = cellKey(ch.value, sc.value);
				const state = matrix[k] ?? "revoked";
				const base = baseline[k] ?? "revoked";
				// Отправляем изменённые + все явные, чтобы defaults зафиксировались.
				if (state !== base || state === "granted" || sc.value === "marketing") {
					entries.push({
						channel: ch.value,
						scope: sc.value,
						state,
						source: "staff",
					});
				}
			}
		}
		// Всегда хотя бы изменённые; если dirty но entries пуст — шлём полный снимок.
		if (entries.length === 0) {
			for (const ch of CHANNELS) {
				for (const sc of SCOPES) {
					const k = cellKey(ch.value, sc.value);
					entries.push({
						channel: ch.value,
						scope: sc.value,
						state: matrix[k] ?? "revoked",
						source: "staff",
					});
				}
			}
		}
		// API max 32 entries — 8×2=16, ok.
		setSaving(true);
		setError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalMutationHeaders === "function"
					? auth.denteClinicalMutationHeaders({
							"Content-Type": "application/json",
						})
					: auth && typeof auth.denteClinicalReadHeaders === "function"
						? {
								...auth.denteClinicalReadHeaders(),
								"Content-Type": "application/json",
							}
						: { "Content-Type": "application/json" };
			const res = await fetch(
				`/api/communications/consents/${encodeURIComponent(pid)}`,
				{
					method: "PUT",
					headers,
					body: JSON.stringify({ entries }),
				},
			);
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			if (!res.ok) {
				console.error(`[comm-consents] PUT ${res.status} ${raw.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(
					typeof json?.message === "string" ? json.message : null,
				);
				const msg =
					detail ??
					(res.status === 400
						? "Согласия не сохранены: проверьте каналы и статусы."
						: res.status === 404
							? "Пациент не найден в клинике."
							: actionFailureToast(
									"Согласия на связь не сохранены",
									res.status,
								));
				setError(msg);
				showToast(msg, "error", 12000);
				return;
			}
			setBaseline({ ...matrix });
			showToast("Согласия на связь сохранены.", "success", 7000);
			// Reload to pick server decidedAt / canonical state
			void load();
		} catch (e) {
			console.error("[comm-consents] save failed", e);
			const msg = `Согласия не сохранены: ${requestFailureCause(null)}.`;
			setError(msg);
			showToast(msg, "error", 12000);
		} finally {
			setSaving(false);
		}
	}, [auth, baseline, load, matrix, patientId]);

	if (!patientId) {
		return null;
	}

	return (
		<section
			className="rounded-2xl border border-sky-500/25 bg-zinc-950/80 p-4 shadow-[0_0_40px_-18px_rgba(14,165,233,0.3)]"
			data-testid="patient-comm-consents-panel"
			aria-label="Согласия на каналы связи"
		>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
				<div>
					<h3 className="text-sm font-bold text-sky-200 tracking-wide">
						Согласия на связь
					</h3>
					<p className="text-xs text-zinc-500 mt-0.5">
						Служебные (запись, напоминания) и реклама по каналам. Без явного
						«разрешено» реклама не уходит.
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{dirty && (
						<span className="text-[11px] px-2 py-0.5 rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-200">
							Есть изменения
						</span>
					)}
					<button
						type="button"
						data-testid="patient-comm-consents-reload"
						disabled={loading || saving}
						onClick={() => void load()}
						className="px-3 py-1.5 text-xs rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
					>
						Обновить
					</button>
					<button
						type="button"
						data-testid="patient-comm-consents-save"
						disabled={loading || saving || !dirty || !loaded}
						onClick={() => void save()}
						className="px-3 py-1.5 text-xs font-medium rounded-xl bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400/40 disabled:opacity-50"
					>
						{saving ? "Сохраняю…" : "Сохранить"}
					</button>
				</div>
			</div>

			{loading && !loaded ? (
				<p className="text-xs text-zinc-500">Загружаю согласия…</p>
			) : null}

			{error && (
				<p className="mb-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
					{error}
				</p>
			)}

			{loaded && (
				<div
					className="overflow-x-auto"
					data-testid="patient-comm-consents-matrix"
				>
					<table className="w-full text-left text-xs border-collapse min-w-[420px]">
						<thead>
							<tr className="text-zinc-500 border-b border-zinc-800">
								<th className="py-2 pr-3 font-medium">Канал</th>
								{SCOPES.map((sc) => (
									<th
										key={sc.value}
										className="py-2 px-2 font-medium text-center"
									>
										{sc.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{CHANNELS.map((ch) => (
								<tr key={ch.value} className="border-b border-zinc-900/80">
									<td className="py-2 pr-3 text-zinc-200 font-medium">
										{ch.label}
									</td>
									{SCOPES.map((sc) => {
										const k = cellKey(ch.value, sc.value);
										const state = matrix[k] ?? "revoked";
										const on = state === "granted";
										return (
											<td key={sc.value} className="py-2 px-2 text-center">
												<button
													type="button"
													data-testid={`patient-comm-consent-${ch.value}-${sc.value}`}
													aria-pressed={on}
													onClick={() => toggle(ch.value, sc.value)}
													disabled={saving}
													className={
														on
															? "min-w-[88px] px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-600/25 text-emerald-200 border border-emerald-400/35"
															: "min-w-[88px] px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700"
													}
												>
													{on ? "Разрешено" : "Запрещено"}
												</button>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
					<p className="mt-2 text-[11px] text-zinc-500">
						По умолчанию служебные — разрешены, реклама — запрещена, пока
						администратор не зафиксирует иное.
					</p>
				</div>
			)}
		</section>
	);
};

export default PatientCommunicationConsentsPanel;
