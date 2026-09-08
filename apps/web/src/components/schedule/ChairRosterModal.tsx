/**
 * DENTE Dental CRM — Compact Chair Roster Week Matrix (StomX / IDENT Parity)
 *
 * Compliance & Standards:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-tap weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (compact 32-36px toolbar, touch targets >= 44x44px)
 */

import React, { useState, useEffect, useMemo } from "react";
import {
	AlertTriangle,
	Armchair,
	CalendarRange,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Copy,
	Layers,
	RotateCcw,
	Save,
	Sparkles,
	Users,
	X,
} from "lucide-react";
import {
	DoctorShiftRosterModal,
	type DoctorShiftRosterModalProps,
	type DoctorShift,
	type StaffMember,
	type CabinetDefinition,
	type ShiftArchetypeId,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	getMondayOfWeekIso,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
	applyDoctorChairWeeklyTemplate,
	applyCellShiftPreset,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	addDaysToDateIso,
	getWeekDaysIso,
} from "./roster/DoctorShiftRosterModal";
import {
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
} from "./roster/doctorShiftRosterPresets";
import {
	generateWeeklyScheduleForStaffAndCabinets,
} from "./roster/doctorWeeklyScheduleGenerator";
import { detectRosterConflicts } from "./roster/doctorShiftRosterEngine";
import "./roster/doctorShiftRoster.css";

export interface ChairRosterModalProps extends DoctorShiftRosterModalProps {
	/**
	 * Focus on a specific chair ID when opening the roster modal
	 */
	focusedChairId?: string | null;
}

