import React from "react";

export interface BactericidalDesktopTableProps {
	readonly logs: any[];
	readonly loading: boolean;
}

export function BactericidalDesktopTable({ logs, loading }: BactericidalDesktopTableProps) {
	return (
		<div className="hidden md:block">
			<table className="sanpin-table">
				<thead>
					<tr>
						<th>Дата сеанса</th>
						<th>Кабинет / Аппарат</th>
						<th>Время включения / выключения</th>
						<th>Длительность (мин / ч)</th>
						<th>Режим обеззараживания</th>
						<th>Наработка после сеанса (ч)</th>
						<th>Ответственный</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
								Загрузка журнала сеансов...
							</td>
						</tr>
					) : logs.length === 0 ? (
						<tr>
							<td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Сеансы бактерицидной обработки не зафиксированы.
							</td>
						</tr>
					) : (
						logs.map((log) => (
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
								<td style={{ fontWeight: 600 }}>{log.date}</td>
								<td>
									<div>{log.roomName}</div>
									<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
										{log.deviceBrand} (№{log.serialNumber})
									</div>
								</td>
								<td>
									{new Date(log.sessionStartTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									{" — "}
									{new Date(log.sessionEndTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
								</td>
								<td>
									<span style={{ fontWeight: 600 }}>{log.durationMinutes} мин</span>
									<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}> ({log.durationHours} ч)</span>
								</td>
								<td>
									<span className="sanpin-tag sanpin-tag-neutral">
										{log.operatingMode === "continuous_presence"
											? "В присутствии людей"
											: log.operatingMode === "pre_op_preparation"
												? "Предоперационная подготовка"
												: log.operatingMode === "post_cleaning"
													? "Заключительная после уборки"
													: "Периодический"}
									</span>
								</td>
								<td style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
									{log.cumulativeHoursAfterSession} ч
								</td>
								<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Медсестра кабинета"}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
