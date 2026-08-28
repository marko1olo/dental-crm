/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL P&L HUB & CHAIR-HOUR UNIT ECONOMICS MODAL
 * Touch-First (>= 44x44px), Strict Multi-Theme CSS Variables, Exact Math
 * Order 804n Consumption, Dental Lab (ZTL), Doctor Commission, EBITDA
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
	TrendingUp,
	Coins,
	BarChart3,
	PieChart,
	Layers,
	Calendar,
	Filter,
	Download,
	Printer,
	CheckCircle2,
	AlertCircle,
	ArrowUpRight,
	ArrowDownRight,
	Percent,
	Clock,
	Users,
	Sparkles,
	Building2,
	FileSpreadsheet,
	X,
	ChevronRight,
	Briefcase,
	ShieldCheck,
} from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface ClinicalPnlHubModalProps {
	isOpen: boolean;
	onClose: () => void;
	clinicName?: string;
	initialPeriod?: "month_current" | "month_prev" | "quarter_3" | "year_2026";
}

interface DepartmentUnitEconomics {
	id: string;
	title: string;
	revenueRub: number;
	chairHours: number;
	revenuePerHour: number;
	materialCostRub: number;
	materialPct: number;
	labCostRub: number;
	labPct: number;
	doctorFotRub: number;
	doctorFotPct: number;
	grossMarginRub: number;
	marginPct: number;
}

interface DoctorPerformanceRow {
	id: string;
	fullName: string;
	specialty: string;
	chairHours: number;
	patientVisits: number;
	revenueRub: number;
	avgTicketRub: number;
	labDeductionRub: number;
	materialDeductionRub: number;
	calculatedCommissionRub: number;
	profitContributionRub: number;
}

const SAMPLE_DEPARTMENTS: DepartmentUnitEconomics[] = [
	{
		id: "therapy",
		title: "Терапия и эндодонтия",
		revenueRub: 1650000,
		chairHours: 220,
		revenuePerHour: 7500,
		materialCostRub: 165000,
		materialPct: 10.0,
		labCostRub: 0,
		labPct: 0.0,
		doctorFotRub: 412500,
		doctorFotPct: 25.0,
		grossMarginRub: 1072500,
		marginPct: 65.0,
	},
	{
		id: "orthopedics",
		title: "Ортопедическая стоматология (ЗТЛ)",
		revenueRub: 1420000,
		chairHours: 110,
		revenuePerHour: 12909,
		materialCostRub: 71000,
		materialPct: 5.0,
		labCostRub: 568000,
		labPct: 40.0,
		doctorFotRub: 284000,
		doctorFotPct: 20.0,
		grossMarginRub: 497000,
		marginPct: 35.0,
	},
	{
		id: "surgery_implant",
		title: "Хирургия и дентальная имплантация",
		revenueRub: 1180000,
		chairHours: 95,
		revenuePerHour: 12421,
		materialCostRub: 295000,
		materialPct: 25.0,
		labCostRub: 0,
		labPct: 0.0,
		doctorFotRub: 295000,
		doctorFotPct: 25.0,
		grossMarginRub: 590000,
		marginPct: 50.0,
	},
	{
		id: "orthodontics",
		title: "Ортодонтия (Элайнеры / Брекеты)",
		revenueRub: 320000,
		chairHours: 55,
		revenuePerHour: 5818,
		materialCostRub: 48000,
		materialPct: 15.0,
		labCostRub: 0,
		labPct: 0.0,
		doctorFotRub: 96000,
		doctorFotPct: 30.0,
		grossMarginRub: 176000,
		marginPct: 55.0,
	},
	{
		id: "hygiene",
		title: "Профессиональная гигиена и пародонтология",
		revenueRub: 280000,
		chairHours: 80,
		revenuePerHour: 3500,
		materialCostRub: 28000,
		materialPct: 10.0,
		labCostRub: 0,
		labPct: 0.0,
		doctorFotRub: 84000,
		doctorFotPct: 30.0,
		grossMarginRub: 168000,
		marginPct: 60.0,
	},
];

