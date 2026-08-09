/**
 * Действующие ставки врачей (GET /api/settings/staff/commissions).
 *
 * БЫЛО: маршрут отдавал список `{ userId, commissionPct, materialCostDeductionPct,
 * effectiveFrom }` из `doctor_commissions`, а PUT
 * `/api/settings/staff/:staffId/commission` уже жил в DoctorPayoutDashboard —
 * но **zero web callers** на GET. Владелец видел ставку только внутри месячного
 * отчёта выплат; на вкладке «Персонал» процента не было, и врачи без приёмов
 * в выбранном месяце выглядели «без ставки», хотя строка в базе уже есть.
 *
 * ТЕПЕРЬ: самодостаточная панель на Settings → Персонал. Грузит GET list,
 * сопоставляет userId с ФИО из дашборда, даёт задать/изменить процент через
 * тот же PUT и `auth.settingsAccessHeaders`, что и остальные вкладки настроек
 * (requireSettingsAccess + settingsAdminSecretSession → x-dente-admin-secret).
 *
 * BYLO: denteAdminSecretRequestHeaders() без второго аргумента — секрет не
 * уходил. Локально зелёно (unguarded), у заказчика 403 на GET list и PUT rate.
 */

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

type CommissionRate = {
	userId: string;
	commissionPct: string;
	materialCostDeductionPct: string;
	effectiveFrom: string;
};

type StaffMemberLite = {
	id?: string;
	fullName?: string;
	role?: string;
	active?: boolean;
};

type LoadState =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "ready"; rates: CommissionRate[] }
	| { kind: "failed"; message: string };

type SaveState =
	| { kind: "idle" }
	| { kind: "saving"; userId: string }
	| { kind: "failed"; message: string };

function serverMessageOf(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const record = payload as { message?: unknown };
	if (typeof record.message === "string" && record.message.trim()) {
		return record.message.trim();
	}
	return null;
}

/** Границы как у doctor_commissions.commission_pct — numeric(5,2). */
function parseCommissionInput(raw: string): number | null {
	const normalized = raw.trim().replace(",", ".");
	if (!normalized) return null;
	const n = Number(normalized);
	if (!Number.isFinite(n) || n < 0 || n > 100) return null;
	return Math.round(n * 100) / 100;
}

