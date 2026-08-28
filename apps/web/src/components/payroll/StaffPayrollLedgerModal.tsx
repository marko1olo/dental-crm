/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Staff Multi-Role Payroll Ledger Modal (Form T-51 & 1C:ZUP 3.1)
 *
 * Provides:
 * 1. Multi-role consolidated payroll management (Doctors, Assistants, Administrators).
 * 2. Real-time kopeck-exact calculation of piecework rates, shift bonuses, NDFL 13%/15%, and SFR contributions.
 * 3. 1-Click statutory exports: Form T-51 (CSV), 1C:ZUP 3.1 (XML & CSV), Form T-13 timesheet summary.
 * 4. Granular employee calculation breakdown inspection drawer.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Calculator,
	Download,
	FileSpreadsheet,
	FileCode,
	Printer,
	User,
	Users,
	X,
	CheckCircle2,
	AlertCircle,
	Calendar,
	DollarSign,
	Award,
	TrendingUp,
	Layers,
	ShieldCheck,
	ChevronRight,
	Search,
	Building,
	Stethoscope,
	Activity,
} from "lucide-react";
import {
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollT51Csv,
	generate1CZup31Xml,
	generate1CZup31Csv,
	type StaffPayrollRecord,
	type ConsolidatedStaffPayrollSummary,
	type DoctorStaffPayrollInput,
	type AssistantStaffPayrollInput,
	type AdministratorStaffPayrollInput,
	type StaffRole,
} from "./staffPayrollEngine";
import "./staffPayrollLedger.css";

export interface StaffPayrollLedgerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
	readonly initialDoctors?: readonly DoctorStaffPayrollInput[] | undefined;
	readonly initialAssistants?: readonly AssistantStaffPayrollInput[] | undefined;
	readonly initialAdministrators?: readonly AdministratorStaffPayrollInput[] | undefined;
}

// Sample clinical workforce data
const SAMPLE_DOCTORS: readonly DoctorStaffPayrollInput[] = [
	{
		employeeId: "doc-1",
		employeeTabNumber: "00101",
		employeeFullName: "Смирнов Алексей Петрович",
		specialtyId: "therapist",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		daysWorked: 21,
		hoursWorked: 126.0,
		comprehensivePlansCount: 4,
		comprehensivePlanBonusPerUnitKop: 500000, // 5,000 RUB per plan
		services: [
			{
				id: "srv-1",
				dateIso: "2026-08-05",
				patientName: "Смирнова Екатерина Васильевна",
				medicalCardNumber: "043/у-2026/891",
				serviceNameRu: "Эндодонтическое лечение 3-канального моляра",
				order804nCode: "A16.07.002.001",
				toothCode: "16",
				category: "therapy",
				grossRevenueKop: 2400000, // 24,000 RUB
				labCostKop: 0,
				materialCostKop: 180000, // 1,800 RUB
			},
			{
				id: "srv-2",
				dateIso: "2026-08-12",
				patientName: "Кузнецов Дмитрий Анатольевич",
				medicalCardNumber: "043/у-2026/742",
				serviceNameRu: "Художественная реставрация зуба 11 (Estelite Asteria)",
				order804nCode: "A16.07.003",
				toothCode: "11",
				category: "therapy",
				grossRevenueKop: 1500000, // 15,000 RUB
				labCostKop: 0,
				materialCostKop: 120000,
			},
			{
				id: "srv-3",
				dateIso: "2026-08-20",
				patientName: "Попов Артем Сергеевич",
				medicalCardNumber: "043/у-2026/651",
				serviceNameRu: "Реализация набора гигиены Curaprox Ortho 5460",
				category: "retail_hygiene",
				grossRevenueKop: 250000, // 2,500 RUB
				labCostKop: 0,
				materialCostKop: 0,
			},
		],
	},
	{
		employeeId: "doc-2",
		employeeTabNumber: "00102",
		employeeFullName: "Васильев Максим Сергеевич",
		specialtyId: "orthopedist",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		daysWorked: 20,
		hoursWorked: 120.0,
		comprehensivePlansCount: 6,
		comprehensivePlanBonusPerUnitKop: 500000,
		services: [
			{
				id: "srv-4",
				dateIso: "2026-08-08",
				patientName: "Сидорова Светлана Сергеевна",
				medicalCardNumber: "043/у-2026/512",
				serviceNameRu: "Коронка из диоксида циркония CAD/CAM (Prettau)",
				order804nCode: "A16.07.004.002",
				toothCode: "24",
				category: "orthopedics",
				grossRevenueKop: 3200000, // 32,000 RUB
				labCostKop: 850000, // 8,500 RUB ЗТЛ
				materialCostKop: 150000,
			},
			{
				id: "srv-5",
				dateIso: "2026-08-18",
				patientName: "Фролов Игорь Дмитриевич",
				medicalCardNumber: "043/у-2026/309",
				serviceNameRu: "Винир керамический E.max Press",
				order804nCode: "A16.07.004.003",
				toothCode: "12",
				category: "orthopedics",
				grossRevenueKop: 2800000, // 28,000 RUB
				labCostKop: 750000, // 7,500 RUB ЗТЛ
				materialCostKop: 120000,
			},
		],
	},
	{
		employeeId: "doc-3",
		employeeTabNumber: "00103",
		employeeFullName: "Ковалев Игорь Олегович",
		specialtyId: "surgeon_implantologist",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		daysWorked: 18,
		hoursWorked: 108.0,
		comprehensivePlansCount: 5,
		comprehensivePlanBonusPerUnitKop: 500000,
		services: [
			{
				id: "srv-6",
				dateIso: "2026-08-14",
				patientName: "Григорьев Роман Николаевич",
				medicalCardNumber: "043/у-2026/410",
				serviceNameRu: "Дентальная имплантация Straumann BLX",
				order804nCode: "A16.07.054",
				toothCode: "36",
				category: "surgery",
				grossRevenueKop: 6500000, // 65,000 RUB
				labCostKop: 0,
				materialCostKop: 1800000, // 18,000 RUB (имплантат + мембрана)
			},
		],
	},
];

