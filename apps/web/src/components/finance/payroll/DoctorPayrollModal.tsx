import React, { useState, useMemo } from "react";
import {
	Calculator,
	X,
	FileText,
	Download,
	Calendar,
	User,
	Award,
	Percent,
	CheckCircle2,
	DollarSign,
	Layers,
	ChevronRight,
	TrendingUp,
} from "lucide-react";
import {
	calculateDoctorPeriodPayroll,
	generatePayrollT51Csv,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
} from "./payrollEngine";
import { DOCTOR_SPECIALTY_PAYROLL_PRESETS } from "./payrollPresets";
import "./doctorPayroll.css";

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

const SAMPLE_DOCTORS = [
	{ id: "doc-1", name: "Д-р Смирнов Алексей Петрович", specialtyId: "therapist" },
	{ id: "doc-2", name: "Д-р Васильев Максим Сергеевич", specialtyId: "orthopedist" },
	{ id: "doc-3", name: "Д-р Ковалев Игорь Олегович", specialtyId: "surgeon_implantologist" },
	{ id: "doc-4", name: "Д-р Морозова Анна Дмитриевна", specialtyId: "orthodontist" },
	{ id: "doc-5", name: "Д-р Лебедева Ольга Викторовна", specialtyId: "hygienist" },
];

const SAMPLE_SERVICES: readonly DoctorCompletedServiceItem[] = [
	{
		id: "srv-1",
		dateIso: "2026-08-18",
		patientName: "Смирнова Екатерина Васильевна",
		medicalCardNumber: "043/у-2026/891",
		serviceNameRu: "Лечение пульпита 3-канального моляра",
		order804nCode: "A16.07.002.001",
		toothCode: "16",
		category: "therapy",
		grossRevenueKop: 1850000, // 18,500 RUB
		labCostKop: 0,
		materialCostKop: 120000, // 1,200 RUB
	},
	{
		id: "srv-2",
		dateIso: "2026-08-19",
		patientName: "Кузнецов Дмитрий Анатольевич",
		medicalCardNumber: "043/у-2026/742",
		serviceNameRu: "Эстетическая реставрация фронтального зуба (Estelite Asteria)",
		order804nCode: "A16.07.003",
		toothCode: "11",
		category: "therapy",
		grossRevenueKop: 920000, // 9,200 RUB
		labCostKop: 0,
		materialCostKop: 80000,
	},
	{
		id: "srv-3",
		dateIso: "2026-08-20",
		patientName: "Сидорова Светлана Сергеевна",
		medicalCardNumber: "043/у-2026/512",
		serviceNameRu: "Коронка из диоксида циркония CAD/CAM (Prettau)",
		order804nCode: "A16.07.004.002",
		toothCode: "24",
		category: "orthopedics",
		grossRevenueKop: 2800000, // 28,000 RUB
		labCostKop: 750000, // 7,500 RUB ЗТЛ
		materialCostKop: 150000, // 1,500 RUB
	},
	{
		id: "srv-4",
		dateIso: "2026-08-20",
		patientName: "Иванова Мария Сергеевна",
		medicalCardNumber: "043/у-2026/904",
		serviceNameRu: "Комплексная профессиональная гигиена Air-Flow + УЗ",
		order804nCode: "A16.07.051",
		toothCode: "18-48",
		category: "hygiene",
		grossRevenueKop: 650000, // 6,500 RUB
		labCostKop: 0,
		materialCostKop: 40000,
	},
	{
		id: "srv-5",
		dateIso: "2026-08-21",
		patientName: "Попов Артем Сергеевич",
		medicalCardNumber: "043/у-2026/651",
		serviceNameRu: "Продажа набора Curaprox Ortho 5460",
		order804nCode: "—",
		toothCode: undefined,
		category: "retail_hygiene",
		grossRevenueKop: 180000, // 1,800 RUB
		labCostKop: 0,
		materialCostKop: 0,
	},
];

export const DoctorPayrollModal: React.FC<DoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	doctorsList = SAMPLE_DOCTORS,
	initialDoctorId,
	initialServices,
	initialPeriodStart = "2026-08-01",
	initialPeriodEnd = "2026-08-31",
	initialBasePercentage,
}) => {
	const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || doctorsList[0]?.id || "doc-1");
	const [periodStart, setPeriodStart] = useState(initialPeriodStart);
	const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
	const [customPercent, setCustomPercent] = useState<number | undefined>(initialBasePercentage);
	const [manualAdjustmentRub, setManualAdjustmentRub] = useState<number>(0);

	// Sync when initial values change
	React.useEffect(() => {
		if (initialDoctorId) setSelectedDoctorId(initialDoctorId);
		if (initialPeriodStart) setPeriodStart(initialPeriodStart);
		if (initialPeriodEnd) setPeriodEnd(initialPeriodEnd);
		if (initialBasePercentage !== undefined) setCustomPercent(initialBasePercentage);
	}, [initialDoctorId, initialPeriodStart, initialPeriodEnd, initialBasePercentage]);

	const activeDoc = useMemo(() => {
		const found = doctorsList.find((d) => d.id === selectedDoctorId);
		return found ?? doctorsList[0] ?? SAMPLE_DOCTORS[0]!;
	}, [doctorsList, selectedDoctorId]);

	const servicesToUse = useMemo(() => {
		return initialServices && initialServices.length > 0 ? initialServices : SAMPLE_SERVICES;
	}, [initialServices]);

	const payrollResult: DoctorPayrollResult = useMemo(() => {
		if (!isOpen) {
			return {
				doctorId: activeDoc.id,
				doctorName: activeDoc.name,
				specialtyTitleRu: "",
				periodLabelRu: `${periodStart} — ${periodEnd}`,
				totalGrossRevenueKop: 0,
				totalLabDeductionsKop: 0,
				totalMaterialDeductionsKop: 0,
				totalNetBaseKop: 0,
				baseCommissionPercent: 0,
				earnedBaseCommissionKop: 0,
				kpiBonusPercent: 0,
				kpiBonusEarnedKop: 0,
				kpiTierBadgeRu: "",
				earnedRetailCommissionKop: 0,
				grossPayoutBeforeTaxKop: 0,
				ndfl13TaxKop: 0,
				netPayoutToDoctorKop: 0,
				minimumGuaranteeApplied: false,
				manualAdjustmentKop: 0,
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
		a.download = `payroll_${payrollResult.doctorId}_${periodStart}.csv`;
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
								Врач / Специалист:
							</label>
							<select
								value={selectedDoctorId}
								onChange={(e) => setSelectedDoctorId(e.target.value)}
								className="h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
							>
								{doctorsList.map((doc) => (
									<option key={doc.id} value={doc.id}>
										{doc.name}
									</option>
								))}
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
							<span className="text-[10px] text-[var(--teal,#0d9488)] truncate">
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
