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
import { useAppStore } from "../../store/appStore";
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

export function staffToFormT13EmployeeInfo(staff: readonly any[]): FormT13EmployeeInfo[] {
	return staff
		.filter(
			(m) =>
				m &&
				m.active !== false &&
				(m.role === "doctor" ||
					m.role === "assistant" ||
					m.role === "owner" ||
					m.role === "admin" ||
					!m.role),
		)
		.map((m, index) => {
			const isDoctor = m.role === "doctor" || m.role === "owner" || !m.role;
			const isAssistant = m.role === "assistant";

			let positionRu = "Врач-стоматолог";
			if (isAssistant) {
				positionRu = "Ассистент врача-стоматолога";
			} else if (m.role === "admin") {
				positionRu = "Старший администратор";
			} else if (Array.isArray(m.specialties) && m.specialties.length > 0) {
				const spec = m.specialties[0];
				if (spec === "orthopedics" || spec === "orthopedist") {
					positionRu = "Врач-стоматолог ортопед";
				} else if (spec === "surgery" || spec === "surgeon") {
					positionRu = "Врач-стоматолог хирург-имплантолог";
				} else if (spec === "orthodontics" || spec === "orthodontist") {
					positionRu = "Врач-стоматолог ортодонт";
				} else if (spec === "pediatric") {
					positionRu = "Детский врач-стоматолог";
				} else if (spec === "periodontics") {
					positionRu = "Врач-стоматолог пародонтолог";
				} else if (spec === "hygiene" || spec === "hygienist") {
					positionRu = "Гигиенист стоматологический";
				} else {
					positionRu = "Врач-стоматолог терапевт";
				}
			}

			let departmentRu = "Терапевтическое отделение";
			if (isAssistant) {
				departmentRu = "Сестринская служба / ЦСО";
			} else if (m.role === "admin") {
				departmentRu = "Ресепшен и клиентский сервис";
			} else if (Array.isArray(m.specialties) && m.specialties.length > 0) {
				const spec = m.specialties[0];
				if (spec === "orthopedics" || spec === "orthopedist") {
					departmentRu = "Ортопедическое отделение";
				} else if (spec === "surgery" || spec === "surgeon") {
					departmentRu = "Хирургическое отделение";
				} else if (spec === "orthodontics" || spec === "orthodontist") {
					departmentRu = "Ортодонтическое отделение";
				} else if (spec === "pediatric") {
					departmentRu = "Детское отделение";
				}
			}

			const defaultShiftHours = isAssistant ? 7.8 : (m.role === "admin" ? 12.0 : 6.0);
			const tabNumber = String(101 + index).padStart(5, "0");

			return {
				id: m.id || `emp-t13-${index + 1}`,
				tabNumber: m.tabNumber || tabNumber,
				name: m.fullName || m.name || `Сотрудник ${index + 1}`,
				positionRu,
				departmentRu,
				defaultShiftHours,
			};
		});
}

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
	employeesList,
}) => {
	const now = new Date();
	const [year, setYear] = useState<number>(initialYear ?? now.getFullYear());
	const [month, setMonth] = useState<number>(initialMonth ?? now.getMonth() + 1);

	const storeStaff = useAppStore((s) => s.dashboard?.clinicSettings?.staff);
	const resolvedEmployees: readonly FormT13EmployeeInfo[] = useMemo(() => {
		if (employeesList && employeesList.length > 0) {
			return employeesList;
		}
		if (Array.isArray(storeStaff) && storeStaff.length > 0) {
			const converted = staffToFormT13EmployeeInfo(storeStaff);
			if (converted.length > 0) return converted;
		}
		const storeState = useAppStore.getState() as any;
		const fallbackStaff = storeState.doctors || storeState.staff;
		if (Array.isArray(fallbackStaff) && fallbackStaff.length > 0) {
			const converted = staffToFormT13EmployeeInfo(fallbackStaff);
			if (converted.length > 0) return converted;
		}
		return [];
	}, [employeesList, storeStaff]);

	const [viewMode, setViewMode] = useState<TimesheetViewMode>("interactive");
	const [selectedEmpId, setSelectedEmpId] = useState<string>(
		() => resolvedEmployees[0]?.id || "",
	);
	const [departmentFilter, setDepartmentFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	React.useEffect(() => {
		if (
			resolvedEmployees.length > 0 &&
			!resolvedEmployees.some((e) => e.id === selectedEmpId)
		) {
			setSelectedEmpId(resolvedEmployees[0]!.id);
		}
	}, [resolvedEmployees, selectedEmpId]);

	// In-memory schedules map: employeeId -> TimesheetDayRecord[]
	const [schedules, setSchedules] = useState<Record<string, TimesheetDayRecord[]>>(() => {
		const init: Record<string, TimesheetDayRecord[]> = {};
		const yr = initialYear ?? now.getFullYear();
		const mth = initialMonth ?? now.getMonth() + 1;
		resolvedEmployees.forEach((emp) => {
			init[emp.id] = generateDefaultMonthRecords(yr, mth, emp.defaultShiftHours);
		});
		return init;
	});

	// Ensure schedules exist for all resolved employees
	React.useEffect(() => {
		if (resolvedEmployees.length === 0) return;
		setSchedules((prev) => {
			let changed = false;
			const next = { ...prev };
			resolvedEmployees.forEach((emp) => {
				if (!next[emp.id]) {
					next[emp.id] = generateDefaultMonthRecords(year, month, emp.defaultShiftHours);
					changed = true;
				}
			});
			return changed ? next : prev;
		});
	}, [resolvedEmployees, year, month]);

	const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

	const activeEmployee = useMemo(() => {
		return (
			resolvedEmployees.find((e) => e.id === selectedEmpId) ??
			resolvedEmployees[0]
		);
	}, [resolvedEmployees, selectedEmpId]);

	const currentEmployeeDays: TimesheetDayRecord[] = useMemo(() => {
		if (!activeEmployee) return [];
		return (
			schedules[activeEmployee.id] ??
			generateDefaultMonthRecords(year, month, activeEmployee.defaultShiftHours)
		);
	}, [schedules, activeEmployee, year, month]);

	// Calculate Form T-13 results for all employees
	const allResults: EmployeeTimesheetResult[] = useMemo(() => {
		if (!isOpen || resolvedEmployees.length === 0) return [];
		return resolvedEmployees.map((emp) => {
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
	}, [isOpen, schedules, resolvedEmployees, year, month]);

	const activeResult: EmployeeTimesheetResult = useMemo(() => {
		if (!activeEmployee) {
			return calculateEmployeeTimesheetT13({
				employeeId: "emp-empty",
				employeeTabNumber: "00000",
				employeeFullName: "—",
				positionRu: "—",
				departmentRu: "—",
				year,
				month,
				days: [],
			});
		}
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

	if (resolvedEmployees.length === 0 || !activeEmployee) {
		return (
			<div className="t13-modal-overlay" data-testid="form-t13-timesheet-modal">
				<div className="t13-modal-container max-w-lg mx-auto my-auto p-6 bg-[var(--paper,#ffffff)] rounded-2xl shadow-xl border border-[var(--line,#e2e8f0)] text-center flex flex-col items-center gap-4">
					<div className="w-14 h-14 rounded-2xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30">
						<Users className="w-7 h-7" />
					</div>
					<div className="flex flex-col gap-1">
						<h3 className="text-base font-bold text-[var(--ink,#0f172a)]">
							Сотрудники не зарегистрированы в клинике
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] max-w-sm">
							Добавьте персонал в разделе «Настройки клиники / Персонал» для формирования и печати формы Т-13 (ОКУД 0301008).
						</p>
					</div>
					<div className="flex items-center gap-2 mt-2">
						<button
							type="button"
							onClick={() => {
								useAppStore.getState().setCurrentView("settings");
								useAppStore.getState().setSettingsTab("staff");
								onClose();
							}}
							className="h-9 px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-90 text-[var(--on-teal,#ffffff)] text-xs font-bold transition-all cursor-pointer"
						>
							Перейти в Настройки / Персонал
						</button>
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-4 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		);
	}

	const handleDayCodeChange = (dayNum: number, newCode: TimesheetCode) => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
		const codeMeta = TIMESHEET_STATUTORY_CODES[newCode];
		const defaultHrs = codeMeta?.isWorkTime ? activeEmployee.defaultShiftHours : 0;

		setSchedules((prev) => {
			const empDays = [...(prev[empId] || currentEmployeeDays)];
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

			return { ...prev, [empId]: empDays };
		});
	};

	const handleDayHoursChange = (dayNum: number, hours: number) => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
		setSchedules((prev) => {
			const empDays = [...(prev[empId] || currentEmployeeDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			if (idx >= 0) {
				const curr = empDays[idx]!;
				empDays[idx] = {
					...curr,
					primaryHours: Math.max(0, Math.min(24, Number(hours.toFixed(1)))),
				};
			}
			return { ...prev, [empId]: empDays };
		});
	};

	// Quick Fill Actions
	const handleBatchFillWorkdays = () => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
		const newDays = generateDefaultMonthRecords(year, month, activeEmployee.defaultShiftHours);
		setSchedules((prev) => ({ ...prev, [empId]: newDays }));
	};

	const handleQuickFillStandard5Day = (hoursPerDay: number) => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
		const newDays = generateDefaultMonthRecords(year, month, hoursPerDay);
		setSchedules((prev) => ({ ...prev, [empId]: newDays }));
	};

	const handleQuickFillShift2x2 = () => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
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
		setSchedules((prev) => ({ ...prev, [empId]: records }));
	};

	const handleQuickFillVacationRange = (startDay: number, endDay: number) => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
		setSchedules((prev) => {
			const empDays = [...(prev[empId] || currentEmployeeDays)];
			for (let d = startDay; d <= Math.min(endDay, daysInMonth); d++) {
				const idx = empDays.findIndex((item) => item.dayNumber === d);
				const updated: TimesheetDayRecord = { dayNumber: d, primaryCode: "ОТ", primaryHours: 0 };
				if (idx >= 0) empDays[idx] = updated;
				else empDays.push(updated);
			}
			return { ...prev, [empId]: empDays };
		});
	};

	const handleQuickFillSickRange = (startDay: number, endDay: number) => {
		if (!activeEmployee) return;
		const empId = activeEmployee.id;
		setSchedules((prev) => {
			const empDays = [...(prev[empId] || currentEmployeeDays)];
			for (let d = startDay; d <= Math.min(endDay, daysInMonth); d++) {
				const idx = empDays.findIndex((item) => item.dayNumber === d);
				const updated: TimesheetDayRecord = { dayNumber: d, primaryCode: "Б", primaryHours: 0 };
				if (idx >= 0) empDays[idx] = updated;
				else empDays.push(updated);
			}
			return { ...prev, [empId]: empDays };
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

	const filteredEmployees = resolvedEmployees.filter((emp) => {
		if (departmentFilter !== "all" && emp.departmentRu !== departmentFilter) return false;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			return emp.name.toLowerCase().includes(q) || emp.positionRu.toLowerCase().includes(q) || emp.tabNumber.includes(q);
		}
		return true;
	});

	const departments = Array.from(new Set(resolvedEmployees.map((e) => e.departmentRu)));

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

				{/* Period & View Mode Selector — Fixed 1-row layout (Sin 2 compliant, h-9, 32-36px) */}
				<div className="t13-toolbar h-9 px-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap timesheet-no-print shrink-0">
					{/* Month / Year Navigator */}
					<div className="flex items-center gap-2 shrink-0">
						<span className="text-xs font-bold text-[var(--muted,#64748b)]">Отчетный период:</span>
						<div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
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
								className="p-0.5 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								title="Предыдущий месяц"
							>
								<ChevronLeft className="w-3.5 h-3.5" />
							</button>
							<span className="text-xs font-extrabold text-[var(--ink,#0f172a)] capitalize min-w-[120px] text-center">
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
								className="p-0.5 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								title="Следующий месяц"
							>
								<ChevronRight className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					{/* View Mode Switcher */}
					<div className="flex items-center gap-1 bg-[var(--paper-soft,#f8fafc)] p-0.5 rounded-lg border border-[var(--line,#e2e8f0)] shrink-0">
						<button
							type="button"
							onClick={() => setViewMode("interactive")}
							className={`adv-payroll-tab-btn text-xs h-7 px-2.5 ${viewMode === "interactive" ? "active" : ""}`}
						>
							<Sliders className="w-3 h-3" />
							Интерактивный табель
						</button>
						<button
							type="button"
							onClick={() => setViewMode("allEmployees")}
							className={`adv-payroll-tab-btn text-xs h-7 px-2.5 ${viewMode === "allEmployees" ? "active" : ""}`}
						>
							<Users className="w-3 h-3" />
							Сводка по персоналу ({resolvedEmployees.length})
						</button>
						<button
							type="button"
							onClick={() => setViewMode("printA4")}
							className={`adv-payroll-tab-btn text-xs h-7 px-2.5 ${viewMode === "printA4" ? "active" : ""}`}
						>
							<Eye className="w-3 h-3" />
							Бланк Госкомстата (А4)
						</button>
					</div>

					{/* Employee Selector for interactive mode */}
					{viewMode === "interactive" && (
						<div className="flex items-center gap-2 shrink-0">
							<span className="text-xs font-bold text-[var(--muted,#64748b)]">Сотрудник:</span>
							<select
								value={selectedEmpId}
								onChange={(e) => setSelectedEmpId(e.target.value)}
								className="h-7 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
							>
								{resolvedEmployees.map((emp) => (
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
									<Clock className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									Отработано часов
								</span>
								<span className="adv-payroll-kpi-val text-[var(--teal,#0d9488)]">
									{activeResult.monthTotalSummary.totalHoursWorked.toFixed(1)} ч
								</span>
								<span className="adv-payroll-kpi-sub">
									Дневные: {activeResult.monthTotalSummary.regularHoursWorked.toFixed(1)} ч • Ночные: {activeResult.monthTotalSummary.nightHoursWorked.toFixed(1)} ч
								</span>
							</div>

							<div className="adv-payroll-kpi-card">
								<span className="adv-payroll-kpi-label">
									<AlertCircle className="w-3.5 h-3.5 text-[var(--warn-fg,#d97706)]" />
									Сверхурочные & Выходные
								</span>
								<span className="adv-payroll-kpi-val text-[var(--warn-fg,#d97706)]">
									{(activeResult.monthTotalSummary.overtimeHoursWorked + activeResult.monthTotalSummary.weekendHoursWorked).toFixed(1)} ч
								</span>
								<span className="adv-payroll-kpi-sub">
									Сверхурочные (С): {activeResult.monthTotalSummary.overtimeHoursWorked.toFixed(1)} ч • РВ: {activeResult.monthTotalSummary.weekendHoursWorked.toFixed(1)} ч
								</span>
							</div>

							<div className="adv-payroll-kpi-card">
								<span className="adv-payroll-kpi-label">
									<Calendar className="w-3.5 h-3.5 text-[var(--bad-fg,#ef4444)]" />
									Неявки (Отпуск / Больничный)
								</span>
								<span className="adv-payroll-kpi-val text-[var(--bad-fg,#ef4444)]">
									{activeResult.monthTotalSummary.vacationDays + activeResult.monthTotalSummary.sickLeaveDays} дн
								</span>
								<span className="adv-payroll-kpi-sub">
									Больничный (Б): {activeResult.monthTotalSummary.sickLeaveDays} дн • Отпуск (ОТ): {activeResult.monthTotalSummary.vacationDays} дн
								</span>
							</div>
						</div>

						{/* Quick Fill Preset Toolbar — Single row (36px) */}
						<div className="h-9 px-3 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-xl flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap shrink-0">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted,#64748b)] shrink-0">
								<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								Быстрое заполнение:
							</div>
							<div className="t13-quick-fill-bar shrink-0 flex items-center gap-1.5">
								<button
									type="button"
									onClick={handleBatchFillWorkdays}
									className="adv-btn adv-btn-sm text-xs h-7 px-2"
									title="Заполнить по базовой норме часов сотрудника"
								>
									По норме ({activeEmployee?.defaultShiftHours ?? 6}ч)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillStandard5Day(6.0)}
									className="adv-btn adv-btn-sm text-xs h-7 px-2"
								>
									Пятидневка (6ч)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillStandard5Day(7.8)}
									className="adv-btn adv-btn-sm text-xs h-7 px-2"
								>
									Пятидневка (7.8ч)
								</button>
								<button
									type="button"
									onClick={handleQuickFillShift2x2}
									className="adv-btn adv-btn-sm text-xs h-7 px-2"
								>
									Сменный 2/2 (12ч)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillVacationRange(1, 14)}
									className="adv-btn adv-btn-sm text-xs h-7 px-2"
								>
									Отпуск 1-14 (ОТ)
								</button>
								<button
									type="button"
									onClick={() => handleQuickFillSickRange(15, 20)}
									className="adv-btn adv-btn-sm text-xs h-7 px-2"
								>
									Больничный 15-20 (Б)
								</button>
							</div>
						</div>

						{/* Daily 1..31 Calendar Matrix Table */}
						<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)] shadow-sm">
							<div className="p-3 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-2">
								<div className="text-xs font-bold text-[var(--ink,#0f172a)]">
									Ежедневный учет явок и часов: <span className="text-[var(--teal,#0d9488)]">{activeEmployee?.name ?? "—"}</span> (Таб. № {activeEmployee?.tabNumber ?? "—"})
								</div>
								<div className="flex items-center gap-3 text-[11px] text-[var(--muted,#64748b)]">
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]"></span> Явка (Я)</span>
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--warn-bg,#fef3c7)] border border-[var(--warn-border,#fcd34d)]"></span> Отпуск (ОТ)</span>
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--bad-bg,#fee2e2)] border border-[var(--bad-border,#fca5a5)]"></span> Больничный (Б)</span>
									<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--line,#e2e8f0)] border border-[var(--muted,#94a3b8)]"></span> Выходной (В)</span>
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
															isWeekend ? "bg-[var(--bad-bg,#fee2e2)]/20 text-[var(--bad-fg,#ef4444)]" : ""
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
																	? "bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#b45309)]"
																	: isSick
																		? "bg-[var(--bad-bg,#fee2e2)] text-[var(--bad-fg,#b91c1c)]"
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
											<td className="p-2 font-black text-[var(--teal,#0d9488)] bg-[var(--teal-soft,#f0fdfa)] border-l border-[var(--line,#e2e8f0)]">
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
									<option value="all">Все отделения ({resolvedEmployees.length})</option>
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
										const isSelected = activeEmployee ? emp.id === activeEmployee.id : false;

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
												<td className="p-2.5 text-center font-bold text-[var(--teal,#0d9488)]">
													{res?.monthTotalSummary.totalHoursWorked.toFixed(1) ?? 0} ч
												</td>
												<td className="p-2.5 text-center text-[var(--warn-fg,#d97706)]">
													{res && res.monthTotalSummary.overtimeHoursWorked > 0 ? `${res.monthTotalSummary.overtimeHoursWorked.toFixed(1)} ч` : "—"}
												</td>
												<td className="p-2.5 text-center text-[var(--bad-fg,#ef4444)]">
													{res && res.monthTotalSummary.sickLeaveDays > 0 ? `${res.monthTotalSummary.sickLeaveDays} дн` : "—"}
												</td>
												<td className="p-2.5 text-center text-[var(--teal,#0d9488)]">
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
					<div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[var(--paper-soft,#f1f5f9)] flex justify-center">
						<div className="t13-print-sheet shadow-lg max-w-[1320px] rounded-lg">
							{/* Statutory Header Block */}
							<div className="flex justify-between items-start pb-2 border-b border-[var(--line-strong,currentColor)]">
								<div className="w-2/3">
									<div className="font-bold text-xs uppercase">{clinicName}</div>
									<div className="text-[9pt] text-[var(--muted,#64748b)]">ИНН: {organizationInn} / КПП: {organizationKpp}</div>
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
														<div style={{ fontSize: "6.5pt", fontWeight: "normal", color: "var(--muted, #64748b)" }}>{res.positionRu}</div>
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
															return <td key={d} style={{ backgroundColor: "var(--paper-soft, #e5e5e5)" }}>X</td>;
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
															return <td key={d} style={{ backgroundColor: "var(--paper-soft, #e5e5e5)" }}>X</td>;
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
									<div className="text-[7pt] text-[var(--muted,#64748b)] text-center">(должность, подпись, расшифровка подписи)</div>
								</div>
								<div>
									<div className="font-bold">Работник кадровой службы:</div>
									<div className="t13-signature-line"></div>
									<div className="text-[7pt] text-[var(--muted,#64748b)] text-center">(должность, подпись, расшифровка подписи)</div>
								</div>
								<div>
									<div className="font-bold">Руководитель организации:</div>
									<div className="t13-signature-line"></div>
									<div className="text-[7pt] text-[var(--muted,#64748b)] text-center">(должность, подпись, расшифровка подписи)</div>
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

				{/* Modal Footer — Fixed 1-row layout (Sin 2 compliant, h-14) */}
				<div className="h-14 px-4 sm:px-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap shrink-0 no-print">
					<div className="text-xs text-[var(--muted,#64748b)] shrink-0">
						Табель за <span className="font-bold text-[var(--ink,#0f172a)]">{monthLabelRu}</span> • Всего в табеле: <span className="font-bold text-[var(--teal,#0d9488)]">{resolvedEmployees.length} сотрудников</span>
					</div>

					<div className="flex items-center gap-2.5 shrink-0 ml-auto">
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
