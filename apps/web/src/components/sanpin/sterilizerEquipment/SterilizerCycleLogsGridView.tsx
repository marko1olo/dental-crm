import { Activity, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import React from "react";
import type { SterilizerCycleLogItem } from "./types.js";

export interface SterilizerCycleLogsGridViewProps {
	readonly logs: SterilizerCycleLogItem[];
}

export function SterilizerCycleLogsGridView({ logs }: SterilizerCycleLogsGridViewProps) {
	return (
		<div
			style={{
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				overflow: "hidden",
				background: "var(--paper, #ffffff)",
			}}
		>
			<div
				style={{
					padding: "0.5rem 0.75rem",
					background: "var(--paper-soft, #f8fafc)",
					borderBottom: "1px solid var(--line, #e2e8f0)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
					<Clock size={14} color="#0d9488" /> Журнал автоклавирования
				</span>
				<span style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>
					Записей: {logs.length}
				</span>
			</div>

			{logs.length === 0 ? (
				<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted, #64748b)", fontSize: "0.8rem" }}>
					<Activity size={28} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
					<p style={{ margin: 0 }}>В текущей смене циклов стерилизации ещё не зафиксировано.</p>
					<p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}>Нажмите «Зафиксировать цикл 134°C (5 сек)» для внесения записи.</p>
				</div>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
						<thead>
							<tr style={{ background: "var(--paper-soft, #f8fafc)", color: "var(--muted, #64748b)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600 }}>№</th>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600 }}>Дата / Время</th>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600 }}>Режим</th>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600 }}>Индикаторы КТ-1..КТ-5</th>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600 }}>Упаковок</th>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600 }}>Оператор ЦСО</th>
								<th style={{ padding: "0.45rem 0.6rem", textAlign: "right", fontWeight: 600 }}>Результат</th>
							</tr>
						</thead>
						<tbody>
							{logs.map((log) => (
								<tr key={log.id} style={{ borderBottom: "1px solid var(--line-subtle, #f1f5f9)" }}>
									<td style={{ padding: "0.45rem 0.6rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
										#{log.cycleNumber}
									</td>
									<td style={{ padding: "0.45rem 0.6rem", color: "var(--ink, #0f172a)" }}>
										{log.timestamp}
									</td>
									<td style={{ padding: "0.45rem 0.6rem", fontWeight: 600, color: "var(--teal-600, #0d9488)" }}>
										{log.regimeName}
									</td>
									<td style={{ padding: "0.45rem 0.6rem", color: "#059669" }}>
										<span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
											<ShieldCheck size={13} /> {log.indicatorResult}
										</span>
									</td>
									<td style={{ padding: "0.45rem 0.6rem", color: "var(--ink, #0f172a)" }}>
										{log.packsCount} уп.
									</td>
									<td style={{ padding: "0.45rem 0.6rem", color: "var(--muted, #64748b)" }}>
										{log.operatorName}
									</td>
									<td style={{ padding: "0.45rem 0.6rem", textAlign: "right" }}>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "0.2rem",
												padding: "0.15rem 0.45rem",
												borderRadius: "4px",
												fontSize: "0.7rem",
												fontWeight: 700,
												background: "rgba(5, 150, 105, 0.1)",
												color: "#059669",
											}}
										>
											<CheckCircle2 size={12} /> Стерильно
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
