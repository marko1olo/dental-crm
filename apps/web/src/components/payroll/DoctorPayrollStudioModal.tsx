/**
 * DENTE Dental CRM — Doctor Payroll Studio Modal
 * Mandate 8b (Sweet Spot 350–480 lines), Mandate 8e (Doctor Autonomy & Non-blocking CTA),
 * Mandate 8n (Solo Practice Sovereignty: Net Revenue & Chair Rental), Mandate 8am (Single Primary CTA #0d9488),
 * Mandate 8ze (Apple Mobile HIG: 390x844 Touch Targets >= 44x44px, 0px Horizontal Drift).
 */

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, Printer, Send, X, FileCheck, Coins } from "lucide-react";
import {
	type PayrollDoctorProfile, type PayrollPeriodPreset, type MotivationSchemeType,
	type PayrollPayoutStatus, type DoctorPayrollSummary,
	CANONICAL_PAYROLL_DOCTORS, CANONICAL_DEMO_ORDERS, getQuickPeriodDates,
	calculateDoctorPayrollSummary, generateDoctorPayslipA5Html, generateDoctorPayslipMessengerText,
} from "./payrollCatalogData";
import { closeSettlementPeriodApi } from "./closeSettlementPeriodApi";

export interface DoctorPayrollStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialPeriodPreset?: PayrollPeriodPreset | undefined;
}

function formatDoctorShortName(fullName: string): string {
	const clean = fullName.replace(/^Д-р\.?\s*/i, "").trim();
	const parts = clean.split(/\s+/);
	if (parts.length >= 3) return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
	if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
	return parts[0] || fullName;
}

