/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Advanced Doctor Payroll Modal (Wave 14)
 *
 * Implements:
 * 1. Piecework Accruals by Clinical Direction (Therapy, Orthopedics, Surgery, Hygiene, Retail)
 *    with automatic deduction of Dental Laboratory (ЗТЛ) and Clinical Consumables.
 * 2. Assistant & Radiography Breakdown (Shifts, 3D CT/КЛКТ, OPTG/ОПТГ, Surgical Assistance).
 * 3. 1-Click 1C:ZUP 3.1 (1С:Зарплата и управление персоналом) XML EnterpriseData & CSV Export.
 * 4. Printable Doctor Payroll Slip (Расчетный листок) & Form T-51.
 *
 * Invariant: 100% kopeck-exact integer arithmetic, DENTE design tokens, WCAG >= 4.5:1.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Calculator,
	X,
	FileText,
	Download,
	Calendar,
	User,
	Users,
	Award,
	Percent,
	CheckCircle2,
	DollarSign,
	Layers,
	ChevronRight,
	TrendingUp,
	FileCode,
	FileSpreadsheet,
	Printer,
	Search,
	Filter,
	Stethoscope,
	Activity,
	Copy,
	Check,
	Plus,
	Sliders,
} from "lucide-react";
import {
	calculateDoctorStaffPayroll,
	calculateAssistantStaffPayroll,
	calculateConsolidatedStaffPayroll,
	generate1CZup31Xml,
	generate1CZup31Csv,
	generateStaffPayrollT51Csv,
	type StaffDoctorCompletedServiceItem,
	type DoctorStaffPayrollInput,
	type DoctorStaffPayrollResult,
	type AssistantStaffPayrollInput,
	type AssistantStaffPayrollResult,
	type DoctorSpecialtyId,
	DOCTOR_SPECIALTY_CONFIGS,
	DEFAULT_ASSISTANT_RATES,
} from "./staffPayrollEngine";
import "./advancedPayroll.css";

export interface AdvancedDoctorPayrollModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly doctorsList?: readonly DoctorStaffPayrollInput[] | undefined;
	readonly assistantsList?: readonly AssistantStaffPayrollInput[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
}

export type PayrollTabKey = "directions" | "services" | "assistants" | "kpi" | "export1c" | "slip";

export interface ClinicalDirectionSummary {
	readonly categoryKey: string;
	readonly titleRu: string;
	readonly count: number;
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly netBaseKop: number;
	readonly commissionPercent: number;
	readonly earnedAccrualKop: number;
}