const SAMPLE_ASSISTANTS: readonly AssistantStaffPayrollInput[] = [
	{
		employeeId: "asst-1",
		employeeTabNumber: "00201",
		employeeFullName: "Иванова Екатерина Сергеевна",
		category: "highest", // Высшая категория (+20%)
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		shifts: [
			{ id: "sh-1", dateIso: "2026-08-03", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: true, radiographsTakenCount: 4, surgeriesAssistedCount: 1 },
			{ id: "sh-2", dateIso: "2026-08-05", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: false, radiographsTakenCount: 6, surgeriesAssistedCount: 2 },
			{ id: "sh-3", dateIso: "2026-08-07", shiftType: "full_12h", hoursWorked: 12.0, isSterilizationShift: true, radiographsTakenCount: 8, surgeriesAssistedCount: 3 },
			{ id: "sh-4", dateIso: "2026-08-10", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: false, radiographsTakenCount: 5, surgeriesAssistedCount: 0 },
			{ id: "sh-5", dateIso: "2026-08-12", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: true, radiographsTakenCount: 3, surgeriesAssistedCount: 1 },
			{ id: "sh-6", dateIso: "2026-08-14", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: false, radiographsTakenCount: 7, surgeriesAssistedCount: 2 },
			{ id: "sh-7", dateIso: "2026-08-17", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: true, radiographsTakenCount: 4, surgeriesAssistedCount: 0 },
			{ id: "sh-8", dateIso: "2026-08-19", shiftType: "full_12h", hoursWorked: 12.0, isSterilizationShift: false, radiographsTakenCount: 9, surgeriesAssistedCount: 2 },
		],
	},
	{
		employeeId: "asst-2",
		employeeTabNumber: "00202",
		employeeFullName: "Петрова Анна Владимировна",
		category: "first", // Первая категория (+15%)
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		shifts: [
			{ id: "sh-9", dateIso: "2026-08-04", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: false, radiographsTakenCount: 5, surgeriesAssistedCount: 1 },
			{ id: "sh-10", dateIso: "2026-08-06", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: true, radiographsTakenCount: 4, surgeriesAssistedCount: 0 },
			{ id: "sh-11", dateIso: "2026-08-11", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: false, radiographsTakenCount: 6, surgeriesAssistedCount: 1 },
			{ id: "sh-12", dateIso: "2026-08-13", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: true, radiographsTakenCount: 3, surgeriesAssistedCount: 0 },
			{ id: "sh-13", dateIso: "2026-08-18", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: false, radiographsTakenCount: 5, surgeriesAssistedCount: 1 },
			{ id: "sh-14", dateIso: "2026-08-20", shiftType: "standard_6h", hoursWorked: 6.0, isSterilizationShift: true, radiographsTakenCount: 2, surgeriesAssistedCount: 0 },
		],
	},
];