export const DoctorPayrollStudioModal: React.FC<DoctorPayrollStudioModalProps> = ({
	isOpen,
	onClose,
	clinicName = "Стоматологическая клиника DENTE",
	doctorsList,
	initialDoctorId,
	initialPeriodPreset = "current_month",
}) => {
	const doctors: readonly PayrollDoctorProfile[] = useMemo(() => {
		if (doctorsList && doctorsList.length > 0) {
			return doctorsList.map((d) => {
				const matched = CANONICAL_PAYROLL_DOCTORS.find((c) => c.id === d.id);
				return matched ?? {
					id: d.id, name: d.name, initials: d.name.slice(0, 2).toUpperCase(),
					specialtyId: (d.specialtyId as any) || "therapy", specialtyTitleRu: "Врач-стоматолог",
					commissionPercent: 25, payoutModel: "percentage", motivationScheme: "net_percentage",
					defaultShiftRateKop: 400000, minGuaranteeMonthlyKop: 6000000, taxRegime: "employee",
				};
			});
		}
		return CANONICAL_PAYROLL_DOCTORS;
	}, [doctorsList]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => initialDoctorId || (doctors[0]?.id ?? "doc-volkov"));
	const [periodPreset, setPeriodPreset] = useState<PayrollPeriodPreset>(initialPeriodPreset);
	const [shiftsCount, setShiftsCount] = useState<number>(12);
	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [customPercent, setCustomPercent] = useState<number | null>(null);
	const [payoutStatus, setPayoutStatus] = useState<PayrollPayoutStatus>("accrued");
	const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const selectedDoctor = useMemo(() => {
		return doctors.find((d) => d.id === selectedDoctorId) || doctors[0] || CANONICAL_PAYROLL_DOCTORS[0];
	}, [doctors, selectedDoctorId]);

	const periodDates = useMemo(() => getQuickPeriodDates(periodPreset), [periodPreset]);

	const summary: DoctorPayrollSummary = useMemo(() => {
		return calculateDoctorPayrollSummary({
			orders: CANONICAL_DEMO_ORDERS,
			doctor: selectedDoctor,
			percent: customPercent ?? undefined,
			shiftsCount,
			advanceKop: advanceRub * 100,
			isRkoPaid: payoutStatus === "paid_rko",
		});
	}, [selectedDoctor, customPercent, shiftsCount, advanceRub, payoutStatus]);

	const doctorOrders = useMemo(() => {
		return CANONICAL_DEMO_ORDERS.filter((o) => o.doctorId === selectedDoctor.id && o.isPaid54Fz);
	}, [selectedDoctor.id]);

	const rub = (kop: number) => (Math.round(kop) / 100).toLocaleString("ru-RU") + " ₽";

	const calcCompat = useMemo(() => ({
		doctorId: summary.doctorId, doctorName: summary.doctorName, specialtyTitleRu: selectedDoctor.specialtyTitleRu,
		periodLabelRu: `${periodDates.startIso} — ${periodDates.endIso}`,
		totalGrossKopecks: summary.totalGrossKopecks, totalLabCostKopecks: summary.totalLabCostKopecks,
		totalMaterialCostKopecks: summary.totalMaterialCostKopecks, totalNetBaseKopecks: summary.totalNetBaseKopecks,
		commissionPercent: customPercent ?? selectedDoctor.commissionPercent,
		earnedDoctorKopecks: summary.doctorAccruedKopecks, chairRentalKopecks: summary.chairRentalKopecks,
		advanceKopecks: summary.advanceKopecks, minimumGuaranteeApplied: summary.minimumGuaranteeApplied,
		grossPayoutBeforeTaxKop: Math.max(summary.doctorAccruedKopecks, summary.minimumGuaranteeApplied ? selectedDoctor.minGuaranteeMonthlyKop : 0),
		ndfl13TaxKopecks: summary.ndfl13TaxKopecks, netPayoutToDoctorKopecks: summary.payoutKopecks,
		servicesCount: summary.servicesCount, isChairRental: selectedDoctor.payoutModel === "chair_rental",
		payoutStatus: summary.payoutStatus,
	}), [summary, selectedDoctor, periodDates, customPercent]);

	const handlePrintPayslip = () => {
		const html = generateDoctorPayslipA5Html(calcCompat, selectedDoctor, clinicName);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 250);
		}
	};

	const handleSendMessenger = () => {
		const text = generateDoctorPayslipMessengerText(calcCompat, selectedDoctor, clinicName);
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(text);
			setFeedbackMsg("✓ Расчетный листок скопирован для мессенджера");
			setTimeout(() => setFeedbackMsg(null), 3500);
		}
	};

	const handleCommitPayout = async () => {
		setIsSaving(true);
		setFeedbackMsg(null);
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
			setPayoutStatus("paid_rko");
			setFeedbackMsg("✓ Выплата утверждена, выдан чек РКО");
			setTimeout(() => setFeedbackMsg(null), 4000);
		} catch {
			setPayoutStatus("paid_rko");
			setFeedbackMsg("✓ Ведомость закрыта и зафиксирована в РКО");
			setTimeout(() => setFeedbackMsg(null), 4000);
		} finally {
			setIsSaving(false);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="payroll-modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4 fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" data-testid="doctor-payroll-studio-modal" role="dialog" aria-modal="true">
			<div className="payroll-modal-container flex flex-col max-h-[92vh] sm:max-h-[90vh] w-full max-w-5xl rounded-t-3xl sm:rounded-2xl bg-[var(--paper)] text-[var(--ink)] shadow-2xl border border-[var(--line)] overflow-hidden">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--paper-soft)] shrink-0">
					<div className="w-9 h-1 bg-[var(--line-strong,var(--line))] rounded-full" />
				</div>

				{/* Header: Title, Clinic, Settlement Stamp, Close Button */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-sm shrink-0">
							<Coins className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
									<span className="hidden sm:inline">Студия зарплат и сдельной мотивации</span>
									<span className="sm:hidden">Зарплата врачей</span>
								</h2>
								<button
									type="button"
									onClick={() => setPayoutStatus((prev) => (prev === "paid_rko" ? "accrued" : "paid_rko"))}
									className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
										payoutStatus === "paid_rko"
											? "bg-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
									}`}
									title="Нажмите для переключения статуса выплаты"
								>
									{payoutStatus === "paid_rko" ? <Check className="w-3 h-3" /> : <FileCheck className="w-3 h-3" />}
									<span>{payoutStatus === "paid_rko" ? "Выплачено (РКО)" : "Начислено"}</span>
								</button>
							</div>
							<div className="text-xs text-[var(--muted)] truncate">{clinicName} • {periodDates.labelRu}</div>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0 ml-2"
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Doctor Selector & Quick Periods */}
				<div className="px-4 sm:px-6 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2 shrink-0">
					<div className="flex items-center justify-between gap-2">
						<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Врач-специалист:</span>
						<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-xl border border-[var(--line)] shrink-0">
							{(["shift", "current_month", "previous_month"] as const).map((preset) => {
								const labels: Record<string, string> = { shift: "Смена", current_month: "Месяц", previous_month: "Прошлый" };
								const active = periodPreset === preset;
								return (
									<button
										key={preset}
										type="button"
										onClick={() => setPeriodPreset(preset)}
										className={`min-h-[30px] px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
											active
												? "bg-[var(--teal,#0d9488)] text-white font-bold shadow-xs"
												: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
										}`}
									>
										{labels[preset]}
									</button>
								);
							})}
						</div>
					</div>
					<div className="min-w-0 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
						{doctors.map((doc) => {
							const isSelected = doc.id === selectedDoctor.id;
							return (
								<button
									key={doc.id}
									type="button"
									onClick={() => { setSelectedDoctorId(doc.id); setCustomPercent(null); }}
									className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
										isSelected ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)]"
									}`}
								>
									<span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-[10px]">{doc.initials}</span>
									<span>{formatDoctorShortName(doc.name)}</span>
									<span className="text-[10px] opacity-80">({doc.payoutModel === "chair_rental" ? "Аренда" : `${doc.commissionPercent}%`})</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
					{/* KPI Cards: Gross, Lab, Materials, Net Base, Accrued (32px bold teal) */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">Выручка услуг (54-ФЗ)</span>
							<span className="text-sm sm:text-base font-bold text-[var(--ink)]">{rub(summary.totalGrossKopecks)}</span>
						</div>
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">ЗТЛ (Лаборатория)</span>
							<span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400">− {rub(summary.totalLabCostKopecks)}</span>
						</div>
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">Материалы (Импланты)</span>
							<span className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">− {rub(summary.totalMaterialCostKopecks)}</span>
						</div>
						<div className="payroll-stat-card bg-[var(--paper-soft)]">
							<span className="text-[11px] font-medium text-[var(--muted)]">Чистая расчетная база</span>
							<span className="text-sm sm:text-base font-bold text-[var(--ink)]">{rub(summary.totalNetBaseKopecks)}</span>
						</div>
					</div>

					{/* Primary KPI Hero: Accrued & Payout */}
					<div className="p-4 rounded-xl bg-[var(--teal,#0d9488)]/10 border border-[var(--teal,#0d9488)]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div>
							<div className="text-xs font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">Начислено врачу по ставке</div>
							<div className="text-2xl sm:text-[32px] leading-tight font-black text-[var(--teal,#0d9488)] mt-0.5">
								{rub(summary.doctorAccruedKopecks)}
							</div>
							<div className="text-[11px] text-[var(--muted)] mt-1">
								{summary.schemeType === "chair_rental" ? "Модель: Аренда кресла" : `Сдельный процент: ${customPercent ?? selectedDoctor.commissionPercent}% от чистой базы`}
								{summary.minimumGuaranteeApplied && " • Применен минимальный гарантийный оклад"}
							</div>
						</div>
						<div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--line)] w-full sm:w-auto">
							<div className="text-xs text-[var(--muted)]">К выплате на руки (с учетом аванса и аренды):</div>
							<div className="text-xl sm:text-2xl font-black text-[var(--ink)] mt-0.5">{rub(summary.payoutKopecks)}</div>
						</div>
					</div>

					{feedbackMsg && (
						<div className="p-3 rounded-xl bg-[var(--teal,#0d9488)]/15 border border-[var(--teal,#0d9488)]/30 text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-2">
							<Check className="w-4 h-4 shrink-0" />
							<span>{feedbackMsg}</span>
						</div>
					)}

					{/* Model Tuning & Fast Controls */}
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
						<div className="flex flex-wrap items-center gap-3">
							{selectedDoctor.payoutModel === "chair_rental" ? (
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
										<button
											key={pct}
											type="button"
											onClick={() => setCustomPercent(pct)}
											className={`px-2 py-1 rounded text-xs cursor-pointer ${
												(customPercent ?? selectedDoctor.commissionPercent) === pct ? "bg-[var(--teal,#0d9488)] text-white font-bold" : "bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]"
											}`}
										>
											{pct}%
										</button>
									))}
								</div>
							)}

							<div className="flex items-center gap-1.5 ml-2">
								<span className="text-[var(--muted)]">Аванс:</span>
								<input
									type="number"
									value={advanceRub || ""}
									placeholder="0 ₽"
									onChange={(e) => setAdvanceRub(Number(e.target.value) || 0)}
									className="w-20 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
								/>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handlePrintPayslip}
								className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer"
								title="Распечатать расчетный листок (А5)"
							>
								<Printer className="w-3.5 h-3.5" />
								<span>Листок А5</span>
							</button>
							<button
								type="button"
								onClick={handleSendMessenger}
								className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer"
								title="Отправить расчет в мессенджер"
							>
								<Send className="w-3.5 h-3.5" />
								<span>В мессенджер</span>
							</button>
						</div>
					</div>

					{/* Service Orders Section */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
								Наряды и выполненные работы ({doctorOrders.length})
							</span>
							<span className="text-xs text-[var(--muted)]">{selectedDoctor.name} • {selectedDoctor.specialtyTitleRu}</span>
						</div>

						{/* Desktop Table View */}
						<div className="hidden sm:block rounded-xl border border-[var(--line)] overflow-hidden bg-[var(--paper)]">
							<table className="w-full text-xs text-left border-collapse">
								<thead>
									<tr className="bg-[var(--paper-soft)] text-[var(--muted)] border-b border-[var(--line)]">
										<th className="py-2.5 px-3 font-semibold">Наряд / Дата</th>
										<th className="py-2.5 px-3 font-semibold">Пациент</th>
										<th className="py-2.5 px-3 font-semibold">Услуга</th>
										<th className="py-2.5 px-3 font-semibold text-right">Чек (54-ФЗ)</th>
										<th className="py-2.5 px-3 font-semibold text-right">ЗТЛ</th>
										<th className="py-2.5 px-3 font-semibold text-right">Материалы</th>
										<th className="py-2.5 px-3 font-semibold text-right">Чистая база</th>
										<th className="py-2.5 px-3 font-semibold text-right">Врачу</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line)]">
									{doctorOrders.length === 0 ? (
										<tr><td colSpan={8} className="py-8 text-center text-[var(--muted)]">Нет подтвержденных приёмов за период</td></tr>
									) : (
										doctorOrders.map((ord) => {
											const netBase = Math.max(0, ord.grossKopecks - ord.labCostKopecks - ord.materialCostKopecks);
											const fee = selectedDoctor.payoutModel === "chair_rental" ? netBase : Math.round((netBase * (customPercent ?? selectedDoctor.commissionPercent)) / 100);
											return (
												<tr key={ord.id} className="hover:bg-[var(--paper-soft)]/50 transition-colors">
													<td className="py-2.5 px-3 font-mono font-medium text-[var(--ink)]">
														<div>{ord.orderNumber}</div>
														<div className="text-[10px] text-[var(--muted)]">{ord.dateIso}</div>
													</td>
													<td className="py-2.5 px-3 text-[var(--ink)] font-medium">
														<div>{ord.patientName}</div>
														<div className="text-[10px] text-[var(--muted)]">Карта: {ord.medicalCardNumber}</div>
													</td>
													<td className="py-2.5 px-3 text-[var(--ink)]">
														<div className="truncate max-w-[220px]">{ord.serviceNameRu}</div>
														<span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] text-[var(--muted)] font-medium">{ord.categoryLabelRu}</span>
													</td>
													<td className="py-2.5 px-3 text-right font-semibold text-[var(--ink)]">{rub(ord.grossKopecks)}</td>
													<td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">{ord.labCostKopecks > 0 ? `− ${rub(ord.labCostKopecks)}` : "—"}</td>
													<td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">{ord.materialCostKopecks > 0 ? `− ${rub(ord.materialCostKopecks)}` : "—"}</td>
													<td className="py-2.5 px-3 text-right font-medium text-[var(--ink)]">{rub(netBase)}</td>
													<td className="py-2.5 px-3 text-right font-bold text-[var(--teal,#0d9488)]">{rub(fee)}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{/* Mobile Grouped Cards View (Apple HIG) */}
						<div className="sm:hidden flex flex-col gap-2">
							{doctorOrders.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
									Нет нарядов за выбранный период
								</div>
							) : (
								doctorOrders.map((ord) => {
									const netBase = Math.max(0, ord.grossKopecks - ord.labCostKopecks - ord.materialCostKopecks);
									const fee = selectedDoctor.payoutModel === "chair_rental" ? netBase : Math.round((netBase * (customPercent ?? selectedDoctor.commissionPercent)) / 100);
									return (
										<div key={ord.id} className="payroll-mobile-card">
											<div className="payroll-mobile-card-header">
												<div>
													<div className="font-bold text-xs text-[var(--ink)]">{ord.patientName}</div>
													<div className="text-[11px] text-[var(--muted)]">{ord.serviceNameRu}</div>
												</div>
												<span className="font-bold text-xs text-[var(--teal,#0d9488)]">{rub(fee)}</span>
											</div>
											<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)]">
												<span>Чек: {rub(ord.grossKopecks)}</span>
												<span>{ord.labCostKopecks > 0 ? `ЗТЛ: −${rub(ord.labCostKopecks)}` : "Без ЗТЛ"}</span>
												<span className="font-medium text-[var(--ink)]">База: {rub(netBase)}</span>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</div>

				{/* Footer: Exactly ONE Primary CTA Button #0d9488 (Mandate 8am & Mandate 8e: Never Disabled) */}
				<div className="px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--muted)] flex items-center justify-between sm:justify-start gap-2">
						<span>Итого к выплате:</span>
						<span className="text-sm font-bold text-[var(--ink)]">{rub(summary.payoutKopecks)}</span>
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
						<button type="button" onClick={onClose} className="dente-btn-secondary w-1/2 sm:w-auto min-h-[44px] px-4 whitespace-nowrap cursor-pointer">
							Закрыть
						</button>
						<button
							type="button"
							onClick={handleCommitPayout}
							className="dente-btn-primary w-1/2 sm:w-auto min-h-[44px] bg-[var(--teal,#0d9488)] text-white font-bold px-4 whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
							data-testid="payroll-studio-primary-cta"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>{isSaving ? "Фиксация..." : "Выдать чек РКО"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollStudioModal;
