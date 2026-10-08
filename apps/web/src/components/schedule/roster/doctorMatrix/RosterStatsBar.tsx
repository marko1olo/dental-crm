/**
 * DENTE Dental CRM — Roster Stats Bar & Clinical Views (Layer 2)
 * Includes: Doctors Weekly Norms View, Statutory Form T-13 Timesheet, and Chair Utilization Heatmap
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Mandates 8e, 8d, 8k, 8n
 */

import React from "react";
import { MEDICAL_STAFF_ROLES } from "../doctorShiftRosterPresets";
import { calculateChairUtilization } from "../doctorShiftRosterEngine";
import { RosterHeaderToolbar } from "./RosterHeaderToolbar";
import type { RosterStatsBarProps } from "./types";

export const RosterStatsBar: React.FC<RosterStatsBarProps> = React.memo(
	function RosterStatsBar({
		activeTab,
		weekDays,
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		monthNormObj,
		cabinets,
		staffList,
		shifts,
		t13Matrix,
		sanitizedAppointments,
		flatChairsList,
		onOpenT13Timesheet,
		onOpenInternalT13Modal,
		onExportT13,
		onClose,
		onCellClick,
	}) {
		return (
			<>
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
								{staffList.length === 0 ? (
									<tr>
										<td
											colSpan={weekDays.length + 2}
											style={{ textAlign: "center", padding: "3rem 1rem" }}
										>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													gap: "0.75rem",
												}}
											>
												<div
													style={{
														color: "var(--muted, #64748b)",
														fontSize: "0.875rem",
													}}
												>
													В штате клиники пока нет сотрудников.
												</div>
												<a
													href="/settings?tab=staff"
													className="roster-btn roster-btn-secondary"
													style={{
														textDecoration: "none",
														display: "inline-flex",
														alignItems: "center",
														gap: "0.5rem",
														minHeight: "36px",
													}}
												>
													+ Добавить сотрудника в штат
												</a>
											</div>
										</td>
									</tr>
								) : (
									staffList.map((staff) => {
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
																onCellClick({
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
																		onCellClick({
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
																		onCellClick({
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
									})
								)}
							</tbody>
						</table>
					</div>
				)}

				{/* TAB 3: Form T-13 View */}
				{activeTab === "t13" && (
					<div
						style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
					>
						<RosterHeaderToolbar
							monthNormObj={monthNormObj}
							selectedYear={selectedYear}
							onOpenT13Timesheet={onOpenT13Timesheet}
							onOpenInternalT13Modal={onOpenInternalT13Modal}
							onExportT13={onExportT13}
							onClose={onClose}
						/>

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
									{t13Matrix.length === 0 ? (
										<tr>
											<td
												colSpan={36}
												style={{ textAlign: "center", padding: "3rem 1rem" }}
											>
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														gap: "0.75rem",
													}}
												>
													<div
														style={{
															color: "var(--muted, #64748b)",
															fontSize: "0.875rem",
														}}
													>
														Нет данных для формирования табеля учёта времени (сотрудники не добавлены).
													</div>
													<a
														href="/settings?tab=staff"
														className="roster-btn roster-btn-secondary"
														style={{
															textDecoration: "none",
															display: "inline-flex",
															alignItems: "center",
															gap: "0.5rem",
															minHeight: "36px",
														}}
													>
														+ Добавить врачей и ассистентов
													</a>
												</div>
											</td>
										</tr>
									) : (
										t13Matrix.map((row) => (
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
										))
									)}
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
								{cabinets.length === 0 ? (
									<tr>
										<td
											colSpan={weekDays.length + 1}
											style={{ textAlign: "center", padding: "3rem 1rem" }}
										>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													gap: "0.75rem",
												}}
											>
												<div
													style={{
														color: "var(--muted, #64748b)",
														fontSize: "0.875rem",
													}}
												>
													Для расчета загрузки кресел добавьте хотя бы одно рабочее место.
												</div>
												<a
													href="/settings?tab=clinic"
													className="roster-btn roster-btn-secondary"
													style={{
														textDecoration: "none",
														display: "inline-flex",
														alignItems: "center",
														gap: "0.5rem",
														minHeight: "36px",
													}}
												>
													+ Настроить кресла
												</a>
											</div>
										</td>
									</tr>
								) : (
									cabinets.map((cab) =>
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
									)
								)}
							</tbody>
						</table>
					</div>
				)}
			</>
		);
	},
);