const SAMPLE_ADMINS: readonly AdministratorStaffPayrollInput[] = [
	{
		employeeId: "adm-1",
		employeeTabNumber: "00301",
		employeeFullName: "Соколова Елена Викторовна",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		shiftsWorked: 15,
		clinicCashRevenueKop: 145000000, // 1,450,000 RUB касса
		primaryLeadsCount: 42,
		convertedLeadsCount: 34, // 80.9% конверсия (> 70% threshold)
	},
	{
		employeeId: "adm-2",
		employeeTabNumber: "00302",
		employeeFullName: "Морозова Дарья Андреевна",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		shiftsWorked: 15,
		clinicCashRevenueKop: 120000000, // 1,200,000 RUB касса
		primaryLeadsCount: 38,
		convertedLeadsCount: 24, // 63.1% конверсия
	},
];

export const StaffPayrollLedgerModal: React.FC<StaffPayrollLedgerModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	organizationInn = "7701984512",
	organizationKpp = "770101001",
	initialPeriodStart = "2026-08-01",
	initialPeriodEnd = "2026-08-31",
	initialDoctors = SAMPLE_DOCTORS,
	initialAssistants = SAMPLE_ASSISTANTS,
	initialAdministrators = SAMPLE_ADMINS,
}) => {
	const [activeRoleFilter, setActiveRoleFilter] = useState<"all" | StaffRole>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

	const summary: ConsolidatedStaffPayrollSummary = useMemo(() => {
		return calculateConsolidatedStaffPayroll({
			clinicName,
			organizationInn,
			organizationKpp,
			periodStartIso: initialPeriodStart,
			periodEndIso: initialPeriodEnd,
			doctors: initialDoctors,
			assistants: initialAssistants,
			administrators: initialAdministrators,
			isSmeTariff: true,
		});
	}, [
		clinicName,
		organizationInn,
		organizationKpp,
		initialPeriodStart,
		initialPeriodEnd,
		initialDoctors,
		initialAssistants,
		initialAdministrators,
	]);

	const filteredRecords = useMemo(() => {
		let list = summary.records;
		if (activeRoleFilter !== "all") {
			list = list.filter((r) => r.role === activeRoleFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(r) =>
					r.employeeFullName.toLowerCase().includes(q) ||
					r.employeeTabNumber.toLowerCase().includes(q) ||
					r.positionRu.toLowerCase().includes(q)
			);
		}
		return list;
	}, [summary.records, activeRoleFilter, searchQuery]);

	const selectedRecord: StaffPayrollRecord | undefined = useMemo(() => {
		if (!selectedEmployeeId) return undefined;
		return summary.records.find((r) => r.employeeId === selectedEmployeeId);
	}, [summary.records, selectedEmployeeId]);

	// Export handlers
	const handleDownloadT51Csv = useCallback(() => {
		const csv = generateStaffPayrollT51Csv(summary);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Ведомость_Т51_${initialPeriodStart}_${initialPeriodEnd}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [summary, initialPeriodStart, initialPeriodEnd]);

	const handleDownload1CZupXml = useCallback(() => {
		const xml = generate1CZup31Xml(summary);
		const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `1C_ZUP_31_Зарплата_${initialPeriodStart.slice(0, 7)}.xml`;
		a.click();
		URL.revokeObjectURL(url);
	}, [summary, initialPeriodStart]);

	const handleDownload1CZupCsv = useCallback(() => {
		const csv = generate1CZup31Csv(summary);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `1C_ZUP_Таблица_${initialPeriodStart.slice(0, 7)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [summary, initialPeriodStart]);

	const formatRub = (kop: number): string => {
		return (kop / 100).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) + " ₽";
	};

	if (!isOpen) return null;

	return (
		<div className="staff-payroll-modal-overlay" role="dialog" aria-modal="true">
			<div className="staff-payroll-modal-container">
				{/* Modal Header */}
				<header className="staff-payroll-header">
					<div className="staff-payroll-header-title-wrap">
						<div className="staff-payroll-header-icon">
							<Calculator className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
								Сводный фонд оплаты труда (ФОТ) & 1С:ЗУП 3.1
								<span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(20,184,166,0.15)] text-[var(--teal,#0d9488)] font-semibold">
									Т-51 / Т-13
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)]">
								{clinicName} • ИНН {organizationInn} • Период: {summary.periodLabelRu}
							</p>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="staff-payroll-toolbar staff-payroll-no-print">
						<button
							type="button"
							onClick={handleDownloadT51Csv}
							className="staff-payroll-btn"
							title="Скачать унифицированную форму Т-51 в CSV формате"
						>
							<FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
							<span>Ведомость Т-51 (CSV)</span>
						</button>
						<button
							type="button"
							onClick={handleDownload1CZupXml}
							className="staff-payroll-btn staff-payroll-btn-primary"
							title="Экспорт в формате 1С:ЗУП 3.1 XML EnterpriseData"
						>
							<FileCode className="w-3.5 h-3.5" />
							<span>Экспорт 1С:ЗУП (XML)</span>
						</button>
						<button
							type="button"
							onClick={handleDownload1CZupCsv}
							className="staff-payroll-btn"
							title="Экспорт в формате 1С:ЗУП CSV"
						>
							<Download className="w-3.5 h-3.5" />
							<span>1С:ЗУП (CSV)</span>
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="staff-payroll-btn"
							title="Печать"
						>
							<Printer className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={onClose}
							className="staff-payroll-btn hover:bg-red-50 text-[var(--muted)] hover:text-red-600"
							aria-label="Закрыть"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</header>

				{/* KPI Summary Cards */}
				<div className="staff-payroll-kpi-grid">
					<div className="staff-payroll-kpi-card">
						<div className="staff-payroll-kpi-label">
							<DollarSign className="w-3.5 h-3.5 text-blue-500" />
							<span>Общий ФОТ (Gross)</span>
						</div>
						<div className="staff-payroll-kpi-value">
							{formatRub(summary.totalGrossPayoutKop)}
						</div>
						<div className="staff-payroll-kpi-sub">
							{summary.totalEmployeesCount} сотрудников клиники
						</div>
					</div>

					<div className="staff-payroll-kpi-card">
						<div className="staff-payroll-kpi-label">
							<ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
							<span>НДФЛ 13% / 15%</span>
						</div>
						<div className="staff-payroll-kpi-value text-amber-600">
							{formatRub(summary.totalNdflKop)}
						</div>
						<div className="staff-payroll-kpi-sub">Налоговый агент НК РФ</div>
					</div>

					<div className="staff-payroll-kpi-card">
						<div className="staff-payroll-kpi-label">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
							<span>К выплате на руки</span>
						</div>
						<div className="staff-payroll-kpi-value text-emerald-600">
							{formatRub(summary.totalNetPayoutKop)}
						</div>
						<div className="staff-payroll-kpi-sub">Зарплатный проект / банк</div>
					</div>

					<div className="staff-payroll-kpi-card">
						<div className="staff-payroll-kpi-label">
							<Building className="w-3.5 h-3.5 text-indigo-500" />
							<span>Взносы СФР (МСП)</span>
						</div>
						<div className="staff-payroll-kpi-value text-indigo-600">
							{formatRub(summary.totalSfrContributionsKop)}
						</div>
						<div className="staff-payroll-kpi-sub">Единый тариф + 0.2% травматизм</div>
					</div>

					<div className="staff-payroll-kpi-card">
						<div className="staff-payroll-kpi-label">
							<TrendingUp className="w-3.5 h-3.5 text-teal-500" />
							<span>Выручка врачей</span>
						</div>
						<div className="staff-payroll-kpi-value text-[var(--teal,#0d9488)]">
							{formatRub(summary.totalGrossRevenueKop)}
						</div>
						<div className="staff-payroll-kpi-sub">
							Вычет ЗТЛ/мат: {formatRub(summary.totalLabDeductionsKop + summary.totalMaterialDeductionsKop)}
						</div>
					</div>
				</div>

				{/* Tabs & Search Bar */}
				<div className="staff-payroll-tabs-bar staff-payroll-no-print">
					<div className="staff-payroll-tabs">
						<button
							type="button"
							onClick={() => setActiveRoleFilter("all")}
							className={`staff-payroll-tab ${activeRoleFilter === "all" ? "staff-payroll-tab-active" : ""}`}
						>
							<Users className="w-3.5 h-3.5" />
							<span>Все сотрудники ({summary.totalEmployeesCount})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveRoleFilter("doctor")}
							className={`staff-payroll-tab ${activeRoleFilter === "doctor" ? "staff-payroll-tab-active" : ""}`}
						>
							<Stethoscope className="w-3.5 h-3.5" />
							<span>Врачи ({summary.roleSummaries.doctor.employeesCount})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveRoleFilter("assistant")}
							className={`staff-payroll-tab ${activeRoleFilter === "assistant" ? "staff-payroll-tab-active" : ""}`}
						>
							<Activity className="w-3.5 h-3.5" />
							<span>Ассистенты ({summary.roleSummaries.assistant.employeesCount})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveRoleFilter("administrator")}
							className={`staff-payroll-tab ${activeRoleFilter === "administrator" ? "staff-payroll-tab-active" : ""}`}
						>
							<User className="w-3.5 h-3.5" />
							<span>Администраторы ({summary.roleSummaries.administrator.employeesCount})</span>
						</button>
					</div>

					<div className="relative flex items-center">
						<input
							type="text"
							placeholder="Поиск по ФИО, таб. №, должности..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="staff-payroll-search-input pl-8"
						/>
						<Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--muted)] pointer-events-none" />
					</div>
				</div>

				{/* Main Ledger Table */}
				<div className="staff-payroll-body">
					<div className="staff-payroll-table-wrap">
						<table className="staff-payroll-table">
							<thead>
								<tr>
									<th className="staff-payroll-th">Таб. №</th>
									<th className="staff-payroll-th">ФИО работника</th>
									<th className="staff-payroll-th">Должность / Роль</th>
									<th className="staff-payroll-th text-center">Отработано</th>
									<th className="staff-payroll-th text-right">База / Выручка</th>
									<th className="staff-payroll-th text-right">Премии & KPI</th>
									<th className="staff-payroll-th text-right">Начислено (Gross)</th>
									<th className="staff-payroll-th text-right">НДФЛ</th>
									<th className="staff-payroll-th text-right font-bold">На руки (Net)</th>
									<th className="staff-payroll-th text-right">Взносы СФР</th>
									<th className="staff-payroll-th text-center staff-payroll-no-print">Инфо</th>
								</tr>
							</thead>
							<tbody>
								{filteredRecords.map((r) => {
									const isSelected = selectedEmployeeId === r.employeeId;
									let workedLabel = "—";
									let baseLabel = "—";
									let bonusLabel = "—";

									if (r.role === "doctor") {
										workedLabel = `${r.daysWorked} дн (${r.hoursWorked}ч)`;
										baseLabel = `${formatRub(r.earnedBaseCommissionKop)} (${r.baseCommissionPercent}%)`;
										const bonusKop =
											r.earnedRetailCommissionKop +
											r.comprehensivePlanBonusKop +
											r.revenueKpiBonusKop +
											r.manualAdjustmentKop;
										bonusLabel = formatRub(bonusKop);
									} else if (r.role === "assistant") {
										workedLabel = `${r.totalShiftsCount} см (${r.totalHoursWorked}ч)`;
										baseLabel = formatRub(r.baseShiftsPayoutKop);
										const bonusKop =
											r.categoryBonusKop +
											r.sterilizationBonusKop +
											r.radiographsPayoutKop +
											r.surgeriesPayoutKop +
											r.manualAdjustmentKop;
										bonusLabel = formatRub(bonusKop);
									} else if (r.role === "administrator") {
										workedLabel = `${r.shiftsWorked} см (${r.hoursWorked}ч)`;
										baseLabel = formatRub(r.baseSalaryPayoutKop);
										const bonusKop =
											r.cashRevenueCommissionKop +
											r.leadConversionBonusKop +
											r.manualAdjustmentKop;
										bonusLabel = formatRub(bonusKop);
									}

									return (
										<tr
											key={r.employeeId}
											onClick={() =>
												setSelectedEmployeeId(isSelected ? null : r.employeeId)
											}
											className={`staff-payroll-row cursor-pointer ${
												isSelected ? "staff-payroll-row-selected" : ""
											}`}
										>
											<td className="staff-payroll-td font-mono font-semibold text-xs">
												{r.employeeTabNumber}
											</td>
											<td className="staff-payroll-td font-medium">
												{r.employeeFullName}
											</td>
											<td className="staff-payroll-td">
												<div className="flex items-center gap-1.5">
													<span
														className={`role-badge ${
															r.role === "doctor"
																? "role-badge-doctor"
																: r.role === "assistant"
																	? "role-badge-assistant"
																	: "role-badge-admin"
														}`}
													>
														{r.role === "doctor"
															? "Врач"
															: r.role === "assistant"
																? "Ассистент"
																: "Админ"}
													</span>
													<span className="text-xs text-[var(--muted)] truncate max-w-[180px]" title={r.positionRu}>
														{r.positionRu}
													</span>
												</div>
											</td>
											<td className="staff-payroll-td text-center text-xs text-[var(--muted)]">
												{workedLabel}
											</td>
											<td className="staff-payroll-td text-right">
												{baseLabel}
											</td>
											<td className="staff-payroll-td text-right text-emerald-600 font-medium">
												{bonusLabel}
											</td>
											<td className="staff-payroll-td text-right font-bold text-[var(--ink)]">
												{formatRub(r.grossPayoutBeforeTaxKop)}
											</td>
											<td className="staff-payroll-td text-right text-amber-600">
												{formatRub(r.ndflTaxKop)}
											</td>
											<td className="staff-payroll-td text-right font-extrabold text-emerald-700">
												{formatRub(r.netPayoutKop)}
											</td>
											<td className="staff-payroll-td text-right text-xs text-indigo-600">
												{formatRub(r.sfrContributionsKop)}
											</td>
											<td className="staff-payroll-td text-center staff-payroll-no-print">
												<ChevronRight
													className={`w-4 h-4 text-[var(--muted)] transition-transform ${
														isSelected ? "rotate-90 text-[var(--teal,#0d9488)]" : ""
													}`}
												/>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Expanded Employee Detail Inspection Drawer */}
					{selectedRecord && (
						<div className="staff-payroll-detail-card animate-fadeIn">
							<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
								<div className="flex items-center gap-2">
									<Award className="w-4 h-4 text-[var(--teal,#0d9488)]" />
									<h3 className="text-sm font-bold text-[var(--ink)]">
										Детализация расчета: {selectedRecord.employeeFullName} (Таб. № {selectedRecord.employeeTabNumber})
									</h3>
								</div>
								<span className="text-xs text-[var(--muted)]">{selectedRecord.positionRu}</span>
							</div>

							<div className="staff-payroll-detail-grid">
								{selectedRecord.role === "doctor" && (
									<>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Выручка брутто</div>
											<div className="font-bold text-sm text-[var(--ink)]">
												{formatRub(selectedRecord.totalGrossRevenueKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">{selectedRecord.servicesCount} выполненных услуг</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Вычеты (ЗТЛ + материалы)</div>
											<div className="font-bold text-sm text-red-600">
												{formatRub(selectedRecord.totalLabDeductionsKop + selectedRecord.totalMaterialDeductionsKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">
												ЗТЛ: {formatRub(selectedRecord.totalLabDeductionsKop)} • Мат: {formatRub(selectedRecord.totalMaterialDeductionsKop)}
											</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Чистая база (Net Base)</div>
											<div className="font-bold text-sm text-[var(--teal,#0d9488)]">
												{formatRub(selectedRecord.totalNetBaseKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">Ставка: {selectedRecord.baseCommissionPercent}%</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">KPI Комплексные планы</div>
											<div className="font-bold text-sm text-emerald-600">
												{formatRub(selectedRecord.comprehensivePlanBonusKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">{selectedRecord.comprehensivePlansCount} планов закрыто</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Премия за план выручки</div>
											<div className="font-bold text-sm text-emerald-600">
												{formatRub(selectedRecord.revenueKpiBonusKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">{selectedRecord.kpiBadgeLabelRu}</div>
										</div>
									</>
								)}

								{selectedRecord.role === "assistant" && (
									<>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Оплата за смены</div>
											<div className="font-bold text-sm text-[var(--ink)]">
												{formatRub(selectedRecord.baseShiftsPayoutKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">{selectedRecord.totalShiftsCount} смен ({selectedRecord.totalHoursWorked} ч)</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Надбавка за категорию</div>
											<div className="font-bold text-sm text-blue-600">
												{formatRub(selectedRecord.categoryBonusKop)} (+{selectedRecord.categoryBonusPercent}%)
											</div>
											<div className="text-[10px] text-[var(--muted)]">Категория: {selectedRecord.category}</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Стерилизация и ЦСО</div>
											<div className="font-bold text-sm text-purple-600">
												{formatRub(selectedRecord.sterilizationBonusKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">{selectedRecord.sterilizationShiftsCount} смен автоклавирования</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Снимки и операции</div>
											<div className="font-bold text-sm text-emerald-600">
												{formatRub(selectedRecord.radiographsPayoutKop + selectedRecord.surgeriesPayoutKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">
												{selectedRecord.totalRadiographsCount} снимков • {selectedRecord.totalSurgeriesCount} операций
											</div>
										</div>
									</>
								)}

								{selectedRecord.role === "administrator" && (
									<>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Оклад по сменам</div>
											<div className="font-bold text-sm text-[var(--ink)]">
												{formatRub(selectedRecord.baseSalaryPayoutKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">{selectedRecord.shiftsWorked} смен отработано</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Процент от кассовой выручки</div>
											<div className="font-bold text-sm text-amber-600">
												{formatRub(selectedRecord.cashRevenueCommissionKop)} ({selectedRecord.cashRevenueCommissionPercent}%)
											</div>
											<div className="text-[10px] text-[var(--muted)]">Касса: {formatRub(selectedRecord.clinicCashRevenueKop)}</div>
										</div>
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-xs text-[var(--muted)]">Премия за конверсию лидов</div>
											<div className="font-bold text-sm text-emerald-600">
												{formatRub(selectedRecord.leadConversionBonusKop)}
											</div>
											<div className="text-[10px] text-[var(--muted)]">
												Конверсия {selectedRecord.conversionRatePercent}% (цель {selectedRecord.conversionThresholdPercent}%) • {selectedRecord.convertedLeadsCount}/{selectedRecord.primaryLeadsCount} пациентов
											</div>
										</div>
									</>
								)}

								{/* Taxes and Contributions Breakdown */}
								<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
									<div className="text-xs text-[var(--muted)]">Взносы СФР (разбивка)</div>
									<div className="font-bold text-sm text-indigo-600">
										{formatRub(selectedRecord.sfrContributionsKop)}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										ОПС: {formatRub(selectedRecord.sfrBreakdown.pensionKop)} • ОМС: {formatRub(selectedRecord.sfrBreakdown.medicalKop)} • Травма: {formatRub(selectedRecord.sfrBreakdown.injuryKop)}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<footer className="staff-payroll-footer">
					<div className="text-xs text-[var(--muted)] flex items-center gap-2">
						<Building className="w-3.5 h-3.5" />
						<span>
							Федеральный МРОТ 2026: 22 440 ₽ • Единый тариф СФР для субъектов МСП (15% сверх МРОТ + 0.2% НС)
						</span>
					</div>

					<div className="flex items-center gap-2 staff-payroll-no-print">
						<button
							type="button"
							onClick={onClose}
							className="staff-payroll-btn"
						>
							Закрыть
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
