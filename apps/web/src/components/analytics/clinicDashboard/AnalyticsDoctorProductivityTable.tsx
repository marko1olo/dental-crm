/**
 * apps/web/src/components/analytics/clinicDashboard/AnalyticsDoctorProductivityTable.tsx
 *
 * Таблица и карточки выработки и продуктивности врачей клиники (Layer 4).
 * Включает начисленную сумму, первичные/повторные визиты, доходимость по расписанию,
 * средний чек врача и часовую выработку.
 */

import React from "react";
import { Award, Users } from "lucide-react";
import { formatMoneyKopecks } from "../financialAnalyticsEngine.js";
import type { ClinicDoctorProductivitySummary } from "../doctorProductivityEngine.js";

export interface AnalyticsDoctorProductivityTableProps {
	readonly doctorSummary: ClinicDoctorProductivitySummary;
}

export const AnalyticsDoctorProductivityTable: React.FC<AnalyticsDoctorProductivityTableProps> = ({
	doctorSummary,
}) => {
	return (
		<section className="cad-panel" aria-label="Продуктивность врачей клиники">
			<div className="cad-panel-title-row">
				<h3 className="cad-panel-title">
					<Users size={16} style={{ color: "var(--accent, #6366f1)" }} />
					<span>Продуктивность врачей и доходимость по расписанию</span>
				</h3>
				<span className="cad-badge">{doctorSummary.doctors.length} активных врачей</span>
			</div>

			{doctorSummary.isEmpty ? (
				<div className="cad-empty-state">
					<Users size={32} className="cad-empty-icon" />
					<div>За выбранный период визитов врачей не зарегистрировано</div>
					<div style={{ fontSize: "0.75rem" }}>
						Завершите прием в дневнике пациента для начисления выработки доктора
					</div>
				</div>
			) : (
				<>
					{/* Mobile Grouped List Cards (Apple HIG / Touch Ergonomics) */}
					<div className="cad-doctors-mobile-cards block md:hidden space-y-3">
						{doctorSummary.doctors.map((doc) => (
							<div
								key={doc.doctorId}
								className="p-3 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5 shadow-xs"
							>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2 min-w-0">
										{doc.rank === 1 ? (
											<Award size={18} className="text-amber-500 shrink-0" />
										) : (
											<span className="w-5 h-5 rounded-full bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-xs font-bold text-[var(--muted,#64748b)] flex items-center justify-center shrink-0">
												#{doc.rank}
											</span>
										)}
										<div className="min-w-0">
											<div className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
												{doc.doctorName}
											</div>
											<div className="text-xs text-[var(--muted,#64748b)] truncate">
												{doc.specialty}
											</div>
										</div>
									</div>
									<div className="text-right shrink-0">
										<div className="text-sm font-black font-mono text-teal-700 dark:text-teal-300">
											{formatMoneyKopecks(doc.totalBilledKopecks, false)}
										</div>
										<div className="text-xs text-[var(--muted,#64748b)]">выработка</div>
									</div>
								</div>

								{/* Metrics Pill Grid */}
								<div className="grid grid-cols-3 gap-2 pt-1 text-center">
									<div className="p-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)]">Визиты</div>
										<div className="text-xs font-black font-mono text-[var(--ink,#0f172a)] mt-0.5">
											{doc.completedVisitsCount}
										</div>
										<div className="text-xs text-[var(--muted,#64748b)]">
											<span className="text-teal-600 font-bold">{doc.primaryPatientsCount}</span> /{" "}
											{doc.repeatPatientsCount}
										</div>
									</div>

									<div className="p-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)]">Доходимость</div>
										<div className="mt-0.5">
											<span
												className={`text-xs font-black font-mono px-1.5 py-0.5 rounded ${
													doc.attendanceRatePercent >= 80
														? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
														: "bg-amber-500/15 text-amber-700 dark:text-amber-300"
												}`}
											>
												{doc.attendanceRatePercent}%
											</span>
										</div>
										<div className="text-xs text-[var(--muted,#64748b)] font-mono mt-0.5">
											{formatMoneyKopecks(doc.hourlyBilledKopecks, false)}/ч
										</div>
									</div>

									<div className="p-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)]">Ср. чек</div>
										<div className="text-xs font-black font-mono text-[var(--ink,#0f172a)] mt-0.5">
											{formatMoneyKopecks(doc.averageBillKopecks, false)}
										</div>
										<div className="text-xs text-[var(--muted,#64748b)]">
											первичка {doc.primarySharePercent}%
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Desktop Table */}
					<div className="cad-table-wrap hidden md:block">
						<table className="cad-table">
							<thead>
								<tr>
									<th>Ранг / Врач</th>
									<th>Специализация</th>
									<th style={{ textAlign: "right" }}>Начислено (Выработка)</th>
									<th style={{ textAlign: "center" }}>Визиты</th>
									<th style={{ textAlign: "center" }}>Первичные / Повторные</th>
									<th style={{ textAlign: "center" }}>Доходимость (%)</th>
									<th style={{ textAlign: "right" }}>Ср. чек врача</th>
									<th style={{ textAlign: "right" }}>Часовая выработка</th>
								</tr>
							</thead>
							<tbody>
								{doctorSummary.doctors.map((doc) => (
									<tr key={doc.doctorId}>
										<td>
											<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
												{doc.rank === 1 ? (
													<Award size={14} style={{ color: "var(--warn-fg, #f59e0b)" }} />
												) : (
													<span
														style={{
															fontSize: "0.75rem",
															color: "var(--muted, #94a3b8)",
															width: 14,
														}}
													>
														#{doc.rank}
													</span>
												)}
												<span style={{ fontWeight: 600 }}>{doc.doctorName}</span>
											</div>
										</td>
										<td style={{ color: "var(--muted, #94a3b8)" }}>{doc.specialty}</td>
										<td
											style={{
												textAlign: "right",
												fontFamily: "monospace",
												fontWeight: 700,
												color: "var(--teal, #0d9488)",
											}}
										>
											{formatMoneyKopecks(doc.totalBilledKopecks, false)}
										</td>
										<td style={{ textAlign: "center", fontFamily: "monospace" }}>
											{doc.completedVisitsCount}
										</td>
										<td style={{ textAlign: "center", fontSize: "0.75rem" }}>
											<span style={{ color: "var(--teal, #0d9488)", fontWeight: 600 }}>
												{doc.primaryPatientsCount}
											</span>
											{" / "}
											<span>{doc.repeatPatientsCount}</span>{" "}
											<span style={{ color: "var(--muted, #94a3b8)" }}>
												({doc.primarySharePercent}%)
											</span>
										</td>
										<td style={{ textAlign: "center" }}>
											<span
												style={{
													fontWeight: 600,
													padding: "2px 6px",
													borderRadius: 4,
													backgroundColor:
														doc.attendanceRatePercent >= 80
															? "rgba(16, 185, 129, 0.15)"
															: "rgba(245, 158, 11, 0.15)",
													color:
														doc.attendanceRatePercent >= 80
															? "var(--ok-fg, #10b981)"
															: "var(--warn-fg, #f59e0b)",
												}}
											>
												{doc.attendanceRatePercent}%
											</span>
										</td>
										<td style={{ textAlign: "right", fontFamily: "monospace" }}>
											{formatMoneyKopecks(doc.averageBillKopecks, false)}
										</td>
										<td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--muted, #94a3b8)" }}>
											{formatMoneyKopecks(doc.hourlyBilledKopecks, false)}/ч
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</section>
	);
};
