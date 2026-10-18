import React from "react";
import { FileText } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface DesktopTopProceduresSectionProps {
	readonly topProcedures: readonly any[];
}

export function DesktopTopProceduresSection({ topProcedures }: DesktopTopProceduresSectionProps) {
	return (
		<section className="executive-panel" aria-label="Топ услуг прейскуранта">
			<div className="executive-panel-header">
				<h2 className="executive-panel-title">
					<FileText size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
					Топ услуг прейскуранта
				</h2>
				<span className="executive-panel-badge">{topProcedures.length} услуг</span>
			</div>

			<div className="executive-table-wrap">
				{topProcedures.length > 0 ? (
					<table className="executive-table tabular-nums" aria-label="Таблица топа процедур">
						<thead>
							<tr>
								<th style={{ width: "36px" }}>#</th>
								<th>Процедура / Услуга</th>
								<th>Отделение</th>
								<th style={{ textAlign: "center" }}>Оказано</th>
								<th style={{ textAlign: "right" }}>Сумма</th>
								<th style={{ textAlign: "right" }}>Доля</th>
							</tr>
						</thead>
						<tbody>
							{topProcedures.map((proc, idx) => (
								<tr key={proc.id}>
									<td>
										<span className="rank-badge rank-other">{idx + 1}</span>
									</td>
									<td>
										<div className="font-semibold text-[13px] line-clamp-1">{proc.name}</div>
									</td>
									<td className="text-[12px] text-[var(--muted)]">{proc.category}</td>
									<td style={{ textAlign: "center" }}>{proc.count} шт.</td>
									<td style={{ textAlign: "right", fontWeight: 700 }} className="text-[var(--teal)]">
										{formatRublesClean(proc.revenueFormatted)}
									</td>
									<td style={{ textAlign: "right" }}>
										<span className="kpi-pill-mini kpi-badge-neutral">{proc.sharePercent}%</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<div className="chair-empty-state">
						<FileText size={24} style={{ color: "var(--teal)", margin: "0 auto 0.5rem" }} />
						<div>Топ услуг появится после проведения манипуляций в медицинских картах приёма</div>
					</div>
				)}
			</div>
		</section>
	);
}
