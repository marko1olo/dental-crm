/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster & Workload Studio HUD
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Heatmap
 */

import React, { useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar as CalendarIcon,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Copy,
	Download,
	FileSpreadsheet,
	Filter,
	Layers,
	Plus,
	Printer,
	Save,
	Sparkles,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	type MedicalStaffRole,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	SHIFT_ARCHETYPES,
	type ShiftArchetypeId,
	type StaffMember,
} from "./doctorShiftRosterPresets";
import {
	calculateChairUtilization,
	calculateShiftDurationHours,
	calculateStaffRosterStats,
	createDefaultWeeklySchedule,
	detectRosterConflicts,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
	type RosterConflict,
	timeStringToMinutes,
} from "./doctorShiftRosterEngine";
import "./doctorShiftRoster.css";

export interface DoctorShiftRosterModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialShifts?: DoctorShift[];
	staffList?: StaffMember[];
	cabinets?: CabinetDefinition[];
	appointments?: Array<{
		chairId: string;
		startsAt: string;
		endsAt: string;
		status?: string;
	}>;
	clinicName?: string;
	onSave?: (shifts: DoctorShift[]) => Promise<void> | void;
}

export function DoctorShiftRosterModal({
	isOpen,
	onClose,
	initialShifts,
	staffList = DEFAULT_CLINIC_STAFF,
	cabinets = CLINIC_CABINETS_CATALOG,
	appointments = [],
	clinicName = 'ООО "Денте Клиник"',
	onSave,
}: DoctorShiftRosterModalProps) {
	// Base date: Monday of current week (defaulting to 2026-08-24)
	const [weekStartDateIso, setWeekStartDateIso] = useState<string>("2026-08-24");
	const [activeTab, setActiveTab] = useState<"cabinets" | "doctors" | "t13" | "utilization">("cabinets");

	// Internal Shifts State
	const [shifts, setShifts] = useState<DoctorShift[]>(() => {
		if (initialShifts && initialShifts.length > 0) return initialShifts;
		return createDefaultWeeklySchedule("2026-08-24", staffList, cabinets);
	});

	// Quick Shift Editor Drawer
	const [editingShift, setEditingShift] = useState<Partial<DoctorShift> | null>(null);
	const [isNewShift, setIsNewShift] = useState(false);

	// Notification banner
	const [notification, setNotification] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null);

	// Filter by specialty/doctor
	const [filterRole, setFilterRole] = useState<string>("all");

	// 7 days of the selected week
	const weekDays = useMemo(() => {
		const days: Array<{ dateIso: string; dayName: string; dayNumber: string; isWeekend: boolean }> = [];
		const start = new Date(weekStartDateIso);
		const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

		for (let i = 0; i < 7; i++) {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			const dateIso = d.toISOString().substring(0, 10);
			const dayOfWeek = d.getDay();
			days.push({
				dateIso,
				dayName: dayNamesRu[dayOfWeek] || "Пн",
				dayNumber: dateIso.substring(8, 10),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			});
		}
		return days;
	}, [weekStartDateIso]);

	const weekEndDateIso = weekDays[6]?.dateIso || weekStartDateIso;

	// Month & Year parsed from current week
	const selectedYear = Number.parseInt(weekStartDateIso.substring(0, 4), 10) || 2026;
	const selectedMonth = Number.parseInt(weekStartDateIso.substring(5, 7), 10) || 8;
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[selectedMonth];

	// Run conflict detection
	const conflicts = useMemo(() => {
		return detectRosterConflicts(shifts, staffList);
	}, [shifts, staffList]);

	// Run staff statistics
	const staffStats = useMemo(() => {
		return calculateStaffRosterStats(staffList, shifts, selectedYear, selectedMonth);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Run Form T-13 matrix
	const t13Matrix = useMemo(() => {
		return generateFormT13Matrix(staffList, shifts, selectedYear, selectedMonth);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Overall KPIs
	const kpis = useMemo(() => {
		const weekShifts = shifts.filter(
			(s) => s.dateIso >= weekStartDateIso && s.dateIso <= weekEndDateIso && s.status !== "cancelled" && s.durationHours > 0,
		);

		const totalWeeklyHours = weekShifts.reduce((sum, s) => sum + s.durationHours, 0);
		const totalWithAssistants = weekShifts.filter((s) => s.assistantId).length;
		const assistantPairingPct = weekShifts.length > 0 ? Math.round((totalWithAssistants / weekShifts.length) * 100) : 0;

		return {
			totalWeekShifts: weekShifts.length,
			totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
			assistantPairingPct,
			conflictCount: conflicts.length,
			errorConflictCount: conflicts.filter((c) => c.severity === "error").length,
		};
	}, [shifts, weekStartDateIso, weekEndDateIso, conflicts]);

	// Navigation handlers
	const handlePrevWeek = () => {
		const cur = new Date(weekStartDateIso);
		cur.setDate(cur.getDate() - 7);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	const handleNextWeek = () => {
		const cur = new Date(weekStartDateIso);
		cur.setDate(cur.getDate() + 7);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	// Quick template shift injection
	const handleAddShiftByTemplate = (
		archetypeId: ShiftArchetypeId,
		dateIso: string,
		cabinetId: string,
		chairId: string,
	) => {
		const arch = SHIFT_ARCHETYPES[archetypeId];
		const defaultDoc = staffList.find((s) => s.isDoctor && (s.preferredChairId === chairId || true)) || staffList[0] || DEFAULT_CLINIC_STAFF[0]!;
		const defaultAsst = defaultDoc.defaultAssistantId
			? staffList.find((s) => s.id === defaultDoc.defaultAssistantId) || null
			: null;

		const newShift: DoctorShift = {
			id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
			doctorId: defaultDoc.id,
			doctorName: defaultDoc.shortName,
			doctorRole: defaultDoc.role,
			assistantId: defaultAsst ? defaultAsst.id : null,
			assistantName: defaultAsst ? defaultAsst.shortName : null,
			cabinetId,
			chairId,
			dateIso,
			archetypeId,
			startTime: arch.startTime || "08:30",
			endTime: arch.endTime || "14:30",
			durationHours: arch.durationHours,
			breakMinutes: arch.breakMinutes,
			isNight: arch.isNight,
			nightHours: arch.nightHours,
			status: "scheduled",
		};

		setShifts((prev) => [...prev, newShift]);
		setNotification({ type: "success", message: `Добавлена смена: ${arch.shortName} для ${defaultDoc.shortName}` });
		setTimeout(() => setNotification(null), 3000);
	};

	// Open Edit Drawer
	const handleOpenEdit = (shift: DoctorShift) => {
		setEditingShift({ ...shift });
		setIsNewShift(false);
	};

	const handleOpenCreateInCell = (dateIso: string, cabinetId: string, chairId: string) => {
		const defaultDoc = staffList.find((s) => s.isDoctor) || staffList[0] || DEFAULT_CLINIC_STAFF[0]!;
		const defaultAsst = defaultDoc.defaultAssistantId
			? staffList.find((s) => s.id === defaultDoc.defaultAssistantId) || null
			: null;

		setEditingShift({
			id: `shift-${Date.now()}`,
			doctorId: defaultDoc.id,
			doctorName: defaultDoc.shortName,
			doctorRole: defaultDoc.role,
			assistantId: defaultAsst ? defaultAsst.id : null,
			assistantName: defaultAsst ? defaultAsst.shortName : null,
			cabinetId,
			chairId,
			dateIso,
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		});
		setIsNewShift(true);
	};

	// Save Edited Shift
	const handleSaveDrawerShift = () => {
		if (!editingShift || !editingShift.doctorId || !editingShift.dateIso) return;

		const { durationHours, nightHours } = calculateShiftDurationHours(
			editingShift.startTime || "08:30",
			editingShift.endTime || "14:30",
			editingShift.breakMinutes || 0,
		);

		const doc = staffList.find((s) => s.id === editingShift.doctorId);
		const asst = editingShift.assistantId ? staffList.find((s) => s.id === editingShift.assistantId) : null;

		const finalizedShift: DoctorShift = {
			id: editingShift.id || `shift-${Date.now()}`,
			doctorId: editingShift.doctorId,
			doctorName: doc?.shortName || editingShift.doctorName || "Врач",
			doctorRole: doc?.role || editingShift.doctorRole || "therapist",
			assistantId: asst ? asst.id : null,
			assistantName: asst ? asst.shortName : null,
			cabinetId: editingShift.cabinetId || "cab-1",
			chairId: editingShift.chairId || "chair-1a",
			dateIso: editingShift.dateIso,
			archetypeId: editingShift.archetypeId || "morning_shift",
			startTime: editingShift.startTime || "08:30",
			endTime: editingShift.endTime || "14:30",
			durationHours,
			breakMinutes: editingShift.breakMinutes || 0,
			isNight: editingShift.isNight || false,
			nightHours,
			...(editingShift.customNotes ? { customNotes: editingShift.customNotes } : {}),
			status: editingShift.status || "scheduled",
			...(editingShift.absenceReason ? { absenceReason: editingShift.absenceReason } : {}),
		};

		if (isNewShift) {
			setShifts((prev) => [...prev, finalizedShift]);
		} else {
			setShifts((prev) => prev.map((s) => (s.id === finalizedShift.id ? finalizedShift : s)));
		}

		setEditingShift(null);
		setNotification({ type: "success", message: "Смена успешно сохранена в графике" });
		setTimeout(() => setNotification(null), 3000);
	};

	// Delete Shift
	const handleDeleteShift = (shiftId: string) => {
		setShifts((prev) => prev.filter((s) => s.id !== shiftId));
		setEditingShift(null);
		setNotification({ type: "info", message: "Смена удалена из графика" });
		setTimeout(() => setNotification(null), 3000);
	};

	// Export Form T-13 to CSV
	const handleExportT13 = () => {
		const csvContent = exportFormT13ToCsv(t13Matrix, selectedYear, selectedMonth, clinicName);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `Form_T13_Tabele_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		setNotification({ type: "success", message: "Табель Т-13 успешно экспортирован в CSV (UTF-8 BOM)" });
		setTimeout(() => setNotification(null), 4000);
	};

	// Print Official Schedule (A4 Landscape)
	const handlePrintSchedule = () => {
		const html = generatePrintableRosterHtml(shifts, weekStartDateIso, weekEndDateIso, clinicName, cabinets);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Reset / Auto-fill schedule
	const handleAutoFillDefault = () => {
		const filled = createDefaultWeeklySchedule(weekStartDateIso, staffList, cabinets);
		setShifts((prev) => {
			const otherShifts = prev.filter(
				(s) => s.dateIso < weekStartDateIso || s.dateIso > weekEndDateIso,
			);
			return [...otherShifts, ...filled];
		});
		setNotification({ type: "success", message: "График на текущую неделю заполнен по базовому шаблону" });
		setTimeout(() => setNotification(null), 3000);
	};

	// Save changes
	const handleSaveAll = async () => {
		if (onSave) {
			await onSave(shifts);
		}
		setNotification({ type: "success", message: "Все изменения графика успешно сохранены" });
		setTimeout(() => setNotification(null), 3000);
	};

	if (!isOpen) return null;

	return (
		<div className="roster-modal-overlay" role="dialog" aria-modal="true" aria-label="Студия графиков сменности">
			<div className="roster-modal-container">
				{/* Top Header */}
				<div className="roster-header">
					<div className="roster-header-top">
						<div className="roster-title-block">
							<span className="roster-title-badge">Норма: 33 ч/нед</span>
							<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
								График сменности и табель учета врачей (2026)
							</h2>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={handlePrintSchedule}
								title="Печать графика в формате А4 Альбомный"
							>
								<Printer size={16} />
								<span>Печать (А4)</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={handleExportT13}
								title="Выгрузить форму Т-13 в CSV для 1C / Excel"
							>
								<FileSpreadsheet size={16} />
								<span>Табель Т-13 (CSV)</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-primary"
								onClick={handleSaveAll}
							>
								<Save size={16} />
								<span>Сохранить</span>
							</button>
							<button
								type="button"
								onClick={onClose}
								style={{
									background: "transparent",
									border: "none",
									cursor: "pointer",
									padding: "0.5rem",
									color: "var(--muted, #64748b)",
									display: "flex",
									alignItems: "center",
								}}
								aria-label="Закрыть окно"
							>
								<X size={22} />
							</button>
						</div>
					</div>

					{/* KPI Strip */}
					<div className="roster-kpis-strip">
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Смен на неделю</span>
							<span className="roster-kpi-val">{kpis.totalWeekShifts}</span>
							<span className="roster-kpi-sub">{kpis.totalWeeklyHours} рабочих часов</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Норма месяца ({monthNormObj?.nameRu || "Август"})</span>
							<span className="roster-kpi-val" style={{ color: "var(--teal, #0d9488)" }}>
								{monthNormObj?.normHours33 || 138.6} ч
							</span>
							<span className="roster-kpi-sub">33-часовая неделя</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Ассистентские пары</span>
							<span className="roster-kpi-val">{kpis.assistantPairingPct}%</span>
							<span className="roster-kpi-sub">Охват работы в 4 руки</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Коллизии и наложения</span>
							<span
								className="roster-kpi-val"
								style={{ color: kpis.conflictCount > 0 ? "var(--bad-fg, #ef4444)" : "var(--teal, #0d9488)" }}
							>
								{kpis.conflictCount}
							</span>
							<span className="roster-kpi-sub">
								{kpis.errorConflictCount > 0 ? "Есть наложения смен" : "График сбалансирован"}
							</span>
						</div>
					</div>
				</div>

				{/* Nav, Tab & Period Strip */}
				<div className="roster-nav-bar">
					<div className="roster-tab-group">
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "cabinets" ? "active" : ""}`}
							onClick={() => setActiveTab("cabinets")}
						>
							<Layers size={16} />
							<span>По кабинетам</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "doctors" ? "active" : ""}`}
							onClick={() => setActiveTab("doctors")}
						>
							<Users size={16} />
							<span>Расписание врачей</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "t13" ? "active" : ""}`}
							onClick={() => setActiveTab("t13")}
						>
							<FileSpreadsheet size={16} />
							<span>Табель Т-13</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "utilization" ? "active" : ""}`}
							onClick={() => setActiveTab("utilization")}
						>
							<Clock size={16} />
							<span>Загрузка кресел</span>
						</button>
					</div>

					{/* Period Selector */}
					<div className="roster-period-controls">
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={handlePrevWeek}
							style={{ padding: "0.25rem 0.5rem", minHeight: "36px" }}
							title="Предыдущая неделя"
						>
							<ChevronLeft size={18} />
						</button>
						<div style={{ fontWeight: 700, fontSize: "0.875rem", minWidth: "13rem", textAlign: "center" }}>
							{weekStartDateIso.substring(8, 10)}.{weekStartDateIso.substring(5, 7)} — {weekEndDateIso.substring(8, 10)}.{weekEndDateIso.substring(5, 7)}.{selectedYear}
						</div>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={handleNextWeek}
							style={{ padding: "0.25rem 0.5rem", minHeight: "36px" }}
							title="Следующая неделя"
						>
							<ChevronRight size={18} />
						</button>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={handleAutoFillDefault}
							style={{ minHeight: "36px", fontSize: "0.75rem" }}
							title="Заполнить неделю стандартным шаблоном смен"
						>
							<Sparkles size={14} />
							<span>Авто-шаблон</span>
						</button>
					</div>
				</div>

				{/* Notifications & Conflicts Ribbon */}
				{notification && (
					<div
						style={{
							padding: "0.5rem 1.5rem",
							background: notification.type === "error" ? "var(--bad-bg, #fef2f2)" : "var(--ok-bg, #f0fdf4)",
							color: notification.type === "error" ? "var(--bad-fg, #991b1b)" : "var(--ok-fg, #166534)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							borderBottom: "1px solid rgba(0,0,0,0.05)",
						}}
					>
						<Check size={16} />
						<span>{notification.message}</span>
					</div>
				)}

				{conflicts.length > 0 && (
					<div className="roster-conflict-banner" role="status" aria-live="polite">
						<div className="roster-conflict-header">
							<AlertTriangle size={16} className="roster-conflict-icon" />
							<span className="roster-conflict-title">Предупреждения ({conflicts.length}):</span>
						</div>
						<div className="roster-conflict-list">
							{conflicts.map((c) => (
								<div
									key={c.id}
									className={`roster-conflict-tag ${c.severity === "error" ? "error" : "warning"}`}
									title={c.message}
								>
									<span className="roster-conflict-dot" />
									<span className="roster-conflict-text">{c.message}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Main Content Workspace */}
				<div className="roster-main-area">
					{/* TAB 1: Cabinets View */}
					{activeTab === "cabinets" && (
						<table className="roster-grid-table">
							<thead>
								<tr>
									<th style={{ width: "14rem" }}>Кабинет / Кресло</th>
									{weekDays.map((d) => (
										<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
											{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{cabinets.map((cab) =>
									cab.chairs.map((chair, chairIdx) => (
										<tr key={chair.id}>
											<td className="roster-lane-header">
												<div style={{ color: "var(--ink, #0f172a)", fontSize: "0.8125rem" }}>{cab.name}</div>
												<div style={{ color: "var(--teal, #0d9488)", fontSize: "0.75rem", marginTop: "2px" }}>
													{chair.name}
												</div>
												<div style={{ color: "var(--muted, #64748b)", fontSize: "0.6875rem", marginTop: "2px" }}>
													{chair.equipment}
												</div>
											</td>
											{weekDays.map((day) => {
												const cellShifts = shifts.filter(
													(s) =>
														s.chairId === chair.id &&
														s.dateIso === day.dateIso &&
														s.status !== "cancelled",
												);

												const cellConflicts = conflicts.filter((c) =>
													c.dateIso === day.dateIso &&
													c.shiftIds.some((sId) => cellShifts.some((cs) => cs.id === sId)),
												);

												return (
													<td key={day.dateIso}>
														{cellShifts.map((shift) => {
															const arch = SHIFT_ARCHETYPES[shift.archetypeId] || SHIFT_ARCHETYPES.morning_shift;
															const hasConflict = cellConflicts.some((c) => c.shiftIds.includes(shift.id));

															return (
																<div
																	key={shift.id}
																	className={`roster-shift-pill ${hasConflict ? "has-conflict" : ""}`}
																	style={{
																		backgroundColor: `${arch.color}15`,
																		borderLeft: `4px solid ${arch.color}`,
																	}}
																	onClick={() => handleOpenEdit(shift)}
																>
																	<div className="roster-shift-time">
																		<span style={{ color: arch.color }}>
																			{shift.startTime}–{shift.endTime} ({shift.durationHours}ч)
																		</span>
																		{hasConflict && <AlertTriangle size={12} color="#ef4444" />}
																	</div>
																	<div className="roster-shift-doc" title={shift.doctorName}>
																		{shift.doctorName}
																	</div>
																	{shift.assistantName ? (
																		<div className="roster-shift-asst">
																			<span>🤝 {shift.assistantName}</span>
																		</div>
																	) : (
																		<div style={{ fontSize: "0.6875rem", color: "#ef4444" }}>
																			⚠️ Без ассистента
																		</div>
																	)}
																</div>
															);
														})}

														{/* Add Shift Button */}
														<button
															type="button"
															className="roster-cell-add-btn"
															onClick={() => handleOpenCreateInCell(day.dateIso, cab.id, chair.id)}
														>
															+ Смена
														</button>
													</td>
												);
											})}
										</tr>
									)),
								)}
							</tbody>
						</table>
					)}

					{/* TAB 2: Doctors View */}
					{activeTab === "doctors" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<table className="roster-grid-table">
								<thead>
									<tr>
										<th style={{ width: "16rem" }}>Сотрудник / Должность</th>
										{weekDays.map((d) => (
											<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
												{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
											</th>
										))}
										<th style={{ width: "10rem" }}>Неделя / Норма (33 ч)</th>
									</tr>
								</thead>
								<tbody>
									{staffList.map((staff) => {
										const userShifts = shifts.filter(
											(s) =>
												(s.doctorId === staff.id || s.assistantId === staff.id) &&
												s.dateIso >= weekStartDateIso &&
												s.dateIso <= weekEndDateIso &&
												s.status !== "cancelled" &&
												s.durationHours > 0,
										);

										const totalWeekHours = userShifts.reduce((sum, s) => sum + s.durationHours, 0);
										const isOverLimit = totalWeekHours > staff.weeklyHourLimit;

										return (
											<tr key={staff.id}>
												<td className="roster-lane-header">
													<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<div
															style={{
																width: "10px",
																height: "10px",
																borderRadius: "50%",
																backgroundColor: staff.avatarColor,
															}}
														/>
														<div style={{ fontWeight: 700 }}>{staff.fullName}</div>
													</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
														Таб. № {staff.tabNumber} • {MEDICAL_STAFF_ROLES[staff.role]?.nameRu}
													</div>
												</td>
												{weekDays.map((day) => {
													const dayShifts = userShifts.filter((s) => s.dateIso === day.dateIso);
													return (
														<td key={day.dateIso}>
															{dayShifts.map((s) => (
																<div
																	key={s.id}
																	className="roster-shift-pill"
																	style={{
																		background: "var(--paper-soft, #f8fafc)",
																		border: "1px solid var(--line, #cbd5e1)",
																	}}
																	onClick={() => handleOpenEdit(s)}
																>
																	<div style={{ fontWeight: 700, fontSize: "0.75rem" }}>
																		{s.startTime}–{s.endTime}
																	</div>
																	<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
																		{s.chairId} • {s.durationHours}ч
																	</div>
																</div>
															))}
															{dayShifts.length === 0 && (
																<div style={{ color: "var(--muted, #94a3b8)", fontSize: "0.75rem", textAlign: "center", paddingTop: "0.5rem" }}>
																	Выходной
																</div>
															)}
														</td>
													);
												})}
												<td style={{ verticalAlign: "middle", padding: "0.75rem" }}>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", fontWeight: 700 }}>
														<span>{totalWeekHours.toFixed(1)} ч</span>
														<span style={{ color: isOverLimit ? "#ef4444" : "var(--muted, #64748b)" }}>
															макс {staff.weeklyHourLimit} ч
														</span>
													</div>
													<div
														style={{
															height: "6px",
															background: "#e2e8f0",
															borderRadius: "9999px",
															overflow: "hidden",
															marginTop: "4px",
														}}
													>
														<div
															style={{
																width: `${Math.min(100, (totalWeekHours / staff.weeklyHourLimit) * 100)}%`,
																height: "100%",
																backgroundColor: isOverLimit ? "#ef4444" : "var(--teal, #0d9488)",
															}}
														/>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

					{/* TAB 3: Form T-13 View */}
					{activeTab === "t13" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div>
									<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
										Табель учета рабочего времени (Форма Т-13 Госкомстата) — {monthNormObj?.nameRu} {selectedYear}
									</h3>
									<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
										Норма: {monthNormObj?.normHours33 || 138.6} ч (врачи: 33 ч/нед, ассистенты: 39 ч/нед)
									</span>
								</div>
								<button
									type="button"
									className="roster-btn roster-btn-secondary"
									onClick={handleExportT13}
								>
									<Download size={16} />
									<span>Скачать CSV (Excel / 1C)</span>
								</button>
							</div>

							<div className="t13-table-wrapper">
								<table className="t13-table">
									<thead>
										<tr>
											<th rowSpan={2} style={{ width: "3rem" }}>Таб №</th>
											<th rowSpan={2} style={{ width: "12rem", textAlign: "left" }}>ФИО сотрудника</th>
											<th rowSpan={2} style={{ width: "10rem", textAlign: "left" }}>Должность</th>
											<th colSpan={15}>1-я половина месяца (1–15)</th>
											<th colSpan={t13Matrix[0]?.days.length ? t13Matrix[0].days.length - 15 : 16}>2-я половина (16–{t13Matrix[0]?.days.length || 31})</th>
											<th colSpan={4}>Итого за месяц</th>
										</tr>
										<tr>
											{t13Matrix[0]?.days.map((d) => (
												<th key={d.dayOfMonth} style={{ minWidth: "1.75rem" }}>
													{d.dayOfMonth}
												</th>
											))}
											<th>Дней</th>
											<th>Часов</th>
											<th>Ночных</th>
											<th>Сверхуроч.</th>
										</tr>
									</thead>
									<tbody>
										{t13Matrix.map((row) => (
											<React.Fragment key={row.tabNumber}>
												{/* Codes Row */}
												<tr>
													<td rowSpan={2} style={{ fontWeight: 700 }}>{row.tabNumber}</td>
													<td rowSpan={2} style={{ textAlign: "left", fontWeight: 600 }}>{row.staffName}</td>
													<td rowSpan={2} style={{ textAlign: "left", color: "var(--muted, #64748b)" }}>{row.position}</td>
													{row.days.map((d) => (
														<td
															key={d.dayOfMonth}
															className="t13-cell-code"
															style={{
																backgroundColor: d.code === "Я" ? "#f0fdf4" : d.code === "Н" ? "#e0e7ff" : d.code === "Б" ? "#fee2e2" : d.code === "ОТ" ? "#dcfce7" : "transparent",
																color: d.code === "Я" ? "#166534" : d.code === "Н" ? "#3730a3" : d.code === "Б" ? "#991b1b" : "var(--muted, #64748b)",
															}}
														>
															{d.code}
														</td>
													))}
													<td rowSpan={2} style={{ fontWeight: 700 }}>{row.totalMonthDays}</td>
													<td rowSpan={2} style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>{row.totalMonthHours.toFixed(1)}</td>
													<td rowSpan={2}>{row.totalNightHours.toFixed(1)}</td>
													<td rowSpan={2} style={{ color: row.overtimeHours > 0 ? "#ef4444" : "inherit" }}>
														{row.overtimeHours > 0 ? `+${row.overtimeHours.toFixed(1)}` : "—"}
													</td>
												</tr>
												{/* Hours Row */}
												<tr>
													{row.days.map((d) => (
														<td key={`h-${d.dayOfMonth}`} className="t13-cell-hours">
															{d.hours > 0 ? d.hours.toFixed(1) : ""}
														</td>
													))}
												</tr>
											</React.Fragment>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* TAB 4: Utilization & Heatmap View */}
					{activeTab === "utilization" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div>
								<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
									Тепловая карта загрузки кресел (Chair Utilization Matrix)
								</h3>
								<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
									Формула: Занятые минуты приемов / Доступные минуты смен x 100%
								</span>
							</div>

							<table className="roster-grid-table">
								<thead>
									<tr>
										<th style={{ width: "15rem" }}>Кабинет / Кресло</th>
										{weekDays.map((d) => (
											<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
												{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{cabinets.map((cab) =>
										cab.chairs.map((chair) => (
											<tr key={chair.id}>
												<td className="roster-lane-header">
													<div>{cab.name}</div>
													<div style={{ color: "var(--teal, #0d9488)", fontSize: "0.75rem" }}>{chair.name}</div>
												</td>
												{weekDays.map((day) => {
													const metrics = calculateChairUtilization(shifts, appointments, day.dateIso, cabinets);
													const chairMetric = metrics.find((m) => m.chairId === chair.id);
													const rate = chairMetric ? chairMetric.utilizationRatePercent : 0;
													const heat = chairMetric ? chairMetric.heatLevel : "empty";

													return (
														<td key={day.dateIso} style={{ textAlign: "center", verticalAlign: "middle" }}>
															<div className={`roster-heatmap-chip ${heat}`}>
																<span>{rate.toFixed(0)}%</span>
															</div>
															<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
																{chairMetric?.bookedAppointmentMinutes || 0} / {chairMetric?.totalShiftMinutes || 0} мин
															</div>
														</td>
													);
												})}
											</tr>
										)),
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Quick Shift Edit Drawer */}
				{editingShift && (
					<div className="roster-drawer-overlay" onClick={() => setEditingShift(null)}>
						<div className="roster-drawer-panel" onClick={(e) => e.stopPropagation()}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: "0.75rem" }}>
								<h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
									{isNewShift ? "Назначение новой смены" : "Редактирование смены"}
								</h3>
								<button
									type="button"
									onClick={() => setEditingShift(null)}
									style={{ background: "transparent", border: "none", cursor: "pointer" }}
								>
									<X size={20} />
								</button>
							</div>

							{/* Doctor select */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
									Врач
								</label>
								<select
									style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)" }}
									value={editingShift.doctorId || ""}
									onChange={(e) => {
										const doc = staffList.find((s) => s.id === e.target.value);
										setEditingShift((prev) => {
											if (!prev) return null;
											return {
												...prev,
												doctorId: e.target.value,
												doctorName: doc?.shortName || "",
												doctorRole: doc?.role || "therapist",
												assistantId: doc?.defaultAssistantId ?? prev.assistantId ?? null,
											};
										});
									}}
								>
									{staffList.filter((s) => s.isDoctor).map((doc) => (
										<option key={doc.id} value={doc.id}>
											{doc.fullName} ({MEDICAL_STAFF_ROLES[doc.role]?.nameRu})
										</option>
									))}
								</select>
							</div>

							{/* Assistant select */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
									Ассистент / Медсестра
								</label>
								<select
									style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)" }}
									value={editingShift.assistantId || ""}
									onChange={(e) => {
										const asst = staffList.find((s) => s.id === e.target.value);
										setEditingShift((prev) => ({
											...prev,
											assistantId: e.target.value || null,
											assistantName: asst ? asst.shortName : null,
										}));
									}}
								>
									<option value="">(Без ассистента)</option>
									{staffList.filter((s) => s.isAssistant).map((asst) => (
										<option key={asst.id} value={asst.id}>
											{asst.fullName}
										</option>
									))}
								</select>
							</div>

							{/* Cabinet & Chair select */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
								<div>
									<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
										Кабинет
									</label>
									<select
										style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)" }}
										value={editingShift.cabinetId || "cab-1"}
										onChange={(e) => {
											const cab = cabinets.find((c) => c.id === e.target.value);
											setEditingShift((prev) => ({
												...prev,
												cabinetId: e.target.value,
												chairId: cab?.chairs[0]?.id || "chair-1a",
											}));
										}}
									>
										{cabinets.map((cab) => (
											<option key={cab.id} value={cab.id}>
												{cab.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
										Кресло
									</label>
									<select
										style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)" }}
										value={editingShift.chairId || "chair-1a"}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, chairId: e.target.value }))}
									>
										{cabinets
											.find((c) => c.id === (editingShift.cabinetId || "cab-1"))
											?.chairs.map((chair) => (
												<option key={chair.id} value={chair.id}>
													{chair.name}
												</option>
											))}
									</select>
								</div>
							</div>

							{/* Date & Shift Template */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
								<div>
									<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
										Дата
									</label>
									<input
										type="date"
										style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)" }}
										value={editingShift.dateIso || ""}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, dateIso: e.target.value }))}
									/>
								</div>
								<div>
									<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
										Шаблон
									</label>
									<select
										style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)" }}
										value={editingShift.archetypeId || "morning_shift"}
										onChange={(e) => {
											const archId = e.target.value as ShiftArchetypeId;
											const arch = SHIFT_ARCHETYPES[archId];
											setEditingShift((prev) => ({
												...prev,
												archetypeId: archId,
												startTime: arch.startTime || prev?.startTime || "08:30",
												endTime: arch.endTime || prev?.endTime || "14:30",
												durationHours: arch.durationHours,
												isNight: arch.isNight,
												breakMinutes: arch.breakMinutes,
											}));
										}}
									>
										{Object.values(SHIFT_ARCHETYPES).map((arch) => (
											<option key={arch.id} value={arch.id}>
												{arch.name}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Times */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
								<div>
									<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
										Начало смены
									</label>
									<input
										type="time"
										style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)" }}
										value={editingShift.startTime || "08:30"}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, startTime: e.target.value }))}
									/>
								</div>
								<div>
									<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
										Окончание
									</label>
									<input
										type="time"
										style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)" }}
										value={editingShift.endTime || "14:30"}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, endTime: e.target.value }))}
									/>
								</div>
							</div>

							{/* Notes */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
									Примечание
								</label>
								<input
									type="text"
									placeholder="например, только консультации или сложная хирургия"
									style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)" }}
									value={editingShift.customNotes || ""}
									onChange={(e) => setEditingShift((prev) => ({ ...prev, customNotes: e.target.value }))}
								/>
							</div>

							{/* Drawer Footer Actions */}
							<div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--line, #e2e8f0)" }}>
								{!isNewShift && editingShift.id && (
									<button
										type="button"
										className="roster-btn roster-btn-danger"
										onClick={() => handleDeleteShift(editingShift.id!)}
									>
										<Trash2 size={16} />
										<span>Удалить</span>
									</button>
								)}
								<div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
									<button
										type="button"
										className="roster-btn roster-btn-secondary"
										onClick={() => setEditingShift(null)}
									>
										Отмена
									</button>
									<button
										type="button"
										className="roster-btn roster-btn-primary"
										onClick={handleSaveDrawerShift}
									>
										<Check size={16} />
										<span>Сохранить смену</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="roster-footer">
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Баланс рабочего времени: 33 ч/нед (врачи) • Форма Т-13
					</div>
					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>
						<button
							type="button"
							className="roster-btn roster-btn-primary"
							onClick={handleSaveAll}
						>
							<Save size={16} />
							<span>Применить и закрыть</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
