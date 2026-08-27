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
 * Интегрирован симулятор и калькулятор сдельной мотивации врача строго в целых копейках
 * (% от терапевтического/ортопедического приёма минус ЗТЛ и расходные материалы).
 */

import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";
import { Calculator, Check, ChevronDown, ChevronUp, Coins, Percent, RefreshCw, X } from "lucide-react";
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
	return role === "doctor" || role === "owner" || role === "head_doctor";
}

export const StaffCommissionsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
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

	// Интерактивный калькулятор сдельной оплаты (Live Simulator)
	const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
	const [simTherapyRub, setSimTherapyRub] = useState("350000");
	const [simTherapyRate, setSimTherapyRate] = useState("25");
	const [simOrthoRub, setSimOrthoRub] = useState("450000");
	const [simOrthoRate, setSimOrthoRate] = useState("20");
	const [simLabCostRub, setSimLabCostRub] = useState("120000");
	const [simLabDeductionPct, setSimLabDeductionPct] = useState("100");
	const [simMaterialCostRub, setSimMaterialCostRub] = useState("30000");
	const [simMaterialDeductionPct, setSimMaterialDeductionPct] = useState("0");
	const [simBaseShiftRub, setSimBaseShiftRub] = useState("0");

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

	// Расчет симулятора сдельной оплаты в копейках
	const simCalculation = useMemo(() => {
		try {
			return calculateDoctorPieceRatePayout({
				therapyRevenueKopecks: parseRublesToKopecks(simTherapyRub),
				therapyRatePct: Number(simTherapyRate) || 0,
				orthopedicsRevenueKopecks: parseRublesToKopecks(simOrthoRub),
				orthopedicsRatePct: Number(simOrthoRate) || 0,
				surgeryRevenueKopecks: 0,
				surgeryRatePct: 0,
				hygieneRevenueKopecks: 0,
				hygieneRatePct: 0,
				labOrdersCostKopecks: parseRublesToKopecks(simLabCostRub),
				labDeductionPct: Number(simLabDeductionPct) || 0,
				materialCostKopecks: parseRublesToKopecks(simMaterialCostRub),
				materialDeductionPct: Number(simMaterialDeductionPct) || 0,
				baseShiftSalaryKopecks: parseRublesToKopecks(simBaseShiftRub),
			});
		} catch {
			return null;
		}
	}, [
		simTherapyRub,
		simTherapyRate,
		simOrthoRub,
		simOrthoRate,
		simLabCostRub,
		simLabDeductionPct,
		simMaterialCostRub,
		simMaterialDeductionPct,
		simBaseShiftRub,
	]);

	return (
		<article
			className="settings-card col-span-full flex flex-col gap-4"
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
					<h4 className="m-0 flex items-center gap-2">
						<Percent size={16} className="text-[var(--teal)]" />
						Ставки врачей и сдельная мотивация (% от кассы)
					</h4>
					<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
						Процент, по которому клиника начисляет зарплату врачам от приёма.
						Расчёт ведётся строго в целых копейках с учётом списания ЗТЛ и материалов.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						className="secondary-button text-xs flex items-center gap-1.5"
						onClick={() => setIsSimulatorOpen((v) => !v)}
						data-testid="toggle-piece-rate-simulator"
					>
						<Calculator size={13} />
						{isSimulatorOpen ? "Скрыть калькулятор" : "Калькулятор сделки"}
					</button>

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
			</div>

			{/* Интерактивный калькулятор сдельной оплаты (Simulator) */}
			{isSimulatorOpen && (
				<div
					className="p-4 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 flex flex-col gap-3 transition-all"
					data-testid="piece-rate-simulator-panel"
				>
					<div className="flex items-center justify-between">
						<h5 className="m-0 text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
							<Coins size={15} />
							Симулятор сдельной оплаты врача (Расчёт в целых копейках)
						</h5>
						<span className="text-[11px] text-teal-700 dark:text-teal-300 font-mono">
							Zero Float · Penny-Exact
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Терапия: выручка (₽)
							</label>
							<input
								type="text"
								value={simTherapyRub}
								onChange={(e) => setSimTherapyRub(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="350000"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Ставка терапия (%)
							</label>
							<input
								type="text"
								value={simTherapyRate}
								onChange={(e) => setSimTherapyRate(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="25"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Ортопедия (₽)
							</label>
							<input
								type="text"
								value={simOrthoRub}
								onChange={(e) => setSimOrthoRub(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="450000"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Ставка ортопедия (%)
							</label>
							<input
								type="text"
								value={simOrthoRate}
								onChange={(e) => setSimOrthoRate(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="20"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								ЗТЛ лаборатория (₽)
							</label>
							<input
								type="text"
								value={simLabCostRub}
								onChange={(e) => setSimLabCostRub(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="120000"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Удержание ЗТЛ (%)
							</label>
							<input
								type="text"
								value={simLabDeductionPct}
								onChange={(e) => setSimLabDeductionPct(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="100"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Расходные материалы (₽)
							</label>
							<input
								type="text"
								value={simMaterialCostRub}
								onChange={(e) => setSimMaterialCostRub(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="30000"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
								Оклад за смены (₽)
							</label>
							<input
								type="text"
								value={simBaseShiftRub}
								onChange={(e) => setSimBaseShiftRub(e.target.value)}
								className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs h-8"
								placeholder="0"
							/>
						</div>
					</div>

					{simCalculation && (
						<div className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between flex-wrap gap-3">
							<div className="flex items-center gap-4 flex-wrap text-xs">
								<div>
									<span className="text-slate-500 block">Выручка клиники:</span>
									<strong className="text-slate-900 dark:text-white">
										{formatKopecksToRublesDisplay(simCalculation.totalRevenueKopecks)}
									</strong>
								</div>
								<div>
									<span className="text-slate-500 block">Начислено (%):</span>
									<strong className="text-emerald-600 dark:text-emerald-400">
										{formatKopecksToRublesDisplay(simCalculation.grossAccruedCommissionKopecks)}
									</strong>
								</div>
								<div>
									<span className="text-slate-500 block">Удержано (ЗТЛ):</span>
									<strong className="text-rose-600 dark:text-rose-400">
										−{formatKopecksToRublesDisplay(simCalculation.withheldLabKopecks)}
									</strong>
								</div>
							</div>

							<div className="text-right">
								<span className="text-xs text-slate-500 block">Итого к выплате врачу:</span>
								<span
									className="text-base font-bold text-teal-700 dark:text-teal-300"
									data-testid="sim-net-payout"
								>
									{formatKopecksToRublesDisplay(simCalculation.netPayoutKopecks)}
								</span>
							</div>
						</div>
					)}
				</div>
			)}

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
										<th scope="col" className="py-2.5 pr-3 font-semibold">
											Врач-клиницист
										</th>
										<th scope="col" className="py-2.5 pr-3 font-semibold">
											Ставка (% от кассы)
										</th>
										<th scope="col" className="py-2.5 pr-3 font-semibold">
											Действует с
										</th>
										<th scope="col" className="py-2.5 font-semibold text-right">
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
