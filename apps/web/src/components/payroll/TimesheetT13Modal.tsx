import React, { useState, useMemo } from "react";
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
import "./timesheetT13.css";

export interface TimesheetT13ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string;
}

export interface EmployeeInfo {
	readonly id: string;
	readonly tabNumber: string;
	readonly name: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly defaultShiftHours: number;
}

const DEFAULT_EMPLOYEES: readonly EmployeeInfo[] = [
	{
		id: "emp-1",
		tabNumber: "00101",
		name: "Смирнов Алексей Петрович",
		positionRu: "Врач-стоматолог терапевт",
		departmentRu: "Терапевтическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-2",
		tabNumber: "00102",
		name: "Васильев Максим Сергеевич",
		positionRu: "Врач-стоматолог ортопед",
		departmentRu: "Ортопедическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-3",
		tabNumber: "00103",
		name: "Ковалев Игорь Олегович",
		positionRu: "Врач-стоматолог хирург-имплантолог",
		departmentRu: "Хирургическое отделение",
		defaultShiftHours: 6.0,
	},
	{
		id: "emp-4",
		tabNumber: "00201",
		name: "Иванова Екатерина Сергеевна",
		positionRu: "Старшая медицинская сестра",
		departmentRu: "ЦСО и операционный блок",
		defaultShiftHours: 7.8,
	},
	{
		id: "emp-5",
		tabNumber: "00202",
		name: "Петрова Анна Владимировна",
		positionRu: "Ассистент врача-стоматолога",
		departmentRu: "Терапевтическое отделение",
		defaultShiftHours: 6.0,
	},
];

function generateDefaultMonthSchedule(
	year: number,
	month: number,
	defaultHours: number,
): TimesheetDayRecord[] {
	const totalDays = getDaysInMonth(year, month);
	const records: TimesheetDayRecord[] = [];

	for (let d = 1; d <= totalDays; d++) {
		const dayOfWeek = new Date(year, month - 1, d).getDay();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

		records.push({
			dayNumber: d,
			primaryCode: isWeekend ? "В" : "Я",
			primaryHours: isWeekend ? 0 : defaultHours,
		});
	}

	return records;
}