export const AdvancedDoctorPayrollModal: React.FC<AdvancedDoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	organizationInn = "7701984512",
	organizationKpp = "770101001",
	doctorsList = [],
	assistantsList = [],
	initialDoctorId,
	initialPeriodStart = "2026-08-01",
	initialPeriodEnd = "2026-08-31",
}) => {
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
		initialDoctorId || doctorsList[0]?.employeeId || ""
	);
	const [periodStart, setPeriodStart] = useState<string>(initialPeriodStart);
	const [periodEnd, setPeriodEnd] = useState<string>(initialPeriodEnd);
	const [activeTab, setActiveTab] = useState<PayrollTabKey>("directions");
	const [serviceFilter, setServiceFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

	// Editable parameters for doctor
	const [customPercent, setCustomPercent] = useState<number | undefined>(undefined);
	const [plansCount, setPlansCount] = useState<number>(0);
	const [manualAdjustmentRub, setManualAdjustmentRub] = useState<number>(0);
	const [manualNote, setManualNote] = useState<string>("");

	// Sync when initial values change
	React.useEffect(() => {
		if (initialDoctorId) {
			setSelectedDoctorId(initialDoctorId);
		} else if (doctorsList.length > 0 && !doctorsList.some((d) => d.employeeId === selectedDoctorId)) {
			setSelectedDoctorId(doctorsList[0]?.employeeId ?? "");
		}
		if (initialPeriodStart) setPeriodStart(initialPeriodStart);
		if (initialPeriodEnd) setPeriodEnd(initialPeriodEnd);
	}, [initialDoctorId, initialPeriodStart, initialPeriodEnd, doctorsList, selectedDoctorId]);

	const activeDocInput = useMemo(() => {
		if (doctorsList.length === 0) return null;
		const found = doctorsList.find((d) => d.employeeId === selectedDoctorId);
		return found ?? doctorsList[0] ?? null;
	}, [doctorsList, selectedDoctorId]);

	React.useEffect(() => {
		if (activeDocInput?.comprehensivePlansCount !== undefined) {
			setPlansCount(activeDocInput.comprehensivePlansCount);
		}
	}, [activeDocInput]);

	// Calculated Doctor Payroll
	const doctorPayrollResult: DoctorStaffPayrollResult = useMemo(() => {
		if (!isOpen || !activeDocInput) {
			return {
				employeeId: activeDocInput?.employeeId ?? "",
				employeeTabNumber: activeDocInput?.employeeTabNumber ?? "—",
				employeeFullName: activeDocInput?.employeeFullName ?? "Сотрудник не выбран",
				role: "doctor" as const,
				specialtyId: (activeDocInput?.specialtyId ?? "therapist") as DoctorSpecialtyId,
				positionRu: "Врач-стоматолог",
				departmentRu: "Клиническое отделение",
				periodLabelRu: `${periodStart} — ${periodEnd}`,
				daysWorked: 0,
				hoursWorked: 0,
				totalGrossRevenueKop: 0,
				totalLabDeductionsKop: 0,
				totalMaterialDeductionsKop: 0,
				totalNetBaseKop: 0,
				baseCommissionPercent: customPercent ?? 0,
				earnedBaseCommissionKop: 0,
				earnedRetailCommissionKop: 0,
				comprehensivePlansCount: plansCount,
				comprehensivePlanBonusKop: 0,
				revenueKpiPercent: 0,
				revenueKpiBonusKop: 0,
				kpiBadgeLabelRu: "—",
				minimumGuaranteeKop: 0,
				minimumGuaranteeApplied: false,
				guaranteeTopUpKop: 0,
				manualAdjustmentKop: 0,
				manualAdjustmentNoteRu: "",
				grossPayoutBeforeTaxKop: 0,
				servicesCount: 0,
			};
		}
		return calculateDoctorStaffPayroll({
			...activeDocInput,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			customBasePercentage: customPercent,
			comprehensivePlansCount: plansCount,
			manualAdjustmentKop: Math.round(manualAdjustmentRub * 100),
			manualAdjustmentNoteRu: manualNote,
		});
	}, [isOpen, activeDocInput, periodStart, periodEnd, customPercent, plansCount, manualAdjustmentRub, manualNote]);

	// Calculated Assistant Payrolls
	const assistantResults: readonly AssistantStaffPayrollResult[] = useMemo(() => {
		if (!isOpen || assistantsList.length === 0) return [];
		return assistantsList.map((asst) =>
			calculateAssistantStaffPayroll({
				...asst,
				periodStartIso: periodStart,
				periodEndIso: periodEnd,
			})
		);
	}, [isOpen, assistantsList, periodStart, periodEnd]);

	// Direction Summaries Breakdown
	const directionSummaries: readonly ClinicalDirectionSummary[] = useMemo(() => {
		if (!activeDocInput || activeDocInput.services.length === 0) return [];

		const map: Record<string, { count: number; gross: number; lab: number; mat: number; title: string }> = {
			therapy: { count: 0, gross: 0, lab: 0, mat: 0, title: "Терапия и эндодонтия" },
			orthopedics: { count: 0, gross: 0, lab: 0, mat: 0, title: "Ортопедия (CAD/CAM)" },
			surgery: { count: 0, gross: 0, lab: 0, mat: 0, title: "Хирургия и имплантация" },
			hygiene: { count: 0, gross: 0, lab: 0, mat: 0, title: "Профессиональная гигиена" },
			retail_hygiene: { count: 0, gross: 0, lab: 0, mat: 0, title: "Розничные товары (Curaprox)" },
			pediatric: { count: 0, gross: 0, lab: 0, mat: 0, title: "Детская стоматология" },
		};

		const preset = DOCTOR_SPECIALTY_CONFIGS[activeDocInput.specialtyId] ?? DOCTOR_SPECIALTY_CONFIGS.therapist;
		const basePct = customPercent ?? preset.defaultPercentage;

		for (const s of activeDocInput.services) {
			const cat = map[s.category] ?? { count: 0, gross: 0, lab: 0, mat: 0, title: s.category };
			cat.count += 1;
			cat.gross += s.grossRevenueKop;
			cat.lab += s.labCostKop;
			cat.mat += s.materialCostKop;
			map[s.category] = cat;
		}

		return Object.entries(map)
			.filter(([_, data]) => data.count > 0)
			.map(([key, data]) => {
				const isRetail = key === "retail_hygiene";
				const pct = isRetail ? (preset.retailProductsPercentage ?? 10) : basePct;
				const netBase = Math.max(0, data.gross - data.lab - data.mat);
				const earned = Math.round(( (isRetail ? data.gross : netBase) * pct) / 100);

				return {
					categoryKey: key,
					titleRu: data.title,
					count: data.count,
					grossRevenueKop: data.gross,
					labCostKop: data.lab,
					materialCostKop: data.mat,
					netBaseKop: isRetail ? data.gross : netBase,
					commissionPercent: pct,
					earnedAccrualKop: earned,
				};
			});
	}, [activeDocInput, customPercent]);

	// Consolidated Summary for 1C:ZUP Export
	const consolidatedSummary = useMemo(() => {
		return calculateConsolidatedStaffPayroll({
			clinicName,
			organizationInn,
			organizationKpp,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			doctors: activeDocInput
				? [
						{
							...activeDocInput,
							periodStartIso: periodStart,
							periodEndIso: periodEnd,
							customBasePercentage: customPercent,
							comprehensivePlansCount: plansCount,
							manualAdjustmentKop: Math.round(manualAdjustmentRub * 100),
							manualAdjustmentNoteRu: manualNote,
						},
				  ]
				: [],
			assistants: assistantsList,
		});
	}, [clinicName, organizationInn, organizationKpp, periodStart, periodEnd, activeDocInput, customPercent, plansCount, manualAdjustmentRub, manualNote, assistantsList]);

	// XML & CSV 1C Outputs
	const xml1CContent = useMemo(() => {
		return generate1CZup31Xml(consolidatedSummary);
	}, [consolidatedSummary]);

	const csv1CContent = useMemo(() => {
		return generate1CZup31Csv(consolidatedSummary);
	}, [consolidatedSummary]);

	const csvT51Content = useMemo(() => {
		return generateStaffPayrollT51Csv(consolidatedSummary);
	}, [consolidatedSummary]);

	const handleDownloadXml = useCallback(() => {
		const blob = new Blob([xml1CContent], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `1C_ZUP_Doctor_${doctorPayrollResult.employeeTabNumber || "00000"}_${periodStart}.xml`;
		a.click();
		URL.revokeObjectURL(url);
	}, [xml1CContent, doctorPayrollResult.employeeTabNumber, periodStart]);

	const handleDownloadCsv1C = useCallback(() => {
		const blob = new Blob([csv1CContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `1C_ZUP_Accruals_${periodStart}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [csv1CContent, periodStart]);

	const handleDownloadT51Csv = useCallback(() => {
		const blob = new Blob([csvT51Content], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Form_T51_${periodStart}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [csvT51Content, periodStart]);

	const handleCopyText = (text: string, formatName: string) => {
		navigator.clipboard.writeText(text);
		setCopiedFormat(formatName);
		setTimeout(() => setCopiedFormat(null), 2000);
	};

	if (!isOpen) return null;

	const filteredServices = useMemo(() => {
		if (!activeDocInput || activeDocInput.services.length === 0) return [];
		return activeDocInput.services.filter((s) => {
			if (serviceFilter !== "all" && s.category !== serviceFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchName = s.serviceNameRu.toLowerCase().includes(q);
				const matchPatient = s.patientName.toLowerCase().includes(q);
				const matchTooth = s.toothCode?.toLowerCase().includes(q);
				const matchCode = s.order804nCode?.toLowerCase().includes(q);
				return matchName || matchPatient || matchTooth || matchCode;
			}
			return true;
		});
	}, [activeDocInput, serviceFilter, searchQuery]);

	// Approximate NDFL 13% for reference display
	const ndfl13ReferenceKop = Math.round(doctorPayrollResult.grossPayoutBeforeTaxKop * 0.13);
	const netTakeHomeKop = doctorPayrollResult.grossPayoutBeforeTaxKop - ndfl13ReferenceKop;

	return (
		<div className="adv-payroll-overlay" data-testid="advanced-doctor-payroll-modal">
			<div className="adv-payroll-container">
				{/* Top Header */}
				<div className="adv-payroll-header no-print">
					<div className="adv-payroll-header-title">
						<div className="adv-payroll-icon-badge">
							<Calculator className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Расширенный расчет сдельной зарплаты врача
								<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
									Т-51 / 1С:ЗУП 3.1
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicName} • ИНН {organizationInn} • Автоматический вычет материалов и ЗТЛ • Связка с ассистентами
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDownloadXml}
							className="adv-btn adv-btn-primary"
							title="1-клик экспорт в 1С:ЗУП 3.1 XML"
						>
							<FileCode className="w-4 h-4" />
							Экспорт в 1С:ЗУП (XML)
						</button>
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть окно"
							className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Doctor & Period Filter Toolbar */}
				<div className="p-3.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
					<div>
						<label className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1.5 mb-1">
							<User className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Врач-стоматолог:
						</label>
						<select
							value={selectedDoctorId}
							onChange={(e) => setSelectedDoctorId(e.target.value)}
							disabled={doctorsList.length === 0}
							className="w-full h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-[var(--teal,#0d9488)] disabled:opacity-50"
						>
							{doctorsList.length === 0 ? (
								<option value="">Нет сотрудников для расчета</option>
							) : (
								doctorsList.map((doc) => (
									<option key={doc.employeeId} value={doc.employeeId}>
										{doc.employeeFullName} ({doc.employeeTabNumber})
									</option>
								))
							)}
						</select>
					</div>

					<div>
						<label className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1.5 mb-1">
							<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Начало периода:
						</label>
						<input
							type="date"
							value={periodStart}
							onChange={(e) => setPeriodStart(e.target.value)}
							className="w-full h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
						/>
					</div>

					<div>
						<label className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1.5 mb-1">
							<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Конец периода:
						</label>
						<input
							type="date"
							value={periodEnd}
							onChange={(e) => setPeriodEnd(e.target.value)}
							className="w-full h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
						/>
					</div>

					<div className="flex items-end gap-2">
						<div className="flex-1">
							<label className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1 mb-1">
								<Percent className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								Ставка врача:
							</label>
							<input
								type="number"
								min="1"
								max="100"
								value={customPercent ?? doctorPayrollResult.baseCommissionPercent}
								onChange={(e) => setCustomPercent(Number(e.target.value) || undefined)}
								className="w-full h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)]"
								placeholder="%"
							/>
						</div>
					</div>
				</div>

				{/* Top 6 KPI Metric Cards */}
				<div className="adv-payroll-kpi-grid no-print">
					<div className="adv-payroll-kpi-card">
						<span className="adv-payroll-kpi-label">
							<TrendingUp className="w-3.5 h-3.5 text-blue-600" />
							Выручка брутто
						</span>
						<span className="adv-payroll-kpi-val text-blue-600 dark:text-blue-400">
							{(doctorPayrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU")} ₽
						</span>
						<span className="adv-payroll-kpi-sub">
							{doctorPayrollResult.servicesCount} приемов / нарядов
						</span>
					</div>

					<div className="adv-payroll-kpi-card">
						<span className="adv-payroll-kpi-label">
							<Activity className="w-3.5 h-3.5 text-rose-600" />
							Вычеты (ЗТЛ + материалы)
						</span>
						<span className="adv-payroll-kpi-val text-rose-600 dark:text-rose-400">
							-{((doctorPayrollResult.totalLabDeductionsKop + doctorPayrollResult.totalMaterialDeductionsKop) / 100).toLocaleString("ru-RU")} ₽
						</span>
						<span className="adv-payroll-kpi-sub">
							ЗТЛ: {(doctorPayrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU")} ₽ • Мат: {(doctorPayrollResult.totalMaterialDeductionsKop / 100).toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<div className="adv-payroll-kpi-card">
						<span className="adv-payroll-kpi-label">
							<Sliders className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Чистая база
						</span>
						<span className="adv-payroll-kpi-val text-[var(--teal,#0d9488)]">
							{(doctorPayrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU")} ₽
						</span>
						<span className="adv-payroll-kpi-sub">
							Базовая ставка {doctorPayrollResult.baseCommissionPercent}%
						</span>
					</div>

					<div className="adv-payroll-kpi-card">
						<span className="adv-payroll-kpi-label">
							<Award className="w-3.5 h-3.5 text-amber-600" />
							KPI & Премии
						</span>
						<span className="adv-payroll-kpi-val text-amber-600 dark:text-amber-400">
							+{((doctorPayrollResult.comprehensivePlanBonusKop + doctorPayrollResult.revenueKpiBonusKop + doctorPayrollResult.earnedRetailCommissionKop) / 100).toLocaleString("ru-RU")} ₽
						</span>
						<span className="adv-payroll-kpi-sub truncate">
							{doctorPayrollResult.kpiBadgeLabelRu}
						</span>
					</div>

					<div className="adv-payroll-kpi-card border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)]">
						<span className="adv-payroll-kpi-label text-[var(--teal,#0d9488)]">
							<DollarSign className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Всего начислено (1С)
						</span>
						<span className="adv-payroll-kpi-val text-[var(--teal,#0d9488)]">
							{(doctorPayrollResult.grossPayoutBeforeTaxKop / 100).toLocaleString("ru-RU")} ₽
						</span>
						<span className="adv-payroll-kpi-sub">
							{doctorPayrollResult.daysWorked} рабочих смен ({doctorPayrollResult.hoursWorked.toFixed(1)} ч)
						</span>
					</div>

					<div className="adv-payroll-kpi-card">
						<span className="adv-payroll-kpi-label">
							<CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok-fg,#059669)]" />
							На руки (справ. -13%)
						</span>
						<span className="adv-payroll-kpi-val text-[var(--ok-fg,#059669)]">
							{(netTakeHomeKop / 100).toLocaleString("ru-RU")} ₽
						</span>
						<span className="adv-payroll-kpi-sub">
							НДФЛ 13%: -{(ndfl13ReferenceKop / 100).toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Interactive Navigation Tabs */}
				<div className="adv-payroll-tabs no-print">
					<button
						type="button"
						onClick={() => setActiveTab("directions")}
						className={`adv-payroll-tab-btn ${activeTab === "directions" ? "active" : ""}`}
					>
						<Layers className="w-4 h-4" />
						Сводка по направлениям ({directionSummaries.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("services")}
						className={`adv-payroll-tab-btn ${activeTab === "services" ? "active" : ""}`}
					>
						<Stethoscope className="w-4 h-4" />
						Детализация нарядов ({activeDocInput?.services.length ?? 0})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("assistants")}
						className={`adv-payroll-tab-btn ${activeTab === "assistants" ? "active" : ""}`}
					>
						<Users className="w-4 h-4" />
						Ассистенты и рентгенография ({assistantResults.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("kpi")}
						className={`adv-payroll-tab-btn ${activeTab === "kpi" ? "active" : ""}`}
					>
						<Award className="w-4 h-4" />
						KPI, Планы и Корректировки
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("export1c")}
						className={`adv-payroll-tab-btn ${activeTab === "export1c" ? "active" : ""}`}
					>
						<FileCode className="w-4 h-4" />
						1С:ЗУП 3.1 & Бухгалтерия
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("slip")}
						className={`adv-payroll-tab-btn ${activeTab === "slip" ? "active" : ""}`}
					>
						<Printer className="w-4 h-4" />
						Печать расчетного листка
					</button>
				</div>

				{/* Main Tab Views Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
					{/* TAB 1: Clinical Directions Breakdown */}
					{activeTab === "directions" && (
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between">
								<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									Начисления врача по клиническим направлениям:
								</h3>
								<span className="text-xs text-[var(--muted,#64748b)]">
									Специальность: <span className="font-bold text-[var(--ink,#0f172a)]">{doctorPayrollResult.positionRu}</span>
								</span>
							</div>

							{directionSummaries.length === 0 ? (
								<div className="p-8 text-center border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
									<Layers className="w-8 h-8 opacity-40 text-[var(--teal,#0d9488)]" />
									<p className="text-xs font-semibold text-[var(--ink,#0f172a)]">
										{doctorsList.length === 0
											? "Нет сотрудников для расчета за выбранный период"
											: "Нет подтвержденных оказанных услуг за выбранный расчетный период"}
									</p>
									<p className="text-[11px]">
										Сдельные начисления по клиническим направлениям отсутствуют
									</p>
								</div>
							) : (
								<div className="adv-direction-grid">
									{directionSummaries.map((dir) => {
										const grossShare = doctorPayrollResult.totalGrossRevenueKop > 0
											? (dir.grossRevenueKop / doctorPayrollResult.totalGrossRevenueKop) * 100
											: 0;

										return (
											<div key={dir.categoryKey} className="adv-direction-card">
												<div className="adv-direction-header">
													<span className="font-bold text-xs text-[var(--ink,#0f172a)]">
														{dir.titleRu}
													</span>
													<span className="adv-direction-badge">
														{dir.count} услуг
													</span>
												</div>

												<div className="flex flex-col gap-1.5 pt-1">
													<div className="adv-direction-metric-row">
														<span className="text-[var(--muted,#64748b)]">Выручка:</span>
														<span className="font-bold text-[var(--ink,#0f172a)]">
															{(dir.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
														</span>
													</div>

													{dir.labCostKop > 0 && (
														<div className="adv-direction-metric-row text-amber-600 dark:text-amber-400">
															<span>Вычет ЗТЛ (лаборатория):</span>
															<span className="font-semibold">
																-{(dir.labCostKop / 100).toLocaleString("ru-RU")} ₽
															</span>
														</div>
													)}

													{dir.materialCostKop > 0 && (
														<div className="adv-direction-metric-row text-rose-600 dark:text-rose-400">
															<span>Вычет материалов:</span>
															<span className="font-semibold">
																-{(dir.materialCostKop / 100).toLocaleString("ru-RU")} ₽
															</span>
														</div>
													)}

													<div className="adv-direction-metric-row border-t border-[var(--line,#e2e8f0)] pt-1.5">
														<span className="text-[var(--muted,#64748b)]">Расчетная база ({dir.commissionPercent}%):</span>
														<span className="font-bold text-[var(--teal,#0d9488)]">
															{(dir.netBaseKop / 100).toLocaleString("ru-RU")} ₽
														</span>
													</div>

													<div className="adv-direction-metric-row bg-[var(--teal-soft,#f0fdfa)] p-1.5 rounded-lg">
														<span className="font-bold text-[var(--teal,#0d9488)]">Сдельное начисление:</span>
														<span className="font-black text-sm text-[var(--teal,#0d9488)]">
															{(dir.earnedAccrualKop / 100).toLocaleString("ru-RU")} ₽
														</span>
													</div>
												</div>

												<div className="flex flex-col gap-1 mt-auto pt-2">
													<div className="flex justify-between text-[10px] text-[var(--muted,#64748b)]">
														<span>Доля в общей выручке</span>
														<span className="font-bold">{grossShare.toFixed(1)}%</span>
													</div>
													<div className="adv-progress-bar">
														<div
															className="adv-progress-fill"
															style={{ width: `${Math.min(100, Math.max(5, grossShare))}%` }}
														/>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* TAB 2: Services Detailed Table */}
					{activeTab === "services" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div className="flex items-center gap-2 flex-1 max-w-md">
									<div className="relative w-full">
										<Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted,#64748b)]" />
										<input
											type="text"
											placeholder="Поиск по пациенту, услуге, коду 804н или зубу..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
										/>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-xs font-semibold text-[var(--muted,#64748b)]">Направление:</span>
									<select
										value={serviceFilter}
										onChange={(e) => setServiceFilter(e.target.value)}
										className="h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)]"
									>
										<option value="all">Все направления ({activeDocInput?.services.length ?? 0})</option>
										<option value="therapy">Терапия</option>
										<option value="orthopedics">Ортопедия</option>
										<option value="surgery">Хирургия</option>
										<option value="hygiene">Гигиена</option>
										<option value="retail_hygiene">Розница</option>
									</select>
								</div>
							</div>

							<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)]">
								{filteredServices.length === 0 ? (
									<div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
										<Stethoscope className="w-8 h-8 opacity-40 text-[var(--teal,#0d9488)]" />
										<p className="text-xs font-semibold text-[var(--ink,#0f172a)]">
											{doctorsList.length === 0
												? "Нет сотрудников для расчета за выбранный период"
												: (activeDocInput?.services.length ?? 0) === 0
													? "Нет подтвержденных оказанных услуг за выбранный расчетный период"
													: "По заданным фильтрам услуг не найдено"}
										</p>
										<p className="text-[11px]">
											При закрытии приемов и нарядов данные автоматически поступят в расчет ведомости
										</p>
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs border-collapse">
											<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
												<tr>
													<th className="p-2.5">Дата</th>
													<th className="p-2.5">Пациент</th>
													<th className="p-2.5">Услуга / Код 804н / Зуб</th>
													<th className="p-2.5 text-right">Выручка брутто</th>
													<th className="p-2.5 text-right">Вычет ЗТЛ</th>
													<th className="p-2.5 text-right">Вычет материалов</th>
													<th className="p-2.5 text-right">Чистая база</th>
													<th className="p-2.5 text-right">Начислено врачу</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
												{filteredServices.map((srv) => {
													const isRetail = srv.category === "retail_hygiene";
													const preset = DOCTOR_SPECIALTY_CONFIGS[activeDocInput?.specialtyId ?? "therapist"] ?? DOCTOR_SPECIALTY_CONFIGS.therapist;
													const pct = isRetail ? preset.retailProductsPercentage : (customPercent ?? preset.defaultPercentage);
													const labDeduct = preset.deductsLabCosts ? srv.labCostKop : 0;
													const matDeduct = preset.deductsMaterialCosts ? srv.materialCostKop : 0;
													const netBase = Math.max(0, srv.grossRevenueKop - labDeduct - matDeduct);
													const earned = isRetail
														? Math.round((srv.grossRevenueKop * pct) / 100)
														: Math.round((netBase * pct) / 100);

													return (
														<tr key={srv.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
															<td className="p-2.5 font-medium whitespace-nowrap">{srv.dateIso}</td>
															<td className="p-2.5 font-semibold text-[var(--ink,#0f172a)]">
																<div>{srv.patientName}</div>
																<div className="text-[10px] text-[var(--muted,#64748b)]">Карта: {srv.medicalCardNumber}</div>
															</td>
															<td className="p-2.5">
																<div className="font-medium text-[var(--ink,#0f172a)]">{srv.serviceNameRu}</div>
																<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
																	{srv.order804nCode && srv.order804nCode !== "—" && (
																		<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
																			804н: {srv.order804nCode}
																		</span>
																	)}
																	{srv.toothCode && (
																		<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]">
																			Зуб {srv.toothCode}
																		</span>
																	)}
																</div>
															</td>
															<td className="p-2.5 font-bold text-right whitespace-nowrap">
																{(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
															</td>
															<td className="p-2.5 text-right whitespace-nowrap text-amber-600 dark:text-amber-400">
																{srv.labCostKop > 0 ? `- ${(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
															</td>
															<td className="p-2.5 text-right whitespace-nowrap text-rose-600 dark:text-rose-400">
																{srv.materialCostKop > 0 ? `- ${(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
															</td>
															<td className="p-2.5 text-right whitespace-nowrap font-bold text-[var(--teal,#0d9488)]">
																{(netBase / 100).toLocaleString("ru-RU")} ₽
															</td>
															<td className="p-2.5 text-right whitespace-nowrap font-black text-[var(--ok-fg,#059669)]">
																{(earned / 100).toLocaleString("ru-RU")} ₽ ({pct}%)
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					)}

					{/* TAB 3: Assistants & Radiography */}
					{activeTab === "assistants" && (
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between">
								<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									Детализация работы ассистентов, смен и выполненных снимков:
								</h3>
								<span className="text-xs text-[var(--muted,#64748b)]">
									Снимки КЛКТ/ОПТГ: <span className="font-bold text-[var(--teal,#0d9488)]">150 ₽/снимок</span> • Хирургия: <span className="font-bold text-[var(--teal,#0d9488)]">500 ₽/операция</span>
								</span>
							</div>

							{assistantResults.length === 0 ? (
								<div className="p-8 text-center border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
									<Users className="w-8 h-8 opacity-40 text-[var(--teal,#0d9488)]" />
									<p className="text-xs font-semibold text-[var(--ink,#0f172a)]">
										Нет данных по ассистентам за выбранный расчетный период
									</p>
									<p className="text-[11px]">
										Смены, снимки и ассистирование на операциях отображаются по мере проведения процедур
									</p>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{assistantResults.map((asst) => (
										<div key={asst.employeeId} className="adv-assistant-card">
											<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2.5">
												<div>
													<h4 className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center gap-1.5">
														<User className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
														{asst.employeeFullName}
													</h4>
													<p className="text-[10px] text-[var(--muted,#64748b)]">
														Таб. № {asst.employeeTabNumber} • {asst.positionRu}
													</p>
												</div>
												<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
													{asst.category === "highest" ? "Высшая категория (+20%)" : asst.category === "first" ? "I категория (+15%)" : "Базовый тариф"}
												</span>
											</div>

											<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
												<div className="adv-assistant-stat-chip">
													<span>Смен:</span>
													<span className="font-bold text-[var(--teal,#0d9488)]">{asst.totalShiftsCount} ({asst.totalHoursWorked.toFixed(1)}ч)</span>
												</div>
												<div className="adv-assistant-stat-chip">
													<span>Снимков:</span>
													<span className="font-bold text-blue-600">{asst.totalRadiographsCount} шт</span>
												</div>
												<div className="adv-assistant-stat-chip">
													<span>Операций:</span>
													<span className="font-bold text-purple-600">{asst.totalSurgeriesCount} оп</span>
												</div>
												<div className="adv-assistant-stat-chip">
													<span>ЦСО:</span>
													<span className="font-bold text-amber-600">{asst.sterilizationShiftsCount} см</span>
												</div>
											</div>

											<div className="flex flex-col gap-1 text-xs border-t border-[var(--line,#e2e8f0)] pt-2 mt-1">
												<div className="flex justify-between text-[var(--muted,#64748b)]">
													<span>Базовая оплата смен:</span>
													<span className="font-semibold text-[var(--ink,#0f172a)]">{(asst.baseShiftsPayoutKop / 100).toLocaleString("ru-RU")} ₽</span>
												</div>
												{asst.categoryBonusKop > 0 && (
													<div className="flex justify-between text-blue-600">
														<span>Надбавка за категорию (+{asst.categoryBonusPercent}%):</span>
														<span className="font-semibold">+{(asst.categoryBonusKop / 100).toLocaleString("ru-RU")} ₽</span>
													</div>
												)}
												{asst.radiographsPayoutKop > 0 && (
													<div className="flex justify-between text-[var(--teal,#0d9488)]">
														<span>Сдельная доплата за снимки (КЛКТ/ОПТГ):</span>
														<span className="font-semibold">+{(asst.radiographsPayoutKop / 100).toLocaleString("ru-RU")} ₽</span>
													</div>
												)}
												{asst.surgeriesPayoutKop > 0 && (
													<div className="flex justify-between text-purple-600">
														<span>Доплата за ассистирование на операциях:</span>
														<span className="font-semibold">+{(asst.surgeriesPayoutKop / 100).toLocaleString("ru-RU")} ₽</span>
													</div>
												)}
												{asst.sterilizationBonusKop > 0 && (
													<div className="flex justify-between text-amber-600">
														<span>Доплата за ЦСО и автоклавирование:</span>
														<span className="font-semibold">+{(asst.sterilizationBonusKop / 100).toLocaleString("ru-RU")} ₽</span>
													</div>
												)}

												<div className="flex justify-between items-center bg-[var(--paper,#ffffff)] p-2 rounded-lg border border-[var(--line,#e2e8f0)] font-bold text-xs mt-1">
													<span className="text-[var(--teal,#0d9488)]">Всего начислено ассистенту:</span>
													<span className="font-black text-sm text-[var(--ok-fg,#059669)]">
														{(asst.grossPayoutBeforeTaxKop / 100).toLocaleString("ru-RU")} ₽
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* TAB 4: KPI & Plans */}
					{activeTab === "kpi" && (
						doctorsList.length === 0 ? (
							<div className="p-8 text-center border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
								<Award className="w-8 h-8 opacity-40 text-[var(--teal,#0d9488)]" />
								<p className="text-xs font-semibold text-[var(--ink,#0f172a)]">
									Нет сотрудников для расчета за выбранный период
								</p>
								<p className="text-[11px]">
									Выберите врача для настройки KPI, комплексных планов и ручных корректировок
								</p>
							</div>
						) : (
							<div className="flex flex-col gap-4 max-w-3xl">
								<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									Параметры KPI, комплексных планов и ручных корректировок:
								</h3>

								<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
												<Award className="w-4 h-4 text-amber-500" />
												Комплексные планы лечения (KPI):
											</h4>
											<p className="text-[11px] text-[var(--muted,#64748b)]">
												Бонус 5,000 ₽ за каждый успешно завершенный комплексный план лечения
											</p>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="number"
												min="0"
												max="50"
												value={plansCount}
												onChange={(e) => setPlansCount(Number(e.target.value) || 0)}
												className="w-20 h-9 text-center font-bold text-xs rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]"
											/>
											<span className="text-xs font-bold text-[var(--teal,#0d9488)]">
												= {((plansCount * 500000) / 100).toLocaleString("ru-RU")} ₽
											</span>
										</div>
									</div>

									<div className="border-t border-[var(--line,#e2e8f0)] pt-3 flex items-center justify-between">
										<div>
											<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
												<TrendingUp className="w-4 h-4 text-blue-500" />
												Премия за перевыполнение финансового плана клиники:
											</h4>
											<p className="text-[11px] text-[var(--muted,#64748b)]">
												{doctorPayrollResult.kpiBadgeLabelRu} (+{doctorPayrollResult.revenueKpiPercent}%)
											</p>
										</div>
										<span className="text-xs font-bold text-blue-600">
											+{(doctorPayrollResult.revenueKpiBonusKop / 100).toLocaleString("ru-RU")} ₽
										</span>
									</div>

									<div className="border-t border-[var(--line,#e2e8f0)] pt-3 flex flex-col gap-2">
										<div className="flex items-center justify-between">
											<h4 className="text-xs font-bold text-[var(--ink,#0f172a)]">
												Разовая ручная корректировка (премия / удержание):
											</h4>
											<div className="flex items-center gap-2">
												<input
													type="number"
													step="500"
													value={manualAdjustmentRub}
													onChange={(e) => setManualAdjustmentRub(Number(e.target.value) || 0)}
													className="w-32 h-9 text-right px-2 font-bold text-xs rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]"
													placeholder="0.00 ₽"
												/>
												<span className="text-xs text-[var(--muted,#64748b)]">₽</span>
											</div>
										</div>
										<input
											type="text"
											placeholder="Обоснование корректировки (напр., Премия за наставничество ординатора)..."
											value={manualNote}
											onChange={(e) => setManualNote(e.target.value)}
											className="w-full h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)]"
										/>
									</div>
								</div>
							</div>
						)
					)}

					{/* TAB 5: 1C:ZUP 3.1 Export */}
					{activeTab === "export1c" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider flex items-center gap-2">
									<FileCode className="w-4 h-4 text-[var(--teal,#0d9488)]" />
									1С:ЗУП 3.1 — Пакет обмена (EnterpriseData 1.13 & CSV)
								</h3>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => handleCopyText(xml1CContent, "xml")}
										className="adv-btn adv-btn-sm"
									>
										{copiedFormat === "xml" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
										{copiedFormat === "xml" ? "XML скопирован" : "Копировать XML"}
									</button>
									<button
										type="button"
										onClick={handleDownloadXml}
										className="adv-btn adv-btn-sm adv-btn-primary"
									>
										<Download className="w-3.5 h-3.5" />
										Скачать XML (1С:ЗУП)
									</button>
									<button
										type="button"
										onClick={handleDownloadCsv1C}
										className="adv-btn adv-btn-sm"
									>
										<FileSpreadsheet className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
										Скачать CSV для 1С
									</button>
								</div>
							</div>

							<div className="adv-xml-box">
								<pre>{xml1CContent}</pre>
							</div>
						</div>
					)}

					{/* TAB 6: Doctor Slip Print Preview */}
					{activeTab === "slip" && (
						doctorsList.length === 0 ? (
							<div className="p-8 text-center border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col items-center justify-center gap-2 text-[var(--muted,#64748b)]">
								<Printer className="w-8 h-8 opacity-40 text-[var(--teal,#0d9488)]" />
								<p className="text-xs font-semibold text-[var(--ink,#0f172a)]">
									Нет сотрудников для формирования расчетного листка
								</p>
								<p className="text-[11px]">
									Выберите врача с подтвержденными начислениями для предпросмотра и печати
								</p>
							</div>
						) : (
							<div className="p-6 bg-[#ffffff] text-[#000000] border border-[var(--line,#e2e8f0)] rounded-xl font-mono text-xs flex flex-col gap-3">
								<div className="text-center font-bold border-b pb-2">
									<div className="text-sm">{clinicName}</div>
									<div>РАСЧЕТНЫЙ ЛИСТОК ЗА {periodStart} — {periodEnd}</div>
								</div>

								<div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b">
									<div><strong>Сотрудник:</strong> {doctorPayrollResult.employeeFullName} (Таб. № {doctorPayrollResult.employeeTabNumber})</div>
									<div><strong>Должность:</strong> {doctorPayrollResult.positionRu}</div>
									<div><strong>Подразделение:</strong> {doctorPayrollResult.departmentRu}</div>
									<div><strong>Отработано:</strong> {doctorPayrollResult.daysWorked} дн ({doctorPayrollResult.hoursWorked.toFixed(1)} ч)</div>
								</div>

								<div className="flex flex-col gap-1 text-[11px]">
									<div className="font-bold text-xs pb-1">НАЧИСЛЕНО:</div>
									<div className="flex justify-between">
										<span>1. Сдельная оплата ({doctorPayrollResult.baseCommissionPercent}% от чистой базы):</span>
										<span>{(doctorPayrollResult.earnedBaseCommissionKop / 100).toFixed(2)} ₽</span>
									</div>
									{doctorPayrollResult.earnedRetailCommissionKop > 0 && (
										<div className="flex justify-between">
											<span>2. Комиссия за розничные средства гигиены:</span>
											<span>{(doctorPayrollResult.earnedRetailCommissionKop / 100).toFixed(2)} ₽</span>
										</div>
									)}
									{doctorPayrollResult.comprehensivePlanBonusKop > 0 && (
										<div className="flex justify-between">
											<span>3. Премия за комплексные планы лечения ({doctorPayrollResult.comprehensivePlansCount} шт):</span>
											<span>{(doctorPayrollResult.comprehensivePlanBonusKop / 100).toFixed(2)} ₽</span>
										</div>
									)}
									{doctorPayrollResult.revenueKpiBonusKop > 0 && (
										<div className="flex justify-between">
											<span>4. Премия за выполнение плана выручки (+{doctorPayrollResult.revenueKpiPercent}%):</span>
											<span>{(doctorPayrollResult.revenueKpiBonusKop / 100).toFixed(2)} ₽</span>
										</div>
									)}
									{doctorPayrollResult.manualAdjustmentKop !== 0 && (
										<div className="flex justify-between">
											<span>5. Ручная корректировка ({doctorPayrollResult.manualAdjustmentNoteRu || "Премия/удержание"}):</span>
											<span>{(doctorPayrollResult.manualAdjustmentKop / 100).toFixed(2)} ₽</span>
										</div>
									)}

									<div className="flex justify-between font-bold border-t pt-1.5 mt-1 text-xs">
										<span>ВСЕГО НАЧИСЛЕНО (ГРОСС):</span>
										<span>{(doctorPayrollResult.grossPayoutBeforeTaxKop / 100).toFixed(2)} ₽</span>
									</div>

									<div className="flex justify-between text-rose-700 pt-1">
										<span>УДЕРЖАНО: НДФЛ 13% (справочно):</span>
										<span>-{(ndfl13ReferenceKop / 100).toFixed(2)} ₽</span>
									</div>

									<div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5 mt-1">
										<span>К ВЫПЛАТЕ НА РУКИ (НЕТТО):</span>
										<span>{(netTakeHomeKop / 100).toFixed(2)} ₽</span>
									</div>
								</div>

								<div className="pt-4 flex justify-between text-[10px] text-neutral-600">
									<div>Бухгалтер: _________________ / _______________ /</div>
									<div>Работник: _________________ / {doctorPayrollResult.employeeFullName} /</div>
								</div>

								<div className="pt-2 no-print flex justify-end">
									<button
										type="button"
										onClick={() => window.print()}
										className="adv-btn adv-btn-primary"
									>
										<Printer className="w-4 h-4" />
										Печать расчетного листка
									</button>
								</div>
							</div>
						)
					)}
				</div>

				{/* Modal Bottom Footer */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3 no-print">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Врач: <span className="font-bold text-[var(--ink,#0f172a)]">{doctorPayrollResult.employeeFullName}</span> • Итого: <span className="font-black text-[var(--teal,#0d9488)]">{(doctorPayrollResult.grossPayoutBeforeTaxKop / 100).toLocaleString("ru-RU")} ₽</span>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleDownloadT51Csv}
							className="adv-btn"
						>
							<FileSpreadsheet className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Форма Т-51 (CSV)
						</button>

						<button
							type="button"
							onClick={handleDownloadXml}
							className="adv-btn adv-btn-primary"
						>
							<FileCode className="w-4 h-4" />
							1С:ЗУП 3.1 (XML)
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
