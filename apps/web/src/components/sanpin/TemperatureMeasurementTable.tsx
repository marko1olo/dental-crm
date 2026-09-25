import { AlertTriangle, CheckCircle2 } from "lucide-react";
import React from "react";

export interface TemperatureMeasurementTableProps {
	readonly loading: boolean;
	readonly filteredLogs: any[];
}

export function TemperatureMeasurementTable({
	loading,
	filteredLogs,
}: TemperatureMeasurementTableProps) {
	return (
		<div className="sanpin-table-wrapper">
			<table className="sanpin-table">
				<thead>
					<tr>
						<th>Дата замера</th>
						<th>Время суток</th>
						<th>Объект контроля</th>
						<th>Фактическая T° (°C)</th>
						<th>Влажность (%)</th>
						<th>Норматив</th>
						<th>Статус соответствия</th>
						<th>Ответственный</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
								Загрузка журнала температурного режима...
							</td>
						</tr>
					) : filteredLogs.length === 0 ? (
						<tr>
							<td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Замеры температуры и влажности не найдены.
							</td>
						</tr>
					) : (
						filteredLogs.map((log) => (
							<tr
								key={log.id}
								className="sanpin-log-row"
								style={{
									minHeight: "44px",
									contentVisibility: "auto",
									containIntrinsicSize: "1px 44px",
									contain: "content",
								}}
							>
								<td style={{ fontWeight: 600 }}>{log.measurementDate}</td>
								<td>
									<span className="sanpin-tag sanpin-tag-neutral">
										{log.measurementPeriod === "morning" ? "Утро (09:00)" : "Вечер (18:00)"}
									</span>
								</td>
								<td>
									<div style={{ fontWeight: 500 }}>{log.equipmentName}</div>
									<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>{log.location}</div>
								</td>
								<td>
									<span
										style={{
											fontWeight: 700,
											fontSize: "0.95rem",
											color: log.isWithinNorm ? "var(--ink)" : "#dc2626",
										}}
									>
										{log.temperatureCelsius}°C
									</span>
								</td>
								<td>
									{log.relativeHumidityPercent ? `${log.relativeHumidityPercent}%` : "—"}
								</td>
								<td style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
									[{log.targetTempMin}°C .. {log.targetTempMax}°C]
								</td>
								<td>
									{log.isWithinNorm ? (
										<span className="sanpin-tag sanpin-tag-success">
											<CheckCircle2 size={12} /> В норме
										</span>
									) : (
										<span
											className="sanpin-tag sanpin-tag-danger"
											title={log.deviationReason || "Отклонение от нормы"}
										>
											<AlertTriangle size={12} /> ОТКЛОНЕНИЕ
										</span>
									)}
								</td>
								<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Ответственная медсестра"}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