export const ChairRosterModal: React.FC<ChairRosterModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		initialShifts,
		staffList = DEFAULT_CLINIC_STAFF,
		cabinets = CLINIC_CABINETS_CATALOG,
		clinicName = 'ООО "Денте Клиник"',
		onSave,
		currentDate,
		focusedChairId,
	} = props;

	// View mode: 'matrix' (compact StomX chair-by-week grid) or 'studio' (full DoctorShiftRosterModal)
	const [viewMode, setViewMode] = useState<"matrix" | "studio">("matrix");

	// Active week Monday
	const defaultMonday = useMemo(
		() => getMondayOfWeekIso(currentDate),
		[currentDate],
	);
	const [weekStartDateIso, setWeekStartDateIso] = useState<string>(defaultMonday);

	useEffect(() => {
		if (currentDate) {
			setWeekStartDateIso(getMondayOfWeekIso(currentDate));
		}
	}, [currentDate]);

	// Shifts state
	const [shifts, setShifts] = useState<DoctorShift[]>(() => {
		if (initialShifts && initialShifts.length > 0) return initialShifts;
		if (Array.isArray(initialShifts) && initialShifts.length === 0) return [];
		return generateWeeklyScheduleForStaffAndCabinets(
			defaultMonday,
			staffList,
			cabinets,
			"five_day",
		);
	});

	useEffect(() => {
		if (initialShifts) {
			setShifts(initialShifts);
		}
	}, [initialShifts]);

	// Notification banner
	const [notification, setNotification] = useState<{
		type: "success" | "info" | "error";
		message: string;
	} | null>(null);

	// Selected active doctor per chair for 1-tap shift assignment
	const doctors = useMemo(
		() => staffList.filter((s) => s.isDoctor),
		[staffList],
	);
	const fallbackDoctor = doctors[0] || staffList[0] || DEFAULT_CLINIC_STAFF[0]!;

	const [selectedDoctorByChair, setSelectedDoctorByChair] = useState<
		Record<string, string>
	>({});

	const getActiveDoctorForChair = (chairId: string): StaffMember => {
		const docId = selectedDoctorByChair[chairId];
		if (docId) {
			const found = staffList.find((s) => s.id === docId);
			if (found) return found;
		}
		const pref = doctors.find((d) => d.preferredChairId === chairId);
		return pref || fallbackDoctor;
	};

	// 7 days of the active week (Monday to Sunday)
	const weekDays = useMemo(() => {
		const dayNamesRu = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
		const days: Array<{
			dateIso: string;
			dayName: string;
			dayNumber: string;
			isWeekend: boolean;
		}> = [];
		for (let i = 0; i < 7; i++) {
			const dateIso = addDaysToDateIso(weekStartDateIso, i);
			const parts = dateIso.split("-").map(Number);
			const d = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
			const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
			days.push({
				dateIso,
				dayName: dayNamesRu[i] || "Пн",
				dayNumber: dateIso.substring(8, 10),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			});
		}
		return days;
	}, [weekStartDateIso]);

	const weekEndDateIso = weekDays[6]?.dateIso || weekStartDateIso;

	// Week navigation handlers
	const handlePrevWeek = () => {
		setWeekStartDateIso((prev) => addDaysToDateIso(prev, -7));
	};

	const handleNextWeek = () => {
		setWeekStartDateIso((prev) => addDaysToDateIso(prev, 7));
	};

	// 1-Click Copy Week to Next Week
	const handleCopyWeekToNextWeek = () => {
		const nextMondayIso = addDaysToDateIso(weekStartDateIso, 7);
		const nextShifts = copyWeekShiftsToTargetWeek(
			shifts,
			weekStartDateIso,
			nextMondayIso,
		);
		setShifts(nextShifts);
		const weekShiftsCount = shifts.filter(
			(s) =>
				s.dateIso >= weekStartDateIso &&
				s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled",
		).length;
		setNotification({
			type: "success",
			message: `Сетка кресел скопирована на след. неделю (${nextMondayIso}): перенесено ${weekShiftsCount} смен`,
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// 1-Click Copy Week to 4 Weeks (Month)
	const handleCopyWeekToMonth = () => {
		const nextShifts = copyWeekShiftsToMonth(shifts, weekStartDateIso, 4);
		setShifts(nextShifts);
		const weekShiftsCount = shifts.filter(
			(s) =>
				s.dateIso >= weekStartDateIso &&
				s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled",
		).length;
		setNotification({
			type: "success",
			message: `Сетка кресел скопирована на 4 недели вперед (месяц): перенесено ${weekShiftsCount * 4} смен`,
		});
		setTimeout(() => setNotification(null), 4000);
	};

	// 1-Click Clear Week Shifts
	const handleClearWeek = () => {
		const nextShifts = clearWeekShifts(shifts, weekStartDateIso);
		setShifts(nextShifts);
		setNotification({
			type: "info",
			message: "Все смены текущей недели очищены (чистая сетка кресел)",
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// 1-Tap Fast Cell Shift Assignment
	const handleCellPreset = (
		dateIso: string,
		cabinetId: string,
		chairId: string,
		presetType: "morning" | "evening" | "full_day" | "clear",
	) => {
		const activeDoc = getActiveDoctorForChair(chairId);
		const nextShifts = applyCellShiftPreset(shifts, {
			dateIso,
			cabinetId,
			chairId,
			presetType,
			doctorId: activeDoc.id,
			staffList,
			cabinets,
		});
		setShifts(nextShifts);

		const presetLabels: Record<string, string> = {
			morning: `Утро 08:00–14:00 (${activeDoc.shortName})`,
			evening: `Вечер 14:00–20:00 (${activeDoc.shortName})`,
			full_day: `Весь день 08:00–20:00 (${activeDoc.shortName})`,
			clear: "Выходной (смена очищена)",
		};

		setNotification({
			type: presetType === "clear" ? "info" : "success",
			message: presetLabels[presetType] || "Смена обновлена",
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// 1-Click Chair Weekly Template (StomX / DentalPRO parity)
	const handleApplyChairTemplate = (
		chairId: string,
		cabinetId: string,
		templateId: DoctorChairRosterTemplateId,
	) => {
		const activeDoc = getActiveDoctorForChair(chairId);
		const nextShifts = applyDoctorChairWeeklyTemplate(shifts, {
			weekStartDateIso,
			templateId,
			doctorId: activeDoc.id,
			chairId,
			cabinetId,
			staffList,
			cabinets,
		});
		setShifts(nextShifts);

		const templateObj = DOCTOR_CHAIR_ROSTER_TEMPLATES.find(
			(t) => t.id === templateId,
		);
		setNotification({
			type: "success",
			message: `Кресло закреплено: «${templateObj?.title || templateId}» • ${activeDoc.shortName}`,
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// Save all changes
	const handleSaveAll = async (closeAfter = false) => {
		let shiftsToSave = shifts;
		if (shiftsToSave.length === 0) {
			shiftsToSave = generateWeeklyScheduleForStaffAndCabinets(
				weekStartDateIso,
				staffList,
				cabinets,
				"five_day",
			);
			setShifts(shiftsToSave);
		}
		if (onSave) {
			await onSave(shiftsToSave);
		}
		setNotification({
			type: "success",
			message: `График сменности кресел сохранен (${shiftsToSave.length} смен)`,
		});
		if (closeAfter) {
			onClose();
		} else {
			setTimeout(() => setNotification(null), 3000);
		}
	};

	// Run conflict detection
	const conflicts = useMemo(
		() => detectRosterConflicts(shifts, staffList),
		[shifts, staffList],
	);

	if (!isOpen) return null;

	// If user toggled to full studio view, render DoctorShiftRosterModal
	if (viewMode === "studio") {
		return (
			<DoctorShiftRosterModal
				{...props}
				initialShifts={shifts}
				onSave={async (savedShifts) => {
					setShifts(savedShifts);
					if (onSave) await onSave(savedShifts);
				}}
				onClose={() => setViewMode("matrix")}
			/>
		);
	}

	return (
		<div
			className="roster-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Сетка кресел и график врачей"
		>
			<div className="roster-modal-container">
				{/* Top Header Strip */}
				<div className="roster-header">
					<div className="roster-header-top">
						<div className="roster-title-block">
							<span className="roster-title-badge">StomX / DentalPRO</span>
							<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
								Сетка кресел — график врачей по дням недели
							</h2>
							{clinicName && (
								<span
									style={{
										fontSize: "0.8125rem",
										color: "var(--muted, #64748b)",
										fontWeight: 500,
									}}
								>
									• {clinicName}
								</span>
							)}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<button
								type="button"
								data-testid="chair-view-mode-toggle"
								className="roster-btn roster-btn-secondary"
								onClick={() => setViewMode("studio")}
								style={{ minHeight: "44px" }}
								title="Переключиться в расширенный табель учета (Т-13, баланс часов)"
							>
								<Clock size={16} />
								<span>Табель Т-13 / Студия</span>
							</button>
							<button
								type="button"
								data-testid="chair-save-btn"
								className="roster-btn roster-btn-primary"
								onClick={() => handleSaveAll(false)}
								style={{ minHeight: "44px" }}
								title="Сохранить изменения сетки кресел (Мандат 8e)"
							>
								<Save size={16} />
								<span>Сохранить</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onClose}
								style={{ minHeight: "44px" }}
								title="Закрыть окно (Esc)"
							>
								<X size={16} />
								<span>Закрыть</span>
							</button>
						</div>
					</div>

					{/* Notification Toast Strip */}
					{notification && (
						<div
							className={`roster-notification roster-notification-${notification.type}`}
						>
							{notification.type === "success" && <Check size={16} />}
							{notification.type === "error" && <AlertTriangle size={16} />}
							{notification.type === "info" && <Clock size={16} />}
							<span>{notification.message}</span>
						</div>
					)}

					{/* Navigation & 1-Click Week Copy Action Strip */}
					<div className="roster-nav-strip">
						<div className="roster-week-nav">
							<button
								type="button"
								className="roster-btn-icon"
								onClick={handlePrevWeek}
								title="Предыдущая неделя"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<ChevronLeft size={18} />
							</button>
							<div className="roster-week-label">
								<span className="roster-week-dates">
									{weekStartDateIso} — {weekEndDateIso}
								</span>
							</div>
							<button
								type="button"
								className="roster-btn-icon"
								onClick={handleNextWeek}
								title="Следующая неделя"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<ChevronRight size={18} />
							</button>
						</div>

						{/* 1-Click Copy & Clear Actions (StomX / DentalPRO parity, Mandates 8e, 8k, 8n) */}
						<div className="roster-actions-group">
							<button
								type="button"
								data-testid="chair-copy-next-week-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleCopyWeekToNextWeek}
								style={{ minHeight: "44px" }}
								title="Копировать все смены текущей недели на следующую неделю (+7 дней) в 1 клик"
							>
								<Copy size={16} />
								<span>Копировать на след. неделю</span>
							</button>
							<button
								type="button"
								data-testid="chair-copy-month-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleCopyWeekToMonth}
								style={{ minHeight: "44px" }}
								title="Копировать график текущей недели на следующие 4 недели вперед (месяц) в 1 клик"
							>
								<CalendarRange size={16} />
								<span>Копировать на 4 недели (месяц)</span>
							</button>
							<button
								type="button"
								data-testid="chair-clear-week-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleClearWeek}
								style={{ minHeight: "44px", color: "var(--bad-fg, #ef4444)" }}
								title="Очистить все смены текущей недели в 1 клик"
							>
								<RotateCcw size={16} />
								<span>Очистить неделю</span>
							</button>
						</div>
					</div>
				</div>

				{/* Compact Chair Matrix Body */}
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "1rem 1.5rem",
						display: "flex",
						flexDirection: "column",
						gap: "1.25rem",
					}}
				>
					{cabinets.map((cab) => (
						<div key={cab.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									paddingBottom: "0.25rem",
									borderBottom: "2px solid var(--line, #e2e8f0)",
								}}
							>
								<span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
									{cab.name}
								</span>
								<span
									style={{
										fontSize: "0.75rem",
										color: "var(--muted, #64748b)",
									}}
								>
									({cab.chairs.length} {cab.chairs.length === 1 ? "кресло" : "кресла"})
								</span>
							</div>

							{cab.chairs.map((chair) => {
								const isFocused = focusedChairId === chair.id;
								const activeDoc = getActiveDoctorForChair(chair.id);

								return (
									<div
										key={chair.id}
										style={{
											background: "var(--paper, #ffffff)",
											border: isFocused
												? "2px solid var(--teal, #0d9488)"
												: "1px solid var(--line, #e2e8f0)",
											borderRadius: "12px",
											padding: "0.875rem",
											boxShadow: isFocused ? "var(--shadow-2)" : "var(--shadow-1)",
										}}
									>
										{/* Chair Top Info Strip */}
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "0.75rem",
												marginBottom: "0.75rem",
												flexWrap: "wrap",
											}}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
												<Armchair size={18} color="var(--teal, #0d9488)" />
												<span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
													{chair.name}
												</span>
												{chair.equipment && (
													<span
														style={{
															fontSize: "0.75rem",
															color: "var(--muted, #64748b)",
															background: "var(--paper-soft, #f8fafc)",
															padding: "0.125rem 0.5rem",
															borderRadius: "6px",
															border: "1px solid var(--line, #e2e8f0)",
														}}
													>
														{chair.equipment}
													</span>
												)}
											</div>

											{/* Active Doctor Selector for 1-tap presets on this chair */}
											<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
												<span
													style={{
														fontSize: "0.75rem",
														fontWeight: 600,
														color: "var(--muted, #64748b)",
													}}
												>
													Врач для смен:
												</span>
												<select
													data-testid={`chair-doctor-select-${chair.id}`}
													value={activeDoc.id}
													onChange={(e) => {
														const newDocId = e.target.value;
														setSelectedDoctorByChair((prev) => ({
															...prev,
															[chair.id]: newDocId,
														}));
													}}
													style={{
														padding: "0.25rem 0.5rem",
														borderRadius: "6px",
														border: "1px solid var(--line, #cbd5e1)",
														background: "var(--paper, #fff)",
														color: "var(--ink, #0f172a)",
														fontSize: "0.8125rem",
														fontWeight: 600,
														minHeight: "36px",
													}}
												>
													{doctors.map((d) => (
														<option key={d.id} value={d.id}>
															{d.shortName} ({d.role})
														</option>
													))}
												</select>

												{/* Quick chair template buttons */}
												<div
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "0.25rem",
														marginLeft: "0.25rem",
													}}
												>
													<button
														type="button"
														data-testid={`chair-template-mon-wed-fri-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"mon_wed_fri_morning",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Пн/Ср/Пт (Утро 08:00–14:00)"
													>
														Пн/Ср/Пт
													</button>
													<button
														type="button"
														data-testid={`chair-template-tue-thu-sat-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"tue_thu_sat_evening",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Вт/Чт/Сб (Вечер 14:00–20:00)"
													>
														Вт/Чт/Сб
													</button>
													<button
														type="button"
														data-testid={`chair-template-two-two-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"two_two_full",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="2/2 (Полный день 08:00–20:00)"
													>
														2/2
													</button>
												</div>
											</div>
										</div>

										{/* 7 Days Matrix (Пн, Вт, Ср, Чт, Пт, Сб, Вс) */}
										<div
											style={{
												display: "grid",
												gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
												gap: "0.5rem",
											}}
										>
											{weekDays.map((day) => {
												const dayShifts = shifts.filter(
													(s) =>
														s.chairId === chair.id &&
														s.dateIso === day.dateIso &&
														s.status !== "cancelled",
												);

												return (
													<div
														key={day.dateIso}
														style={{
															border: "1px solid var(--line, #e2e8f0)",
															borderRadius: "8px",
															padding: "0.5rem",
															background: day.isWeekend
																? "var(--paper-soft, #fef2f2)"
																: "var(--paper, #ffffff)",
															display: "flex",
															flexDirection: "column",
															gap: "0.375rem",
															minHeight: "140px",
														}}
													>
														{/* Day Header */}
														<div
															style={{
																display: "flex",
																alignItems: "center",
																justifyContent: "space-between",
																borderBottom: "1px solid var(--line-subtle, #f1f5f9)",
																paddingBottom: "0.25rem",
															}}
														>
															<span
																style={{
																	fontSize: "0.75rem",
																	fontWeight: 800,
																	color: day.isWeekend
																		? "var(--bad-fg, #ef4444)"
																		: "var(--ink, #0f172a)",
																}}
															>
																{day.dayName}
															</span>
															<span
																style={{
																	fontSize: "0.6875rem",
																	color: "var(--muted, #64748b)",
																}}
															>
																{day.dayNumber}
															</span>
														</div>

														{/* Active Shifts in cell */}
														<div
															style={{
																flex: 1,
																display: "flex",
																flexDirection: "column",
																gap: "0.25rem",
															}}
														>
															{dayShifts.length === 0 ? (
																<div
																	style={{
																		fontSize: "0.6875rem",
																		color: "var(--muted, #94a3b8)",
																		padding: "0.25rem 0",
																		fontStyle: "italic",
																	}}
																>
																	Выходной
																</div>
															) : (
																dayShifts.map((s) => {
																	const isMorning = s.startTime < "14:00";
																	const isFull = s.durationHours >= 8;
																	const bg = isFull
																		? "#f3e8ff"
																		: isMorning
																			? "#fef3c7"
																			: "#e0e7ff";
																	const fg = isFull
																		? "#6b21a8"
																		: isMorning
																			? "#92400e"
																			: "#3730a3";

																	return (
																		<div
																			key={s.id}
																			style={{
																				background: bg,
																				color: fg,
																				padding: "0.25rem 0.375rem",
																				borderRadius: "6px",
																				fontSize: "0.6875rem",
																				lineHeight: 1.2,
																				border: `1px solid ${fg}20`,
																			}}
																		>
																			<div style={{ fontWeight: 700 }}>
																				{s.startTime}–{s.endTime}
																			</div>
																			<div
																				style={{
																					whiteSpace: "nowrap",
																					overflow: "hidden",
																					textOverflow: "ellipsis",
																				}}
																				title={s.doctorName}
																			>
																				{s.doctorName}
																			</div>
																		</div>
																	);
																})
															)}
														</div>

														{/* 1-Tap Fast Preset Actions (StomX Parity) */}
														<div
															style={{
																display: "grid",
																gridTemplateColumns: "1fr 1fr",
																gap: "0.25rem",
																marginTop: "auto",
																paddingTop: "0.25rem",
																borderTop: "1px solid var(--line-subtle, #f1f5f9)",
															}}
														>
															<button
																type="button"
																data-testid={`chair-btn-morning-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"morning",
																	)
																}
																style={{
																	minHeight: "28px",
																	height: "28px",
																	padding: "0 0.25rem",
																	fontSize: "0.6875rem",
																	fontWeight: 600,
																	borderRadius: "4px",
																	border: "1px solid var(--line, #cbd5e1)",
																	background: "var(--paper-soft, #f8fafc)",
																	color: "var(--ink, #0f172a)",
																	cursor: "pointer",
																}}
																title="Назначить утреннюю смену (08:00–14:00)"
															>
																Утро
															</button>
															<button
																type="button"
																data-testid={`chair-btn-evening-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"evening",
																	)
																}
																style={{
																	minHeight: "28px",
																	height: "28px",
																	padding: "0 0.25rem",
																	fontSize: "0.6875rem",
																	fontWeight: 600,
																	borderRadius: "4px",
																	border: "1px solid var(--line, #cbd5e1)",
																	background: "var(--paper-soft, #f8fafc)",
																	color: "var(--ink, #0f172a)",
																	cursor: "pointer",
																}}
																title="Назначить вечернюю смену (14:00–20:00)"
															>
																Вечер
															</button>
															<button
																type="button"
																data-testid={`chair-btn-full-day-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"full_day",
																	)
																}
																style={{
																	minHeight: "28px",
																	height: "28px",
																	padding: "0 0.25rem",
																	fontSize: "0.6875rem",
																	fontWeight: 600,
																	borderRadius: "4px",
																	border: "1px solid var(--line, #cbd5e1)",
																	background: "var(--paper-soft, #f8fafc)",
																	color: "var(--ink, #0f172a)",
																	cursor: "pointer",
																}}
																title="Назначить полный день (08:00–20:00)"
															>
																День
															</button>
															<button
																type="button"
																data-testid={`chair-btn-clear-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"clear",
																	)
																}
																style={{
																	minHeight: "28px",
																	height: "28px",
																	padding: "0 0.25rem",
																	fontSize: "0.6875rem",
																	fontWeight: 600,
																	borderRadius: "4px",
																	border: "1px solid var(--line, #cbd5e1)",
																	background: "var(--paper-soft, #f8fafc)",
																	color: "var(--bad-fg, #ef4444)",
																	cursor: "pointer",
																}}
																title="Очистить смену (Выходной день)"
															>
																Вых
															</button>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>

				{/* Footer Strip */}
				<div className="roster-footer">
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Сетка кресел (StomX Parity) • 1-тап назначение смен врачей
					</div>
					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onClose}
							style={{ minHeight: "44px" }}
						>
							Закрыть
						</button>
						<button
							type="button"
							data-testid="chair-apply-close-btn"
							className="roster-btn roster-btn-primary"
							onClick={() => handleSaveAll(true)}
							style={{ minHeight: "44px" }}
						>
							<Check size={16} />
							<span>Применить и закрыть</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export {
	DoctorShiftRosterModal,
	getMondayOfWeekIso,
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
	applyDoctorChairWeeklyTemplate,
	applyCellShiftPreset,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	addDaysToDateIso,
	getWeekDaysIso,
};
export type {
	DoctorShiftRosterModalProps,
	DoctorShift,
	StaffMember,
	CabinetDefinition,
	ShiftArchetypeId,
	DoctorChairRosterTemplateId,
	DoctorChairRosterTemplate,
};

export default ChairRosterModal;

