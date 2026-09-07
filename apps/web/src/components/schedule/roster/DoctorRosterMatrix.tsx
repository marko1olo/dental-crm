/**
 * DENTE Dental CRM — Doctor Shift Roster Matrix & Views
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Mandate 8e, Mandate 8d
 */

import React from "react";
import {
	AlertTriangle,
	Calendar as CalendarIcon,
	Download,
	Users,
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
	}) {
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
												<td key={day.dateIso}>
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
																}}
																onClick={() => onOpenEdit(shift)}
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
														onClick={() =>
															onOpenCreateInCell(day.dateIso, cab.id, chair.id)
														}
														style={{ minHeight: "44px" }}
														title={`Добавить смену на ${day.dayName} (${chair.name})`}
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
																onClick={() => onOpenEdit(s)}
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
															<div
																style={{
																	color: "var(--muted, #94a3b8)",
																	fontSize: "0.75rem",
																	textAlign: "center",
																	paddingTop: "0.5rem",
																}}
															>
																Выходной
															</div>
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
			</div>
		);
	},
);
