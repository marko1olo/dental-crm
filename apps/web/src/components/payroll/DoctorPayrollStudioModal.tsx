/**
 * DENTE Dental CRM — Canonical Doctor Payroll Studio Modal (Mandates 8b 380–480 lines, 8e, 8n, 8am #0d9488, 8wy).
 */
import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X, FileCheck, Coins, Users, ListFilter, History } from "lucide-react";
import { type PayrollDoctorProfile, type PayrollPeriodPreset, type PayrollPayoutStatus, type DoctorPayrollSummary, type PayrollServiceOrder, type ClosedPayrollPeriodItem, CANONICAL_PAYROLL_DOCTORS, CANONICAL_DEMO_ORDERS, CANONICAL_CLOSED_PERIODS, getQuickPeriodDates, calculateDoctorPayrollSummary } from "./payrollCatalogData";
import { kopecksToRubles } from "@dental/shared";
import { printDoctorPayslip, buildDoctorPayrollCalculation, EMPTY_DOCTOR_PAYROLL_SUMMARY } from "./doctorPayrollModalUtils";
import { closeSettlementPeriodApi } from "./closeSettlementPeriodApi";
import { DoctorPayrollTabPanel } from "./DoctorPayrollTabPanel";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import "./styles/doctorPayrollStudio.css";

export interface DoctorPayrollStudioModalProps {
	/** Whether the modal dialog is visibly mounted in DOM */
	readonly isOpen: boolean;
	/** Close handler resetting any transient dialog state */
	readonly onClose: () => void;
	/** Official registered clinic name for billing headers */
	readonly clinicName?: string | undefined;
	/** Optional pre-fetched doctor list overriding remote fetching */
	readonly doctorsList?: readonly {
		readonly id: string;
		readonly name: string;
		readonly specialtyId: string;
	}[] | undefined;
	/** Initial doctor preselected on modal launch */
	readonly initialDoctorId?: string | undefined;
	/** Default payroll period preset (defaults to current month) */
	readonly initialPeriodPreset?: PayrollPeriodPreset | undefined;
	/** Service orders passed directly from parent workspace */
	readonly orders?: readonly PayrollServiceOrder[] | undefined;
	/** Closed settlement periods passed directly from parent */
	readonly closedPeriods?: readonly ClosedPayrollPeriodItem[] | undefined;
}

