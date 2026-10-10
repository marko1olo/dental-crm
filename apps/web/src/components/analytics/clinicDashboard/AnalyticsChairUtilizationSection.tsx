/**
 * apps/web/src/components/analytics/clinicDashboard/AnalyticsChairUtilizationSection.tsx
 *
 * Секция загрузки стоматологических кресел клиники (Layer 4).
 * Адаптивное представление: карточки для смартфонов / планшетов (Apple HIG)
 * и плотная десктопная таблица с аналитикой санобработки и простоев.
 */

import React from "react";
import { Activity, Clock } from "lucide-react";
import { formatMoneyKopecks } from "../financialAnalyticsEngine.js";
import type { ClinicChairUtilizationSummary } from "../chairUtilizationEngine.js";

export interface AnalyticsChairUtilizationSectionProps {
	readonly chairSummary: ClinicChairUtilizationSummary;
}

export const AnalyticsChairUtilizationSection: React.FC<AnalyticsChairUtilizationSectionProps> = ({
	chairSummary,
}) => {
	return (
		<section className="cad-panel" aria-label="Загрузка стоматологических кресел">
			<div className="cad-panel-title-row">
				<h3 className="cad-panel-title">
					<Activity size={16} style={{ color: "var(--teal, #0d9488)" }} />
					<span>Загрузка стоматологических кресел клиники</span>
				</h3>
				<span className="cad-badge">{chairSummary.chairs.length} рабочих мест</span>
			</div>

			{chairSummary.isEmpty ? (
				<div className="cad-empty-state">
					<Clock size={32} className="cad-empty-icon" />
					<div>За выбранный период записей в расписании не найдено</div>
					<div style={{ fontSize: "0.75rem" }}>
						Оформите запись пациента в расписании для расчета загрузки кресел
					</div>
				</div>
			) : (
				<>
					{/* Mobile Grouped List Cards (Apple HIG / Touch Ergonomics) */}
					<div className="cad-chairs-mobile-cards block md:hidden space-y-3">
						{chairSummary.chairs.map((ch) => (
							<div
								key={ch.chairId}
								className="p-3 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5 shadow-xs"
							>
								<div className="flex items-center justify-between gap-2">
									<div className="min-w-0">
										<div className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
											{ch.chairName}
										</div>
										<div className="text-xs text-[var(--muted,#64748b)] truncate">
											{ch.cabinet}
										</div>
									</div>
									<span className="cad-badge font-mono font-bold text-xs shrink-0">
										{formatMoneyKopecks(ch.totalRevenueKopecks, false)}
									</span>
								</div>

								{/* Utilization bar */}
								<div className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="text-[var(--muted,#64748b)] font-medium">Полезная загрузка:</span>
										<span className="font-bold font-mono text-[var(--ink,#0f172a)]">
											{ch.effectiveUtilizationPercent}%
										</span>
									</div>
									<div className="cad-progress-bar-bg w-full">
										<div
											className="cad-progress-bar-fill"
											style={{
												width: `${ch.effectiveUtilizationPercent}%`,
												backgroundColor:
													ch.effectiveUtilizationPercent >= 85
														? "var(--warn-fg, #f59e0b)"
														: ch.effectiveUtilizationPercent >= 50
															? "var(--ok-fg, #10b981)"
															: "var(--teal, #0d9488)",
											}}
										/>
									</div>
								</div>

								{/* Metrics Pill Grid */}
								<div className="grid grid-cols-3 gap-2 pt-1 text-center">
									<div className="p-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)]">Приемы</div>
										<div className="text-xs font-black font-mono text-[var(--ink,#0f172a)] mt-0.5">
											{ch.completedCount} виз.
										</div>
										<div className="text-xs text-[var(--muted,#64748b)] font-mono">
											{Math.round(ch.occupiedMinutes / 60)} ч
										</div>
									</div>

									<div className="p-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)]">Санобработка</div>
										<div className="text-xs font-black font-mono text-[var(--ink,#0f172a)] mt-0.5">
											{ch.sanitationMinutes} мин
										</div>
										<div className="text-xs text-[var(--muted,#64748b)] font-mono">
											Простой: {Math.round(ch.idleMinutes / 60)}ч
										</div>
									</div>

									<div className="p-2 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)]">Срывы</div>
										<div
											className={`text-xs font-black font-mono mt-0.5 ${
												ch.cancellationRatePercent > 15 ? "text-rose-600" : "text-emerald-600"
											}`}
										>
											{ch.cancellationRatePercent}%
										</div>
										<div className="text-xs text-[var(--muted,#64748b)] font-mono">
											{formatMoneyKopecks(ch.revenuePerHourKopecks, false)}/ч
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
									<th>Кресло / Кабинет</th>
									<th style={{ minWidth: 140 }}>Полезная загрузка (%)</th>
									<th style={{ textAlign: "right" }}>Приемы</th>
									<th style={{ textAlign: "right" }}>Санобработка</th>
									<th style={{ textAlign: "right" }}>Простой</th>
									<th style={{ textAlign: "right" }}>Выручка кресла</th>
									<th style={{ textAlign: "right" }}>Выручка/час</th>
									<th style={{ textAlign: "center" }}>Срывы</th>
								</tr>
							</thead>
							<tbody>
								{chairSummary.chairs.map((ch) => (
									<tr key={ch.chairId}>
										<td>
											<div style={{ fontWeight: 600 }}>{ch.chairName}</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #94a3b8)" }}>
												{ch.cabinet}
											</div>
										</td>
										<td>
											<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
												<div className="cad-progress-bar-bg" style={{ flex: 1 }}>
													<div
														className="cad-progress-bar-fill"
														style={{
															width: `${ch.effectiveUtilizationPercent}%`,
															backgroundColor:
																ch.effectiveUtilizationPercent >= 85
																	? "var(--warn-fg, #f59e0b)"
																	: ch.effectiveUtilizationPercent >= 50
																		? "var(--ok-fg, #10b981)"
																		: "var(--teal, #0d9488)",
														}}
													/>
												</div>
												<span
													style={{
														fontWeight: 700,
														fontFamily: "monospace",
														width: 44,
														textAlign: "right",
													}}
												>
													{ch.effectiveUtilizationPercent}%
												</span>
											</div>
										</td>
										<td style={{ textAlign: "right", fontFamily: "monospace" }}>
											{Math.round(ch.occupiedMinutes / 60)} ч ({ch.completedCount} виз.)
										</td>
										<td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--muted, #94a3b8)" }}>
											{ch.sanitationMinutes} мин
										</td>
										<td
											style={{
												textAlign: "right",
												fontFamily: "monospace",
												color: ch.idleMinutes > 120 ? "var(--warn-fg, #f59e0b)" : "inherit",
											}}
										>
											{Math.round(ch.idleMinutes / 60)} ч
										</td>
										<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
											{formatMoneyKopecks(ch.totalRevenueKopecks, false)}
										</td>
										<td style={{ textAlign: "right", fontFamily: "monospace" }}>
											{formatMoneyKopecks(ch.revenuePerHourKopecks, false)}/ч
										</td>
										<td style={{ textAlign: "center" }}>
											<span
												style={{
													fontSize: "0.75rem",
													padding: "2px 6px",
													borderRadius: 4,
													backgroundColor:
														ch.cancellationRatePercent > 15
															? "rgba(239, 68, 68, 0.15)"
															: "rgba(255, 255, 255, 0.05)",
													color:
														ch.cancellationRatePercent > 15
															? "var(--err-fg, #ef4444)"
															: "var(--muted, #94a3b8)",
												}}
											>
												{ch.cancellationRatePercent}%
											</span>
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
