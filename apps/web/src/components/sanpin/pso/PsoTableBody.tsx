import React from "react";
import type { PsoCleaningLog } from "@dental/shared";

export interface PsoTableBodyProps {
	readonly loading: boolean;
	readonly logs: PsoCleaningLog[];
	readonly logsSlice: PsoCleaningLog[];
}

export const PsoTableBody: React.FC<PsoTableBodyProps> = ({
	loading,
	logs,
	logsSlice,
}) => {
	return (
		<table className="sanpin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
			<thead>
				<tr>
					<th style={{ width: 130 }}>Дата и время</th>
					<th>Обработанный инструментарий</th>
					<th style={{ width: 100, textAlign: "center" }}>Объем партии</th>
					<th style={{ width: 100, textAlign: "center" }}>Проба (шт)</th>
					<th style={{ width: 130, textAlign: "center" }}>Азопирам</th>
					<th style={{ width: 130, textAlign: "center" }}>Фенолфталеин</th>
					<th style={{ width: 150, textAlign: "center" }}>Заключение</th>
					<th style={{ width: 180 }}>Ответственный</th>
				</tr>
			</thead>
			<tbody>
				{loading && logs.length === 0 ? (
					<tr>
						<td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
							Загрузка журнала проб...
						</td>
					</tr>
				) : logsSlice.length === 0 ? (
					<tr>
						<td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
							Нет записей проб за выбранный период
						</td>
					</tr>
				) : (
					logsSlice.map((log) => {
						const isOk = log.isBatchApproved;
						const dateStr = log.timestamp
							? new Date(log.timestamp).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
							: "—";

						return (
							<tr key={log.id}>
								<td style={{ fontSize: "0.825rem", whiteSpace: "nowrap" }}>{dateStr}</td>
								<td>
									<div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--ink)" }}>{log.instrumentName}</div>
									{log.detergentBrand && (
										<div style={{ fontSize: "0.775rem", color: "var(--muted)" }}>Моющее: {log.detergentBrand}</div>
									)}
								</td>
								<td style={{ textAlign: "center", fontWeight: 600 }}>{log.batchItemCount} шт</td>
								<td style={{ textAlign: "center", fontWeight: 600 }}>{log.testedSampleCount} шт</td>
								<td style={{ textAlign: "center" }}>
									<span className={`sanpin-badge ${log.isAzopyramNegative ? "sanpin-badge--success" : "sanpin-badge--danger"}`}>
										{log.isAzopyramNegative ? "Отрицательно" : "Положительно"}
									</span>
								</td>
								<td style={{ textAlign: "center" }}>
									<span className={`sanpin-badge ${log.isPhenolphthaleinNegative ? "sanpin-badge--success" : "sanpin-badge--danger"}`}>
										{log.isPhenolphthaleinNegative ? "Отрицательно" : "Положительно"}
									</span>
								</td>
								<td style={{ textAlign: "center" }}>
									<span className={`sanpin-status-pill ${isOk ? "sanpin-status-pill--passed" : "sanpin-status-pill--failed"}`}>
										{isOk ? "Допущено" : "Брак"}
									</span>
								</td>
								<td style={{ fontSize: "0.825rem" }}>
									<div style={{ fontWeight: 500 }}>{log.operatorName || "Медсестра ЦСО"}</div>
								</td>
							</tr>
						);
					})
				)}
			</tbody>
		</table>
	);
};
