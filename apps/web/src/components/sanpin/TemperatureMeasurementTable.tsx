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
			{/* Mobile Grouped Cards (Apple HIG & Anti-Desktop-Squeeze) */}
			<div className="md:hidden flex flex-col gap-3 p-1.5" data-testid="temp-mobile-cards-container">
				{loading ? (
					<div className="sanpin-mobile-card p-6 text-center text-sm text-[var(--muted)]">
						Загрузка журнала температурного режима...
					</div>
				) : filteredLogs.length === 0 ? (
					<div className="sanpin-mobile-card p-6 text-center text-sm text-[var(--muted)]">
						Замеры температуры и влажности не найдены.
					</div>
				) : (
					filteredLogs.map((log) => (
						<div
							key={log.id}
							className="sanpin-mobile-card touch-manipulation"
							data-testid={`temp-measurement-card-${log.id}`}
						>
							<div className="sanpin-mobile-card-header">
								<div className="flex items-baseline gap-2">
									<span className="text-sm font-extrabold text-[var(--ink)] tracking-tight">
										{log.measurementDate}
									</span>
									<span className="sanpin-tag sanpin-tag-neutral text-xs">
										{log.measurementPeriod === "morning" ? "Утро (09:00)" : "Вечер (18:00)"}
									</span>
								</div>
								{log.isWithinNorm ? (
									<span className="sanpin-tag sanpin-tag-success shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5">
										<CheckCircle2 size={12} /> В норме
									</span>
								) : (
									<span className="sanpin-tag sanpin-tag-danger shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5">
										<AlertTriangle size={12} /> Отклонение
									</span>
								)}
							</div>

							<div className="sanpin-mobile-card-body">
								<div className="font-semibold text-sm text-[var(--ink)]">{log.equipmentName}</div>
								{log.location && <div className="text-xs text-[var(--muted)]">{log.location}</div>}

								<div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--line-subtle,#e2e8f0)] text-xs">
									<div>
										<span className="text-[var(--muted)]">T°: </span>
										<strong className="text-sm text-[var(--ink)]">{log.temperatureCelsius}°C</strong>
										<span className="text-[var(--muted)] ml-1">[{log.targetTempMin}°C .. {log.targetTempMax}°C]</span>
									</div>
									{log.relativeHumidityPercent ? (
										<div>
											<span className="text-[var(--muted)]">Влажность: </span>
											<strong className="text-sm text-[var(--ink)]">{log.relativeHumidityPercent}%</strong>
										</div>
									) : null}
								</div>

								<div className="text-xs text-[var(--muted)] mt-1.5">
									Ответственный: <span className="text-[var(--ink)] font-medium">{log.operatorName || "Ответственная медсестра"}</span>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* Desktop Wide Table (Form 706н / 646н) */}
			<div className="hidden md:block">
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
		</div>
	);
}
