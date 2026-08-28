/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Form T-13 Statutory Timesheet Modal (Wave 14)
 *
 * Implements:
 * 1. Interactive Unified Form No. T-13 ("Табель учета рабочего времени",
 *    Постановление Госкомстата РФ от 05.01.2004 № 1).
 * 2. Statutory Russian attendance/absence codes (Я, В, Б, ОТ, ОД, РВ, С, Н, ДО, К, ПК)
 *    and daily hours accounting.
 * 3. Quick-fill presets (5-day 6h/8h, shift 2/2 12h, vacation, sick leave).
 * 4. Multi-employee department ledger overview.
 * 5. Official Statutory A4 Landscape Print Sheet with signatures.
 * 6. 1-Click Form T-13 CSV Export with UTF-8 BOM.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Calendar,
	Clock,
	Download,
	FileSpreadsheet,
	Printer,
	User,
	Users,
	X,
	CheckCircle2,
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Plus,
	Building,
	Sliders,
	Search,
	Filter,
	Sparkles,
	FileText,
	Layers,
	Eye,
} from "lucide-react";
import {
	calculateEmployeeTimesheetT13,
	generateTimesheetT13Csv,
	getDaysInMonth,
	TIMESHEET_STATUTORY_CODES,
	type TimesheetCode,
	type TimesheetDayRecord,
	type EmployeeTimesheetInput,
	type EmployeeTimesheetResult,
} from "@dental/shared";
import "./advancedPayroll.css";

export interface FormT13TimesheetModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly organizationOkpo?: string | undefined;
	readonly initialYear?: number | undefined;
	readonly initialMonth?: number | undefined;
	readonly employeesList?: readonly FormT13EmployeeInfo[] | undefined;
}

export interface FormT13EmployeeInfo {
	readonly id: string;
	readonly tabNumber: string;
	readonly name: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly defaultShiftHours: number;
}

export type TimesheetViewMode = "interactive" | "allEmployees" | "printA4";

const DEFAULT_CLINIC_EMPLOYEES: readonly FormT13EmployeeInfo[] = [
	{
		id: "emp-t13-1",
		tabNumber: "00101",
		name: "Смирнов Алексей Петрович",
		positionRu: "Врач-стоматолог терапевт",
		departmentRu: "Терапевтическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-t13-2",
		tabNumber: "00102",
		name: "Васильев Максим Сергеевич",
		positionRu: "Врач-стоматолог ортопед",
		departmentRu: "Ортопедическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-t13-3",
		tabNumber: "00103",
		name: "Ковалев Игорь Олегович",
		positionRu: "Врач-стоматолог хирург-имплантолог",
		departmentRu: "Хирургическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-t13-4",
		tabNumber: "00201",
		name: "Иванова Екатерина Сергеевна",
		positionRu: "Старшая медицинская сестра",
		departmentRu: "Сестринская служба / ЦСО",
		defaultShiftHours: 7.8,
	},
	{
		id: "emp-t13-5",
		tabNumber: "00202",
		name: "Петрова Анна Владимировна",
		positionRu: "Ассистент врача-стоматолога",
		departmentRu: "Терапевтическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-t13-6",
		tabNumber: "00301",
		name: "Соколова Елена Дмитриевна",
		positionRu: "Старший администратор",
		departmentRu: "Ресепшен и клиентский сервис",
		defaultShiftHours: 12.0,
	},
];

function generateDefaultMonthRecords(
	year: number,
	month: number,
	defaultHours: number
): TimesheetDayRecord[] {
	const totalDays = getDaysInMonth(year, month);
	const records: TimesheetDayRecord[] = [];

	for (let d = 1; d <= totalDays; d++) {
		const dayOfWeek = new Date(year, month - 1, d).getDay();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

		records.push({
			dayNumber: d,
			primaryCode: isWeekend ? "В" : "Я",
			primaryHours: isWeekend ? 0 : defaultHours,
		});
	}

	return records;
}

