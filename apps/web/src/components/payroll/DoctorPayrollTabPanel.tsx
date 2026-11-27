/**
 * DoctorPayrollTabPanel.tsx — Keyed Remount Tab Panel for Doctor Payroll Studio (SEV-3.2, Mandate 8b <= 200 lines).
 * Zero-Leak Draft: Keyed remount ensures each doctor gets fresh isolated advance & rate state.
 */

import React, { useState, useMemo } from "react";
import { Printer, Send, FileSpreadsheet } from "lucide-react";
import {
	type PayrollDoctorProfile,
	type DoctorPayrollSummary,
	type PayrollServiceOrder,
	calculateDoctorPayrollSummary,
} from "./payrollCatalogData";
import { generateUuidV7, rublesToKopecks, type CashAdvanceAllocationPolicy, type IdentSalaryModel } from "@dental/shared";
import {
	printDoctorPayslip,
	copyPayslipToClipboard,
	exportDoctorPayrollToCsv,
	buildDoctorPayrollCalculation,
	calculateOrderNetAndFee,
} from "./doctorPayrollModalUtils";
import { PendingCashierOrdersSection } from "./PendingCashierOrdersSection";

export interface DoctorPayrollTabPanelProps {
	readonly doctor: PayrollDoctorProfile;
	readonly doctors: readonly PayrollDoctorProfile[];
	readonly onSelectDoctor: (doctorId: string) => void;
	readonly effectiveOrders: readonly PayrollServiceOrder[];
	readonly periodDates: { readonly startIso: string; readonly endIso: string; readonly labelRu: string };
	readonly clinicName: string;
	readonly isRkoPaid: boolean;
	readonly apiSummary?: DoctorPayrollSummary | null | undefined;
	readonly isDemo: boolean;
	readonly rub: (kop: number) => string;
	readonly allDoctorsSummaries: readonly { readonly doctor: PayrollDoctorProfile; readonly summary: DoctorPayrollSummary }[];
	readonly identSalaryModel?: IdentSalaryModel | undefined;
	readonly onChangeIdentSalaryModel?: ((model: IdentSalaryModel) => void) | undefined;
	readonly cashAdvancePolicy?: CashAdvanceAllocationPolicy | undefined;
	readonly onChangeCashAdvancePolicy?: ((policy: CashAdvanceAllocationPolicy) => void) | undefined;
	readonly onSummaryCalculated?: ((summary: DoctorPayrollSummary, advanceRub: number, customPercent: number | null) => void) | undefined;
}

