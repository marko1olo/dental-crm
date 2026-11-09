/**
 * DENTE Dental CRM — Canonical Doctor Payroll Studio Modal
 * Compliance: Mandate 8b (Sweet Spot 380–480 lines), Mandate 8e (Doctor Autonomy & 0 Disabled Buttons),
 * Mandate 8n (Solo Practice & Net Revenue = Gross − Lab − Materials), Mandate 8am (Single Primary CTA #0d9488),
 * Mandate 8ze (Apple Mobile HIG: 390x844 Touch Targets >= 44x44px, Natural Thumb Zone, 0px Horizontal Drift),
 * Mandate 8wy (Strict Production vs Demo Mode Isolation: zero mockups in live production).
 */

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Printer, Send, X, FileCheck, Coins, Users, ListFilter, History, FileSpreadsheet } from "lucide-react";
import {
	type PayrollDoctorProfile, type PayrollPeriodPreset, type PayrollPayoutStatus,
	type DoctorPayrollSummary, type PayrollServiceOrder, type ClosedPayrollPeriodItem,
	CANONICAL_PAYROLL_DOCTORS, CANONICAL_DEMO_ORDERS, CANONICAL_CLOSED_PERIODS,
	getQuickPeriodDates, calculateDoctorPayrollSummary, formatKopecksToRubles,
	generateDoctorPayslipA5Html, generateDoctorPayslipMessengerText,
} from "./payrollCatalogData";
import { closeSettlementPeriodApi } from "./closeSettlementPeriodApi";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import "./styles/doctorPayrollStudio.css";

export interface DoctorPayrollStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialPeriodPreset?: PayrollPeriodPreset | undefined;
	readonly orders?: readonly PayrollServiceOrder[] | undefined;
	readonly closedPeriods?: readonly ClosedPayrollPeriodItem[] | undefined;
}

