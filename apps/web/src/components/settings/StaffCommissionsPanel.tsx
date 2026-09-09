/**
 * Действующие ставки врачей и калькулятор сдельной оплаты (GET /api/settings/staff/commissions).
 *
 * БЫЛО: маршрут отдавал список `{ userId, commissionPct, materialCostDeductionPct,
 * effectiveFrom }` из `doctor_commissions`, а PUT
 * `/api/settings/staff/:staffId/commission` уже жил в DoctorPayoutDashboard —
 * но zero web callers на GET.
 *
 * ТЕПЕРЬ: самодостаточная панель на Settings → Персонал. Грузит GET list,
 * сопоставляет userId с ФИО из дашборда, даёт задать/изменить процент через
 * тот же PUT и `auth.settingsAccessHeaders`, что и остальные вкладки настроек.
 *
 * Мандат 8k, 8i, 8d: Упразднен процедурный симулятор сделки. Фактический расчет
 * начислений врачей ведется в реальном модуле выплат (DoctorPayoutDashboard).
 */

import { Percent } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
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
	return role === "doctor" || role === "owner" || role === "head_doctor";
}

export interface StaffCommissionsPanelProps {
	readonly isModalView?: boolean;
}

export const StaffCommissionsPanel: React.FC<StaffCommissionsPanelProps> = ({
	isModalView = false,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

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
			className={
				isModalView
					? "col-span-full flex flex-col gap-3 min-w-0"
					: "settings-card col-span-full flex flex-col gap-4 min-w-0"
			}
			aria-label="Ставки врачей"
			data-testid="staff-commissions-panel"
		>
			<div
				className={
					isModalView
						? "flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-800"
						: "settings-card-header flex items-center justify-between gap-3 flex-wrap"
				}
			>
				{!isModalView ? (
					<div>
						<h4 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
							<Percent size={16} className="text-[var(--teal)]" />
							Ставки врачей и сдельная мотивация (% от кассы)
						</h4>
						<p className="text-xs text-slate-600 dark:text-slate-400 m-0 mt-1">
							Процент, по которому клиника начисляет зарплату врачам от приёма.
							Фактический расчёт с учётом ЗТЛ и материалов ведётся в разделе выплат врачам.
						</p>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
							Врачей в штате: <strong>{doctors.length}</strong>
						</span>
					</div>
				)}

				<div className="flex items-center gap-2 ml-auto">
					<button
						type="button"
						className="secondary-button text-xs min-h-[36px]"
						onClick={() => void loadRates()}
						disabled={load.kind === "loading"}
						data-testid="staff-commissions-refresh"
					>
						{load.kind === "loading" ? "Загрузка…" : "Обновить"}
					</button>
				</div>
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
							<div
								className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 m-0 mb-3"
								role="status"
							>
								<span>Без ставки: <strong>{withoutRate}</strong>. Пока процент не задан, отчёт выплат не включает этого врача в итог к выплате.</span>
							</div>
						) : null}
						{/* Десктопная таблица (>= 640px) */}
						<div className="hidden sm:block overflow-x-auto">
							<table
								className="w-full text-sm"
								data-testid="staff-commissions-table"
							>
								<thead>
									<tr className="text-left text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50/50 dark:bg-slate-800/50">
										<th scope="col" className="py-2.5 px-3 font-bold">
											Врач-клиницист
										</th>
										<th scope="col" className="py-2.5 px-3 font-bold">
											Ставка (% от кассы)
										</th>
										<th scope="col" className="py-2.5 px-3 font-bold">
											Действует с
										</th>
										<th scope="col" className="py-2.5 px-3 font-bold text-right">
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
												className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
												data-testid={`staff-commission-row-${row.userId}`}
											>
												<td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">
													{row.name}
												</td>
												<td className="py-2.5 pr-3">
													{isEditing ? (
														<input
															type="text"
															inputMode="decimal"
															value={draft}
															onChange={(e) => setDraft(e.target.value)}
															placeholder="0–100"
															aria-label={`Ставка для ${row.name}`}
															className="w-24 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
															data-testid={`staff-commission-draft-${row.userId}`}
														/>
													) : row.rate ? (
														<span
															className="font-semibold text-slate-900 dark:text-white"
															data-testid={`staff-commission-pct-${row.userId}`}
														>
															{percentLabel(row.rate.commissionPct)}
														</span>
													) : (
														<span
															className="text-slate-400 text-xs"
															data-testid={`staff-commission-pct-${row.userId}`}
														>
															не задана
														</span>
													)}
												</td>
												<td className="py-2.5 pr-3 text-xs text-slate-500">
													{row.rate?.effectiveFrom
														? formatEffectiveFrom(row.rate.effectiveFrom)
														: "—"}
												</td>
												<td className="py-2.5 text-right">
													{isEditing ? (
														<div className="flex items-center justify-end gap-2">
															<button
																type="button"
																className="primary-button px-3 py-1 text-xs min-h-[36px]"
																disabled={isSaving}
																onClick={() => void saveRate(row.userId)}
																data-testid={`staff-commission-save-${row.userId}`}
															>
																{isSaving ? "…" : "Сохранить"}
															</button>
															<button
																type="button"
																className="secondary-button px-3 py-1 text-xs min-h-[36px]"
																disabled={isSaving}
																onClick={cancelEdit}
															>
																Отмена
															</button>
														</div>
													) : (
														<button
															type="button"
															className="secondary-button px-3 py-1 text-xs min-h-[36px]"
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

						{/* Мобильные карточки и аккордеоны (< 640px) */}
						<div className="flex flex-col gap-2.5 sm:hidden" data-testid="staff-commissions-mobile-cards">
							{rows.map((row) => {
								const isEditing = editingUserId === row.userId;
								const isSaving = save.kind === "saving" && save.userId === row.userId;
								return (
									<div
										key={`mobile-comm-${row.userId}`}
										className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 shadow-2xs"
										data-testid={`staff-commission-mobile-card-${row.userId}`}
									>
										<div className="flex items-center justify-between gap-2">
											<div className="min-w-0">
												<span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
													{row.name}
												</span>
												<span className="text-[11px] text-slate-500 block mt-0.5">
													Действует с: {row.rate?.effectiveFrom ? formatEffectiveFrom(row.rate.effectiveFrom) : "—"}
												</span>
											</div>
											<div className="shrink-0">
												{row.rate ? (
													<span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
														{percentLabel(row.rate.commissionPct)}
													</span>
												) : (
													<span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
														не задана
													</span>
												)}
											</div>
										</div>

										{isEditing ? (
											<div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
												<div className="flex items-center gap-2">
													<label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
														Ставка (%):
													</label>
													<input
														type="text"
														inputMode="decimal"
														value={draft}
														onChange={(e) => setDraft(e.target.value)}
														placeholder="0–100"
														aria-label={`Ставка для ${row.name}`}
														className="flex-1 min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
													/>
												</div>
												<div className="flex items-center gap-2">
													<button
														type="button"
														className="flex-1 primary-button min-h-[44px] text-xs font-bold inline-flex items-center justify-center gap-1.5"
														disabled={isSaving}
														onClick={() => void saveRate(row.userId)}
													>
														{isSaving ? "Сохраняем…" : "Сохранить ставку"}
													</button>
													<button
														type="button"
														className="secondary-button min-h-[44px] px-4 text-xs font-medium"
														disabled={isSaving}
														onClick={cancelEdit}
													>
														Отмена
													</button>
												</div>
											</div>
										) : (
											<div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
												<button
													type="button"
													className="secondary-button min-h-[44px] w-full text-xs font-semibold justify-center"
													onClick={() =>
														beginEdit(
															row.userId,
															row.rate ? row.rate.commissionPct : null,
														)
													}
												>
													{row.rate ? "Изменить ставку врача" : "Назначить ставку"}
												</button>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</>
				) : null}

				{save.kind === "failed" ? (
					<p
						className="text-sm text-rose-700 dark:text-rose-300 m-0 mt-3"
						role="alert"
						data-testid="staff-commissions-error"
					>
						{save.message}
					</p>
				) : null}
			</div>
		</article>
	);
};

export default StaffCommissionsPanel;
