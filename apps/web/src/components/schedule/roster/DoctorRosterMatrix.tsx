/**
 * DENTE Dental CRM — Doctor Shift Roster Matrix & Views
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Mandate 8e, Mandate 8d
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Building,
	Calendar as CalendarIcon,
	Clock,
	Download,
	Moon,
	Sun,
	Trash2,
	Users,
	X,
	XCircle,
} from "lucide-react";
import type {
	CabinetDefinition,
	StaffMember,
} from "./doctorShiftRosterPresets";
import {
	MEDICAL_STAFF_ROLES,
	SHIFT_ARCHETYPES,
} from "./doctorShiftRosterPresets";
import {
	calculateChairUtilization,
	type DoctorShift,
	type RosterConflict,
	type T13RowData,
} from "./doctorShiftRosterEngine";

export interface DoctorRosterMatrixProps {
	activeTab: "cabinets" | "doctors" | "t13" | "utilization";
	weekDays: Array<{
		dateIso: string;
		dayName: string;
		dayNumber: string;
		isWeekend: boolean;
	}>;
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	selectedMonth: number;
	monthNormObj?: {
		month: number;
		nameRu: string;
		normHours33: number;
	} | undefined;
	cabinets: CabinetDefinition[];
	staffList: StaffMember[];
	shifts: DoctorShift[];
	conflicts: RosterConflict[];
	t13Matrix: T13RowData[];
	sanitizedAppointments: Parameters<typeof calculateChairUtilization>[1];
	onOpenEdit: (shift: DoctorShift) => void;
	onOpenCreateInCell: (dateIso: string, cabinetId: string, chairId: string) => void;
	onOpenT13Timesheet?: (() => void) | undefined;
	onOpenInternalT13Modal: () => void;
	onExportT13: () => void;
	onClose: () => void;
	// 1-Click Chair-Doctor shift preset toggling (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
	onApplyCellPreset?: (
		dateIso: string,
		cabinetId: string,
		chairId: string,
		presetType: "morning" | "evening" | "full_day" | "clear",
		doctorId?: string,
	) => void;
	activePopoverCell?: {
		dateIso: string;
		cabinetId: string;
		chairId: string;
		doctorId?: string;
	} | null;
	onActivePopoverCellChange?: (
		cell: {
			dateIso: string;
			cabinetId: string;
			chairId: string;
			doctorId?: string;
		} | null,
	) => void;
}

export const DoctorRosterMatrix: React.FC<DoctorRosterMatrixProps> = React.memo(
	function DoctorRosterMatrix({
		activeTab,
		weekDays,
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		selectedMonth,
		monthNormObj,
		cabinets,
		staffList,
		shifts,
		conflicts,
		t13Matrix,
		sanitizedAppointments,
		onOpenEdit,
		onOpenCreateInCell,
		onOpenT13Timesheet,
		onOpenInternalT13Modal,
		onExportT13,
		onClose,
		onApplyCellPreset,
		activePopoverCell,
		onActivePopoverCellChange,
	}) {
		const [internalPopoverCell, setInternalPopoverCell] = useState<{
			dateIso: string;
			cabinetId: string;
			chairId: string;
			doctorId?: string;
		} | null>(null);

		const activePopover =
			activePopoverCell !== undefined
				? activePopoverCell
				: internalPopoverCell;

		const setActivePopover = (
			cell: {
				dateIso: string;
				cabinetId: string;
				chairId: string;
				doctorId?: string;
			} | null,
		) => {
			setInternalPopoverCell(cell);
			onActivePopoverCellChange?.(cell);
		};

		// Flat list of all available chairs across cabinets for quick chair selection
		const flatChairsList = useMemo(() => {
			const list: Array<{
				cabinetId: string;
				cabinetName: string;
				chairId: string;
				chairName: string;
			}> = [];
			for (const cab of cabinets) {
				for (const ch of cab.chairs) {
					list.push({
						cabinetId: cab.id,
						cabinetName: cab.name,
						chairId: ch.id,
						chairName: ch.name,
					});
				}
			}
			return list;
		}, [cabinets]);

		const [selectedDocId, setSelectedDocId] = useState<string>("");
		const [selectedChairKey, setSelectedChairKey] = useState<string>("");

		React.useEffect(() => {
			if (activePopover) {
				const docInCell =
					activePopover.doctorId ||
					shifts.find(
						(s) =>
							s.dateIso === activePopover.dateIso &&
							s.chairId === activePopover.chairId &&
							s.status !== "cancelled",
					)?.doctorId ||
					staffList.find(
						(s) =>
							s.isDoctor &&
							s.preferredChairId === activePopover.chairId,
					)?.id ||
					staffList.find((s) => s.isDoctor)?.id ||
					staffList[0]?.id ||
					"";
				setSelectedDocId(docInCell);

				const currentChairKey = `${activePopover.cabinetId}::${activePopover.chairId}`;
				setSelectedChairKey(currentChairKey);
			}
		}, [activePopover, shifts, staffList]);

		const handleApplyPresetInPopover = (
			presetType: "morning" | "evening" | "full_day" | "clear",
		) => {
			if (!activePopover) return;
			const parts = selectedChairKey ? selectedChairKey.split("::") : [];
			const cabId = parts[0] || activePopover.cabinetId;
			const chId = parts[1] || activePopover.chairId;
			const docId =
				selectedDocId ||
				activePopover.doctorId ||
				staffList.find((s) => s.isDoctor)?.id;

			if (onApplyCellPreset) {
				onApplyCellPreset(
					activePopover.dateIso,
					cabId,
					chId,
					presetType,
					docId,
				);
			} else {
				if (presetType === "clear") {
					const toCancel = shifts.find(
						(s) =>
							s.dateIso === activePopover.dateIso &&
							s.chairId === chId &&
							(!docId || s.doctorId === docId),
					);
					if (toCancel) onOpenEdit({ ...toCancel, status: "cancelled" });
				} else {
					onOpenCreateInCell(activePopover.dateIso, cabId, chId);
				}
			}
			setActivePopover(null);
		};

		const popoverDayInfo = useMemo(() => {
			if (!activePopover) return null;
			return weekDays.find((d) => d.dateIso === activePopover.dateIso);
		}, [activePopover, weekDays]);
		return (
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
								cab.chairs.map((chair) => (
									<tr key={chair.id}>
										<td className="roster-lane-header">
											<div
												style={{
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											>
												{cab.name}
											</div>
											<div
												style={{
													color: "var(--teal, #0d9488)",
													fontSize: "0.75rem",
													marginTop: "2px",
												}}
											>
												{chair.name}
											</div>
											<div
												style={{
													color: "var(--muted, #64748b)",
													fontSize: "0.6875rem",
													marginTop: "2px",
												}}
											>
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
												c.shiftIds.some((sId) =>
													cellShifts.some((cs) => cs.id === sId),
												),
											);

											return (
												<td
													key={day.dateIso}
													onClick={() =>
														setActivePopover({
															dateIso: day.dateIso,
															cabinetId: cab.id,
															chairId: chair.id,
														})
													}
													style={{ cursor: "pointer" }}
												>
													{cellShifts.map((shift) => {
														const arch =
															SHIFT_ARCHETYPES[shift.archetypeId] ||
															SHIFT_ARCHETYPES.morning_shift;
														const hasConflict = cellConflicts.some((c) =>
															c.shiftIds.includes(shift.id),
														);

														return (
															<div
																key={shift.id}
																className={`roster-shift-pill ${hasConflict ? "has-conflict" : ""}`}
																style={{
																	backgroundColor: `${arch.color}15`,
																	borderLeft: `4px solid ${arch.color}`,
																	minHeight: "44px",
																	cursor: "pointer",
																}}
																onClick={(e) => {
																	e.stopPropagation();
																	setActivePopover({
																		dateIso: day.dateIso,
																		cabinetId: cab.id,
																		chairId: chair.id,
																		doctorId: shift.doctorId,
																	});
																}}
																title="Кликните для быстрой смены или выбора пресета"
															>
																<div className="roster-shift-time">
																	<span style={{ color: arch.color }}>
																		{shift.startTime}–{shift.endTime} (
																		{shift.durationHours}ч)
																	</span>
																	{hasConflict && (
																		<AlertTriangle size={12} color="#ef4444" />
																	)}
																</div>
																<div
																	className="roster-shift-doc"
																	title={shift.doctorName}
																>
																	{shift.doctorName}
																</div>
																{shift.assistantName ? (
																	<div className="roster-shift-asst flex items-center gap-1">
																		<Users
																			size={11}
																			className="shrink-0 text-[var(--teal,#0d9488)]"
																		/>
																		<span>{shift.assistantName}</span>
																	</div>
																) : shift.doctorRole === "surgeon" ? (
																	<div
																		className="flex items-center gap-1"
																		style={{
																			fontSize: "0.6875rem",
																			color: "#f59e0b",
																		}}
																		title="Хирургический приём рекомендуется проводить с ассистентом"
																	>
																		<AlertTriangle size={11} className="shrink-0" />
																		<span>Без ассистента</span>
																	</div>
																) : (
																	<div
																		className="flex items-center gap-1 text-[var(--muted)] opacity-70"
																		style={{ fontSize: "0.6875rem" }}
																	>
																		<span className="truncate">
																			Индивидуальный приём
																		</span>
																	</div>
																)}
															</div>
														);
													})}

													{/* Add Shift Button (>=44px touch target) */}
													<button
														type="button"
														className="roster-cell-add-btn"
														onClick={(e) => {
															e.stopPropagation();
															setActivePopover({
																dateIso: day.dateIso,
																cabinetId: cab.id,
																chairId: chair.id,
															});
														}}
														style={{ minHeight: "44px" }}
														title={`Назначить смену на ${day.dayName} (${chair.name})`}
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
					<div
						style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
					>
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

									const totalWeekHours = userShifts.reduce(
										(sum, s) => sum + s.durationHours,
										0,
									);
									const isOverLimit = totalWeekHours > staff.weeklyHourLimit;

									return (
										<tr key={staff.id}>
											<td className="roster-lane-header">
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "0.5rem",
													}}
												>
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
												<div
													style={{
														fontSize: "0.75rem",
														color: "var(--muted, #64748b)",
														marginTop: "2px",
													}}
												>
													Таб. № {staff.tabNumber} •{" "}
													{MEDICAL_STAFF_ROLES[staff.role]?.nameRu}
												</div>
											</td>
											{weekDays.map((day) => {
												const dayShifts = userShifts.filter(
													(s) => s.dateIso === day.dateIso,
												);
												const docChair =
													staff.preferredChairId ||
													flatChairsList[0]?.chairId ||
													"";
												const cabForChair =
													cabinets.find((c) =>
														c.chairs.some((ch) => ch.id === docChair),
													)?.id ||
													cabinets[0]?.id ||
													"";

												return (
													<td
														key={day.dateIso}
														onClick={() => {
															setActivePopover({
																dateIso: day.dateIso,
																cabinetId: cabForChair,
																chairId: docChair,
																doctorId: staff.id,
															});
														}}
														style={{ cursor: "pointer" }}
													>
														{dayShifts.map((s) => (
															<div
																key={s.id}
																className="roster-shift-pill"
																style={{
																	background: "var(--paper-soft, #f8fafc)",
																	border: "1px solid var(--line, #cbd5e1)",
																	minHeight: "44px",
																	display: "flex",
																	flexDirection: "column",
																	justifyContent: "center",
																	cursor: "pointer",
																}}
																onClick={(e) => {
																	e.stopPropagation();
																	const cabId =
																		cabinets.find((c) =>
																			c.chairs.some((ch) => ch.id === s.chairId),
																		)?.id ||
																		cabinets[0]?.id ||
																		"";
																	setActivePopover({
																		dateIso: day.dateIso,
																		cabinetId: cabId,
																		chairId: s.chairId,
																		doctorId: staff.id,
																	});
																}}
																title="Кликните для быстрой смены или выбора пресета"
															>
																<div
																	style={{
																		fontWeight: 700,
																		fontSize: "0.75rem",
																	}}
																>
																	{s.startTime}–{s.endTime}
																</div>
																<div
																	style={{
																		fontSize: "0.6875rem",
																		color: "var(--muted, #64748b)",
																	}}
																>
																	{s.chairId} • {s.durationHours}ч
																</div>
															</div>
														))}
														{dayShifts.length === 0 && (
															<button
																type="button"
																className="roster-cell-add-btn"
																style={{
																	minHeight: "44px",
																	width: "100%",
																	marginTop: "0.25rem",
																}}
																onClick={(e) => {
																	e.stopPropagation();
																	setActivePopover({
																		dateIso: day.dateIso,
																		cabinetId: cabForChair,
																		chairId: docChair,
																		doctorId: staff.id,
																	});
																}}
																title={`Назначить смену: ${staff.fullName}`}
															>
																+ Смена
															</button>
														)}
													</td>
												);
											})}
											<td
												style={{ verticalAlign: "middle", padding: "0.75rem" }}
											>
												<div
													style={{
														display: "flex",
														justifyContent: "space-between",
														fontSize: "0.8125rem",
														fontWeight: 700,
													}}
												>
													<span>{totalWeekHours.toFixed(1)} ч</span>
													<span
														style={{
															color: isOverLimit
																? "#ef4444"
																: "var(--muted, #64748b)",
														}}
													>
														макс {staff.weeklyHourLimit} ч
													</span>
												</div>
												<div
													style={{
														height: "6px",
														background: "var(--line, #334155)",
														borderRadius: "9999px",
														overflow: "hidden",
														marginTop: "4px",
													}}
												>
													<div
														style={{
															width: `${Math.min(100, (totalWeekHours / staff.weeklyHourLimit) * 100)}%`,
															height: "100%",
															backgroundColor: isOverLimit
																? "#ef4444"
																: "var(--teal, #0d9488)",
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
					<div
						style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div>
								<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
									Табель учета рабочего времени (Форма Т-13 Госкомстата) —{" "}
									{monthNormObj?.nameRu} {selectedYear}
								</h3>
								<span
									style={{
										fontSize: "0.8125rem",
										color: "var(--muted, #64748b)",
									}}
								>
									Норма: {monthNormObj?.normHours33 || 138.6} ч (врачи: 33
									ч/нед, ассистенты: 39 ч/нед)
								</span>
							</div>
							<div
								style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
							>
								<button
									type="button"
									className="roster-btn roster-btn-secondary"
									onClick={() => {
										if (onOpenT13Timesheet) {
											onClose();
											onOpenT13Timesheet();
										} else {
											onOpenInternalT13Modal();
										}
									}}
									style={{ minHeight: "44px" }}
									title="Открыть интерактивный табель Форма Т-13"
								>
									<CalendarIcon size={16} />
									<span>Интерактивный табель Т-13</span>
								</button>
								<button
									type="button"
									className="roster-btn roster-btn-secondary"
									onClick={onExportT13}
									style={{ minHeight: "44px" }}
								>
									<Download size={16} />
									<span>Скачать CSV (Excel / 1C)</span>
								</button>
							</div>
						</div>

						<div className="t13-table-wrapper">
							<table className="t13-table">
								<thead>
									<tr>
										<th rowSpan={2} style={{ width: "3rem" }}>
											Таб №
										</th>
										<th rowSpan={2} style={{ width: "12rem", textAlign: "left" }}>
											ФИО сотрудника
										</th>
										<th rowSpan={2} style={{ width: "10rem", textAlign: "left" }}>
											Должность
										</th>
										<th colSpan={15}>1-я половина месяца (1–15)</th>
										<th
											colSpan={
												t13Matrix[0]?.days.length
													? t13Matrix[0].days.length - 15
													: 16
											}
										>
											2-я половина (16–{t13Matrix[0]?.days.length || 31})
										</th>
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
												<td rowSpan={2} style={{ fontWeight: 700 }}>
													{row.tabNumber}
												</td>
												<td
													rowSpan={2}
													style={{ textAlign: "left", fontWeight: 600 }}
												>
													{row.staffName}
												</td>
												<td
													rowSpan={2}
													style={{
														textAlign: "left",
														color: "var(--muted, #64748b)",
													}}
												>
													{row.position}
												</td>
												{row.days.map((d) => (
													<td
														key={d.dayOfMonth}
														className="t13-cell-code"
														style={{
															backgroundColor:
																d.code === "Я"
																	? "var(--ok-bg, #f0fdf4)"
																	: d.code === "Н"
																		? "var(--info-bg, #e0e7ff)"
																		: d.code === "Б"
																			? "var(--bad-bg, #fee2e2)"
																			: d.code === "ОТ"
																				? "var(--teal-soft, #dcfce7)"
																				: "transparent",
															color:
																d.code === "Я"
																	? "var(--ok-fg, #166534)"
																	: d.code === "Н"
																		? "var(--info-fg, #3730a3)"
																		: d.code === "Б"
																			? "var(--bad-fg, #991b1b)"
																			: "var(--muted, #64748b)",
														}}
													>
														{d.code}
													</td>
												))}
												<td rowSpan={2} style={{ fontWeight: 700 }}>
													{row.totalMonthDays}
												</td>
												<td
													rowSpan={2}
													style={{
														fontWeight: 700,
														color: "var(--teal, #0d9488)",
													}}
												>
													{row.totalMonthHours.toFixed(1)}
												</td>
												<td rowSpan={2}>{row.totalNightHours.toFixed(1)}</td>
												<td
													rowSpan={2}
													style={{
														color:
															row.overtimeHours > 0
																? "var(--bad-fg, #ef4444)"
																: "inherit",
													}}
												>
													{row.overtimeHours > 0
														? `+${row.overtimeHours.toFixed(1)}`
														: "—"}
												</td>
											</tr>
											{/* Hours Row */}
											<tr>
												{row.days.map((d) => (
													<td
														key={`h-${d.dayOfMonth}`}
														className="t13-cell-hours"
													>
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
					<div
						style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
					>
						<div>
							<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
								Тепловая карта загрузки кресел (Chair Utilization Matrix)
							</h3>
							<span
								style={{
									fontSize: "0.8125rem",
									color: "var(--muted, #64748b)",
								}}
							>
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
												<div
													style={{
														color: "var(--teal, #0d9488)",
														fontSize: "0.75rem",
													}}
												>
													{chair.name}
												</div>
											</td>
											{weekDays.map((day) => {
												const metrics = calculateChairUtilization(
													shifts,
													sanitizedAppointments,
													day.dateIso,
													cabinets,
												);
												const chairMetric = metrics.find(
													(m) => m.chairId === chair.id,
												);
												const rate = chairMetric
													? chairMetric.utilizationRatePercent
													: 0;
												const heat = chairMetric
													? chairMetric.heatLevel
													: "empty";

												return (
													<td
														key={day.dateIso}
														style={{
															textAlign: "center",
															verticalAlign: "middle",
														}}
													>
														<div className={`roster-heatmap-chip ${heat}`}>
															<span>{rate.toFixed(0)}%</span>
														</div>
														<div
															style={{
																fontSize: "0.6875rem",
																color: "var(--muted, #64748b)",
																marginTop: "2px",
															}}
														>
															{chairMetric?.bookedAppointmentMinutes || 0} /{" "}
															{chairMetric?.totalShiftMinutes || 0} мин
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

				{/* 1-Click Fast Shift & Chair-Doctor Binding Popover (Mandates 8e, 8k, 8n) */}
				{activePopover && (
					<div
						className="roster-cell-popover-overlay"
						data-testid="roster-cell-popover"
						style={{
							position: "fixed",
							inset: 0,
							backgroundColor: "rgba(15, 23, 42, 0.5)",
							backdropFilter: "blur(2px)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: 1000,
							padding: "1rem",
						}}
						onClick={(e) => {
							if (e.target === e.currentTarget) {
								setActivePopover(null);
							}
						}}
					>
						<div
							className="roster-cell-popover-dialog"
							style={{
								backgroundColor: "var(--paper, #ffffff)",
								color: "var(--ink, #0f172a)",
								border: "1px solid var(--line, #cbd5e1)",
								borderRadius: "0.75rem",
								boxShadow:
									"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
								width: "100%",
								maxWidth: "480px",
								padding: "1.25rem",
								display: "flex",
								flexDirection: "column",
								gap: "1rem",
							}}
						>
							{/* Popover Header */}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									borderBottom: "1px solid var(--line, #e2e8f0)",
									paddingBottom: "0.75rem",
								}}
							>
								<div>
									<h4
										style={{
											margin: 0,
											fontSize: "1rem",
											fontWeight: 700,
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										<span>Назначение смены в 1 клик</span>
										<span
											style={{
												fontSize: "0.75rem",
												fontWeight: 500,
												padding: "0.125rem 0.5rem",
												borderRadius: "9999px",
												backgroundColor: "var(--teal-soft, #f0fdfa)",
												color: "var(--teal, #0d9488)",
											}}
										>
											StomX / DentalPRO
										</span>
									</h4>
									<div
										style={{
											fontSize: "0.8125rem",
											color: "var(--muted, #64748b)",
											marginTop: "2px",
										}}
									>
										{popoverDayInfo?.dayName || ""}, {activePopover.dateIso}
									</div>
								</div>
								<button
									type="button"
									onClick={() => setActivePopover(null)}
									style={{
										minHeight: "44px",
										minWidth: "44px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										borderRadius: "0.375rem",
										background: "transparent",
										border: "none",
										color: "var(--muted, #64748b)",
										cursor: "pointer",
									}}
									title="Закрыть"
								>
									<X size={18} />
								</button>
							</div>

							{/* Quick 1-Click Presets Grid */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.5rem",
								}}
							>
								<div
									style={{
										fontSize: "0.75rem",
										fontWeight: 600,
										color: "var(--muted, #64748b)",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									Быстрые шаблоны смен (Мандат 8k)
								</div>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "0.5rem",
									}}
								>
									<button
										type="button"
										data-testid="cell-preset-morning"
										className="roster-btn roster-btn-secondary"
										onClick={() => handleApplyPresetInPopover("morning")}
										style={{
											minHeight: "44px",
											display: "flex",
											alignItems: "center",
											justifyContent: "flex-start",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											background: "var(--paper-soft, #f8fafc)",
											color: "var(--ink, #0f172a)",
											fontWeight: 600,
											fontSize: "0.8125rem",
											cursor: "pointer",
										}}
									>
										<Sun size={18} color="#f59e0b" className="shrink-0" />
										<div style={{ textAlign: "left" }}>
											<div>Утро</div>
											<div
												style={{
													fontSize: "0.6875rem",
													fontWeight: 400,
													color: "var(--muted, #64748b)",
												}}
											>
												08:00–14:00 (6ч)
											</div>
										</div>
									</button>

									<button
										type="button"
										data-testid="cell-preset-evening"
										className="roster-btn roster-btn-secondary"
										onClick={() => handleApplyPresetInPopover("evening")}
										style={{
											minHeight: "44px",
											display: "flex",
											alignItems: "center",
											justifyContent: "flex-start",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											background: "var(--paper-soft, #f8fafc)",
											color: "var(--ink, #0f172a)",
											fontWeight: 600,
											fontSize: "0.8125rem",
											cursor: "pointer",
										}}
									>
										<Moon size={18} color="#6366f1" className="shrink-0" />
										<div style={{ textAlign: "left" }}>
											<div>Вечер</div>
											<div
												style={{
													fontSize: "0.6875rem",
													fontWeight: 400,
													color: "var(--muted, #64748b)",
												}}
											>
												14:00–20:00 (6ч)
											</div>
										</div>
									</button>

									<button
										type="button"
										data-testid="cell-preset-full-day"
										className="roster-btn roster-btn-secondary"
										onClick={() => handleApplyPresetInPopover("full_day")}
										style={{
											minHeight: "44px",
											display: "flex",
											alignItems: "center",
											justifyContent: "flex-start",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											background: "var(--paper-soft, #f8fafc)",
											color: "var(--ink, #0f172a)",
											fontWeight: 600,
											fontSize: "0.8125rem",
											cursor: "pointer",
										}}
									>
										<Building size={18} color="#0d9488" className="shrink-0" />
										<div style={{ textAlign: "left" }}>
											<div>Весь день</div>
											<div
												style={{
													fontSize: "0.6875rem",
													fontWeight: 400,
													color: "var(--muted, #64748b)",
												}}
											>
												08:00–20:00 (11ч)
											</div>
										</div>
									</button>

									<button
										type="button"
										data-testid="cell-preset-clear"
										className="roster-btn roster-btn-secondary"
										onClick={() => handleApplyPresetInPopover("clear")}
										style={{
											minHeight: "44px",
											display: "flex",
											alignItems: "center",
											justifyContent: "flex-start",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											background: "var(--paper-soft, #f8fafc)",
											color: "#ef4444",
											fontWeight: 600,
											fontSize: "0.8125rem",
											cursor: "pointer",
										}}
									>
										<Trash2 size={18} color="#ef4444" className="shrink-0" />
										<div style={{ textAlign: "left" }}>
											<div>Выходной</div>
											<div
												style={{
													fontSize: "0.6875rem",
													fontWeight: 400,
													color: "var(--muted, #64748b)",
												}}
											>
												Очистить смену
											</div>
										</div>
									</button>
								</div>
							</div>

							{/* Doctor and Chair selectors */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}
							>
								<div>
									<label
										htmlFor="popover-doctor-select"
										style={{
											display: "block",
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--muted, #64748b)",
											marginBottom: "0.25rem",
										}}
									>
										Врач / Специалист
									</label>
									<select
										id="popover-doctor-select"
										data-testid="popover-doctor-select"
										value={selectedDocId}
										onChange={(e) => setSelectedDocId(e.target.value)}
										style={{
											width: "100%",
											minHeight: "44px",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											background: "var(--paper, #ffffff)",
											color: "var(--ink, #0f172a)",
											fontSize: "0.875rem",
										}}
									>
										{staffList
											.filter((s) => s.isDoctor)
											.map((doc) => (
												<option key={doc.id} value={doc.id}>
													{doc.fullName} (
													{MEDICAL_STAFF_ROLES[doc.role]?.nameRu || "Врач"})
												</option>
											))}
									</select>
								</div>

								<div>
									<label
										htmlFor="popover-chair-select"
										style={{
											display: "block",
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--muted, #64748b)",
											marginBottom: "0.25rem",
										}}
									>
										Кабинет и Кресло
									</label>
									<select
										id="popover-chair-select"
										data-testid="popover-chair-select"
										value={selectedChairKey}
										onChange={(e) => setSelectedChairKey(e.target.value)}
										style={{
											width: "100%",
											minHeight: "44px",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											background: "var(--paper, #ffffff)",
											color: "var(--ink, #0f172a)",
											fontSize: "0.875rem",
										}}
									>
										{flatChairsList.map((item) => (
											<option
												key={`${item.cabinetId}::${item.chairId}`}
												value={`${item.cabinetId}::${item.chairId}`}
											>
												{item.cabinetName} — {item.chairName}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Footer / Full Edit Button */}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									borderTop: "1px solid var(--line, #e2e8f0)",
									paddingTop: "0.75rem",
									marginTop: "0.25rem",
								}}
							>
								<button
									type="button"
									data-testid="popover-full-edit-btn"
									className="roster-btn roster-btn-secondary"
									onClick={() => {
										const parts = selectedChairKey
											? selectedChairKey.split("::")
											: [];
										const cabId = parts[0] || activePopover.cabinetId;
										const chId = parts[1] || activePopover.chairId;
										const existing = shifts.find(
											(s) =>
												s.dateIso === activePopover.dateIso &&
												s.chairId === chId &&
												s.status !== "cancelled" &&
												(!selectedDocId || s.doctorId === selectedDocId),
										);
										if (existing) {
											onOpenEdit(existing);
										} else {
											onOpenCreateInCell(activePopover.dateIso, cabId, chId);
										}
										setActivePopover(null);
									}}
									style={{
										minHeight: "44px",
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										fontSize: "0.8125rem",
										color: "var(--muted, #64748b)",
									}}
								>
									<Clock size={16} />
									<span>Подробное редактирование...</span>
								</button>

								<button
									type="button"
									className="roster-btn roster-btn-secondary"
									onClick={() => setActivePopover(null)}
									style={{
										minHeight: "44px",
										fontSize: "0.8125rem",
									}}
								>
									Отмена
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	},
);