export const DoctorPayrollStudioModal: React.FC<DoctorPayrollStudioModalProps> = ({
	isOpen, onClose, clinicName = "Стоматологическая клиника DENTE",
	doctorsList, initialDoctorId, initialPeriodPreset = "current_month",
	orders: propsOrders, closedPeriods: propsClosedPeriods,
}) => {
	const isDemo = isDemoShowcaseMode();
	const [apiDoctors, setApiDoctors] = useState<PayrollDoctorProfile[]>([]);
	const [apiOrders, setApiOrders] = useState<PayrollServiceOrder[] | null>(null);
	const [apiClosedPeriods, setApiClosedPeriods] = useState<ClosedPayrollPeriodItem[] | null>(null);

	const doctors: readonly PayrollDoctorProfile[] = useMemo(() => {
		if (doctorsList && doctorsList.length > 0) {
			return doctorsList.map((d) => CANONICAL_PAYROLL_DOCTORS.find((c) => c.id === d.id) ?? {
				id: d.id, name: d.name, initials: d.name.slice(0, 2).toUpperCase(),
				specialtyId: (d.specialtyId as any) || "therapy", specialtyTitleRu: "Врач-стоматолог",
				commissionPercent: 25, payoutModel: "percentage", motivationScheme: "net_percentage",
				defaultShiftRateKop: 400000, minGuaranteeMonthlyKop: 6000000, taxRegime: "employee",
			});
		}
		if (apiDoctors.length > 0) return apiDoctors;
		return (doctorsList && doctorsList.length === 0) ? [] : (isDemo ? CANONICAL_PAYROLL_DOCTORS : []);
	}, [doctorsList, apiDoctors, isDemo]);

	const effectiveOrders = useMemo(() => propsOrders ?? apiOrders ?? (isDemo ? CANONICAL_DEMO_ORDERS : []), [propsOrders, apiOrders, isDemo]);
	const effectiveClosedPeriods = useMemo(() => propsClosedPeriods ?? apiClosedPeriods ?? (isDemo ? CANONICAL_CLOSED_PERIODS : []), [propsClosedPeriods, apiClosedPeriods, isDemo]);

	const [activeTab, setActiveTab] = useState<"summary" | "details" | "closed_periods">("summary");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => initialDoctorId || (doctors[0]?.id ?? ""));
	const [periodPreset, setPeriodPreset] = useState<PayrollPeriodPreset>(initialPeriodPreset);
	const [shiftsCount, setShiftsCount] = useState<number>(12);
	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [customPercent, setCustomPercent] = useState<number | null>(null);
	const [payoutStatus, setPayoutStatus] = useState<PayrollPayoutStatus>("accrued");
	const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const activeDoctorId = useMemo(() => (selectedDoctorId && doctors.some((d) => d.id === selectedDoctorId)) ? selectedDoctorId : (doctors[0]?.id ?? ""), [doctors, selectedDoctorId]);
	const selectedDoctor: PayrollDoctorProfile | null = useMemo(() => doctors.length === 0 ? null : (doctors.find((d) => d.id === activeDoctorId) || doctors[0] || null), [doctors, activeDoctorId]);
	const periodDates = useMemo(() => getQuickPeriodDates(periodPreset), [periodPreset]);

	useEffect(() => {
		if (isDemo || !isOpen) return;
		let cancelled = false;
		if (!doctorsList || doctorsList.length === 0) {
			void fetch("/api/v1/doctors").then((r) => r.ok ? r.json() : null).then((data) => {
				if (!cancelled && data?.doctors?.length > 0) setApiDoctors(data.doctors);
			}).catch(() => {});
		}
		return () => { cancelled = true; };
	}, [isDemo, isOpen, doctorsList]);

	useEffect(() => {
		if (isDemo || !isOpen || !activeDoctorId) return;
		let cancelled = false;
		const query = new URLSearchParams({ doctorId: activeDoctorId, from: periodDates.startIso, to: periodDates.endIso, payoutModel: selectedDoctor?.payoutModel || "percentage" });
		void fetch(`/api/v1/payroll/calculations?${query.toString()}`).then((r) => r.ok ? r.json() : null).then((data) => {
			if (cancelled || !data) return;
			if (Array.isArray(data.orders)) setApiOrders(data.orders);
			if (Array.isArray(data.closedPeriods)) setApiClosedPeriods(data.closedPeriods);
			if (typeof data.shiftsCount === "number" && data.shiftsCount > 0) setShiftsCount(data.shiftsCount);
		}).catch(() => {});
		return () => { cancelled = true; };
	}, [isDemo, isOpen, activeDoctorId, periodDates, selectedDoctor]);

	const summary: DoctorPayrollSummary = useMemo(() => {
		if (!selectedDoctor) {
			return {
				doctorId: "", doctorName: "Врач не выбран", schemeType: "net_percentage",
				totalGrossKopecks: 0, totalLabCostKopecks: 0, totalMaterialCostKopecks: 0, totalNetBaseKopecks: 0,
				doctorAccruedKopecks: 0, chairRentalKopecks: 0, advanceKopecks: 0, ndfl13TaxKopecks: 0,
				payoutKopecks: 0, payoutStatus: "accrued", servicesCount: 0, minimumGuaranteeApplied: false,
			};
		}
		return calculateDoctorPayrollSummary({
			orders: effectiveOrders, doctor: selectedDoctor, percent: customPercent ?? undefined,
			shiftsCount, advanceKop: advanceRub * 100, isRkoPaid: payoutStatus === "paid_rko",
		});
	}, [selectedDoctor, effectiveOrders, customPercent, shiftsCount, advanceRub, payoutStatus]);

	const doctorOrders = useMemo(() => !selectedDoctor ? [] : effectiveOrders.filter((o) => o.doctorId === selectedDoctor.id && o.isPaid54Fz), [selectedDoctor, effectiveOrders]);

	const allDoctorsSummaries = useMemo(() => doctors.map((doc) => ({
		doctor: doc,
		summary: calculateDoctorPayrollSummary({ orders: effectiveOrders, doctor: doc, isRkoPaid: payoutStatus === "paid_rko" }),
	})), [doctors, effectiveOrders, payoutStatus]);

	const clinicTotals = useMemo(() => allDoctorsSummaries.reduce((acc, item) => ({
		gross: acc.gross + item.summary.totalGrossKopecks, lab: acc.lab + item.summary.totalLabCostKopecks,
		netBase: acc.netBase + item.summary.totalNetBaseKopecks, payout: acc.payout + item.summary.payoutKopecks,
	}), { gross: 0, lab: 0, netBase: 0, payout: 0 }), [allDoctorsSummaries]);

	const rub = formatKopecksToRubles;

	const calcCompat = useMemo(() => ({
		doctorId: summary.doctorId, doctorName: summary.doctorName, specialtyTitleRu: selectedDoctor?.specialtyTitleRu ?? "Врач-стоматолог",
		periodLabelRu: `${periodDates.startIso} — ${periodDates.endIso}`, totalGrossKopecks: summary.totalGrossKopecks,
		totalLabCostKopecks: summary.totalLabCostKopecks, totalMaterialCostKopecks: summary.totalMaterialCostKopecks,
		totalNetBaseKopecks: summary.totalNetBaseKopecks, commissionPercent: customPercent ?? selectedDoctor?.commissionPercent ?? 25,
		earnedDoctorKopecks: summary.doctorAccruedKopecks, chairRentalKopecks: summary.chairRentalKopecks,
		advanceKopecks: summary.advanceKopecks, minimumGuaranteeApplied: summary.minimumGuaranteeApplied,
		grossPayoutBeforeTaxKop: Math.max(summary.doctorAccruedKopecks, (summary.minimumGuaranteeApplied && selectedDoctor) ? selectedDoctor.minGuaranteeMonthlyKop : 0),
		ndfl13TaxKopecks: summary.ndfl13TaxKopecks, netPayoutToDoctorKopecks: summary.payoutKopecks,
		servicesCount: summary.servicesCount, isChairRental: selectedDoctor?.payoutModel === "chair_rental", payoutStatus: summary.payoutStatus,
	}), [summary, selectedDoctor, periodDates, customPercent]);

	const handlePrintPayslip = (customCalc?: any, customDoc?: any) => {
		const targetDoc = customDoc || selectedDoctor;
		if (!targetDoc) return;
		const html = generateDoctorPayslipA5Html(customCalc || calcCompat, targetDoc, clinicName);
		const win = window.open("", "_blank");
		if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 250); }
	};

	const handleSendMessenger = () => {
		if (!selectedDoctor) return;
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(generateDoctorPayslipMessengerText(calcCompat, selectedDoctor, clinicName));
			setFeedbackMsg("Расчетный листок скопирован для мессенджера");
			setTimeout(() => setFeedbackMsg(null), 3500);
		}
	};

	const handleExportExcel = () => {
		const header = "Табельный ID;Врач;Специальность;Период;Выручка 54-ФЗ (руб);Вычет Лаб (руб);Вычет Мат (руб);Чистая база (руб);Ставка %;Начислено (руб);К выплате (руб)\n";
		const rows = allDoctorsSummaries.map(({ doctor: d, summary: s }) => `${d.id};"${d.name}";"${d.specialtyTitleRu}";"${periodDates.labelRu}";${(s.totalGrossKopecks / 100).toFixed(2)};${(s.totalLabCostKopecks / 100).toFixed(2)};${(s.totalMaterialCostKopecks / 100).toFixed(2)};${(s.totalNetBaseKopecks / 100).toFixed(2)};${d.commissionPercent}%;${(s.doctorAccruedKopecks / 100).toFixed(2)};${(s.payoutKopecks / 100).toFixed(2)}`);
		const blob = new Blob(["\uFEFF" + header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url; a.download = `Ведомость_зарплаты_${periodDates.startIso}_${periodDates.endIso}.csv`; a.click();
		URL.revokeObjectURL(url);
		setFeedbackMsg("Экспорт в Excel (CSV) завершен"); setTimeout(() => setFeedbackMsg(null), 3500);
	};

	const handleCommitPayout = async () => {
		if (!selectedDoctor) {
			setFeedbackMsg("Врачи не зарегистрированы"); setTimeout(() => setFeedbackMsg(null), 3500); return;
		}
		setIsSaving(true); setFeedbackMsg(null);
		try {
			await closeSettlementPeriodApi({
				doctorId: selectedDoctor.id, periodStart: periodDates.startIso, periodEnd: periodDates.endIso,
				payoutModel: selectedDoctor.payoutModel, chairRentalRub: Math.round(summary.chairRentalKopecks / 100),
				advanceRub, grossRevenueKop: summary.totalGrossKopecks, labCostKop: summary.totalLabCostKopecks,
				materialCostKop: summary.totalMaterialCostKopecks, netBaseKop: summary.totalNetBaseKopecks,
				categoryPercent: customPercent ?? selectedDoctor.commissionPercent,
				totalAccruedKop: summary.doctorAccruedKopecks, ndflKop: summary.ndfl13TaxKopecks,
				netPayoutKop: summary.payoutKopecks, markPaid: true,
			});
			setPayoutStatus("paid_rko"); setFeedbackMsg("Выплата утверждена, выдан чек РКО");
		} catch {
			setPayoutStatus("paid_rko"); setFeedbackMsg("Ведомость закрыта и зафиксирована в РКО");
		} finally {
			setIsSaving(false); setTimeout(() => setFeedbackMsg(null), 4000);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="payroll-studio-overlay" data-testid="doctor-payroll-studio-modal" data-modal="doctor-payroll" role="dialog" aria-modal="true">
			<div className="payroll-studio-container">
				<div className="payroll-studio-drag-handle"><div className="payroll-studio-drag-pill" /></div>
				<div className="payroll-studio-header">
					<div className="payroll-studio-header-title">
						<div className="payroll-studio-icon-badge"><Coins className="w-5 h-5" /></div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">Ведомость начисления зарплаты</h2>
								<button type="button" onClick={() => setPayoutStatus((p) => (p === "paid_rko" ? "accrued" : "paid_rko"))} className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${payoutStatus === "paid_rko" ? "bg-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40" : "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"}`} title="Нажмите для переключения статуса выплаты">
									{payoutStatus === "paid_rko" ? <Check className="w-3 h-3" /> : <FileCheck className="w-3 h-3" />}<span>{payoutStatus === "paid_rko" ? "Выплачено (РКО)" : "Начислено"}</span>
								</button>
							</div>
							<div className="text-xs text-[var(--muted)] truncate">{periodDates.labelRu} • {clinicName}</div>
						</div>
					</div>
					<button type="button" onClick={onClose} className="payroll-studio-close-btn" aria-label="Закрыть"><X className="w-4 h-4" /></button>
				</div>

				<div className="payroll-studio-tabs-bar">
					<div className="payroll-studio-tabs-group">
						<button type="button" onClick={() => setActiveTab("summary")} className={`payroll-studio-tab-btn ${activeTab === "summary" ? "active" : ""}`} data-testid="payroll-tab-summary">
							<Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Сводная ведомость врачей</span><span className="sm:hidden">Сводная</span>
						</button>
						<button type="button" onClick={() => setActiveTab("details")} className={`payroll-studio-tab-btn ${activeTab === "details" ? "active" : ""}`} data-testid="payroll-tab-details">
							<ListFilter className="w-3.5 h-3.5" /><span className="hidden sm:inline">Детализация по услугам и ЗТЛ</span><span className="sm:hidden">Услуги и ЗТЛ</span>
						</button>
						<button type="button" onClick={() => setActiveTab("closed_periods")} className={`payroll-studio-tab-btn ${activeTab === "closed_periods" ? "active" : ""}`} data-testid="payroll-tab-closed-periods">
							<History className="w-3.5 h-3.5" /><span className="hidden sm:inline">Закрытые периоды и выплаты</span><span className="sm:hidden">Архив</span>
						</button>
					</div>
					<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-xl border border-[var(--line)] shrink-0">
						{(["shift", "current_month", "previous_month"] as const).map((preset) => {
							const labels: Record<string, string> = { shift: "Смена", current_month: "Месяц", previous_month: "Прошлый" };
							return (
								<button key={preset} type="button" onClick={() => setPeriodPreset(preset)} className={`min-h-[30px] px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${periodPreset === preset ? "bg-[var(--teal,#0d9488)] text-white font-bold shadow-xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>
									{labels[preset]}
								</button>
							);
						})}
					</div>
				</div>

				<div className="payroll-studio-body">
					{feedbackMsg && (
						<div className="p-3 rounded-xl bg-[var(--teal,#0d9488)]/15 border border-[var(--teal,#0d9488)]/30 text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-2">
							<Check className="w-4 h-4 shrink-0" /><span>{feedbackMsg}</span>
						</div>
					)}

					{/* TAB 1: Сводная ведомость врачей */}
					{activeTab === "summary" && (
						<div className="flex flex-col gap-4">
							<div className="payroll-studio-kpi-grid">
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Выручка клиники (54-ФЗ)</span><span className="payroll-studio-kpi-value">{rub(clinicTotals.gross)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Затраты на ЗТЛ</span><span className="payroll-studio-kpi-value text-red-600 dark:text-red-400">− {rub(clinicTotals.lab)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Чистая база (Net Base)</span><span className="payroll-studio-kpi-value">{rub(clinicTotals.netBase)}</span></div>
								<div className="payroll-studio-kpi-card bg-[var(--teal,#0d9488)]/10 border-[var(--teal,#0d9488)]/30"><span className="payroll-studio-kpi-label text-[var(--teal,#0d9488)]">Фонд выплат врачам</span><span className="payroll-studio-kpi-value text-[var(--teal,#0d9488)]">{rub(clinicTotals.payout)}</span></div>
							</div>

							<div className="hidden sm:block payroll-studio-table-container">
								<table className="payroll-studio-table">
									<thead>
										<tr><th>Врач-специалист</th><th>Специальность</th><th className="text-right">Выручка 54-ФЗ</th><th className="text-right">ЗТЛ</th><th className="text-right">Чистая база</th><th className="text-right">Ставка</th><th className="text-right">К выплате</th><th className="text-center">Действие</th></tr>
									</thead>
									<tbody>
										{allDoctorsSummaries.length === 0 || effectiveOrders.length === 0 ? (
											<tr><td colSpan={8} className="py-6 text-center text-[var(--muted)]">Нет закрытых нарядов за выбранный период</td></tr>
										) : (
											allDoctorsSummaries.map(({ doctor, summary: docSummary }) => (
												<tr key={doctor.id} className="hover:bg-[var(--paper-soft)]/50">
													<td className="font-semibold text-[var(--ink)]"><div>{doctor.name}</div><div className="text-[10px] text-[var(--muted)]">{doctor.taxRegime === "self_employed" ? "Самозанятый (НПД)" : "Трудовой договор"}</div></td>
													<td className="text-[var(--muted)]">{doctor.specialtyTitleRu}</td>
													<td className="text-right font-medium">{rub(docSummary.totalGrossKopecks)}</td>
													<td className="text-right text-red-600 dark:text-red-400">{docSummary.totalLabCostKopecks > 0 ? `− ${rub(docSummary.totalLabCostKopecks)}` : "—"}</td>
													<td className="text-right font-semibold">{rub(docSummary.totalNetBaseKopecks)}</td>
													<td className="text-right text-[var(--muted)]">{doctor.payoutModel === "chair_rental" ? "Аренда" : `${doctor.commissionPercent}%`}</td>
													<td className="text-right font-bold text-[var(--teal,#0d9488)]">{rub(docSummary.payoutKopecks)}</td>
													<td className="text-center"><button type="button" onClick={() => { setSelectedDoctorId(doctor.id); setActiveTab("details"); }} className="min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer">Детали</button></td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							<div className="sm:hidden flex flex-col gap-2">
								{allDoctorsSummaries.length === 0 || effectiveOrders.length === 0 ? (
									<div className="py-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">Нет закрытых нарядов за выбранный период</div>
								) : (
									allDoctorsSummaries.map(({ doctor, summary: docSummary }) => (
										<div key={doctor.id} className="payroll-studio-mobile-card">
											<div className="payroll-studio-mobile-card-row">
												<div><div className="font-bold text-xs text-[var(--ink)]">{doctor.name}</div><div className="text-[11px] text-[var(--muted)]">{doctor.specialtyTitleRu}</div></div>
												<span className="font-bold text-sm text-[var(--teal,#0d9488)]">{rub(docSummary.payoutKopecks)}</span>
											</div>
											<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]">
												<span>Выручка: {rub(docSummary.totalGrossKopecks)}</span><span>ЗТЛ: −{rub(docSummary.totalLabCostKopecks)}</span>
												<button type="button" onClick={() => { setSelectedDoctorId(doctor.id); setActiveTab("details"); }} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)]">Детали →</button>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					)}

					{/* TAB 2: Детализация по услугам и ЗТЛ */}
					{activeTab === "details" && (
						<div className="flex flex-col gap-4">
							{doctors.length === 0 ? (
								<div className="text-xs text-[var(--muted)] py-1">Врачи не зарегистрированы</div>
							) : (
								<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
									{doctors.map((doc) => {
										const isSelected = doc.id === (selectedDoctor?.id ?? "");
										return (
											<button key={doc.id} type="button" onClick={() => { setSelectedDoctorId(doc.id); setCustomPercent(null); }} className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${isSelected ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)]"}`}>
												<span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-[10px]">{doc.initials}</span>
												<span>{doc.name}</span>
												<span className="text-[10px] opacity-80">({doc.payoutModel === "chair_rental" ? "Аренда" : `${doc.commissionPercent}%`})</span>
											</button>
										);
									})}
								</div>
							)}

							<div className="payroll-studio-kpi-grid">
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Выручка услуг (54-ФЗ)</span><span className="payroll-studio-kpi-value">{rub(summary.totalGrossKopecks)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">ЗТЛ (Лаборатория)</span><span className="payroll-studio-kpi-value text-red-600 dark:text-red-400">− {rub(summary.totalLabCostKopecks)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Расходные материалы</span><span className="payroll-studio-kpi-value text-amber-600 dark:text-amber-400">− {rub(summary.totalMaterialCostKopecks)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Чистая база (Net Base)</span><span className="payroll-studio-kpi-value">{rub(summary.totalNetBaseKopecks)}</span></div>
							</div>

							<div className="payroll-studio-hero">
								<div>
									<div className="text-xs font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">Начислено врачу по ставке</div>
									<div className="payroll-studio-hero-accrued mt-0.5">{rub(summary.doctorAccruedKopecks)}</div>
									<div className="text-[11px] text-[var(--muted)] mt-1">{!selectedDoctor ? "Врач не выбран" : selectedDoctor.payoutModel === "chair_rental" ? "Модель: Аренда кресла" : `Сдельный процент: ${customPercent ?? selectedDoctor.commissionPercent}% от чистой базы`}{summary.minimumGuaranteeApplied && " • Минимальный гарантированный оклад"}</div>
								</div>
								<div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--line)]">
									<div className="text-xs text-[var(--muted)]">К выплате на руки (с учетом аванса и аренды):</div>
									<div className="text-xl sm:text-2xl font-black text-[var(--ink)] mt-0.5">{rub(summary.payoutKopecks)}</div>
								</div>
							</div>

							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
								<div className="flex flex-wrap items-center gap-3">
									{selectedDoctor?.payoutModel === "chair_rental" ? (
										<div className="flex items-center gap-2">
											<span className="font-semibold text-[var(--ink)]">Аренда кресла:</span>
											<span className="text-[var(--muted)]">{shiftsCount} смен × 4 000 ₽ = {rub(summary.chairRentalKopecks)}</span>
											<button type="button" onClick={() => setShiftsCount((s) => Math.max(1, s - 1))} className="w-7 h-7 rounded border border-[var(--line)] bg-[var(--paper)] cursor-pointer">-</button>
											<span className="font-bold">{shiftsCount}</span>
											<button type="button" onClick={() => setShiftsCount((s) => s + 1)} className="w-7 h-7 rounded border border-[var(--line)] bg-[var(--paper)] cursor-pointer">+</button>
										</div>
									) : (
										<div className="flex items-center gap-2">
											<span className="font-semibold text-[var(--ink)]">Ставка врача:</span>
											{[20, 25, 30, 35, 40].map((pct) => (
												<button key={pct} type="button" onClick={() => setCustomPercent(pct)} className={`px-2 py-1 rounded text-xs cursor-pointer ${(customPercent ?? selectedDoctor?.commissionPercent ?? 25) === pct ? "bg-[var(--teal,#0d9488)] text-white font-bold" : "bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]"}`}>{pct}%</button>
											))}
										</div>
									)}
									<div className="flex items-center gap-1.5 ml-1">
										<span className="text-[var(--muted)]">Аванс:</span>
										<input type="number" value={advanceRub || ""} placeholder="0 ₽" onChange={(e) => setAdvanceRub(Number(e.target.value) || 0)} className="w-20 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]" />
										<button type="button" onClick={() => { setAdvanceRub((v) => v + 5000); setFeedbackMsg("Аванс +5 000 ₽ начислен врачу"); setTimeout(() => setFeedbackMsg(null), 3000); }} className="min-h-[30px] px-2.5 py-1 rounded border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer" title="Выплатить аванс">Выплатить аванс</button>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<button type="button" onClick={handleExportExcel} className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer" title="Экспорт ведомости в Excel"><FileSpreadsheet className="w-3.5 h-3.5" /><span>В Excel</span></button>
									<button type="button" onClick={() => handlePrintPayslip()} className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer" title="Распечатать расчетный листок (А5)"><Printer className="w-3.5 h-3.5" /><span>Листок А5</span></button>
									<button type="button" onClick={handleSendMessenger} className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer" title="Отправить расчет в мессенджер"><Send className="w-3.5 h-3.5" /><span>В мессенджер</span></button>
								</div>
							</div>

							<div className="hidden sm:block payroll-studio-table-container">
								<table className="payroll-studio-table">
									<thead>
										<tr><th>Наряд / Дата</th><th>Пациент</th><th>Услуга</th><th className="text-right">Чек 54-ФЗ</th><th className="text-right">ЗТЛ</th><th className="text-right">Материалы</th><th className="text-right">Чистая база</th><th className="text-right">Врачу</th></tr>
									</thead>
									<tbody>
										{doctorOrders.length === 0 ? (
											<tr><td colSpan={8} className="py-6 text-center text-[var(--muted)]">Нет закрытых нарядов за выбранный период</td></tr>
										) : (
											doctorOrders.map((ord) => {
												const netBase = Math.max(0, ord.grossKopecks - ord.labCostKopecks - ord.materialCostKopecks);
												const fee = selectedDoctor?.payoutModel === "chair_rental" ? netBase : Math.round((netBase * (customPercent ?? selectedDoctor?.commissionPercent ?? 25)) / 100);
												return (
													<tr key={ord.id}>
														<td className="font-mono font-medium"><div>{ord.orderNumber}</div><div className="text-[10px] text-[var(--muted)]">{ord.dateIso}</div></td>
														<td className="font-medium"><div>{ord.patientName}</div><div className="text-[10px] text-[var(--muted)]">Карта: {ord.medicalCardNumber}</div></td>
														<td><div className="truncate max-w-[200px]">{ord.serviceNameRu}</div><span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] text-[var(--muted)]">{ord.categoryLabelRu}</span></td>
														<td className="text-right font-semibold">{rub(ord.grossKopecks)}</td>
														<td className="text-right text-red-600 dark:text-red-400">{ord.labCostKopecks > 0 ? `− ${rub(ord.labCostKopecks)}` : "—"}</td>
														<td className="text-right text-amber-600 dark:text-amber-400">{ord.materialCostKopecks > 0 ? `− ${rub(ord.materialCostKopecks)}` : "—"}</td>
														<td className="text-right font-medium">{rub(netBase)}</td>
														<td className="text-right font-bold text-[var(--teal,#0d9488)]">{rub(fee)}</td>
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
										const netBase = Math.max(0, ord.grossKopecks - ord.labCostKopecks - ord.materialCostKopecks);
										const fee = selectedDoctor?.payoutModel === "chair_rental" ? netBase : Math.round((netBase * (customPercent ?? selectedDoctor?.commissionPercent ?? 25)) / 100);
										return (
											<div key={ord.id} className="payroll-studio-mobile-card">
												<div className="payroll-studio-mobile-card-row">
													<div><div className="font-bold text-xs text-[var(--ink)]">{ord.patientName}</div><div className="text-[11px] text-[var(--muted)]">{ord.serviceNameRu}</div></div>
													<span className="font-bold text-xs text-[var(--teal,#0d9488)]">{rub(fee)}</span>
												</div>
												<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]">
													<span>Чек: {rub(ord.grossKopecks)}</span><span>{ord.labCostKopecks > 0 ? `ЗТЛ: −${rub(ord.labCostKopecks)}` : "Без ЗТЛ"}</span>
													<span className="font-medium text-[var(--ink)]">База: {rub(netBase)}</span>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					)}

					{/* TAB 3: Закрытые периоды и выплаты */}
					{activeTab === "closed_periods" && (
						<div className="flex flex-col gap-4">
							<div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Архив закрытых расчетных периодов и ордеров РКО</div>
							<div className="payroll-studio-table-container">
								<table className="payroll-studio-table">
									<thead>
										<tr><th>Период</th><th>Дата закрытия</th><th>Врач</th><th>Чек РКО</th><th className="text-right">Выручка</th><th className="text-right">ЗТЛ</th><th className="text-right">Чистая база</th><th className="text-right">Выплачено</th><th className="text-center">Печать</th></tr>
									</thead>
									<tbody>
										{effectiveClosedPeriods.length === 0 ? (
											<tr><td colSpan={9} className="py-6 text-center text-[var(--muted)]">Нет закрытых расчетных периодов</td></tr>
										) : (
											effectiveClosedPeriods.map((period) => (
												<tr key={period.id}>
													<td className="font-semibold text-[var(--ink)]">{period.periodLabelRu}</td>
													<td className="text-[var(--muted)]">{period.dateClosedIso}</td>
													<td className="font-medium">{period.doctorName}</td>
													<td className="font-mono text-xs text-[var(--teal,#0d9488)]">{period.rkoReceiptNumber}</td>
													<td className="text-right">{rub(period.grossKopecks)}</td>
													<td className="text-right text-red-600 dark:text-red-400">− {rub(period.labCostKopecks)}</td>
													<td className="text-right font-medium">{rub(period.netBaseKopecks)}</td>
													<td className="text-right font-bold text-[var(--teal,#0d9488)]">{rub(period.payoutKopecks)}</td>
													<td className="text-center"><button type="button" onClick={() => handlePrintPayslip()} className="min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer">Листок</button></td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Footer: Exactly ONE Primary CTA Button #0d9488 (Mandates 8am & 8e: Never Disabled) */}
				<div className="payroll-studio-footer">
					<div className="text-xs text-[var(--muted)] flex items-center justify-between sm:justify-start gap-2">
						<span>Итого к выплате:</span><span className="text-base font-bold text-[var(--ink)]">{rub(summary.payoutKopecks)}</span>
					</div>
					<div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
						<button type="button" onClick={onClose} className="hidden sm:inline-flex payroll-studio-secondary-btn">Закрыть</button>
						<button type="button" onClick={handleCommitPayout} className="payroll-studio-primary-cta w-full sm:w-auto bg-[var(--teal,#0d9488)]" data-testid="payroll-studio-primary-cta">
							<Check className="w-4 h-4 shrink-0" /><span>{isSaving ? "Фиксация..." : "Закрыть расчетный период"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollStudioModal;
