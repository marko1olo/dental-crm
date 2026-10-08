/**
 * DENTE Dental CRM — Roster Grid Matrix (Layer 1)
 * Compliance: TK RF Article 350, Cabinet-Chair Weekly Schedule Matrix, Mandates 8e, 8d
 */

import React from "react";
import { AlertTriangle, Users } from "lucide-react";
import { SHIFT_ARCHETYPES } from "../doctorShiftRosterPresets";
import type { RosterGridMatrixProps } from "./types";

export const RosterGridMatrix: React.FC<RosterGridMatrixProps> = React.memo(
	function RosterGridMatrix({
		weekDays,
		weekStartDateIso,
		cabinets,
		shifts,
		conflicts,
		onCellClick,
	}) {
		return (
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
										В клинике пока не настроены кабинеты и рабочие места.
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
										+ Настроить кабинеты и кресла
									</a>
								</div>
							</td>
						</tr>
					) : (
						cabinets.map((cab) =>
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
													onCellClick({
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
																onCellClick({
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
																	<span>Без ассистента (соло-приём)</span>
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
														onCellClick({
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
						)
					)}
				</tbody>
			</table>
		);
	},
);