export const FormT13TimesheetModal: React.FC<FormT13TimesheetModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	organizationInn = "7701984512",
	organizationKpp = "770101001",
	organizationOkpo = "84920194",
	initialYear,
	initialMonth,
	employeesList = DEFAULT_CLINIC_EMPLOYEES,
}) => {
	const now = new Date();
	const [year, setYear] = useState<number>(initialYear ?? now.getFullYear());
	const [month, setMonth] = useState<number>(initialMonth ?? now.getMonth() + 1);
	const [viewMode, setViewMode] = useState<TimesheetViewMode>("interactive");
	const [selectedEmpId, setSelectedEmpId] = useState<string>(employeesList[0]?.id || "emp-t13-1");
	const [departmentFilter, setDepartmentFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// In-memory schedules map: employeeId -> TimesheetDayRecord[]
	const [schedules, setSchedules] = useState<Record<string, TimesheetDayRecord[]>>(() => {
		const init: Record<string, TimesheetDayRecord[]> = {};
		const yr = initialYear ?? now.getFullYear();
		const mth = initialMonth ?? now.getMonth() + 1;
		employeesList.forEach((emp) => {
			init[emp.id] = generateDefaultMonthRecords(yr, mth, emp.defaultShiftHours);
		});
		return init;
	});

	const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

	const activeEmployee = useMemo(() => {
		return employeesList.find((e) => e.id === selectedEmpId) ?? employeesList[0] ?? DEFAULT_CLINIC_EMPLOYEES[0]!;
	}, [employeesList, selectedEmpId]);

	const currentEmployeeDays: TimesheetDayRecord[] = useMemo(() => {
		return schedules[activeEmployee.id] ?? generateDefaultMonthRecords(year, month, activeEmployee.defaultShiftHours);
	}, [schedules, activeEmployee, year, month]);

	// Calculate Form T-13 results for all employees
	const allResults: EmployeeTimesheetResult[] = useMemo(() => {
		if (!isOpen) return [];
		return employeesList.map((emp) => {
			const days = schedules[emp.id] ?? generateDefaultMonthRecords(year, month, emp.defaultShiftHours);
			return calculateEmployeeTimesheetT13({
				employeeId: emp.id,
				employeeTabNumber: emp.tabNumber,
				employeeFullName: emp.name,
				positionRu: emp.positionRu,
				departmentRu: emp.departmentRu,
				year,
				month,
				days,
			});
		});
	}, [isOpen, schedules, employeesList, year, month]);

	const activeResult: EmployeeTimesheetResult = useMemo(() => {
		return (
			allResults.find((r) => r.employeeId === activeEmployee.id) ??
			calculateEmployeeTimesheetT13({
				employeeId: activeEmployee.id,
				employeeTabNumber: activeEmployee.tabNumber,
				employeeFullName: activeEmployee.name,
				positionRu: activeEmployee.positionRu,
				departmentRu: activeEmployee.departmentRu,
				year,
				month,
				days: currentEmployeeDays,
			})
		);
	}, [allResults, activeEmployee, year, month, currentEmployeeDays]);

	if (!isOpen) return null;

	const handleDayCodeChange = (dayNum: number, newCode: TimesheetCode) => {
		const codeMeta = TIMESHEET_STATUTORY_CODES[newCode];
		const defaultHrs = codeMeta?.isWorkTime ? activeEmployee.defaultShiftHours : 0;

		setSchedules((prev) => {
			const empDays = [...(prev[activeEmployee.id] || currentEmployeeDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			const updated: TimesheetDayRecord = {
				dayNumber: dayNum,
				primaryCode: newCode,
				primaryHours: defaultHrs,
			};

			if (idx >= 0) {
				empDays[idx] = updated;
			} else {
				empDays.push(updated);
			}

			return { ...prev, [activeEmployee.id]: empDays };
		});
	};

	const handleDayHoursChange = (dayNum: number, hours: number) => {
		setSchedules((prev) => {
			const empDays = [...(prev[activeEmployee.id] || currentEmployeeDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			if (idx >= 0) {
				const curr = empDays[idx]!;
				empDays[idx] = {
					...curr,
					primaryHours: Math.max(0, Math.min(24, Number(hours.toFixed(1)))),
				};
			}
			return { ...prev, [activeEmployee.id]: empDays };
		});
	};

	// Quick Fill Actions
	const handleQuickFillStandard5Day = (hoursPerDay: number) => {
		const newDays = generateDefaultMonthRecords(year, month, hoursPerDay);
		setSchedules((prev) => ({ ...prev, [activeEmployee.id]: newDays }));
	};

	const handleQuickFillShift2x2 = () => {
		const records: TimesheetDayRecord[] = [];
		for (let d = 1; d <= daysInMonth; d++) {
			const shiftCycle = (d - 1) % 4; // 0, 1 = work; 2, 3 = off
			const isWork = shiftCycle === 0 || shiftCycle === 1;
			records.push({
				dayNumber: d,
				primaryCode: isWork ? "Я" : "В",
				primaryHours: isWork ? 12.0 : 0,
			});
		}
		setSchedules((prev) => ({ ...prev, [activeEmployee.id]: records }));
	};

	const handleQuickFillVacationRange = (startDay: number, endDay: number) => {
		setSchedules((prev) => {
			const empDays = [...(prev[activeEmployee.id] || currentEmployeeDays)];
			for (let d = startDay; d <= Math.min(endDay, daysInMonth); d++) {
				const idx = empDays.findIndex((item) => item.dayNumber === d);
				const updated: TimesheetDayRecord = { dayNumber: d, primaryCode: "ОТ", primaryHours: 0 };
				if (idx >= 0) empDays[idx] = updated;
				else empDays.push(updated);
			}
			return { ...prev, [activeEmployee.id]: empDays };
		});
	};

	const handleQuickFillSickRange = (startDay: number, endDay: number) => {
		setSchedules((prev) => {
			const empDays = [...(prev[activeEmployee.id] || currentEmployeeDays)];
			for (let d = startDay; d <= Math.min(endDay, daysInMonth); d++) {
				const idx = empDays.findIndex((item) => item.dayNumber === d);
				const updated: TimesheetDayRecord = { dayNumber: d, primaryCode: "Б", primaryHours: 0 };
				if (idx >= 0) empDays[idx] = updated;
				else empDays.push(updated);
			}
			return { ...prev, [activeEmployee.id]: empDays };
		});
	};

	const handleExportCsv = useCallback(() => {
		const csv = generateTimesheetT13Csv(allResults, clinicName, year, month);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Timesheet_Form_T13_${year}_${String(month).padStart(2, "0")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [allResults, clinicName, year, month]);

	const monthLabelRu = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});

	const filteredEmployees = employeesList.filter((emp) => {
		if (departmentFilter !== "all" && emp.departmentRu !== departmentFilter) return false;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			return emp.name.toLowerCase().includes(q) || emp.positionRu.toLowerCase().includes(q) || emp.tabNumber.includes(q);
		}
		return true;
	});

	const departments = Array.from(new Set(employeesList.map((e) => e.departmentRu)));

	return (
		<div className="t13-modal-overlay" data-testid="form-t13-timesheet-modal">
			<div className="t13-modal-container">
				{/* Top Header */}
				<div className="adv-payroll-header no-print">
					<div className="adv-payroll-header-title">
						<div className="adv-payroll-icon-badge">
							<Calendar className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Табель учета рабочего времени
								<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
									Форма Т-13 (ОКУД 0301008)
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicName} • ИНН {organizationInn} • ОКПО {organizationOkpo} • Утверждена Постановлением Госкомстата РФ № 1
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleExportCsv}
							className="adv-btn"
							title="1-клик экспорт табеля в CSV с UTF-8 BOM"
						>
							<Download className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Экспорт Т-13 (CSV)
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="adv-btn adv-btn-primary"
							title="Печать официального бланка А4"
						>
							<Printer className="w-4 h-4" />
							Печать бланка А4
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

				{/* Period & View Mode Selector */}
				<div className="t13-toolbar no-print">
					{/* Month / Year Navigator */}
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)]">Отчетный период:</span>
						<div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
							<button
								type="button"
								onClick={() => {
									if (month === 1) {
										setMonth(12);
										setYear((y) => y - 1);
									} else {
										setMonth((m) => m - 1);
									}
								}}
								className="p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								title="Предыдущий месяц"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="text-xs font-extrabold text-[var(--ink,#0f172a)] capitalize min-w-[130px] text-center">
								{monthLabelRu}
							</span>
							<button
								type="button"
								onClick={() => {
									if (month === 12) {
										setMonth(1);
										setYear((y) => y + 1);
									} else {
										setMonth((m) => m + 1);
									}
								}}
								className="p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								title="Следующий месяц"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* View Mode Switcher */}
					<div className="flex items-center gap-1 bg-[var(--paper-soft,#f8fafc)] p-1 rounded-xl border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => setViewMode("interactive")}
							className={`adv-payroll-tab-btn ${viewMode === "interactive" ? "active" : ""}`}
						>
							<Sliders className="w-3.5 h-3.5" />
							Интерактивный табель
						</button>
						<button
							type="button"
							onClick={() => setViewMode("allEmployees")}
							className={`adv-payroll-tab-btn ${viewMode === "allEmployees" ? "active" : ""}`}
						>
							<Users className="w-3.5 h-3.5" />
							Сводка по персоналу ({employeesList.length})
						</button>
						<button
							type="button"
							onClick={() => setViewMode("printA4")}
							className={`adv-payroll-tab-btn ${viewMode === "printA4" ? "active" : ""}`}
						>
							<Eye className="w-3.5 h-3.5" />
							Бланк Госкомстата (А4)
						</button>
					</div>

					{/* Employee Selector for interactive mode */}
					{viewMode === "interactive" && (
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-[var(--muted,#64748b)]">Сотрудник:</span>
							<select
								value={selectedEmpId}
								onChange={(e) => setSelectedEmpId(e.target.value)}
								className="h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
							>
								{employeesList.map((emp) => (
									<option key={emp.id} value={emp.id}>
										{emp.name} ({emp.positionRu})
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* VIEW 1: Interactive Matrix View */}
				{viewMode === "interactive" && (
					<div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4 no-print">
						{/* Stat Cards for Active Employee */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<div className="adv-payroll-kpi-card">
								<span className="adv-payroll-kpi-label">
									<Clock className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									Отработано дней
								</span>
								<span className="adv-payroll-kpi-val text-[var(--teal,#0d9488)]">
									{activeResult.monthTotalSummary.daysWorked} дн
								</span>
								<span className="adv-payroll-kpi-sub">
									I пол: {activeResult.firstHalfSummary.daysWorked} дн • II пол: {activeResult.secondHalfSummary.daysWorked} дн
								</span>
							</div>

							<div className="adv-payroll-kpi-card">
								<span className="adv-payroll-kpi-label">
									<Clock className="w-3.5 h-3.5 text-blue-600" />
									Отработано часов
								</span>
								<span className="adv-payroll-kpi-val text-blue-600 dark:text-blue-400">
									{activeResult.monthTotalSummary.totalHoursWorked.toFixed(1)} ч
								</span>
								<span className="adv-payroll-kpi-sub">
									Дневные: {activeResult.monthTotalSummary.regularHoursWorked.toFixed(1)} ч • Ночные: {activeResult.monthTotalSummary.nightHoursWorked.toFixed(1)} ч
								</span>
							</div>

							<div className="adv-payroll-kpi-card">
								<span className="adv-payroll-kpi-label">
									<AlertCircle className="w-3.5 h-3.5 text-amber-600" />
									Сверхурочные & Выходные
								</span>
								<span className="adv-payroll-kpi-val text-amber-600 dark:text-amber-400">
									{(activeResult.monthTotalSummary.overtimeHoursWorked + activeResult.monthTotalSummary.weekendHoursWorked).toFixed(1)} ч
								</span>
								<span className="adv-payroll-kpi-sub">
									Сверхурочные (С): {activeResult.monthTotalSummary.overtimeHoursWorked.toFixed(1)} ч • РВ: {activeResult.monthTotalSummary.weekendHoursWorked.toFixed(1)} ч
								</span>
							</div>

							<div className="adv-payroll-kpi-card">
								<span className="adv-payroll-kpi-label">
									<Calendar className="w-3.5 h-3.5 text-rose-600" />
									Неявки (Отпуск / Больничный)
								</span>
								<span className="adv-payroll-kpi-val text-rose-600 dark:text-rose-400">
									{activeResult.monthTotalSummary.vacationDays + activeResult.monthTotalSummary.sickLeaveDays} дн
								</span>
								<span className="adv-payroll-kpi-sub">
									Больничный (Б): {activeResult.monthTotalSummary.sickLeaveDays} дн • Отпуск (ОТ): {activeResult.monthTotalSummary.vacationDays} дн
								</span>
							</div>
						</div>

						{/* Quick Fill Preset Toolbar */}
						<div className="p-3 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-xl flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted,#64748b)]">
								<Sparkles className="w-4 h-4 text-[var(--teal,#0d9488)]" />
								Быстрое заполнение:
							</div>
							<div className="t13-quick-fill-bar">
								<button
									type="button"
									onClick={() => handleQuickFillStandard5Day(6.0)}
									className="adv-btn adv-btn-sm"
								>
									Пятидневка (6ч)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillStandard5Day(7.8)}
									className="adv-btn adv-btn-sm"
								>
									Пятидневка (7.8ч)
								</button>
								<button
									type="button"
									onClick={handleQuickFillShift2x2}
									className="adv-btn adv-btn-sm"
								>
									Сменный 2/2 (12ч)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillVacationRange(1, 14)}
									className="adv-btn adv-btn-sm"
								>
									Отпуск 1-14 (ОТ)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillSickRange(15, 20)}
									className="adv-btn adv-btn-sm"
								>
									Больничный 15-20 (Б)
								</button>
							</div>
						</div>

						{/* Daily 1..31 Calendar Matrix Table */}
						<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)] shadow-sm">
							<div className="p-3 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-2">
								<div className="text-xs font-bold text-[var(--ink,#0f172a)]">
									Ежедневный учет явок и часов: <span className="text-[var(--teal,#0d9488)]">{activeEmployee.name}</span> (Таб. № {activeEmployee.tabNumber})
								</div>
								<div className="flex items-center gap-3 text-[11px] text-[var(--muted,#64748b)]">
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]"></span> Явка (Я)</span>
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500"></span> Отпуск (ОТ)</span>
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500"></span> Больничный (Б)</span>
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-neutral-300 border border-neutral-400"></span> Выходной (В)</span>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full text-center text-xs border-collapse">
									<thead>
										<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
											<th className="p-2 text-left font-bold min-w-[90px]">Параметр</th>
											{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
												const dayOfWeek = new Date(year, month - 1, d).getDay();
												const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
												return (
													<th
														key={d}
														className={`p-1.5 font-bold min-w-[36px] border-l border-[var(--line,#e2e8f0)] ${
															isWeekend ? "bg-rose-500/5 text-rose-600 dark:text-rose-400" : ""
														}`}
													>
														{d}
													</th>
												);
											})}
											<th className="p-2 font-bold min-w-[65px] bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border-l border-[var(--line,#e2e8f0)]">
												Итого
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{/* Row 1: Codes */}
										<tr>
											<td className="p-2 text-left font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)]">
												Код явки
											</td>
											{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
												const rec = currentEmployeeDays.find((item) => item.dayNumber === d);
												const code = rec?.primaryCode ?? "В";
												const isWork = TIMESHEET_STATUTORY_CODES[code]?.isWorkTime;
												const isVac = code === "ОТ" || code === "ОД";
												const isSick = code === "Б" || code === "Т";

												return (
													<td
														key={d}
														className={`p-0.5 border-l border-[var(--line,#e2e8f0)] ${
															isWork
																? "bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)]"
																: isVac
																	? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
																	: isSick
																		? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
																		: "text-[var(--muted,#64748b)]"
														}`}
													>
														<select
															value={code}
															onChange={(e) => handleDayCodeChange(d, e.target.value as TimesheetCode)}
															className="t13-code-select"
														>
															<option value="Я">Я (01)</option>
															<option value="В">В (26)</option>
															<option value="ОТ">ОТ (09)</option>
															<option value="Б">Б (19)</option>
															<option value="РВ">РВ (03)</option>
															<option value="С">С (04)</option>
															<option value="Н">Н (02)</option>
															<option value="ДО">ДО (16)</option>
															<option value="К">К (06)</option>
															<option value="ПК">ПК (07)</option>
														</select>
													</td>
												);
											})}
											<td className="p-2 font-black text-[var(--teal,#0d9488)] bg-[var(--teal-soft,#f0fdfa)] border-l border-[var(--line,#e2e8f0)]">
												{activeResult.monthTotalSummary.daysWorked} дн
											</td>
										</tr>

										{/* Row 2: Hours */}
										<tr>
											<td className="p-2 text-left font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)]">
												Часы работы
											</td>
											{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
												const rec = currentEmployeeDays.find((item) => item.dayNumber === d);
												const hrs = rec?.primaryHours ?? 0;

												return (
													<td key={d} className="p-0 border-l border-[var(--line,#e2e8f0)]">
														<input
															type="number"
															step="0.5"
															min="0"
															max="24"
															value={hrs === 0 ? "" : hrs}
															placeholder="-"
															onChange={(e) => handleDayHoursChange(d, Number(e.target.value) || 0)}
															className="t13-hours-input"
														/>
													</td>
												);
											})}
											<td className="p-2 font-black text-blue-600 dark:text-blue-400 bg-blue-500/5 border-l border-[var(--line,#e2e8f0)]">
												{activeResult.monthTotalSummary.totalHoursWorked.toFixed(1)} ч
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)}

				{/* VIEW 2: All Employees Multi-Department Ledger */}
				{viewMode === "allEmployees" && (
					<div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3 no-print">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2 flex-1 max-w-md">
								<div className="relative w-full">
									<Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted,#64748b)]" />
									<input
										type="text"
										placeholder="Поиск по ФИО, табельному номеру или должности..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
									/>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<span className="text-xs font-semibold text-[var(--muted,#64748b)]">Подразделение:</span>
								<select
									value={departmentFilter}
									onChange={(e) => setDepartmentFilter(e.target.value)}
									className="h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)]"
								>
									<option value="all">Все отделения ({employeesList.length})</option>
									{departments.map((dep) => (
										<option key={dep} value={dep}>
											{dep}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)]">
							<table className="w-full text-left text-xs border-collapse">
								<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
									<tr>
										<th className="p-2.5">Таб. №</th>
										<th className="p-2.5">Сотрудник</th>
										<th className="p-2.5">Должность / Отделение</th>
										<th className="p-2.5 text-center">I пол (дн/ч)</th>
										<th className="p-2.5 text-center">II пол (дн/ч)</th>
										<th className="p-2.5 text-center">Всего дней</th>
										<th className="p-2.5 text-center">Всего часов</th>
										<th className="p-2.5 text-center">Сверхурочные</th>
										<th className="p-2.5 text-center">Больничный</th>
										<th className="p-2.5 text-center">Отпуск</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
									{filteredEmployees.map((emp) => {
										const res = allResults.find((r) => r.employeeId === emp.id);
										const isSelected = emp.id === activeEmployee.id;

										return (
											<tr
												key={emp.id}
												onClick={() => {
													setSelectedEmpId(emp.id);
													setViewMode("interactive");
												}}
												className={`hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer ${
													isSelected ? "bg-[var(--teal-soft,#f0fdfa)] font-semibold" : ""
												}`}
											>
												<td className="p-2.5 font-mono text-[var(--muted,#64748b)]">{emp.tabNumber}</td>
												<td className="p-2.5 font-bold text-[var(--ink,#0f172a)]">{emp.name}</td>
												<td className="p-2.5 text-[var(--muted,#64748b)]">
													<div>{emp.positionRu}</div>
													<div className="text-[10px] text-[var(--muted,#64748b)]">{emp.departmentRu}</div>
												</td>
												<td className="p-2.5 text-center">
													{res?.firstHalfSummary.daysWorked ?? 0} дн / {res?.firstHalfSummary.totalHoursWorked.toFixed(1) ?? 0} ч
												</td>
												<td className="p-2.5 text-center">
													{res?.secondHalfSummary.daysWorked ?? 0} дн / {res?.secondHalfSummary.totalHoursWorked.toFixed(1) ?? 0} ч
												</td>
												<td className="p-2.5 text-center font-bold text-[var(--teal,#0d9488)]">
													{res?.monthTotalSummary.daysWorked ?? 0} дн
												</td>
												<td className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
													{res?.monthTotalSummary.totalHoursWorked.toFixed(1) ?? 0} ч
												</td>
												<td className="p-2.5 text-center text-amber-600">
													{res && res.monthTotalSummary.overtimeHoursWorked > 0 ? `${res.monthTotalSummary.overtimeHoursWorked.toFixed(1)} ч` : "—"}
												</td>
												<td className="p-2.5 text-center text-rose-600">
													{res && res.monthTotalSummary.sickLeaveDays > 0 ? `${res.monthTotalSummary.sickLeaveDays} дн` : "—"}
												</td>
												<td className="p-2.5 text-center text-blue-600">
													{res && res.monthTotalSummary.vacationDays > 0 ? `${res.monthTotalSummary.vacationDays} дн` : "—"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* VIEW 3: Statutory Form T-13 A4 Landscape Print View */}
				{viewMode === "printA4" && (
					<div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-neutral-100 dark:bg-neutral-900 flex justify-center">
						<div className="t13-print-sheet shadow-lg max-w-[1320px] rounded-lg">
							{/* Statutory Header Block */}
							<div className="flex justify-between items-start pb-2 border-b border-black">
								<div className="w-2/3">
									<div className="font-bold text-xs uppercase">{clinicName}</div>
									<div className="text-[9pt] text-neutral-700">ИНН: {organizationInn} / КПП: {organizationKpp}</div>
									<div className="font-bold text-sm mt-2">ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ</div>
								</div>
								<div className="w-1/3 text-right text-[8pt]">
									<div>Унифицированная форма № Т-13</div>
									<div>Утверждена Постановлением Госкомстата России</div>
									<div>от 05.01.2004 № 1</div>
									<div className="mt-1 font-bold">Форма по ОКУД 0301008</div>
									<div>по ОКПО {organizationOkpo}</div>
								</div>
							</div>

							<div className="flex justify-between items-center py-2 text-[8.5pt]">
								<div>
									<strong>Отчетный период:</strong> с 01.{String(month).padStart(2, "0")}.{year} по {daysInMonth}.{String(month).padStart(2, "0")}.{year}
								</div>
								<div>
									<strong>Дата составления:</strong> {daysInMonth}.{String(month).padStart(2, "0")}.{year}
								</div>
							</div>

							{/* Print Table */}
							<table className="t13-print-table mt-1">
								<thead>
									<tr>
										<th rowSpan={2} style={{ width: "24px" }}>№</th>
										<th rowSpan={2} style={{ width: "160px" }}>Фамилия, инициалы, должность</th>
										<th rowSpan={2} style={{ width: "45px" }}>Таб. номер</th>
										<th colSpan={16}>Отметки о явках и неявках на работу по числам месяца (1-15 и 16-31)</th>
										<th colSpan={3}>Отработано за месяц</th>
									</tr>
									<tr>
										{Array.from({ length: 15 }, (_, i) => i + 1).map((d) => (
											<th key={d} style={{ width: "22px" }}>{d}</th>
										))}
										<th style={{ width: "35px" }}>I/II пол</th>
										<th style={{ width: "35px" }}>Дней</th>
										<th style={{ width: "40px" }}>Часов</th>
										<th style={{ width: "45px" }}>В т.ч. С/Н</th>
									</tr>
								</thead>
								<tbody>
									{allResults.map((res, index) => {
										const row1Days = res.dailyRecords.filter((d) => d.dayNumber <= 15);
										const row2Days = res.dailyRecords.filter((d) => d.dayNumber >= 16);

										return (
											<React.Fragment key={res.employeeId}>
												{/* Upper Row: 1..15 days */}
												<tr>
													<td rowSpan={4}>{index + 1}</td>
													<td rowSpan={4} style={{ textAlign: "left", fontWeight: "bold" }}>
														<div>{res.employeeFullName}</div>
														<div style={{ fontSize: "6.5pt", fontWeight: "normal", color: "#444" }}>{res.positionRu}</div>
													</td>
													<td rowSpan={4} style={{ fontFamily: "monospace" }}>{res.employeeTabNumber}</td>

													{/* Upper Row: Codes for 1..15 */}
													{Array.from({ length: 15 }, (_, i) => i + 1).map((d) => {
														const rec = row1Days.find((item) => item.dayNumber === d);
														return <td key={d} style={{ fontWeight: "bold" }}>{rec?.primaryCode || "В"}</td>;
													})}
													<td style={{ fontWeight: "bold" }}>{res.firstHalfSummary.daysWorked} дн</td>
													<td rowSpan={4} style={{ fontWeight: "bold", fontSize: "9pt" }}>{res.monthTotalSummary.daysWorked}</td>
													<td rowSpan={4} style={{ fontWeight: "bold", fontSize: "9pt" }}>{res.monthTotalSummary.totalHoursWorked.toFixed(1)}</td>
													<td rowSpan={4} style={{ fontSize: "7pt" }}>
														{res.monthTotalSummary.overtimeHoursWorked > 0 && `С: ${res.monthTotalSummary.overtimeHoursWorked.toFixed(1)}ч `}
														{res.monthTotalSummary.nightHoursWorked > 0 && `Н: ${res.monthTotalSummary.nightHoursWorked.toFixed(1)}ч`}
													</td>
												</tr>

												{/* Upper Row: Hours for 1..15 */}
												<tr>
													{Array.from({ length: 15 }, (_, i) => i + 1).map((d) => {
														const rec = row1Days.find((item) => item.dayNumber === d);
														const h = rec?.primaryHours ?? 0;
														return <td key={d}>{h > 0 ? h.toFixed(1) : "—"}</td>;
													})}
													<td>{res.firstHalfSummary.totalHoursWorked.toFixed(1)} ч</td>
												</tr>

												{/* Lower Row: 16..31 days */}
												<tr>
													{Array.from({ length: 15 }, (_, i) => i + 16).map((d) => {
														if (d > daysInMonth) {
															return <td key={d} style={{ backgroundColor: "#e5e5e5" }}>X</td>;
														}
														const rec = row2Days.find((item) => item.dayNumber === d);
														return <td key={d} style={{ fontWeight: "bold" }}>{rec?.primaryCode || "В"}</td>;
													})}
													<td style={{ fontWeight: "bold" }}>{res.secondHalfSummary.daysWorked} дн</td>
												</tr>

												{/* Lower Row: Hours for 16..31 */}
												<tr>
													{Array.from({ length: 15 }, (_, i) => i + 16).map((d) => {
														if (d > daysInMonth) {
															return <td key={d} style={{ backgroundColor: "#e5e5e5" }}>X</td>;
														}
														const rec = row2Days.find((item) => item.dayNumber === d);
														const h = rec?.primaryHours ?? 0;
														return <td key={d}>{h > 0 ? h.toFixed(1) : "—"}</td>;
													})}
													<td>{res.secondHalfSummary.totalHoursWorked.toFixed(1)} ч</td>
												</tr>
											</React.Fragment>
										);
									})}
								</tbody>
							</table>

							{/* Official Statutory Signatures Block */}
							<div className="t13-signature-block">
								<div>
									<div className="font-bold">Руководитель подразделения:</div>
									<div className="t13-signature-line"></div>
									<div className="text-[7pt] text-neutral-600 text-center">(должность, подпись, расшифровка подписи)</div>
								</div>
								<div>
									<div className="font-bold">Работник кадровой службы:</div>
									<div className="t13-signature-line"></div>
									<div className="text-[7pt] text-neutral-600 text-center">(должность, подпись, расшифровка подписи)</div>
								</div>
								<div>
									<div className="font-bold">Руководитель организации:</div>
									<div className="t13-signature-line"></div>
									<div className="text-[7pt] text-neutral-600 text-center">(должность, подпись, расшифровка подписи)</div>
								</div>
							</div>

							<div className="mt-4 no-print flex justify-end">
								<button
									type="button"
									onClick={() => window.print()}
									className="adv-btn adv-btn-primary"
								>
									<Printer className="w-4 h-4" />
									Распечатать форму Т-13
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Modal Footer */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3 no-print">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Табель за <span className="font-bold text-[var(--ink,#0f172a)]">{monthLabelRu}</span> • Всего в табеле: <span className="font-bold text-[var(--teal,#0d9488)]">{employeesList.length} сотрудников</span>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleExportCsv}
							className="adv-btn"
						>
							<FileSpreadsheet className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Выгрузить форму Т-13 (CSV)
						</button>

						<button
							type="button"
							onClick={() => window.print()}
							className="adv-btn adv-btn-primary"
						>
							<Printer className="w-4 h-4" />
							Печать табеля (А4)
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
