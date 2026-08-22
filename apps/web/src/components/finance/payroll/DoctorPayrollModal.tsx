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
	readonly clinicName?: string;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
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
		serviceNameRu: "Лечение пульпита 3-канального моляра (зуб 16)",
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
		serviceNameRu: "Эстетическая реставрация фронтального зуба (зуб 11, Estelite Asteria)",
		category: "therapy",
		grossRevenueKop: 920000, // 9,200 RUB
		labCostKop: 0,
		materialCostKop: 80000,
	},
	{
		id: "srv-3",
		dateIso: "2026-08-20",
		patientName: "Иванова Мария Сергеевна",
		medicalCardNumber: "043/у-2026/904",
		serviceNameRu: "Комплексная профессиональная гигиена Air-Flow + УЗ",
		category: "hygiene",
		grossRevenueKop: 650000, // 6,500 RUB
		labCostKop: 0,
		materialCostKop: 40000,
	},
	{
		id: "srv-4",
		dateIso: "2026-08-21",
		patientName: "Попов Артем Сергеевич",
		medicalCardNumber: "043/у-2026/651",
		serviceNameRu: "Продажа набора Curaprox Ortho 5460",
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
}) => {
	const [selectedDoctorId, setSelectedDoctorId] = useState(doctorsList[0]?.id || "doc-1");
	const [periodStart, setPeriodStart] = useState("2026-08-01");
	const [periodEnd, setPeriodEnd] = useState("2026-08-31");
	const [customPercent, setCustomPercent] = useState<number | undefined>(undefined);
	const [manualAdjustmentRub, setManualAdjustmentRub] = useState<number>(0);

	const activeDoc = useMemo(() => {
		const found = doctorsList.find((d) => d.id === selectedDoctorId);
		return found ?? doctorsList[0] ?? SAMPLE_DOCTORS[0]!;
	}, [doctorsList, selectedDoctorId]);

	const payrollResult: DoctorPayrollResult = useMemo(() => {
		return calculateDoctorPeriodPayroll({
			doctorId: activeDoc.id,
			doctorName: activeDoc.name,
			specialtyId: activeDoc.specialtyId,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			services: SAMPLE_SERVICES,
			customBasePercentage: customPercent,
			manualAdjustmentKop: Math.round(manualAdjustmentRub * 100),
		});
	}, [activeDoc, periodStart, periodEnd, customPercent, manualAdjustmentRub]);

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
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<Calculator className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Сдельная зарплата и расчетный листок
								<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
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
								<User className="w-3.5 h-3.5 text-teal-600" />
								Врач / Специалист:
							</label>
							<select
								value={selectedDoctorId}
								onChange={(e) => setSelectedDoctorId(e.target.value)}
								className="h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
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
								<Calendar className="w-3.5 h-3.5 text-teal-600" />
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
								<Calendar className="w-3.5 h-3.5 text-teal-600" />
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
							<span className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400">
								{payrollResult.baseCommissionPercent}% {payrollResult.kpiBonusPercent > 0 ? `+ ${payrollResult.kpiBonusPercent}%` : ""}
							</span>
							<span className="text-[10px] text-teal-700 dark:text-teal-300 truncate">
								{payrollResult.kpiTierBadgeRu}
							</span>
						</div>

						<div className="payroll-stat-card border-teal-500/40 bg-teal-500/5">
							<span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">Итого на руки (нетто)</span>
							<span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
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
							Детализация выполненных нарядов за период:
						</h3>
						<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
										<tr>
											<th className="p-2.5 font-semibold">Дата</th>
											<th className="p-2.5 font-semibold">Пациент</th>
											<th className="p-2.5 font-semibold">Услуга</th>
											<th className="p-2.5 font-semibold text-right">Сумма</th>
											<th className="p-2.5 font-semibold text-right">Расход</th>
											<th className="p-2.5 font-semibold text-right">Врачу</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{SAMPLE_SERVICES.map((srv) => {
											const net = srv.grossRevenueKop - srv.labCostKop - srv.materialCostKop;
											const earned = Math.round((net * payrollResult.baseCommissionPercent) / 100);
											return (
												<tr key={srv.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
													<td className="p-2.5 font-medium whitespace-nowrap">{srv.dateIso}</td>
													<td className="p-2.5 font-medium">
														<div>{srv.patientName}</div>
														<div className="text-[10px] text-[var(--muted,#64748b)]">{srv.medicalCardNumber}</div>
													</td>
													<td className="p-2.5 text-[var(--ink,#0f172a)]">{srv.serviceNameRu}</td>
													<td className="p-2.5 font-bold text-right whitespace-nowrap">
														{(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td className="p-2.5 text-rose-600 text-right whitespace-nowrap">
														{( (srv.labCostKop + srv.materialCostKop) / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td className="p-2.5 font-bold text-teal-600 text-right whitespace-nowrap">
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
							<Download className="w-4 h-4 text-teal-600" />
							Экспорт Т-51 (CSV)
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