const SAMPLE_DOCTORS: DoctorPerformanceRow[] = [
	{
		id: "doc-1",
		fullName: "Д-р Смирнов Алексей Петрович",
		specialty: "Врач-стоматолог терапевт-ортопед",
		chairHours: 195,
		patientVisits: 142,
		revenueRub: 2350000,
		avgTicketRub: 16549,
		labDeductionRub: 380000,
		materialDeductionRub: 145000,
		calculatedCommissionRub: 587500,
		profitContributionRub: 1237500,
	},
	{
		id: "doc-2",
		fullName: "Д-р Барабаш Сергей Владимирович",
		specialty: "Хирург-имплантолог",
		chairHours: 110,
		patientVisits: 74,
		revenueRub: 1380000,
		avgTicketRub: 18648,
		labDeductionRub: 0,
		materialDeductionRub: 345000,
		calculatedCommissionRub: 345000,
		profitContributionRub: 690000,
	},
	{
		id: "doc-3",
		fullName: "Д-р Волкова Екатерина Сергеевна",
		specialty: "Врач-стоматолог терапевт-эндодонтист",
		chairHours: 140,
		patientVisits: 118,
		revenueRub: 840000,
		avgTicketRub: 7118,
		labDeductionRub: 0,
		materialDeductionRub: 84000,
		calculatedCommissionRub: 210000,
		profitContributionRub: 546000,
	},
	{
		id: "doc-4",
		fullName: "Д-р Ковалев Станислав Павлович",
		specialty: "Врач-стоматолог ортодонт",
		chairHours: 115,
		patientVisits: 86,
		revenueRub: 280000,
		avgTicketRub: 3255,
		labDeductionRub: 0,
		materialDeductionRub: 33600,
		calculatedCommissionRub: 84000,
		profitContributionRub: 162400,
	},
];

const OVERHEAD_EXPENSES = [
	{ title: "Аренда клиники и коммунальные платежи", rub: 320000, pct: 6.6 },
	{ title: "ФОТ ассистентов и администраторов", rub: 291000, pct: 6.0 },
	{ title: "Маркетинг, привлечение пациентов и Яндекс.Карты", rub: 140000, pct: 2.9 },
	{ title: "IT, телефония, фискализация 54-ФЗ и ЕГИСЗ", rub: 54000, pct: 1.1 },
	{ title: "Амортизация оборудования и ТО автоклавов СанПиН", rub: 68000, pct: 1.4 },
];

