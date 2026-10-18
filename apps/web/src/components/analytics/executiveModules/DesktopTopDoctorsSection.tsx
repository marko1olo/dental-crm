import React from "react";
import { Trophy, Users } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface DesktopTopDoctorsSectionProps {
	readonly topDoctors: readonly any[];
}

export function DesktopTopDoctorsSection({ topDoctors }: DesktopTopDoctorsSectionProps) {
	return (
		<section className="executive-panel" aria-label="Топ врачей по реальной выручке">
			<div className="executive-panel-header">
				<h2 className="executive-panel-title">
					<Trophy size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
					Топ врачей по Net Revenue
				</h2>
				<span className="executive-panel-badge">{topDoctors.length} спец.</span>
			</div>

			<div className="executive-table-wrap">
				{topDoctors.length > 0 ? (
					<table className="executive-table tabular-nums" aria-label="Таблица топа врачей">
						<thead>
							<tr>
								<th style={{ width: "36px" }}>#</th>
								<th>Врач</th>
								<th>Специальность</th>
								<th style={{ textAlign: "right" }}>Выручка</th>
								<th style={{ textAlign: "center" }}>Визиты</th>
								<th style={{ textAlign: "center" }}>Явка</th>
								<th style={{ textAlign: "right" }}>Ср. чек</th>
							</tr>
						</thead>
						<tbody>
							{topDoctors.map((doc) => (
								<tr key={doc.id}>
									<td>
										<span className={`rank-badge rank-${doc.rank}`}>{doc.rank}</span>
									</td>
									<td>
										<div className="font-semibold text-[13px]">{doc.name}</div>
									</td>
									<td className="text-[12px] text-[var(--muted)]">{doc.specialty}</td>
									<td style={{ textAlign: "right", fontWeight: 700 }} className="text-[var(--teal)]">
										{formatRublesClean(doc.revenueFormatted)}
									</td>
									<td style={{ textAlign: "center" }}>{doc.visitsCount}</td>
									<td style={{ textAlign: "center" }}>
										<span className="kpi-pill-mini kpi-badge-success">{doc.attendancePercent}%</span>
									</td>
									<td style={{ textAlign: "right" }}>{formatRublesClean(doc.averageCheckFormatted)}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<div className="chair-empty-state">
						<Users size={24} style={{ color: "var(--teal)", margin: "0 auto 0.5rem" }} />
						<div>Выработка врачей формируется по закрытым сменам и оплатам кассы</div>
					</div>
				)}
			</div>
		</section>
	);
}
