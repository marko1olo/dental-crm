import React, { useState, useMemo } from "react";
import {
	Calculator,
	X,
	FileText,
	Download,
	Calendar,
	User,
} from "lucide-react";
import {
	calculateDoctorPeriodPayroll,
	generatePayrollT51Csv,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
} from "./payrollEngine";
import {
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
} from "./payrollPresets";
import "./doctorPayroll.css";

export const DEFAULT_SOLO_DOCTOR = {
	id: "solo-doctor",
	name: "Лечащий врач (соло-практика)",
	specialtyId: "general_dentist",
} as const;

export { SOLO_DOCTOR_SPECIALTY_PRESETS, type SoloDoctorSpecialtyPreset };

export interface DoctorPayrollModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialServices?: readonly DoctorCompletedServiceItem[] | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
	readonly initialBasePercentage?: number | undefined;
}

export const DoctorPayrollModal: React.FC<DoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	doctorsList = [],
	initialDoctorId,
	initialServices,
	initialPeriodStart = "2026-08-01",
	initialPeriodEnd = "2026-08-31",
	initialBasePercentage,
}) => {
	const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || doctorsList[0]?.id || "");
	const [soloSpecialtyId, setSoloSpecialtyId] = useState<string>(() => {
		if (initialDoctorId && initialDoctorId !== "solo-doctor") {
			const matched = SOLO_DOCTOR_SPECIALTY_PRESETS.find((s) => s.specialtyId === initialDoctorId);
			if (matched) return matched.specialtyId;
		}
		return DEFAULT_SOLO_DOCTOR.specialtyId;
	});
	const [periodStart, setPeriodStart] = useState(initialPeriodStart);
	const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
	const [customPercent, setCustomPercent] = useState<number | undefined>(initialBasePercentage);
	const [manualAdjustmentRub, setManualAdjustmentRub] = useState<number>(0);

	// Sync when initial values change
	React.useEffect(() => {
		if (initialDoctorId) {
			setSelectedDoctorId(initialDoctorId);
			if (initialDoctorId === "solo-doctor") {
				setSoloSpecialtyId(DEFAULT_SOLO_DOCTOR.specialtyId);
			} else {
				const matched = SOLO_DOCTOR_SPECIALTY_PRESETS.find((s) => s.specialtyId === initialDoctorId);
				if (matched) setSoloSpecialtyId(matched.specialtyId);
			}
		} else if (doctorsList.length > 0 && !doctorsList.some((d) => d.id === selectedDoctorId)) {
			setSelectedDoctorId(doctorsList[0]?.id ?? "");
		}
		if (initialPeriodStart) setPeriodStart(initialPeriodStart);
		if (initialPeriodEnd) setPeriodEnd(initialPeriodEnd);
		if (initialBasePercentage !== undefined) setCustomPercent(initialBasePercentage);
	}, [initialDoctorId, initialPeriodStart, initialPeriodEnd, initialBasePercentage, doctorsList, selectedDoctorId]);

	const activeDoc = useMemo(() => {
		if (doctorsList.length === 0) {
			const specId =
				soloSpecialtyId === "solo-doctor" || !soloSpecialtyId
					? DEFAULT_SOLO_DOCTOR.specialtyId
					: soloSpecialtyId;
			return {
				id: DEFAULT_SOLO_DOCTOR.id,
				name: DEFAULT_SOLO_DOCTOR.name,
				specialtyId: specId,
			};
		}
		const found = doctorsList.find((d) => d.id === selectedDoctorId);
		return found ?? doctorsList[0] ?? null;
	}, [doctorsList, selectedDoctorId, soloSpecialtyId]);

	const servicesToUse = useMemo(() => {
		return initialServices ?? [];
	}, [initialServices]);

	const payrollResult: DoctorPayrollResult = useMemo(() => {
		if (!isOpen || !activeDoc) {
			return {
				doctorId: activeDoc?.id ?? "",
				doctorName: activeDoc?.name ?? "Сотрудник не выбран",
				specialtyTitleRu: "—",
				periodLabelRu: `${periodStart} — ${periodEnd}`,
				totalGrossRevenueKop: 0,
				totalLabDeductionsKop: 0,
				totalMaterialDeductionsKop: 0,
				totalNetBaseKop: 0,
				baseCommissionPercent: customPercent ?? 0,
				earnedBaseCommissionKop: 0,
				kpiBonusPercent: 0,
				kpiBonusEarnedKop: 0,
				kpiTierBadgeRu: "—",
				earnedRetailCommissionKop: 0,
				grossPayoutBeforeTaxKop: 0,
				ndfl13TaxKop: 0,
				netPayoutToDoctorKop: 0,
				minimumGuaranteeApplied: false,
				manualAdjustmentKop: 0,
				totalRefundDeductionsKop: 0,
				totalRefundClawbackKop: 0,
				refundedServicesCount: 0,
				serviceCount: 0,
			};
		}
		return calculateDoctorPeriodPayroll({
			doctorId: activeDoc.id,
			doctorName: activeDoc.name,
			specialtyId: activeDoc.specialtyId,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			services: servicesToUse,
			customBasePercentage: customPercent,
			manualAdjustmentKop: Math.round(manualAdjustmentRub * 100),
		});
	}, [isOpen, activeDoc, periodStart, periodEnd, servicesToUse, customPercent, manualAdjustmentRub]);

	if (!isOpen) return null;

	const handleDownloadCsv = () => {
		const csv = generatePayrollT51Csv([payrollResult]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `payroll_${payrollResult.doctorId || "report"}_${periodStart}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="payroll-modal-overlay" data-testid="doctor-payroll-modal">
			<div className="payroll-modal-container">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30">
							<Calculator className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Сдельная зарплата и расчетный листок
								<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
									Т-51 / НДФЛ 13%
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicName} • Автоматический вычет материалов и зуботехнической лаборатории
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* Filter Controls */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
								<User className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								{doctorsList.length === 0 ? "Врач / Специализация (соло):" : "Врач / Специалист:"}
							</label>
							<select
								value={doctorsList.length === 0 ? soloSpecialtyId : selectedDoctorId}
								onChange={(e) => {
									if (doctorsList.length === 0) {
										const val = e.target.value === "solo-doctor" ? DEFAULT_SOLO_DOCTOR.specialtyId : e.target.value;
										setSoloSpecialtyId(val);
									} else {
										setSelectedDoctorId(e.target.value);
									}
								}}
								disabled={false}
								data-testid="doctor-payroll-select"
								className="h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{doctorsList.length === 0 ? (
									SOLO_DOCTOR_SPECIALTY_PRESETS.map((spec) => (
										<option key={spec.specialtyId} value={spec.specialtyId}>
											{spec.labelRu}
										</option>
									))
								) : (
									doctorsList.map((doc) => (
										<option key={doc.id} value={doc.id}>
											{doc.name}
										</option>
									))
								)}
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								Начало периода:
							</label>
							<input
								type="date"
								value={periodStart}
								onChange={(e) => setPeriodStart(e.target.value)}
								className="h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								Конец периода:
							</label>
							<input
								type="date"
								value={periodEnd}
								onChange={(e) => setPeriodEnd(e.target.value)}
								className="h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
							/>
						</div>
					</div>

					{/* 4 Summary Stat Cards */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Выручка брутто</span>
							<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
								{(payrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								{payrollResult.serviceCount} услуг оказано
							</span>
						</div>

						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Вычеты (Мат/Лаб)</span>
							<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
								-{( (payrollResult.totalLabDeductionsKop + payrollResult.totalMaterialDeductionsKop) / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								База: {(payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Ставка + KPI</span>
							<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">
								{payrollResult.baseCommissionPercent}% {payrollResult.kpiBonusPercent > 0 ? `+ ${payrollResult.kpiBonusPercent}%` : ""}
							</span>
							<span className="text-[10px] text-[var(--teal,#0d9488)] truncate" title={payrollResult.kpiTierBadgeRu}>
								{payrollResult.kpiTierBadgeRu}
							</span>
						</div>

						<div className="payroll-stat-card border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)]">
							<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">Итого на руки (нетто)</span>
							<span className="text-base sm:text-lg font-black text-[var(--ok-fg,#059669)]">
								{(payrollResult.netPayoutToDoctorKop / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								НДФЛ 13%: {(payrollResult.ndfl13TaxKop / 100).toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					{/* Service Breakdown Table */}
					<div className="flex flex-col gap-2">
						<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
							Детализация выполненных нарядов и приемов за период:
						</h3>
						{servicesToUse.length === 0 ? (
							<div
								className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
								data-testid="doctor-payroll-services-empty"
							>
								<FileText className="w-8 h-8 text-[var(--muted,#64748b)]/60" />
								<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
									Нет подтвержденных оказанных услуг за выбранный расчетный период
								</p>
								<p className="text-xs text-[var(--muted,#64748b)]">
									За выбранный диапазон дат у специалиста не зафиксировано выполненных приемов или закрытых нарядов
								</p>
							</div>
						) : (
							<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs">
										<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
											<tr>
												<th className="p-2.5 font-semibold">Дата</th>
												<th className="p-2.5 font-semibold">Пациент</th>
												<th className="p-2.5 font-semibold">Услуга / Код 804н / Зуб</th>
												<th className="p-2.5 font-semibold text-right">Выручка</th>
												<th className="p-2.5 font-semibold text-right">Материалы</th>
												<th className="p-2.5 font-semibold text-right">ЗТЛ</th>
												<th className="p-2.5 font-semibold text-right">Начислено</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
											{servicesToUse.map((srv) => {
												const net = srv.grossRevenueKop - srv.labCostKop - srv.materialCostKop;
												const earned = Math.round((net * payrollResult.baseCommissionPercent) / 100);
												return (
													<tr key={srv.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
														<td className="p-2.5 font-medium whitespace-nowrap">{srv.dateIso}</td>
														<td className="p-2.5 font-medium">
															<div>{srv.patientName}</div>
															<div className="text-[10px] text-[var(--muted,#64748b)]">Карта: {srv.medicalCardNumber}</div>
														</td>
														<td className="p-2.5 text-[var(--ink,#0f172a)]">
															<div className="font-medium">{srv.serviceNameRu}</div>
															<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
																{srv.order804nCode && (
																	<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
																		804н: {srv.order804nCode}
																	</span>
																)}
																{srv.toothCode && (
																	<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]">
																		Зуб {srv.toothCode}
																	</span>
																)}
															</div>
														</td>
														<td className="p-2.5 font-bold text-right whitespace-nowrap">
															{(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
														</td>
														<td className="p-2.5 text-rose-600 dark:text-rose-400 text-right whitespace-nowrap">
															{srv.materialCostKop > 0 ? `- ${(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
														</td>
														<td className="p-2.5 text-amber-600 dark:text-amber-400 text-right whitespace-nowrap font-medium">
															{srv.labCostKop > 0 ? `- ${(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
														</td>
														<td className="p-2.5 font-bold text-[var(--teal,#0d9488)] text-right whitespace-nowrap">
															{(earned / 100).toLocaleString("ru-RU")} ₽
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Специальность: <span className="font-bold text-[var(--ink,#0f172a)]">{payrollResult.specialtyTitleRu}</span>
					</div>
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleDownloadCsv}
							className="h-10 px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Download className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Экспорт Т-51 (CSV)
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="h-10 px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-90 text-[var(--on-teal,#ffffff)] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
						>
							<FileText className="w-4 h-4" />
							Печать расчетного листка
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
