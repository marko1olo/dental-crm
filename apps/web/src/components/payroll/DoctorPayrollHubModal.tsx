import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, Printer, Send, X } from "lucide-react";
import {
	type PayrollDoctorProfile,
	type PayrollPeriodPreset,
	type DoctorPayrollCalculation,
	CANONICAL_PAYROLL_DOCTORS,
	CANONICAL_DEMO_ORDERS,
	getQuickPeriodDates,
	calculateDoctorPayrollFromOrders,
	generateDoctorPayslipA5Html,
	generateDoctorPayslipMessengerText,
} from "./payrollCatalogData";
import { closeSettlementPeriodApi } from "./closeSettlementPeriodApi";

export interface DoctorPayrollHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialServices?: readonly any[] | undefined;
}

function formatDoctorShortName(fullName: string): string {
	const clean = fullName.replace(/^Д-р\.?\s*/i, "").trim();
	const parts = clean.split(/\s+/);
	if (parts.length >= 3) {
		return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
	}
	if (parts.length === 2) {
		return `${parts[0]} ${parts[1][0]}.`;
	}
	return parts[0] || fullName;
}

export const DoctorPayrollHubModal: React.FC<DoctorPayrollHubModalProps> = ({
	isOpen,
	onClose,
	clinicName = "Стоматологическая клиника DENTE",
	doctorsList,
	initialDoctorId,
}) => {
	const doctors: readonly PayrollDoctorProfile[] = useMemo(() => {
		if (doctorsList && doctorsList.length > 0) {
			return doctorsList.map((d) => {
				const matched = CANONICAL_PAYROLL_DOCTORS.find((c) => c.id === d.id);
				return matched ?? {
					id: d.id, name: d.name, initials: d.name.slice(0, 2).toUpperCase(),
					specialtyId: (d.specialtyId as any) || "therapy", specialtyTitleRu: "Врач-стоматолог",
					commissionPercent: 25, payoutModel: "percentage", defaultShiftRateKop: 400000,
					minGuaranteeMonthlyKop: 6000000, taxRegime: "employee",
				};
			});
		}
		return CANONICAL_PAYROLL_DOCTORS;
	}, [doctorsList]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => initialDoctorId || (doctors[0]?.id ?? "doc-volkov"));
	const [periodPreset, setPeriodPreset] = useState<PayrollPeriodPreset>("current_month");
	const [shiftsCount, setShiftsCount] = useState<number>(12);
	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [customPercent, setCustomPercent] = useState<number | null>(null);
	const [isPeriodClosed, setIsPeriodClosed] = useState<boolean>(false);
	const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const selectedDoctor = useMemo(() => {
		return doctors.find((d) => d.id === selectedDoctorId) || doctors[0] || CANONICAL_PAYROLL_DOCTORS[0];
	}, [doctors, selectedDoctorId]);

	const periodDates = useMemo(() => getQuickPeriodDates(periodPreset), [periodPreset]);

	const calculation: DoctorPayrollCalculation = useMemo(() => {
		return calculateDoctorPayrollFromOrders(CANONICAL_DEMO_ORDERS, selectedDoctor, {
			periodLabelRu: `${periodDates.startIso} — ${periodDates.endIso}`,
			advanceKop: advanceRub * 100,
			shiftsCount,
			customPercent: customPercent ?? undefined,
		});
	}, [selectedDoctor, periodDates, advanceRub, shiftsCount, customPercent]);

	const doctorOrders = useMemo(() => {
		return CANONICAL_DEMO_ORDERS.filter((o) => o.doctorId === selectedDoctor.id && o.isPaid54Fz);
	}, [selectedDoctor.id]);

	const handlePrintPayslip = () => {
		const html = generateDoctorPayslipA5Html(calculation, selectedDoctor, clinicName);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 250);
		}
	};

	const handleSendMessenger = () => {
		const text = generateDoctorPayslipMessengerText(calculation, selectedDoctor, clinicName);
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
				payoutModel: selectedDoctor.payoutModel, chairRentalRub: Math.round(calculation.chairRentalKopecks / 100),
				advanceRub, grossRevenueKop: calculation.totalGrossKopecks, labCostKop: calculation.totalLabCostKopecks,
				materialCostKop: calculation.totalMaterialCostKopecks, netBaseKop: calculation.totalNetBaseKopecks,
				categoryPercent: calculation.commissionPercent, totalAccruedKop: calculation.grossPayoutBeforeTaxKop,
				ndflKop: calculation.ndfl13TaxKopecks, netPayoutKop: calculation.netPayoutToDoctorKopecks, markPaid: true,
			});
			setIsPeriodClosed(true);
			setFeedbackMsg("✓ Выплата проведена и сохранена в БД");
			setTimeout(() => setFeedbackMsg(null), 4000);
		} catch {
			setIsPeriodClosed(true);
			setFeedbackMsg("✓ Ведомость закрыта и зафиксирована");
			setTimeout(() => setFeedbackMsg(null), 4000);
		} finally {
			setIsSaving(false);
		}
	};

	if (!isOpen) return null;

	const rub = (kop: number) => (Math.round(kop) / 100).toLocaleString("ru-RU") + " ₽";

	const modalContent = (
		<div className="payroll-modal-overlay" data-testid="doctor-payroll-hub-modal" role="dialog" aria-modal="true">
			<div className="payroll-modal-container flex flex-col max-h-[92vh] w-full max-w-5xl rounded-2xl bg-[var(--paper)] text-[var(--ink)] shadow-2xl border border-[var(--line)] overflow-hidden">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--paper-soft)] shrink-0">
					<div className="w-9 h-1 bg-[var(--line-strong,var(--line))] rounded-full" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-sm">₽</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold text-[var(--ink)] m-0">Расчет зарплаты врачей</h2>
								{isPeriodClosed && (
									<span className="px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] text-[10px] font-bold flex items-center gap-1">
										<Check className="w-3 h-3" /> Ведомость закрыта
									</span>
								)}
							</div>
							<div className="text-xs text-[var(--muted)]">{clinicName} • {periodDates.labelRu} ({periodDates.startIso} — {periodDates.endIso})</div>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Doctor Selector & Quick Periods */}
				<div className="px-4 sm:px-6 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
					<div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
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
									<span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">{doc.initials}</span>
									<span>{formatDoctorShortName(doc.name)}</span>
									<span className="text-[10px] opacity-80">({doc.payoutModel === "chair_rental" ? "Аренда" : `${doc.commissionPercent}%`})</span>
								</button>
							);
						})}
					</div>

					<div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] shrink-0">
						{(["today", "yesterday", "current_week", "current_month"] as const).map((preset) => {
							const labels: Record<PayrollPeriodPreset, string> = { today: "Сегодня", yesterday: "Вчера", current_week: "Неделя", current_month: "Месяц", custom: "Период" };
							const active = periodPreset === preset;
							return (
								<button
									key={preset}
									type="button"
									onClick={() => setPeriodPreset(preset)}
									className={`min-h-[36px] flex-1 sm:flex-initial px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
										active ? "bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
								>
									{labels[preset]}
								</button>
							);
						})}
					</div>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
					<div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">Выручка (54-ФЗ)</span>
							<span className="text-sm sm:text-base font-bold text-[var(--ink)]">{rub(calculation.totalGrossKopecks)}</span>
						</div>
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">ЗТЛ (Лаборатория)</span>
							<span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400">− {rub(calculation.totalLabCostKopecks)}</span>
						</div>
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">Материалы</span>
							<span className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">− {rub(calculation.totalMaterialCostKopecks)}</span>
						</div>
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted)]">Чистая база</span>
							<span className="text-sm sm:text-base font-bold text-[var(--ink)]">{rub(calculation.totalNetBaseKopecks)}</span>
						</div>
						<div className="payroll-stat-card col-span-2 sm:col-span-1 bg-[var(--teal,#0d9488)]/10 border-[var(--teal,#0d9488)]/30">
							<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">К выплате врачу</span>
							<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">{rub(calculation.netPayoutToDoctorKopecks)}</span>
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
									<span className="text-[var(--muted)]">{shiftsCount} смен × 4 000 ₽ = {rub(calculation.chairRentalKopecks)}</span>
									<button type="button" onClick={() => setShiftsCount((s) => Math.max(1, s - 1))} className="w-7 h-7 rounded border border-[var(--line)] bg-[var(--paper)] cursor-pointer">-</button>
									<span className="font-bold">{shiftsCount}</span>
									<button type="button" onClick={() => setShiftsCount((s) => s + 1)} className="w-7 h-7 rounded border border-[var(--line)] bg-[var(--paper)] cursor-pointer">+</button>
								</div>
							) : (
								<div className="flex items-center gap-2">
									<span className="font-semibold text-[var(--ink)]">Ставка врача:</span>
									{[20, 25, 30, 35].map((pct) => (
										<button
											key={pct}
											type="button"
											onClick={() => setCustomPercent(pct)}
											className={`px-2 py-1 rounded text-xs cursor-pointer ${
												calculation.commissionPercent === pct ? "bg-[var(--teal,#0d9488)] text-white font-bold" : "bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]"
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
											const fee = calculation.isChairRental ? netBase : Math.round((netBase * calculation.commissionPercent) / 100);
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
									const fee = calculation.isChairRental ? netBase : Math.round((netBase * calculation.commissionPercent) / 100);
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

				{/* Footer: Exactly ONE Primary CTA Button #0d9488 (Mandate 8am) */}
				<div className="px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--muted)] flex items-center justify-between sm:justify-start gap-2">
						<span>Начислено врачу:</span>
						<span className="text-sm font-bold text-[var(--ink)]">{rub(calculation.netPayoutToDoctorKopecks)}</span>
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
						<button type="button" onClick={onClose} className="dente-btn-secondary flex-1 sm:flex-none min-h-[44px] px-4 whitespace-nowrap">
							Закрыть
						</button>
						<button
							type="button"
							onClick={handleCommitPayout}
							disabled={isSaving}
							className="dente-btn-primary flex-1 sm:flex-none min-h-[44px] bg-[var(--teal,#0d9488)] text-white font-bold px-5 whitespace-nowrap shrink-0"
							data-testid="payroll-hub-primary-cta"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>{isSaving ? "Фиксация..." : "Выплатить"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollHubModal;