function percentLabel(pct: string | number): string {
	const n = typeof pct === "number" ? pct : Number(pct);
	if (!Number.isFinite(n)) return String(pct);
	return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %`;
}

function formatEffectiveFrom(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function isDoctorLikeRole(role: string): boolean {
	// staffRoleSchema: owner | doctor | administrator | assistant | manager
	// Ставку платят врачу; owner часто сам принимает. assistant/admin — нет.
	return role === "doctor" || role === "owner";
}

export const StaffCommissionsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	/*
	 * authRef: useAppLogic returns a new auth object each render. Keep the
	 * settings secret fresh inside loadRates/saveRate without thrashing deps.
	 */
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;
	// dashboard живёт на корне useAppLogic; точный тип — ReturnType, читаем мягко.
	const dashboardUnknown = (appLogic as { dashboard?: unknown } | null)
		?.dashboard;

	const clinicSettings =
		dashboardUnknown &&
		typeof dashboardUnknown === "object" &&
		dashboardUnknown !== null &&
		"clinicSettings" in dashboardUnknown
			? (dashboardUnknown as { clinicSettings?: { staff?: StaffMemberLite[] } })
					.clinicSettings
			: undefined;
	const staff: StaffMemberLite[] = Array.isArray(clinicSettings?.staff)
		? clinicSettings?.staff
		: [];

	const staffNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const member of staff) {
			const id = typeof member.id === "string" ? member.id : "";
			if (!id) continue;
			const name =
				typeof member.fullName === "string" ? member.fullName.trim() : "";
			map.set(id, name.length > 0 ? name : id);
		}
		return map;
	}, [staff]);

	const doctors = useMemo(() => {
		return staff.filter((m) => {
			const role = String(m.role ?? "");
			const active = m.active !== false;
			return active && isDoctorLikeRole(role);
		});
	}, [staff]);

	const [load, setLoad] = useState<LoadState>({ kind: "idle" });
	const [save, setSave] = useState<SaveState>({ kind: "idle" });
	const [editingUserId, setEditingUserId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");

	const rateByUserId = useMemo(() => {
		const map = new Map<string, CommissionRate>();
		if (load.kind !== "ready") return map;
		for (const rate of load.rates) {
			if (!map.has(rate.userId)) map.set(rate.userId, rate);
		}
		return map;
	}, [load]);

	const loadRates = useCallback(async () => {
		setLoad({ kind: "loading" });
		try {
			const response = await fetch("/api/settings/staff/commissions", {
				method: "GET",
				headers: denteAdminSecretRequestHeaders(
					undefined,
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(authRef.current as any)?.settingsAdminSecretSession,
				),
			});
			const payload = (await response.json().catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка ответа сервера",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as unknown;
			if (!response.ok) {
				const msg =
					serverMessageOf(payload) ??
					(response.status === 401 || response.status === 403
						? "Нет прав смотреть ставки врачей: войдите как администратор клиники."
						: `Ставки не загружены (ответ ${response.status}).`);
				setLoad({ kind: "failed", message: msg });
				return;
			}
			const body = payload as { commissions?: unknown };
			const list = Array.isArray(body.commissions) ? body.commissions : [];
			const rates: CommissionRate[] = [];
			for (const row of list) {
				if (!row || typeof row !== "object") continue;
				const r = row as Record<string, unknown>;
				const userId = typeof r.userId === "string" ? r.userId : "";
				const commissionPct =
					typeof r.commissionPct === "string"
						? r.commissionPct
						: typeof r.commissionPct === "number"
							? String(r.commissionPct)
							: "";
				if (!userId || !commissionPct) continue;
				const materialCostDeductionPct =
					typeof r.materialCostDeductionPct === "string"
						? r.materialCostDeductionPct
						: typeof r.materialCostDeductionPct === "number"
							? String(r.materialCostDeductionPct)
							: "0";
				const effectiveFrom =
					typeof r.effectiveFrom === "string" ? r.effectiveFrom : "";
				rates.push({
					userId,
					commissionPct,
					materialCostDeductionPct,
					effectiveFrom,
				});
			}
			setLoad({ kind: "ready", rates });
		} catch {
			setLoad({
				kind: "failed",
				message: "Ставки не загружены: нет связи с программой клиники.",
			});
		}
	}, []);

	useEffect(() => {
		void loadRates();
	}, [loadRates]);

	const beginEdit = (userId: string, currentPct: string | null) => {
		setEditingUserId(userId);
		setDraft(currentPct ?? "");
		setSave({ kind: "idle" });
	};

	const cancelEdit = () => {
		setEditingUserId(null);
		setDraft("");
		setSave({ kind: "idle" });
	};

	const saveRate = async (userId: string) => {
		const pct = parseCommissionInput(draft);
		if (pct === null) {
			setSave({
				kind: "failed",
				message:
					"Процент от кассы указывается числом от 0 до 100. Ставка не сохранена.",
			});
			return;
		}
		const name = staffNameById.get(userId) ?? "врача";
		setSave({ kind: "saving", userId });
		try {
			const response = await fetch(`/api/settings/staff/${userId}/commission`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders(
					{
						"Content-Type": "application/json",
					},
					authRef.current?.settingsAdminSecretSession,
				),
				body: JSON.stringify({ commissionPct: pct }),
			});
			const payload = (await response.json().catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка ответа сервера",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as unknown;
			if (!response.ok) {
				const msg =
					serverMessageOf(payload) ??
					actionFailureToast(`Ставка «${name}» не сохранена`, response.status);
				setSave({ kind: "failed", message: msg });
				showToast(msg, "error");
				return;
			}
			showToast(`Ставка «${name}»: ${percentLabel(pct)}`, "success");
			setEditingUserId(null);
			setDraft("");
			setSave({ kind: "idle" });
			await loadRates();
		} catch {
			const msg = actionFailureToast(`Ставка «${name}» не сохранена`, null);
			setSave({ kind: "failed", message: msg });
			showToast(msg, "error");
		}
	};

	const rows = useMemo(() => {
		const seen = new Set<string>();
		const result: Array<{
			userId: string;
			name: string;
			rate: CommissionRate | null;
		}> = [];
		for (const d of doctors) {
			const id = typeof d.id === "string" ? d.id : "";
			if (!id || seen.has(id)) continue;
			seen.add(id);
			result.push({
				userId: id,
				name: staffNameById.get(id) ?? id,
				rate: rateByUserId.get(id) ?? null,
			});
		}
		if (load.kind === "ready") {
			for (const rate of load.rates) {
				if (seen.has(rate.userId)) continue;
				seen.add(rate.userId);
				result.push({
					userId: rate.userId,
					name: staffNameById.get(rate.userId) ?? rate.userId,
					rate,
				});
			}
		}
		result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
		return result;
	}, [doctors, load, rateByUserId, staffNameById]);

	const withoutRate = rows.filter((r) => r.rate === null).length;

	return (
		<article
			className="settings-card col-span-full"
			aria-label="Ставки врачей"
			data-testid="staff-commissions-panel"
		>
			<div
				className="settings-card-header"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: "0.75rem",
					flexWrap: "wrap",
				}}
			>
				<div>
					<h4 className="m-0">Ставки врачей (% от кассы)</h4>
					<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
						Процент, по которому клиника платит врачу за лечение. Ноль допустим
						(оклад). Действующие значения из таблицы ставок, не из отчёта за
						месяц.
					</p>
				</div>
				<button
					type="button"
					className="secondary-button text-xs"
					onClick={() => void loadRates()}
					disabled={load.kind === "loading"}
					data-testid="staff-commissions-refresh"
				>
					{load.kind === "loading" ? "Загрузка…" : "Обновить"}
				</button>
			</div>

			<div className="settings-card-body">
				{load.kind === "failed" ? (
					<p
						className="text-sm text-rose-700 dark:text-rose-300 m-0"
						role="alert"
						data-testid="staff-commissions-error"
					>
						{load.message}
					</p>
				) : null}

				{load.kind === "loading" && rows.length === 0 ? (
					<p
						className="text-sm text-slate-500 m-0"
						data-testid="staff-commissions-loading"
					>
						Загружаем ставки…
					</p>
				) : null}

				{load.kind === "ready" && rows.length === 0 ? (
					<p
						className="text-sm text-slate-500 m-0"
						data-testid="staff-commissions-empty"
					>
						Врачей в штате пока нет. Добавьте сотрудника с ролью «Врач» — здесь
						появится строка для назначения процента.
					</p>
				) : null}

				{rows.length > 0 ? (
					<>
						{withoutRate > 0 ? (
							<p
								className="text-xs text-amber-700 dark:text-amber-300 m-0 mb-3"
								role="status"
							>
								Без ставки: {withoutRate}. Пока процент не задан, отчёт выплат
								не включает этого врача в итог к выплате.
							</p>
						) : null}
						<div className="overflow-x-auto">
							<table
								className="w-full text-sm"
								data-testid="staff-commissions-table"
							>
								<thead>
									<tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
										<th scope="col" className="py-2 pr-3 font-medium">
											Врач
										</th>
										<th scope="col" className="py-2 pr-3 font-medium">
											Ставка
										</th>
										<th scope="col" className="py-2 pr-3 font-medium">
											С
										</th>
										<th scope="col" className="py-2 font-medium">
											Действие
										</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => {
										const isEditing = editingUserId === row.userId;
										const isSaving =
											save.kind === "saving" && save.userId === row.userId;
										return (
											<tr
												key={row.userId}
												className="border-b border-slate-100 dark:border-slate-800/80"
												data-testid={`staff-commission-row-${row.userId}`}
											>
												<td className="py-2 pr-3 font-medium text-slate-900 dark:text-white">
													{row.name}
												</td>
												<td className="py-2 pr-3">
													{isEditing ? (
														<input
															type="text"
															inputMode="decimal"
															value={draft}
															onChange={(e) => setDraft(e.target.value)}
															placeholder="0–100"
															aria-label={`Ставка для ${row.name}`}
															className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
															data-testid={`staff-commission-draft-${row.userId}`}
														/>
													) : row.rate ? (
														<span
															data-testid={`staff-commission-pct-${row.userId}`}
														>
															{percentLabel(row.rate.commissionPct)}
														</span>
													) : (
														<span
															className="text-slate-400"
															data-testid={`staff-commission-pct-${row.userId}`}
														>
															не задана
														</span>
													)}
												</td>
												<td className="py-2 pr-3 text-xs text-slate-500">
													{row.rate?.effectiveFrom
														? formatEffectiveFrom(row.rate.effectiveFrom)
														: "—"}
												</td>
												<td className="py-2">
													{isEditing ? (
														<div className="flex flex-wrap gap-2">
															<button
																type="button"
																className="primary-button px-3 py-1 text-xs"
																disabled={isSaving}
																onClick={() => void saveRate(row.userId)}
																data-testid={`staff-commission-save-${row.userId}`}
															>
																{isSaving ? "…" : "Сохранить"}
															</button>
															<button
																type="button"
																className="secondary-button px-3 py-1 text-xs"
																disabled={isSaving}
																onClick={cancelEdit}
															>
																Отмена
															</button>
														</div>
													) : (
														<button
															type="button"
															className="secondary-button px-3 py-1 text-xs"
															onClick={() =>
																beginEdit(
																	row.userId,
																	row.rate ? row.rate.commissionPct : null,
																)
															}
															data-testid={`staff-commission-edit-${row.userId}`}
														>
															{row.rate ? "Изменить" : "Задать ставку"}
														</button>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</>
				) : null}

				{save.kind === "failed" ? (
					<p
						className="text-sm text-rose-700 dark:text-rose-300 m-0 mt-3"
						role="alert"
					>
						{save.message}
					</p>
				) : null}
			</div>
		</article>
	);
};

export default StaffCommissionsPanel;