export const DoctorPayrollTabPanel: React.FC<DoctorPayrollTabPanelProps> = ({
	doctor,
	doctors,
	onSelectDoctor,
	effectiveOrders,
	periodDates,
	clinicName,
	isRkoPaid,
	apiSummary,
	isDemo,
	rub,
	allDoctorsSummaries,
	identSalaryModel = "net_proportional_discount",
	onChangeIdentSalaryModel,
	cashAdvancePolicy = "proportional",
	onChangeCashAdvancePolicy,
	onSummaryCalculated,
}) => {
	const [shiftsCount, setShiftsCount] = useState<number>(0);
	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [customPercent, setCustomPercent] = useState<number | null>(null);
	const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

	const summary: DoctorPayrollSummary = useMemo(() => {
		if (
			apiSummary &&
			!isDemo &&
			customPercent === null &&
			advanceRub === 0 &&
			apiSummary.doctorId === doctor.id &&
			(!("identSalaryModel" in apiSummary) || (apiSummary as { identSalaryModel?: string }).identSalaryModel === identSalaryModel) &&
			(!("cashAdvancePolicy" in apiSummary) || (apiSummary as { cashAdvancePolicy?: string }).cashAdvancePolicy === cashAdvancePolicy)
		) {
			return { ...apiSummary, payoutStatus: isRkoPaid ? "paid_rko" : "accrued" };
		}
		return calculateDoctorPayrollSummary({
			orders: effectiveOrders,
			doctor,
			percent: customPercent ?? undefined,
			shiftsCount,
			advanceKop: rublesToKopecks(advanceRub),
			isRkoPaid,
			identSalaryModel,
			cashAdvancePolicy,
		});
	}, [doctor, effectiveOrders, customPercent, shiftsCount, advanceRub, isRkoPaid, apiSummary, isDemo, identSalaryModel, cashAdvancePolicy]);

	React.useEffect(() => {
		onSummaryCalculated?.(summary, advanceRub, customPercent);
	}, [summary, advanceRub, customPercent, onSummaryCalculated]);

	const doctorOrders = useMemo(
		() => effectiveOrders.filter((o) => o.doctorId === doctor.id && o.isPaid54Fz),
		[doctor.id, effectiveOrders],
	);

	const pendingPaymentOrders = useMemo(
		() => effectiveOrders.filter((o) => o.doctorId === doctor.id && !o.isPaid54Fz),
		[doctor.id, effectiveOrders],
	);

	const calcCompat = useMemo(
		() => buildDoctorPayrollCalculation(summary, doctor, periodDates, customPercent),
		[summary, doctor, periodDates, customPercent],
	);

	const handlePayAdvance = async () => {
		const advanceIncrement = 5000;
		setFeedbackMsg("Оформление аванса в кассе клиники...");
		if (!isDemo) {
			try {
				const idempotencyKey = generateUuidV7();
				const res = await fetch("/api/expenses", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
						"X-Idempotency-Key": idempotencyKey,
					},
					body: JSON.stringify({
						category: "salaries",
						amountKopecks: rublesToKopecks(advanceIncrement),
						expenseDate: new Date().toISOString().slice(0, 10),
						description: `Аванс врачу: ${doctor.name}`,
						paymentMethod: "cash",
					}),
				});
				if (!res.ok) throw new Error("Касса отклонила операцию");
				setAdvanceRub((v) => v + advanceIncrement);
				setFeedbackMsg("Аванс +5 000 ₽ выдан врачу по РКО");
			} catch (err: unknown) {
				setFeedbackMsg(`Ошибка: ${err instanceof Error ? err.message : "Касса отклонила операцию"}. Аванс не выдан.`);
			}
		} else {
			setAdvanceRub((v) => v + advanceIncrement);
			setFeedbackMsg("Аванс +5 000 ₽ начислен врачу (демо-режим)");
		}
		setTimeout(() => setFeedbackMsg(null), 4000);
	};

	const handleSendMessenger = () => {
		if (copyPayslipToClipboard(calcCompat, doctor, clinicName)) {
			setFeedbackMsg("Расчетный листок скопирован для мессенджера");
			setTimeout(() => setFeedbackMsg(null), 3500);
		}
	};

	const handleExportExcel = () => {
		exportDoctorPayrollToCsv(allDoctorsSummaries, periodDates);
		setFeedbackMsg("Экспорт в Excel (CSV) завершен");
		setTimeout(() => setFeedbackMsg(null), 3500);
	};

	return (
		<div className="flex flex-col gap-4">
			{feedbackMsg && (
				<div className="p-2.5 rounded-xl border text-xs font-semibold bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)]">
					{feedbackMsg}
				</div>
			)}

			{doctors.length === 0 ? (
				<div className="text-xs text-[var(--muted)] py-1">Врачи не зарегистрированы</div>
			) : (
				<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
					{doctors.map((doc) => {
						const isSelected = doc.id === doctor.id;
						return (
							<button
								key={doc.id}
								type="button"
								onClick={() => onSelectDoctor(doc.id)}
								className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${isSelected ? "bg-[var(--primary)] text-white shadow-xs" : "bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)]"}`}
							>
								<span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-[10px]">{doc.initials}</span>
								<span>{doc.name}</span>
								<span className="text-[10px] opacity-80">({doc.payoutModel === "chair_rental" ? "Аренда" : `${doc.commissionPercent}%`})</span>
							</button>
						);
					})}
				</div>
			)}

			<div className="payroll-studio-kpi-grid">
				<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Выручка услуг</span><span className="payroll-studio-kpi-value">{rub(summary.totalGrossKopecks)}</span></div>
				<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">ЗТЛ (Лаборатория)</span><span className="payroll-studio-kpi-value text-[var(--danger)]">− {rub(summary.totalLabCostKopecks)}</span></div>
				<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Расходные материалы</span><span className="payroll-studio-kpi-value text-[var(--warning)]">− {rub(summary.totalMaterialCostKopecks)}</span></div>
				<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Чистая база (Net Base)</span><span className="payroll-studio-kpi-value">{rub(summary.totalNetBaseKopecks)}</span></div>
			</div>

			<div className="payroll-studio-hero">
				<div>
					<div className="text-xs font-bold text-[var(--primary)]">Начислено врачу по ставке</div>
					<div className="payroll-studio-hero-accrued mt-0.5">{rub(summary.doctorAccruedKopecks)}</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">
						{doctor.payoutModel === "chair_rental" ? "Модель: Аренда кресла" : `Сдельный процент: ${customPercent ?? doctor.commissionPercent}% от чистой базы`}
						{summary.minimumGuaranteeApplied && " • Минимальный гарантированный оклад"}
						{(summary.serviceSalaryPriceKopecks ?? 0) > 0 && ` • База по цене ЗП: ${rub(summary.serviceSalaryPriceKopecks ?? 0)}`}
					</div>
					{((summary.negativeCarryOverKopecks ?? 0) > 0 || (summary.priorDebtDeductedKopecks ?? 0) > 0) && (
						<div className="text-[11px] font-medium text-[var(--danger)] mt-1">
							{(summary.priorDebtDeductedKopecks ?? 0) > 0 && `Удержан долг прошлых периодов: −${rub(summary.priorDebtDeductedKopecks ?? 0)}`}
							{(summary.negativeCarryOverKopecks ?? 0) > 0 && ` • Перенос долга на следующий период: ${rub(summary.negativeCarryOverKopecks ?? 0)}`}
						</div>
					)}
				</div>
				<div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--line)]">
					<div className="text-xs text-[var(--muted)]">К выплате на руки (с учетом аванса и аренды):</div>
					<div className="text-xl sm:text-2xl font-black text-[var(--ink)] mt-0.5">{rub(summary.payoutKopecks)}</div>
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2.5 text-xs">
				<div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="font-semibold text-[var(--ink)]">База начисления:</span>
						<div className="p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] inline-flex items-center gap-1">
							{([
								{ id: "gross_before_discount", label: "От прайса" },
								{ id: "net_proportional_discount", label: "Пропорционально скидке" },
								{ id: "net_doctor_bears_discount", label: "Скидка с врача" },
							] as const).map((m) => (
								<button key={m.id} type="button" onClick={() => onChangeIdentSalaryModel?.(m.id)} className={`h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${identSalaryModel === m.id ? "bg-[var(--primary)] text-white shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{m.label}</button>
							))}
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="font-semibold text-[var(--ink)]">Частичная оплата:</span>
						<div className="p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] inline-flex items-center gap-1">
							{([
								{ id: "clinic_first", label: "Сначала клиника" },
								{ id: "doctor_first", label: "Сначала врач" },
								{ id: "proportional", label: "Пропорционально" },
							] as const).map((p) => (
								<button key={p.id} type="button" onClick={() => onChangeCashAdvancePolicy?.(p.id)} className={`h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${cashAdvancePolicy === p.id ? "bg-[var(--primary)] text-white shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{p.label}</button>
							))}
						</div>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-3">
						{doctor.payoutModel === "chair_rental" ? (
							<div className="flex items-center gap-2">
								<span className="font-semibold text-[var(--ink)]">Аренда кресла:</span>
								<span className="text-[var(--muted)] font-mono tracking-tight tabular-nums">{shiftsCount} смен × {rub(doctor.defaultShiftRateKop)} = {rub(summary.chairRentalKopecks)}</span>
								<button type="button" onClick={() => setShiftsCount((s) => Math.max(0, s - 1))} className="min-h-[36px] min-w-[36px] h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold flex items-center justify-center hover:bg-[var(--paper-soft)] cursor-pointer" title="Уменьшить количество смен">-</button>
								<span className="font-bold px-1">{shiftsCount}</span>
								<button type="button" onClick={() => setShiftsCount((s) => s + 1)} className="min-h-[36px] min-w-[36px] h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold flex items-center justify-center hover:bg-[var(--paper-soft)] cursor-pointer" title="Увеличить количество смен">+</button>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<span className="font-semibold text-[var(--ink)]">Ставка врача:</span>
								{[20, 25, 30, 35, 40].map((pct) => (
									<button key={pct} type="button" onClick={() => setCustomPercent(pct)} className={`px-2 py-1 rounded text-xs cursor-pointer ${(customPercent ?? doctor.commissionPercent ?? 25) === pct ? "bg-[var(--primary)] text-white font-bold" : "bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]"}`}>{pct}%</button>
								))}
							</div>
						)}
						<div className="flex items-center gap-1.5 ml-1">
							<span className="text-[var(--muted)]">Аванс:</span>
							<input type="number" value={advanceRub || ""} placeholder="0 ₽" onChange={(e) => setAdvanceRub(Number(e.target.value) || 0)} className="w-20 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]" />
							<button type="button" onClick={handlePayAdvance} className="min-h-[30px] px-2.5 py-1 rounded border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer" title="Выплатить аванс">Выплатить аванс</button>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button type="button" onClick={handleExportExcel} className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer" title="Экспорт ведомости в Excel"><FileSpreadsheet className="w-3.5 h-3.5" /><span>В Excel</span></button>
						<button type="button" onClick={() => printDoctorPayslip(calcCompat, doctor, clinicName)} className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer" title="Распечатать расчетный листок (А5)"><Printer className="w-3.5 h-3.5" /><span>Листок А5</span></button>
						<button type="button" onClick={handleSendMessenger} className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer" title="Отправить расчет в мессенджер"><Send className="w-3.5 h-3.5" /><span>В мессенджер</span></button>
					</div>
				</div>
			</div>

			<div className="hidden sm:block payroll-studio-table-container">
				<table className="payroll-studio-table">
					<thead>
						<tr><th>Наряд / Дата</th><th>Пациент</th><th>Услуга</th><th className="text-right">Кассовый чек</th><th className="text-right">Цена для ЗП</th><th className="text-right">ЗТЛ</th><th className="text-right">Материалы</th><th className="text-right">Чистая база</th><th className="text-right">Врачу</th></tr>
					</thead>
					<tbody>
						{doctorOrders.length === 0 ? (
							<tr><td colSpan={9} className="py-6 text-center text-[var(--muted)]">Нет закрытых нарядов за выбранный период</td></tr>
						) : (
							doctorOrders.map((ord) => {
								const { netBase, fee } = calculateOrderNetAndFee(ord, doctor, customPercent);
								return (
									<tr key={ord.id}>
										<td className="font-mono font-medium"><div>{ord.orderNumber}</div><div className="text-[10px] text-[var(--muted)]">{ord.dateIso}</div></td>
										<td className="font-medium"><div>{ord.patientName}</div><div className="text-[10px] text-[var(--muted)]">Карта: {ord.medicalCardNumber}</div></td>
										<td><div className="truncate max-w-[200px]">{ord.serviceNameRu}</div><span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] text-[var(--muted)]">{ord.categoryLabelRu}</span></td>
										<td className="text-right font-semibold">{rub(ord.grossKopecks)}</td>
										<td className="text-right font-mono text-[var(--ink-muted)]">{ord.salaryPriceKopecks !== undefined ? rub(ord.salaryPriceKopecks) : "—"}</td>
										<td className="text-right text-[var(--danger)]">{ord.labCostKopecks > 0 ? `− ${rub(ord.labCostKopecks)}` : "—"}</td>
										<td className="text-right text-[var(--warning)]">{ord.materialCostKopecks > 0 ? `− ${rub(ord.materialCostKopecks)}` : "—"}</td><td className="text-right font-medium">{rub(netBase)}</td>
										<td className="text-right font-bold text-[var(--primary)]">{rub(fee)}</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div className="sm:hidden flex flex-col gap-2">
				{doctorOrders.length === 0 ? (
					<div className="py-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">Нет закрытых нарядов за выбранный период</div>
				) : (
					doctorOrders.map((ord) => {
						const { netBase, fee } = calculateOrderNetAndFee(ord, doctor, customPercent);
						return (
							<div key={ord.id} className="payroll-studio-mobile-card">
								<div className="payroll-studio-mobile-card-row"><div><div className="font-bold text-xs text-[var(--ink)]">{ord.patientName}</div><div className="text-[11px] text-[var(--muted)]">{ord.serviceNameRu}</div></div><span className="font-bold text-xs text-[var(--primary)]">{rub(fee)}</span></div>
								<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]"><span>Чек: {rub(ord.grossKopecks)}</span><span>{ord.labCostKopecks > 0 ? `ЗТЛ: −${rub(ord.labCostKopecks)}` : "Без ЗТЛ"}</span><span className="font-medium text-[var(--ink)]">База: {rub(netBase)}</span></div>
							</div>
						);
					})
				)}
			</div>

			{/* Выполненные приемы, ожидающие оплаты в кассе (54-ФЗ) */}
			<PendingCashierOrdersSection pendingOrders={pendingPaymentOrders} rub={rub} />
		</div>
	);
};

export default DoctorPayrollTabPanel;