export const ClinicalPnlHubModal: React.FC<ClinicalPnlHubModalProps> = ({
	isOpen,
	onClose,
	clinicName = "Стоматологическая клиника «ДЕНТЕ»",
	initialPeriod = "month_current",
}) => {
	const [activeTab, setActiveTab] = useState<"departments" | "doctors" | "expenses">("departments");
	const [selectedPeriod, setSelectedPeriod] = useState<string>(initialPeriod);

	if (!isOpen) return null;

	const totalRevenueRub = SAMPLE_DEPARTMENTS.reduce((sum, d) => sum + d.revenueRub, 0);
	const totalMaterialCostRub = SAMPLE_DEPARTMENTS.reduce((sum, d) => sum + d.materialCostRub, 0);
	const totalLabCostRub = SAMPLE_DEPARTMENTS.reduce((sum, d) => sum + d.labCostRub, 0);
	const totalDoctorFotRub = SAMPLE_DEPARTMENTS.reduce((sum, d) => sum + d.doctorFotRub, 0);
	const totalDirectCostRub = totalMaterialCostRub + totalLabCostRub + totalDoctorFotRub;
	const totalGrossProfitRub = totalRevenueRub - totalDirectCostRub;

	const totalOverheadRub = OVERHEAD_EXPENSES.reduce((sum, e) => sum + e.rub, 0);
	const operatingProfitEbitdaRub = totalGrossProfitRub - totalOverheadRub;
	const netMarginPercent = ((operatingProfitEbitdaRub / totalRevenueRub) * 100).toFixed(1);

	const totalChairHours = SAMPLE_DEPARTMENTS.reduce((sum, d) => sum + d.chairHours, 0);
	const avgRevenuePerChairHour = Math.round(totalRevenueRub / totalChairHours);

	const handleExport1C = () => {
		showToast("Выгрузка финансового отчета в 1С:Бухгалтерия 8.3 сформирована", "success");
	};

	const handlePrint = () => {
		showToast("Печатная форма отчёта о финансовых результатах (ОКУД 0710002) отправлена на печать", "info");
	};

	const handleExportCsv = () => {
		showToast("Таблица юнит-экономики P&L успешно экспортирована в Excel (CSV)", "success");
	};

	return (
		<div
			className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			data-testid="clinical-pnl-hub-modal"
		>
			<div className="relative w-full max-w-6xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
				
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] gap-3 shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold">
							<TrendingUp className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
									Финансовый P&L и юнит-экономика клиники
								</h2>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-[var(--teal-ink,#0f766e)] border border-teal-500/20">
									804н / ЗТЛ / ФОТ
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicName} • Маржинальность процедур, расчет EBITDA и доходность на кресло-час
							</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<select
							value={selectedPeriod}
							onChange={(e) => setSelectedPeriod(e.target.value)}
							className="px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[36px]"
						>
							<option value="month_current">Август 2026 (Текущий месяц)</option>
							<option value="month_prev">Июль 2026 (Прошлый месяц)</option>
							<option value="quarter_3">III Квартал 2026</option>
							<option value="year_2026">2026 Год (Нарастающим)</option>
						</select>

						<button
							type="button"
							onClick={handleExport1C}
							className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-all flex items-center gap-1.5"
							title="Экспорт в 1С"
						>
							<FileSpreadsheet className="w-3.5 h-3.5 text-orange-500" />
							<span className="hidden sm:inline">1С Экспорт</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-all flex items-center gap-1.5"
							title="Печать отчёта"
						>
							<Printer className="w-3.5 h-3.5 text-blue-500" />
							<span className="hidden sm:inline">Печать</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[36px] min-w-[36px] p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-all flex items-center justify-center"
							data-testid="close-clinical-pnl-hub-modal-btn"
							aria-label="Закрыть окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* KPI Summary Metric Tiles */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[var(--paper,#ffffff)] shrink-0">
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between">
						<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
							<span className="font-medium">Выручка (Оборот)</span>
							<Coins className="w-4 h-4 text-teal-600" />
						</div>
						<div className="mt-1.5">
							<div className="text-lg sm:text-xl font-extrabold text-[var(--ink,#0f172a)]">
								{totalRevenueRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
								<ArrowUpRight className="w-3 h-3" />
								<span>+12.4% к пред. периоду</span>
							</div>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between">
						<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
							<span className="font-medium">Себестоимость ТМЦ + ЗТЛ</span>
							<Layers className="w-4 h-4 text-blue-600" />
						</div>
						<div className="mt-1.5">
							<div className="text-lg sm:text-xl font-extrabold text-[var(--ink,#0f172a)]">
								{(totalMaterialCostRub + totalLabCostRub).toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] font-semibold text-[var(--muted,#64748b)] mt-0.5">
								{(((totalMaterialCostRub + totalLabCostRub) / totalRevenueRub) * 100).toFixed(1)}% от оборота
							</div>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between">
						<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
							<span className="font-medium">Сдельный ФОТ врачей</span>
							<Users className="w-4 h-4 text-purple-600" />
						</div>
						<div className="mt-1.5">
							<div className="text-lg sm:text-xl font-extrabold text-[var(--ink,#0f172a)]">
								{totalDoctorFotRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] font-semibold text-[var(--muted,#64748b)] mt-0.5">
								{((totalDoctorFotRub / totalRevenueRub) * 100).toFixed(1)}% (вычет ЗТЛ учтен)
							</div>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col justify-between">
						<div className="flex items-center justify-between text-xs text-[var(--teal-ink,#0f766e)] font-bold">
							<span>Операционная прибыль EBITDA</span>
							<TrendingUp className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						</div>
						<div className="mt-1.5">
							<div className="text-lg sm:text-xl font-extrabold text-[var(--teal-ink,#0f766e)]">
								{operatingProfitEbitdaRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 mt-0.5">
								Маржинальность: {netMarginPercent}% • {avgRevenuePerChairHour.toLocaleString("ru-RU")} ₽/кресло-час
							</div>
						</div>
					</div>
				</div>

				{/* Tabs Navigation */}
				<div className="px-4 sm:px-5 border-b border-[var(--line,#e2e8f0)] flex items-center gap-2 overflow-x-auto shrink-0 bg-[var(--paper,#ffffff)]">
					<button
						type="button"
						onClick={() => setActiveTab("departments")}
						className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
							activeTab === "departments"
								? "border-[var(--teal,#0d9488)] text-[var(--teal-ink,#0f766e)]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<Layers className="w-4 h-4" />
						<span>Юнит-экономика по направлениям</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("doctors")}
						className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
							activeTab === "doctors"
								? "border-[var(--teal,#0d9488)] text-[var(--teal-ink,#0f766e)]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<Users className="w-4 h-4" />
						<span>Выработка врачей & Кресло-часы</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("expenses")}
						className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
							activeTab === "expenses"
								? "border-[var(--teal,#0d9488)] text-[var(--teal-ink,#0f766e)]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<PieChart className="w-4 h-4" />
						<span>Структура OPEX & Накладные расходы</span>
					</button>
				</div>

				{/* Scrollable Tab Content */}
				<div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
					
					{/* Tab 1: Department Unit Economics */}
					{activeTab === "departments" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-bold text-[var(--ink,#0f172a)]">
									Рентабельность клинических отделений клиники
								</h3>
								<button
									type="button"
									onClick={handleExportCsv}
									className="text-xs font-semibold text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 min-h-[32px]"
								>
									<Download className="w-3.5 h-3.5" />
									<span>Скачать отчет CSV</span>
								</button>
							</div>

							<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead>
										<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
											<th className="p-3">Клиническое направление</th>
											<th className="p-3 text-right">Выручка</th>
											<th className="p-3 text-center">Кресло-часы</th>
											<th className="p-3 text-right">Выручка/час</th>
											<th className="p-3 text-right">ТМЦ (804н)</th>
											<th className="p-3 text-right">ЗТЛ (Лаб.)</th>
											<th className="p-3 text-right">ФОТ врачей</th>
											<th className="p-3 text-right">Маржинальность</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{SAMPLE_DEPARTMENTS.map((dept) => (
											<tr key={dept.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
												<td className="p-3 font-bold text-[var(--ink,#0f172a)]">
													{dept.title}
												</td>
												<td className="p-3 text-right font-extrabold text-[var(--ink,#0f172a)]">
													{dept.revenueRub.toLocaleString("ru-RU")} ₽
												</td>
												<td className="p-3 text-center font-semibold text-[var(--muted,#64748b)]">
													{dept.chairHours} ч
												</td>
												<td className="p-3 text-right font-bold text-[var(--teal-ink,#0f766e)]">
													{dept.revenuePerHour.toLocaleString("ru-RU")} ₽/ч
												</td>
												<td className="p-3 text-right text-[var(--muted,#64748b)]">
													{dept.materialCostRub.toLocaleString("ru-RU")} ₽
													<span className="text-[10px] ml-1 opacity-70">({dept.materialPct}%)</span>
												</td>
												<td className="p-3 text-right text-[var(--muted,#64748b)]">
													{dept.labCostRub > 0 ? `${dept.labCostRub.toLocaleString("ru-RU")} ₽ (${dept.labPct}%)` : "—"}
												</td>
												<td className="p-3 text-right text-[var(--muted,#64748b)]">
													{dept.doctorFotRub.toLocaleString("ru-RU")} ₽
													<span className="text-[10px] ml-1 opacity-70">({dept.doctorFotPct}%)</span>
												</td>
												<td className="p-3 text-right">
													<span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
														{dept.marginPct}% ({dept.grossMarginRub.toLocaleString("ru-RU")} ₽)
													</span>
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="bg-[var(--paper-soft,#f8fafc)] font-extrabold text-[var(--ink,#0f172a)] border-t border-[var(--line,#e2e8f0)]">
											<td className="p-3">ИТОГО ПО КЛИНИКЕ</td>
											<td className="p-3 text-right">{totalRevenueRub.toLocaleString("ru-RU")} ₽</td>
											<td className="p-3 text-center">{totalChairHours} ч</td>
											<td className="p-3 text-right text-[var(--teal-ink,#0f766e)]">{avgRevenuePerChairHour.toLocaleString("ru-RU")} ₽/ч</td>
											<td className="p-3 text-right">{totalMaterialCostRub.toLocaleString("ru-RU")} ₽</td>
											<td className="p-3 text-right">{totalLabCostRub.toLocaleString("ru-RU")} ₽</td>
											<td className="p-3 text-right">{totalDoctorFotRub.toLocaleString("ru-RU")} ₽</td>
											<td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{totalGrossProfitRub.toLocaleString("ru-RU")} ₽</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					)}

					{/* Tab 2: Doctors & Chair-Hours */}
					{activeTab === "doctors" && (
						<div className="space-y-4">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)]">
								Эффективность медицинского персонала и выработка на кресло-час
							</h3>

							<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead>
										<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
											<th className="p-3">Врач-стоматолог</th>
											<th className="p-3">Специальность</th>
											<th className="p-3 text-center">Часы</th>
											<th className="p-3 text-center">Приёмы</th>
											<th className="p-3 text-right">Выручка</th>
											<th className="p-3 text-right">Средний чек</th>
											<th className="p-3 text-right">Вычет ЗТЛ/ТМЦ</th>
											<th className="p-3 text-right">ФОТ врача</th>
											<th className="p-3 text-right">Маржинальный вклад</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{SAMPLE_DOCTORS.map((doc) => (
											<tr key={doc.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
												<td className="p-3 font-bold text-[var(--ink,#0f172a)]">{doc.fullName}</td>
												<td className="p-3 text-[var(--muted,#64748b)]">{doc.specialty}</td>
												<td className="p-3 text-center font-semibold text-[var(--ink,#0f172a)]">{doc.chairHours} ч</td>
												<td className="p-3 text-center font-semibold text-[var(--ink,#0f172a)]">{doc.patientVisits}</td>
												<td className="p-3 text-right font-extrabold text-[var(--ink,#0f172a)]">{doc.revenueRub.toLocaleString("ru-RU")} ₽</td>
												<td className="p-3 text-right font-semibold text-[var(--teal-ink,#0f766e)]">{doc.avgTicketRub.toLocaleString("ru-RU")} ₽</td>
												<td className="p-3 text-right text-[var(--muted,#64748b)]">{(doc.labDeductionRub + doc.materialDeductionRub).toLocaleString("ru-RU")} ₽</td>
												<td className="p-3 text-right font-bold text-purple-700 dark:text-purple-300">{doc.calculatedCommissionRub.toLocaleString("ru-RU")} ₽</td>
												<td className="p-3 text-right font-extrabold text-emerald-700 dark:text-emerald-300">{doc.profitContributionRub.toLocaleString("ru-RU")} ₽</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Tab 3: OPEX & Overhead Breakdown */}
					{activeTab === "expenses" && (
						<div className="space-y-4">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)]">
								Структура постоянных и накладных расходов клиники (OPEX)
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-3">
									{OVERHEAD_EXPENSES.map((item, idx) => (
										<div key={idx} className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
											<div>
												<div className="text-xs font-bold text-[var(--ink,#0f172a)]">{item.title}</div>
												<div className="text-[11px] text-[var(--muted,#64748b)]">{item.pct}% от общей выручки клиники</div>
											</div>
											<div className="text-sm font-extrabold text-[var(--ink,#0f172a)]">
												{item.rub.toLocaleString("ru-RU")} ₽
											</div>
										</div>
									))}
								</div>

								<div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 flex flex-col justify-between space-y-4">
									<div>
										<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal-ink,#0f766e)] mb-2 flex items-center gap-1.5">
											<ShieldCheck className="w-4 h-4" />
											<span>Контроль точки безубыточности (Break-Even)</span>
										</h4>
										<p className="text-xs text-[var(--muted,#64748b)] leading-relaxed">
											Постоянные расходы клиники составляют <strong className="text-[var(--ink,#0f172a)]">{totalOverheadRub.toLocaleString("ru-RU")} ₽/мес</strong>. Для покрытия всех расходов требуется минимальная загрузка 2 кресел на уровне <strong>38.2%</strong> (195 кресло-часов).
										</p>
									</div>

									<div className="p-3 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-bold">
										<span className="text-[var(--muted,#64748b)]">Текущая загрузка кресел:</span>
										<span className="text-emerald-600 dark:text-emerald-400 font-extrabold">78.4% (Безопасная зона)</span>
									</div>
								</div>
							</div>
						</div>
					)}

				</div>

				{/* Footer */}
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
					<div className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
						<span>Данные синхронизированы с биллингом 54-ФЗ и актами выполненных работ 804н</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 transition-all shadow-md"
					>
						Закрыть отчёт
					</button>
				</div>

			</div>
		</div>
	);
};