export const TimesheetT13Modal: React.FC<TimesheetT13ModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
}) => {
	const currentDate = new Date();
	const [year, setYear] = useState<number>(currentDate.getFullYear());
	const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
		DEFAULT_EMPLOYEES[0]?.id || "emp-1",
	);

	// In-memory schedules map: employeeId -> TimesheetDayRecord[]
	const [schedules, setSchedules] = useState<Record<string, TimesheetDayRecord[]>>(() => {
		const initial: Record<string, TimesheetDayRecord[]> = {};
		DEFAULT_EMPLOYEES.forEach((emp) => {
			initial[emp.id] = generateDefaultMonthSchedule(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				emp.defaultShiftHours,
			);
		});
		return initial;
	});

	const activeEmployee = useMemo(() => {
		return (
			DEFAULT_EMPLOYEES.find((e) => e.id === selectedEmployeeId) ??
			DEFAULT_EMPLOYEES[0]!
		);
	}, [selectedEmployeeId]);

	const currentDays: TimesheetDayRecord[] = useMemo(() => {
		return (
			schedules[activeEmployee.id] ??
			generateDefaultMonthSchedule(year, month, activeEmployee.defaultShiftHours)
		);
	}, [schedules, activeEmployee, year, month]);

	// Calculated Form T-13 Results
	const allResults: EmployeeTimesheetResult[] = useMemo(() => {
		if (!isOpen) return [];
		return DEFAULT_EMPLOYEES.map((emp) => {
			const days =
				schedules[emp.id] ??
				generateDefaultMonthSchedule(year, month, emp.defaultShiftHours);
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
	}, [isOpen, schedules, year, month]);

	const activeResult: EmployeeTimesheetResult = useMemo(() => {
		if (!isOpen || allResults.length === 0) {
			return calculateEmployeeTimesheetT13({
				employeeId: activeEmployee.id,
				employeeTabNumber: activeEmployee.tabNumber,
				employeeFullName: activeEmployee.name,
				positionRu: activeEmployee.positionRu,
				departmentRu: activeEmployee.departmentRu,
				year,
				month,
				days: [],
			});
		}
		return (
			allResults.find((r) => r.employeeId === activeEmployee.id) ??
			allResults[0]!
		);
	}, [isOpen, allResults, activeEmployee, year, month]);

	if (!isOpen) return null;

	const daysInMonth = getDaysInMonth(year, month);

	const handleDayCodeChange = (dayNum: number, newCode: TimesheetCode) => {
		const codeMeta = TIMESHEET_STATUTORY_CODES[newCode];
		const defaultHrs = codeMeta.isWorkTime ? activeEmployee.defaultShiftHours : 0;

		setSchedules((prev) => {
			const empDays = [...(prev[activeEmployee.id] || currentDays)];
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
			const empDays = [...(prev[activeEmployee.id] || currentDays)];
			const idx = empDays.findIndex((d) => d.dayNumber === dayNum);
			if (idx >= 0) {
				const curr = empDays[idx]!;
				empDays[idx] = {
					...curr,
					primaryHours: Math.max(0, Number(hours.toFixed(1))),
				};
			}
			return { ...prev, [activeEmployee.id]: empDays };
		});
	};

	const handleExportCsv = () => {
		const csv = generateTimesheetT13Csv(allResults, clinicName, year, month);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `timesheet_T13_${year}_${String(month).padStart(2, "0")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const monthLabelRu = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});

	return (
		<div className="timesheet-modal-overlay" data-testid="timesheet-t13-modal">
			<div className="timesheet-modal-container">
				{/* Top Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)] timesheet-no-print">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30">
							<Calendar className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Табель учета рабочего времени
								<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
									Форма Т-13
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicName} • Утверждена Постановлением Госкомстата России от 05.01.2004 № 1
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть табель"
						className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Toolbar / Filters */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-wrap items-center justify-between gap-3 timesheet-no-print">
					{/* Month / Year Selector */}
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)]">Период:</span>
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
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
								className="p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								title="Следующий месяц"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Employee Switcher */}
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)]">Сотрудник:</span>
						<select
							value={selectedEmployeeId}
							onChange={(e) => setSelectedEmployeeId(e.target.value)}
							className="h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-[var(--teal,#0d9488)] focus:outline-none"
						>
							{DEFAULT_EMPLOYEES.map((emp) => (
								<option key={emp.id} value={emp.id}>
									{emp.name} ({emp.positionRu})
								</option>
							))}
						</select>
					</div>

					{/* Quick Actions */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleExportCsv}
							className="h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Download className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Экспорт Т-13 (CSV)
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="h-9 px-3 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-90 text-[var(--on-teal,#ffffff)] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
						>
							<Printer className="w-3.5 h-3.5" />
							Печать
						</button>
					</div>
				</div>

				{/* Scrollable Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* Stat Summary Cards */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 timesheet-no-print">
						<div className="timesheet-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Отработано дней</span>
							<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">
								{activeResult.monthTotalSummary.daysWorked} дней
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								I пол: {activeResult.firstHalfSummary.daysWorked} дн / II пол: {activeResult.secondHalfSummary.daysWorked} дн
							</span>
						</div>

						<div className="timesheet-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Отработано часов</span>
							<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
								{activeResult.monthTotalSummary.totalHoursWorked} ч
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								Дневные: {activeResult.monthTotalSummary.regularHoursWorked} ч
							</span>
						</div>

						<div className="timesheet-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Сверхурочные / Выходные</span>
							<span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
								{activeResult.monthTotalSummary.overtimeHoursWorked + activeResult.monthTotalSummary.weekendHoursWorked} ч
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								Сверхурочные (С): {activeResult.monthTotalSummary.overtimeHoursWorked} ч / РВ: {activeResult.monthTotalSummary.weekendHoursWorked} ч
							</span>
						</div>

						<div className="timesheet-stat-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Неявки (Отпуск / Больничный)</span>
							<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
								{activeResult.monthTotalSummary.vacationDays + activeResult.monthTotalSummary.sickLeaveDays} дней
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								Больничный (Б): {activeResult.monthTotalSummary.sickLeaveDays} дн / Отпуск (ОТ): {activeResult.monthTotalSummary.vacationDays} дн
							</span>
						</div>
					</div>

					{/* Calendar Days Interactive Matrix */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
								Учет ежедневных смен и явок ({activeEmployee.name}, таб. № {activeEmployee.tabNumber}):
							</h3>
							<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
								<span className="inline-block w-2.5 h-2.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]"></span> Явка (Я)
								<span className="inline-block w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500"></span> Отпуск (ОТ)
								<span className="inline-block w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500"></span> Больничный (Б)
								<span className="inline-block w-2.5 h-2.5 rounded bg-neutral-400/20 border border-neutral-400"></span> Выходной (В)
							</div>
						</div>

						<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)]">
							<div className="overflow-x-auto">
								<table className="w-full text-center text-xs border-collapse">
									<thead>
										<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
											<th className="p-2 text-left font-semibold min-w-[60px]">Параметр</th>
											{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
												const dayOfWeek = new Date(year, month - 1, day).getDay();
												const isSunSat = dayOfWeek === 0 || dayOfWeek === 6;
												return (
													<th
														key={day}
														className={`p-1.5 font-bold min-w-[38px] border-l border-[var(--line,#e2e8f0)] ${
															isSunSat ? "bg-rose-500/5 text-rose-600 dark:text-rose-400" : ""
														}`}
													>
														{day}
													</th>
												);
											})}
											<th className="p-2 font-bold min-w-[60px] bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border-l border-[var(--line,#e2e8f0)]">
												Итого
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{/* Row 1: Code */}
										<tr>
											<td className="p-2 text-left font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)]">
												Код явки
											</td>
											{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
												const rec = currentDays.find((d) => d.dayNumber === dayNum);
												const code = rec?.primaryCode ?? "В";
												const isWork = TIMESHEET_STATUTORY_CODES[code]?.isWorkTime;
												const isVacation = code === "ОТ" || code === "ОД";
												const isSick = code === "Б" || code === "Т";
												const isWeekend = code === "В";

												return (
													<td
														key={dayNum}
														className={`p-1 border-l border-[var(--line,#e2e8f0)] ${
															isWork
																? "bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] font-extrabold"
																: isVacation
																	? "bg-blue-500/10 text-blue-800 dark:text-blue-200 font-bold"
																	: isSick
																		? "bg-rose-500/10 text-rose-800 dark:text-rose-200 font-bold"
																		: "text-[var(--muted,#64748b)]"
														}`}
													>
														<select
															value={code}
															onChange={(e) => handleDayCodeChange(dayNum, e.target.value as TimesheetCode)}
															className="w-full text-center bg-transparent font-bold cursor-pointer focus:outline-none"
														>
															<option value="Я">Я</option>
															<option value="В">В</option>
															<option value="ОТ">ОТ</option>
															<option value="Б">Б</option>
															<option value="РВ">РВ</option>
															<option value="С">С</option>
															<option value="ДО">ДО</option>
															<option value="Н">Н</option>
															<option value="К">К</option>
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
											{Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
												const rec = currentDays.find((d) => d.dayNumber === dayNum);
												const hrs = rec?.primaryHours ?? 0;
												return (
													<td key={dayNum} className="p-0.5 border-l border-[var(--line,#e2e8f0)]">
														<input
															type="number"
															step="0.5"
															min="0"
															max="24"
															value={hrs === 0 ? "" : hrs}
															placeholder="-"
															onChange={(e) => handleDayHoursChange(dayNum, Number(e.target.value) || 0)}
															className="w-full h-8 text-center text-xs font-bold text-[var(--ink,#0f172a)] bg-transparent focus:bg-[var(--paper-soft,#f8fafc)] focus:outline-none"
														/>
													</td>
												);
											})}
											<td className="p-2 font-black text-blue-700 dark:text-blue-300 bg-blue-500/5 border-l border-[var(--line,#e2e8f0)]">
												{activeResult.monthTotalSummary.totalHoursWorked} ч
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Department Summary Table for All Staff */}
					<div className="flex flex-col gap-2">
						<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
							Сводная ведомость отработанного времени по персоналу ({monthLabelRu}):
						</h3>
						<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)]">
							<table className="w-full text-left text-xs">
								<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
									<tr>
										<th className="p-2.5">Таб. №</th>
										<th className="p-2.5">Сотрудник</th>
										<th className="p-2.5">Должность</th>
										<th className="p-2.5 text-center">I пол. (дн/ч)</th>
										<th className="p-2.5 text-center">II пол. (дн/ч)</th>
										<th className="p-2.5 text-center">Всего дней</th>
										<th className="p-2.5 text-center">Всего часов</th>
										<th className="p-2.5 text-center">Больничный</th>
										<th className="p-2.5 text-center">Отпуск</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
									{allResults.map((res) => (
										<tr
											key={res.employeeId}
											onClick={() => setSelectedEmployeeId(res.employeeId)}
											className={`hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer ${
												res.employeeId === activeEmployee.id ? "bg-[var(--teal-soft,#f0fdfa)] font-semibold" : ""
											}`}
										>
											<td className="p-2.5 font-mono text-[var(--muted,#64748b)]">{res.employeeTabNumber}</td>
											<td className="p-2.5 font-bold text-[var(--ink,#0f172a)]">{res.employeeFullName}</td>
											<td className="p-2.5 text-[var(--muted,#64748b)]">{res.positionRu}</td>
											<td className="p-2.5 text-center">
												{res.firstHalfSummary.daysWorked} дн / {res.firstHalfSummary.totalHoursWorked} ч
											</td>
											<td className="p-2.5 text-center">
												{res.secondHalfSummary.daysWorked} дн / {res.secondHalfSummary.totalHoursWorked} ч
											</td>
											<td className="p-2.5 text-center font-bold text-[var(--teal,#0d9488)]">
												{res.monthTotalSummary.daysWorked}
											</td>
											<td className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
												{res.monthTotalSummary.totalHoursWorked} ч
											</td>
											<td className="p-2.5 text-center text-rose-600">
												{res.monthTotalSummary.sickLeaveDays > 0 ? `${res.monthTotalSummary.sickLeaveDays} дн` : "—"}
											</td>
											<td className="p-2.5 text-center text-blue-600">
												{res.monthTotalSummary.vacationDays > 0 ? `${res.monthTotalSummary.vacationDays} дн` : "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3 timesheet-no-print">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Ответственный за табель: <span className="font-bold text-[var(--ink,#0f172a)]">Главный врач / Отдел кадров</span>
					</div>
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleExportCsv}
							className="h-10 px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Download className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Выгрузить форму Т-13 в CSV
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="h-10 px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-90 text-[var(--on-teal,#ffffff)] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
						>
							<Printer className="w-4 h-4" />
							Печать формы Т-13
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
