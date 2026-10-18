import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import { Activity } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface DesktopChairUtilizationSectionProps {
	readonly chairCostRub: number;
	readonly chairOccupancy: number;
	readonly chairItems: readonly any[];
	readonly kpis: ExecutiveKpisSummary;
}

export function DesktopChairUtilizationSection({
	chairCostRub,
	chairOccupancy,
	chairItems,
	kpis,
}: DesktopChairUtilizationSectionProps) {
	return (
		<section className="executive-panel" aria-label="Загрузка стоматологических кресел">
			<div className="executive-panel-header">
				<h2 className="executive-panel-title">
					<Activity size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
					Загрузка кресел и стоимость простоя
				</h2>
				<span className="executive-panel-badge">
					Простой: {formatRublesClean(chairCostRub)}/ч
				</span>
			</div>

			<div className="executive-chair-table-wrap">
				{chairItems.length > 0 ? (
					<table className="executive-table tabular-nums" aria-label="Таблица загрузки кресел">
						<thead>
							<tr>
								<th>Кресло / Кабинет</th>
								<th style={{ textAlign: "right" }}>Занято</th>
								<th style={{ textAlign: "right" }}>Доступно</th>
								<th style={{ textAlign: "center" }}>Загрузка</th>
								<th style={{ textAlign: "right" }}>Простой (₽)</th>
							</tr>
						</thead>
						<tbody>
							{chairItems.map((c) => {
								const occHours = Math.round((c.occupiedMinutes / 60) * 10) / 10;
								const availHours = Math.round((c.availableMinutes / 60) * 10) / 10;
								const idleHours = Math.max(0, availHours - occHours);
								const idleLostRub = Math.round(idleHours * chairCostRub);

								return (
									<tr key={c.chairId || c.name}>
										<td>
											<div className="font-semibold text-[13px] flex items-center gap-2">
												<span
													className="w-2.5 h-2.5 rounded-full inline-block"
													style={{ backgroundColor: c.fill || "var(--teal, #0d9488)" }}
												/>
												{c.name}
											</div>
										</td>
										<td style={{ textAlign: "right" }}>{occHours} ч</td>
										<td style={{ textAlign: "right" }}>{availHours} ч</td>
										<td style={{ textAlign: "center" }}>
											<div className="chair-table-progress-cell">
												<span className="text-[12px] font-semibold">{c.utilizationPercent}%</span>
												<div className="chair-table-bar-track">
													<div
														className="chair-table-bar-fill"
														style={{
															width: `${Math.min(100, c.utilizationPercent)}%`,
															backgroundColor: c.fill || "var(--teal, #0d9488)",
														}}
													/>
												</div>
											</div>
										</td>
										<td style={{ textAlign: "right", color: idleLostRub > 0 ? "var(--err-fg, #ef4444)" : "var(--muted)" }}>
											{formatRublesClean(idleLostRub)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				) : (
					<div className="chair-empty-state">
						<Activity size={24} style={{ color: "var(--teal)", margin: "0 auto 0.5rem" }} />
						<div>Кресла настроены: {kpis.totalChairsCount} шт.</div>
						<div className="text-[12px] text-[var(--muted)] mt-1">
							Средняя полезная загрузка: {chairOccupancy}% (норма 65–80%)
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