export const DoctorPayrollStudioModal: React.FC<DoctorPayrollStudioModalProps> = ({
	isOpen,
	onClose,
	clinicName = "Стоматологическая клиника",
	doctorsList,
	initialDoctorId,
	initialPeriodPreset = "current_month",
	orders: propsOrders,
	closedPeriods: propsClosedPeriods,
}) => {
	const isDemo = isDemoShowcaseMode();
	const [apiDoctors, setApiDoctors] = useState<PayrollDoctorProfile[]>([]);
	const [apiOrders, setApiOrders] = useState<PayrollServiceOrder[] | null>(null);
	const [apiClosedPeriods, setApiClosedPeriods] = useState<ClosedPayrollPeriodItem[] | null>(null);
	const [apiSummary, setApiSummary] = useState<DoctorPayrollSummary | null>(null);
	const [apiDoctorSummaries, setApiDoctorSummaries] = useState<Record<string, Partial<DoctorPayrollSummary>>>({});
	const [activeTab, setActiveTab] = useState<"summary" | "details" | "closed_periods">("summary");

	const doctors: readonly PayrollDoctorProfile[] = useMemo(() => {
		if (doctorsList && doctorsList.length > 0) {
			return doctorsList.map((d) => {
				const specId: PayrollDoctorProfile["specialtyId"] = [
					"orthopedics",
					"therapy",
					"surgery",
					"hygiene",
					"solo_rental",
				].includes(d.specialtyId)
					? (d.specialtyId as PayrollDoctorProfile["specialtyId"])
					: "therapy";
				return {
					id: d.id,
					name: d.name,
					initials: d.name.slice(0, 2),
					specialtyId: specId,
					specialtyTitleRu: d.name,
					commissionPercent: 25,
					payoutModel: "percentage" as const,
					motivationScheme: "net_percentage" as const,
					defaultShiftRateKop: 0,
					minGuaranteeMonthlyKop: 0,
					taxRegime: "employee" as const,
				};
			});
		}
		if (apiDoctors.length > 0) return apiDoctors;
		return isDemo ? CANONICAL_PAYROLL_DOCTORS : [];
	}, [doctorsList, apiDoctors, isDemo]);

	const effectiveOrders: readonly PayrollServiceOrder[] = useMemo(() => {
		if (propsOrders && propsOrders.length > 0) return propsOrders;
		if (apiOrders) return apiOrders;
		return isDemo ? CANONICAL_DEMO_ORDERS : [];
	}, [propsOrders, apiOrders, isDemo]);

	const effectiveClosedPeriods: readonly ClosedPayrollPeriodItem[] = useMemo(() => {
		if (propsClosedPeriods && propsClosedPeriods.length > 0) return propsClosedPeriods;
		if (apiClosedPeriods) return apiClosedPeriods;
		return isDemo ? CANONICAL_CLOSED_PERIODS : [];
	}, [propsClosedPeriods, apiClosedPeriods, isDemo]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => initialDoctorId || (doctors[0]?.id ?? ""));
	const [periodPreset, setPeriodPreset] = useState<PayrollPeriodPreset>(initialPeriodPreset);
	const [activeTabDoctorSummary, setActiveTabDoctorSummary] = useState<DoctorPayrollSummary | null>(null);
	const [activeTabAdvanceRub, setActiveTabAdvanceRub] = useState<number>(0);
	const [activeTabCustomPercent, setActiveTabCustomPercent] = useState<number | null>(null);
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
		if (isDemo || !isOpen) return;
		let cancelled = false;
		const queryObj: Record<string, string> = {
			doctorId: "all",
			from: periodDates.startIso,
			to: periodDates.endIso,
		};
		if (activeTabCustomPercent !== null) {
			queryObj.commissionPercent = String(activeTabCustomPercent);
		}
		const query = new URLSearchParams(queryObj);
		void fetch(`/api/v1/payroll/calculations?${query.toString()}`).then((r) => r.ok ? r.json() : null).then((data) => {
			if (cancelled || !data) return;
			if (Array.isArray(data.orders)) setApiOrders(data.orders);
			if (Array.isArray(data.closedPeriods)) setApiClosedPeriods(data.closedPeriods);
			if (data.doctorSummaries && typeof data.doctorSummaries === "object") {
				setApiDoctorSummaries(data.doctorSummaries);
				if (selectedDoctor && data.doctorSummaries[selectedDoctor.id]) setApiSummary(data.doctorSummaries[selectedDoctor.id]);
			} else if (data.summary && typeof data.summary === "object" && data.summary.doctorId !== "all") {
				setApiSummary(data.summary);
			}
		}).catch(() => {});
		return () => { cancelled = true; };
	}, [isDemo, isOpen, periodDates, selectedDoctor, activeTabCustomPercent]);

	const effectiveDoctorSummary: DoctorPayrollSummary = useMemo(() => {
		if (activeTabDoctorSummary && selectedDoctor && activeTabDoctorSummary.doctorId === selectedDoctor.id) {
			return activeTabDoctorSummary;
		}
		if (!selectedDoctor) return EMPTY_DOCTOR_PAYROLL_SUMMARY;
		return calculateDoctorPayrollSummary({
			orders: effectiveOrders, doctor: selectedDoctor,
			isRkoPaid: payoutStatus === "paid_rko",
		});
	}, [activeTabDoctorSummary, selectedDoctor, effectiveOrders, payoutStatus]);

	const allDoctorsSummaries: readonly {
		readonly doctor: PayrollDoctorProfile;
		readonly summary: DoctorPayrollSummary;
	}[] = useMemo(() => doctors.map((doc) => {
		const cached = (!isDemo && apiDoctorSummaries[doc.id]) ? apiDoctorSummaries[doc.id] : undefined;
		const docSummary: DoctorPayrollSummary = cached
			? {
				doctorId: cached.doctorId ?? doc.id,
				doctorName: cached.doctorName ?? doc.name,
				schemeType: cached.schemeType ?? "net_percentage",
				totalGrossKopecks: cached.totalGrossKopecks ?? 0,
				totalLabCostKopecks: cached.totalLabCostKopecks ?? 0,
				totalMaterialCostKopecks: cached.totalMaterialCostKopecks ?? 0,
				totalNetBaseKopecks: cached.totalNetBaseKopecks ?? 0,
				doctorAccruedKopecks: cached.doctorAccruedKopecks ?? 0,
				chairRentalKopecks: cached.chairRentalKopecks ?? 0,
				advanceKopecks: cached.advanceKopecks ?? 0,
				ndfl13TaxKopecks: cached.ndfl13TaxKopecks ?? 0,
				payoutKopecks: cached.payoutKopecks ?? 0,
				payoutStatus,
				servicesCount: cached.servicesCount ?? 0,
				minimumGuaranteeApplied: Boolean(cached.minimumGuaranteeApplied),
			}
			: calculateDoctorPayrollSummary({
				orders: effectiveOrders,
				doctor: doc,
				isRkoPaid: payoutStatus === "paid_rko",
			});
		return { doctor: doc, summary: docSummary };
	}), [doctors, effectiveOrders, payoutStatus, apiDoctorSummaries, isDemo]);

	const clinicTotals = useMemo(() => allDoctorsSummaries.reduce((acc, item) => ({
		gross: acc.gross + item.summary.totalGrossKopecks, lab: acc.lab + item.summary.totalLabCostKopecks,
		netBase: acc.netBase + item.summary.totalNetBaseKopecks, payout: acc.payout + item.summary.payoutKopecks,
	}), { gross: 0, lab: 0, netBase: 0, payout: 0 }), [allDoctorsSummaries]);
	const rub = (kop: number) => `${kopecksToRubles(kop).toLocaleString("ru-RU")} ₽`;
	const calcCompat = useMemo(() => buildDoctorPayrollCalculation(effectiveDoctorSummary, selectedDoctor, periodDates, activeTabCustomPercent), [effectiveDoctorSummary, selectedDoctor, periodDates, activeTabCustomPercent]);

	const handlePrintPayslip = (customCalc?: typeof calcCompat, customDoc?: PayrollDoctorProfile) => {
		const targetDoc = customDoc || selectedDoctor;
		if (targetDoc) printDoctorPayslip(customCalc || calcCompat, targetDoc, clinicName);
	};

	const handleCommitPayout = async () => {
		setIsSaving(true); setFeedbackMsg(null);
		try {
			if (activeTab === "summary") {
				await closeSettlementPeriodApi({
					doctorId: "all", periodStart: periodDates.startIso, periodEnd: periodDates.endIso,
					payoutModel: "percentage", chairRentalRub: 0, advanceRub: 0, grossRevenueKop: clinicTotals.gross,
					labCostKop: clinicTotals.lab, materialCostKop: 0, netBaseKop: clinicTotals.netBase, categoryPercent: 0,
					totalAccruedKop: clinicTotals.payout, ndflKop: 0, netPayoutKop: clinicTotals.payout, markPaid: true,
				});
				setPayoutStatus("paid_rko"); setFeedbackMsg("Ведомости клиники утверждены для всех врачей, выданы РКО");
			} else {
				if (!selectedDoctor) {
					setFeedbackMsg("Врачи не зарегистрированы"); setTimeout(() => setFeedbackMsg(null), 3500); return;
				}
				await closeSettlementPeriodApi({
					doctorId: selectedDoctor.id, periodStart: periodDates.startIso, periodEnd: periodDates.endIso,
					payoutModel: selectedDoctor.payoutModel, chairRentalKopecks: effectiveDoctorSummary.chairRentalKopecks, chairRentalRub: effectiveDoctorSummary.chairRentalKopecks > 0 ? kopecksToRubles(effectiveDoctorSummary.chairRentalKopecks) : 0,
					advanceRub: activeTabAdvanceRub, grossRevenueKop: effectiveDoctorSummary.totalGrossKopecks, labCostKop: effectiveDoctorSummary.totalLabCostKopecks,
					materialCostKop: effectiveDoctorSummary.totalMaterialCostKopecks, netBaseKop: effectiveDoctorSummary.totalNetBaseKopecks,
					categoryPercent: activeTabCustomPercent ?? selectedDoctor.commissionPercent,
					totalAccruedKop: effectiveDoctorSummary.doctorAccruedKopecks, ndflKop: effectiveDoctorSummary.ndfl13TaxKopecks,
					netPayoutKop: effectiveDoctorSummary.payoutKopecks, markPaid: true,
				});
				setPayoutStatus("paid_rko"); setFeedbackMsg("Выплата утверждена, выдан чек РКО");
			}
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Не удалось закрыть расчетный период";
			setFeedbackMsg(`Ошибка: ${errorMsg}. Нажмите кнопку повторно.`);
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
								<button type="button" onClick={() => setPayoutStatus((p) => (p === "paid_rko" ? "accrued" : "paid_rko"))} className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${payoutStatus === "paid_rko" ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40" : "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"}`} title="Нажмите для переключения статуса выплаты">
									{payoutStatus === "paid_rko" ? <Check className="w-3 h-3" /> : <FileCheck className="w-3 h-3" />}<span>{payoutStatus === "paid_rko" ? "Выплачено (РКО)" : "Начислено"}</span>
								</button>
							</div>
							<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-tight">
								<span>{periodDates.labelRu}</span>
								<span className="opacity-40">•</span>
								<span>{clinicName}</span>
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} className="payroll-studio-close-btn" aria-label="Закрыть"><X className="w-4 h-4" /></button>
				</div>

				<div className="payroll-studio-tabs-bar">
					<div className="payroll-studio-tabs-group">
						<button type="button" onClick={() => setActiveTab("summary")} className={`payroll-studio-tab-btn ${activeTab === "summary" ? "active" : ""}`} data-testid="payroll-tab-summary"><Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Сводная ведомость врачей</span><span className="sm:hidden">Сводная</span></button>
						<button type="button" onClick={() => setActiveTab("details")} className={`payroll-studio-tab-btn ${activeTab === "details" ? "active" : ""}`} data-testid="payroll-tab-details"><ListFilter className="w-3.5 h-3.5" /><span className="hidden sm:inline">Детализация по услугам и ЗТЛ</span><span className="sm:hidden">Услуги и ЗТЛ</span></button>
						<button type="button" onClick={() => setActiveTab("closed_periods")} className={`payroll-studio-tab-btn ${activeTab === "closed_periods" ? "active" : ""}`} data-testid="payroll-tab-closed-periods"><History className="w-3.5 h-3.5" /><span className="hidden sm:inline">Закрытые периоды и выплаты</span><span className="sm:hidden">Архив</span></button>
					</div>
					<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-xl border border-[var(--line)] shrink-0">
						{(["shift", "current_month", "previous_month"] as const).map((preset) => (
							<button key={preset} type="button" onClick={() => setPeriodPreset(preset)} className={`min-h-[30px] px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${periodPreset === preset ? "bg-[var(--primary)] text-white font-bold shadow-xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>{preset === "shift" ? "Смена" : preset === "current_month" ? "Месяц" : "Прошлый"}</button>
						))}
					</div>
				</div>

				<div className="payroll-studio-body">
					{feedbackMsg && (
						<div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${feedbackMsg.startsWith("Ошибка") ? "bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--danger)]" : "bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)]"}`} role="alert">
							<div className="flex items-center gap-2">
								{feedbackMsg.startsWith("Ошибка") ? <X className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
								<span>{feedbackMsg}</span>
							</div>
							{feedbackMsg.startsWith("Ошибка") && (
								<button type="button" onClick={() => void handleCommitPayout()} className="px-2.5 py-1 rounded-lg bg-[var(--danger)] text-white hover:opacity-90 text-xs font-semibold cursor-pointer shrink-0 transition-colors">Повторить</button>
							)}
						</div>
					)}

					{/* TAB 1: Сводная ведомость врачей */}
					{activeTab === "summary" && (
						<div className="flex flex-col gap-4">
							<div className="payroll-studio-kpi-grid">
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Выручка клиники (касса)</span><span className="payroll-studio-kpi-value">{rub(clinicTotals.gross)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Затраты на ЗТЛ</span><span className="payroll-studio-kpi-value text-[var(--danger)]">− {rub(clinicTotals.lab)}</span></div>
								<div className="payroll-studio-kpi-card"><span className="payroll-studio-kpi-label">Чистая база (Net Base)</span><span className="payroll-studio-kpi-value">{rub(clinicTotals.netBase)}</span></div>
								<div className="payroll-studio-kpi-card bg-[var(--primary)]/10 border-[var(--primary)]/30"><span className="payroll-studio-kpi-label text-[var(--primary)]">Фонд выплат врачам</span><span className="payroll-studio-kpi-value text-[var(--primary)]">{rub(clinicTotals.payout)}</span></div>
							</div>

							<div className="hidden sm:block payroll-studio-table-container">
								<table className="payroll-studio-table">
									<thead>
										<tr><th>Врач-специалист</th><th>Специальность</th><th className="text-right">Выручка кассы</th><th className="text-right">ЗТЛ</th><th className="text-right">Чистая база</th><th className="text-right">Ставка</th><th className="text-right">К выплате</th><th className="text-center">Действие</th></tr>
									</thead>
									<tbody>
										{allDoctorsSummaries.length === 0 || effectiveOrders.length === 0 ? (
											<tr><td colSpan={8} className="py-6 text-center text-[var(--muted)]">Нет закрытых нарядов за выбранный период</td></tr>
										) : (
											allDoctorsSummaries.map(({ doctor, summary: docSummary }) => (
												<tr key={doctor.id} className="hover:bg-[var(--paper-soft)]/50">
													<td className="font-semibold text-[var(--ink)]"><div>{doctor.name}</div><div className="text-[10px] text-[var(--muted)]">{doctor.taxRegime === "self_employed" ? "Самозанятый (НПД)" : "Трудовой договор"}</div></td>
													<td className="text-[var(--muted)]">{doctor.specialtyTitleRu}</td>
													<td className="text-right font-medium">{rub(docSummary.totalGrossKopecks)}</td><td className="text-right text-[var(--danger)]">{docSummary.totalLabCostKopecks > 0 ? `− ${rub(docSummary.totalLabCostKopecks)}` : "—"}</td>
													<td className="text-right font-semibold">{rub(docSummary.totalNetBaseKopecks)}</td><td className="text-right text-[var(--muted)]">{doctor.payoutModel === "chair_rental" ? "Аренда" : `${doctor.commissionPercent}%`}</td>
													<td className="text-right font-bold text-[var(--primary)]">{rub(docSummary.payoutKopecks)}</td>
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
											<div className="payroll-studio-mobile-card-row"><div><div className="font-bold text-xs text-[var(--ink)]">{doctor.name}</div><div className="text-[11px] text-[var(--muted)]">{doctor.specialtyTitleRu}</div></div><span className="font-bold text-sm text-[var(--primary)]">{rub(docSummary.payoutKopecks)}</span></div>
											<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]"><span>Выручка: {rub(docSummary.totalGrossKopecks)}</span><span>ЗТЛ: −{rub(docSummary.totalLabCostKopecks)}</span><button type="button" onClick={() => { setSelectedDoctorId(doctor.id); setActiveTab("details"); }} className="px-2.5 py-1 rounded text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)]">Детали →</button></div>
										</div>
									))
								)}
							</div>
						</div>
					)}

					{/* TAB 2: Детализация по услугам и ЗТЛ (Keyed Remount per Doctor - SEV-3.2, Zero-Leak Draft) */}
					{activeTab === "details" && (
						selectedDoctor ? (
							<DoctorPayrollTabPanel
								key={selectedDoctor.id}
								doctor={selectedDoctor}
								doctors={doctors}
								onSelectDoctor={(docId) => setSelectedDoctorId(docId)}
								effectiveOrders={effectiveOrders}
								periodDates={periodDates}
								clinicName={clinicName}
								isRkoPaid={payoutStatus === "paid_rko"}
								apiSummary={selectedDoctor && apiDoctorSummaries[selectedDoctor.id] ? (apiDoctorSummaries[selectedDoctor.id] as DoctorPayrollSummary) : undefined}
								isDemo={isDemo}
								rub={rub}
								allDoctorsSummaries={allDoctorsSummaries}
								onSummaryCalculated={(s, adv, pct) => {
									setActiveTabDoctorSummary(s);
									setActiveTabAdvanceRub(adv);
									setActiveTabCustomPercent(pct);
								}}
							/>
						) : (
							<div className="text-xs text-[var(--muted)] py-4 text-center">Врачи не зарегистрированы</div>
						)
					)}

					{/* TAB 3: Закрытые периоды и выплаты */}
					{activeTab === "closed_periods" && (
						<div className="flex flex-col gap-4">
							<div className="text-xs font-bold text-[var(--muted)]">Архив закрытых расчетных периодов и кассовых чеков</div>
							<div className="payroll-studio-table-container">
								<table className="payroll-studio-table">
									<thead>
										<tr><th>Период</th><th>Дата закрытия</th><th>Врач</th><th>Кассовый чек</th><th className="text-right">Выручка</th><th className="text-right">ЗТЛ</th><th className="text-right">Чистая база</th><th className="text-right">Выплачено</th><th className="text-center">Печать</th></tr>
									</thead>
									<tbody>
										{effectiveClosedPeriods.length === 0 ? (
											<tr><td colSpan={9} className="py-6 text-center text-[var(--muted)]">Нет закрытых расчетных периодов</td></tr>
										) : (
											effectiveClosedPeriods.map((period) => (
												<tr key={period.id}>
													<td className="font-semibold text-[var(--ink)]">{period.periodLabelRu}</td><td className="text-[var(--muted)]">{period.dateClosedIso}</td>
													<td className="font-medium">{period.doctorName}</td><td className="font-mono text-xs text-[var(--primary)]">{period.rkoReceiptNumber.replace(/^РКО-/, "Чек №")}</td>
													<td className="text-right">{rub(period.grossKopecks)}</td><td className="text-right text-[var(--danger)]">− {rub(period.labCostKopecks)}</td>
													<td className="text-right font-medium">{rub(period.netBaseKopecks)}</td><td className="text-right font-bold text-[var(--primary)]">{rub(period.payoutKopecks)}</td>
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

				{/* Footer: Exactly ONE Primary CTA Button (Mandates 8am & 8e: Never Disabled) */}
				<div className="payroll-studio-footer">
					<div className="text-xs text-[var(--muted)] flex items-center justify-between sm:justify-start gap-2">
						<span>Итого к выплате:</span><span className="text-base font-bold text-[var(--ink)]">{rub(activeTab === "summary" ? clinicTotals.payout : effectiveDoctorSummary.payoutKopecks)}</span>
					</div>
					<div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
						<button type="button" onClick={onClose} className="hidden sm:inline-flex payroll-studio-secondary-btn">Закрыть</button>
						<button type="button" onClick={handleCommitPayout} className="payroll-studio-primary-cta w-full sm:w-auto bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]" data-testid="payroll-studio-primary-cta">
							<Check className="w-4 h-4 shrink-0" /><span>{isSaving ? "Фиксация..." : activeTab === "summary" ? "Утвердить ведомости клиники" : "Закрыть расчетный период"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollStudioModal;
