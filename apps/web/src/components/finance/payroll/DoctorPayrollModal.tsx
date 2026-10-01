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
	filterServicesForDoctor,
	generatePayrollT51Csv,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
	type DoctorPayrollStornoLineItem,
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
		const raw = initialServices ?? [];
		if (!activeDoc) return raw;
		return filterServicesForDoctor(raw, activeDoc.id);
	}, [initialServices, activeDoc]);

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
				stornoItems: [],
				warrantyServicesCount: 0,
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

	const handlePrintPayslip = () => {
		const printWindow = window.open("", "_blank", "width=800,height=900");
		if (!printWindow) {
			window.print();
			return;
		}

		const grossRub = (payrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const labRub = (payrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const matRub = (payrollResult.totalMaterialDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const netBaseRub = (payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const baseCommRub = (payrollResult.earnedBaseCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const retailRub = (payrollResult.earnedRetailCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const kpiRub = (payrollResult.kpiBonusEarnedKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const grossPayoutRub = (payrollResult.grossPayoutBeforeTaxKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const ndflRub = (payrollResult.ndfl13TaxKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const netToDocRub = (payrollResult.netPayoutToDoctorKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });

		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Расчетный листок — ${payrollResult.doctorName}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111827; margin: 0; padding: 10px; }
		.header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; }
		.header h1 { font-size: 16pt; margin: 0 0 4px 0; color: #0f172a; }
		.header p { font-size: 10pt; color: #475569; margin: 0; }
		.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 10pt; }
		.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
		.table th, .table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
		.table th { background: #f1f5f9; font-weight: 600; font-size: 9pt; }
		.table td.num { text-align: right; }
		.summary-box { background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
		.summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10pt; }
		.summary-row.total { font-size: 13pt; font-weight: bold; border-top: 1px solid #0d9488; padding-top: 8px; color: #0f766e; }
		.signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 10pt; }
		.signature-line { width: 200px; border-bottom: 1px solid #475569; margin-top: 25px; }
	</style>
</head>
<body>
	<div class="header">
		<h1>РАСЧЕТНЫЙ ЛИСТОК ЗА ПЕРИОД</h1>
		<p>${clinicName} • Ст. 136 ТК РФ</p>
	</div>

	<div class="meta-grid">
		<div><strong>Сотрудник:</strong> ${payrollResult.doctorName}</div>
		<div><strong>Период:</strong> ${payrollResult.periodLabelRu}</div>
		<div><strong>Специальность:</strong> ${payrollResult.specialtyTitleRu}</div>
		<div><strong>Ставка сдельная:</strong> ${payrollResult.baseCommissionPercent}%</div>
	</div>

	<table class="table">
		<thead>
			<tr>
				<th>Показатель начисления / удержания</th>
				<th style="width: 140px; text-align: right;">Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			<tr><td>Выручка от оказанных услуг (Gross)</td><td class="num">${grossRub} ₽</td></tr>
			<tr><td>Удержание: Зуботехническая лаборатория (ЗТЛ)</td><td class="num" style="color: #b91c1c;">-${labRub} ₽</td></tr>
			<tr><td>Удержание: Дорогостоящие расходные материалы</td><td class="num" style="color: #b91c1c;">-${matRub} ₽</td></tr>
			<tr style="background: #f8fafc; font-weight: 600;"><td>Чистая сдельная база (Net Base)</td><td class="num">${netBaseRub} ₽</td></tr>
			<tr><td>Начислено: Сдельная оплата (${payrollResult.baseCommissionPercent}%)</td><td class="num">${baseCommRub} ₽</td></tr>
			<tr><td>Начислено: Продажа средств гигиены (Retail)</td><td class="num">${retailRub} ₽</td></tr>
			<tr><td>Премия: Выполнение нормативов KPI (${payrollResult.kpiTierBadgeRu})</td><td class="num">${kpiRub} ₽</td></tr>
			${payrollResult.manualAdjustmentKop !== 0 ? `<tr><td>Корректировка / Аванс</td><td class="num">${(payrollResult.manualAdjustmentKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>` : ""}
		</tbody>
	</table>

	<div class="summary-box">
		<div class="summary-row">
			<span>Всего начислено (до налогообложения):</span>
			<strong>${grossPayoutRub} ₽</strong>
		</div>
		<div class="summary-row" style="color: #b91c1c;">
			<span>Удержан НДФЛ 13% (п. 6 ст. 225 НК РФ):</span>
			<span>-${ndflRub} ₽</span>
		</div>
		<div class="summary-row total">
			<span>К ВЫПЛАТЕ («НА РУКИ»):</span>
			<span>${netToDocRub} ₽</span>
		</div>
	</div>

	<div class="signatures">
		<div>
			<div>Руководитель клиники / Главврач:</div>
			<div class="signature-line"></div>
		</div>
		<div>
			<div>Врач-специалист (подпись):</div>
			<div class="signature-line"></div>
		</div>
	</div>

	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>`;

		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
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
									Расчет зарплаты / НДФЛ 13%
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
								{payrollResult.serviceCount} услуг
								{payrollResult.warrantyServicesCount > 0 ? ` • ${payrollResult.warrantyServicesCount} гарантия` : ""}
								{payrollResult.refundedServicesCount > 0 ? ` • ${payrollResult.refundedServicesCount} возврат` : ""}
							</span>
						</div>

						<div className="payroll-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Вычеты (Мат/Лаб)</span>
							<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
								-{( (payrollResult.totalLabDeductionsKop + payrollResult.totalMaterialDeductionsKop) / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								{payrollResult.totalRefundClawbackKop > 0
									? `Сторно возвратов: -${(payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU")} ₽`
									: `База: ${(payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU")} ₽`}
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
												<th className="p-2.5 font-semibold">Услуга / Код / Зуб</th>
												<th className="p-2.5 font-semibold text-right">Выручка</th>
												<th className="p-2.5 font-semibold text-right">Материалы</th>
												<th className="p-2.5 font-semibold text-right">ЗТЛ</th>
												<th className="p-2.5 font-semibold text-right">Начислено</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
											{servicesToUse.map((srv) => {
												const isWarranty = srv.isWarrantyRework;
												const isFullyRefunded = srv.isRefunded === true || (srv.refundedAmountKop !== undefined && srv.refundedAmountKop >= srv.grossRevenueKop);
												const hasPartialRefund = !isFullyRefunded && (srv.refundedAmountKop ?? 0) > 0;
												const effectiveGrossKop = Math.max(0, srv.grossRevenueKop - (srv.refundedAmountKop ?? 0));
												const net = isWarranty ? 0 : Math.max(0, effectiveGrossKop - srv.labCostKop - srv.materialCostKop);
												let earned = 0;
												if (isWarranty) {
													if (srv.warrantyType === "clinic_warranty" || srv.warrantyType === "lab_warranty") {
														earned = srv.warrantyFixedCompensationKop ?? 0;
													}
												} else if (!isFullyRefunded) {
													earned = Math.round((net * (srv.customCommissionPercent ?? payrollResult.baseCommissionPercent)) / 100);
												}

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
																		Код: {srv.order804nCode}
																	</span>
																)}
																{srv.toothCode && (
																	<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]">
																		Зуб {srv.toothCode}
																	</span>
																)}
																{srv.paymentSource === "family_deposit" && (
																	<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
																		Семейный депозит
																	</span>
																)}
																{isWarranty && (
																	<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																		Гарантия {srv.warrantyType === "doctor_fault" ? "(вина врача: 0 ₽)" : "(клиника / ЗТЛ)"}
																	</span>
																)}
																{isFullyRefunded && (
																	<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
																		Возврат / Сторно
																	</span>
																)}
																{hasPartialRefund && (
																	<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																		Частичный возврат
																	</span>
																)}
															</div>
														</td>
														<td className="p-2.5 font-bold text-right whitespace-nowrap">
															{isWarranty ? "0 ₽" : `${(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽`}
														</td>
														<td className="p-2.5 text-rose-600 dark:text-rose-400 text-right whitespace-nowrap">
															{srv.materialCostKop > 0 ? `- ${(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
														</td>
														<td className="p-2.5 text-amber-600 dark:text-amber-400 text-right whitespace-nowrap font-medium">
															{srv.labCostKop > 0 ? `- ${(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
														</td>
														<td className="p-2.5 font-bold text-[var(--teal,#0d9488)] text-right whitespace-nowrap">
															{isFullyRefunded
																? "0 ₽ (сторно)"
																: `${(earned / 100).toLocaleString("ru-RU")} ₽`}
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

					{/* Storno Details Section */}
					{payrollResult.stornoItems.length > 0 && (
						<div className="flex flex-col gap-2" data-testid="doctor-payroll-storno-section">
							<h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
								<span>Сторно комиссий при возвратах и перерасчётах:</span>
								<span className="text-[10px] font-normal normal-case text-[var(--muted,#64748b)]">
									(Автоматическое сторнирование начислений при возврате денег пациенту)
								</span>
							</h4>
							<div className="border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden bg-rose-50/30 dark:bg-rose-950/20">
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs">
										<thead className="bg-rose-100/50 dark:bg-rose-900/40 border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
											<tr>
												<th className="p-2.5 font-semibold">Дата</th>
												<th className="p-2.5 font-semibold">Чек / Документ</th>
												<th className="p-2.5 font-semibold">Услуга / Основание</th>
												<th className="p-2.5 font-semibold text-right">Возврат пациенту</th>
												<th className="p-2.5 font-semibold text-right">Сторно комиссии</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-rose-200/60 dark:divide-rose-900/40">
											{payrollResult.stornoItems.map((storno) => (
												<tr key={storno.id} className="hover:bg-rose-100/30 dark:hover:bg-rose-900/20 transition-colors">
													<td className="p-2.5 font-medium whitespace-nowrap">{storno.dateIso}</td>
													<td className="p-2.5 font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</td>
													<td className="p-2.5 text-[var(--ink,#0f172a)]">
														<div className="font-semibold">{storno.serviceNameRu}</div>
														<div className="text-[10px] text-rose-600 dark:text-rose-400">{storno.reasonRu}</div>
														<div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">{storno.labelRu}</div>
													</td>
													<td className="p-2.5 font-bold text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
														-{(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td className="p-2.5 font-black text-right text-rose-700 dark:text-rose-300 whitespace-nowrap">
														-{(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
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
							Экспорт зарплаты (CSV)
						</button>
						<button
							type="button"
							onClick={handlePrintPayslip}
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
