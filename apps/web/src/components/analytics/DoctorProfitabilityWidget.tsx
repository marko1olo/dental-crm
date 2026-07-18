import { Users } from "lucide-react";
import React from "react";

interface DoctorProfitabilityWidgetProps {
	data: Array<{
		name: string;
		revenue: number;
		margin: number;
		completionRate: number;
	}>;
}

function formatRub(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₽`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₽`;
	return `${n} ₽`;
}

export function DoctorProfitabilityWidget({
	data,
}: DoctorProfitabilityWidgetProps) {
	const hasData = data && data.filter((x) => x.revenue > 0).length > 0;

	return (
		<article className="glass-widget">
			<h3>
				<Users className="w-5 h-5 text-purple-500" /> Эффективность врачей
			</h3>
			<div className="widget-chart-container" style={{ overflowY: "auto" }}>
				{hasData ? (
					<table className="analytics-leaderboard-table">
						<thead>
							<tr>
								<th>Врач</th>
								<th>Выручка</th>
								<th>Прибыль</th>
								<th>Успешность</th>
							</tr>
						</thead>
						<tbody>
							{data.map((doc, idx) => (
								<tr key={idx}>
									<td>{doc.name}</td>
									<td>{formatRub(doc.revenue)}</td>
									<td className="margin-positive">+{formatRub(doc.margin)}</td>
									<td>
										<span
											style={{
												color:
													doc.completionRate >= 80
														? "#10b981"
														: doc.completionRate >= 60
															? "#f59e0b"
															: "#ef4444",
												fontWeight: 600,
											}}
										>
											{doc.completionRate}%
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<div className="analytics-empty-state">Нет данных по врачам</div>
				)}
			</div>
		</article>
	);
}
