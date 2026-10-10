/**
 * @file CabinetReadinessHistoryTable.tsx
 * @description Layer 4: Audit history log table for cabinet readiness shift inspections (SanPiN 3.3686-21).
 */

import { Clock } from "lucide-react";
import React from "react";
import type { CabinetReadinessHistoryTableProps } from "./types";

export function CabinetReadinessHistoryTable({
	historyRecords,
}: CabinetReadinessHistoryTableProps) {
	return (
		<div
			className="cabinet-readiness-history-card"
			style={{
				marginTop: "0.85rem",
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--paper-border, #e2e8f0)",
				borderRadius: "0.75rem",
				padding: "0.85rem 1.15rem",
			}}
		>
			<h3
				style={{
					fontSize: "1rem",
					fontWeight: 700,
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					marginBottom: "0.75rem",
				}}
			>
				<Clock size={18} color="var(--brand-primary, #2563eb)" />
				<span>История проверок готовности кабинетов за смену</span>
			</h3>

			<div style={{ overflowX: "auto" }}>
				<table className="sanpin-table" style={{ width: "100%", fontSize: "0.85rem" }}>
					<thead>
						<tr>
							<th>Время</th>
							<th>Кабинет</th>
							<th>Профиль</th>
							<th>Статус</th>
							<th>Дезинфекция</th>
							<th>Наконечники</th>
							<th>Лоток</th>
							<th>Исполнитель</th>
							<th>ЭЦП Штамп</th>
						</tr>
					</thead>
					<tbody>
						{historyRecords.map((rec) => (
							<tr
								key={rec.id}
								className="sanpin-log-row"
								style={{
									minHeight: "44px",
									contentVisibility: "auto",
									containIntrinsicSize: "1px 44px",
									contain: "content",
								}}
							>
								<td style={{ whiteSpace: "nowrap" }}>
									{new Date(rec.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
								</td>
								<td style={{ fontWeight: 700 }}>{rec.cabinetNumber}</td>
								<td>{rec.appointmentTypeTitleRu.split("(")[0]}</td>
								<td>
									<span
										style={{
											padding: "0.2rem 0.5rem",
											borderRadius: "0.3rem",
											fontSize: "0.75rem",
											fontWeight: 700,
											background: rec.isFullyReady ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
											color: rec.isFullyReady ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)",
										}}
									>
										{rec.summaryBadgeRu}
									</span>
								</td>
								<td>
									{rec.surfaceDisinfection.disinfectantBrand} ({rec.surfaceDisinfection.exposureMinutes} мин)
								</td>
								<td>{rec.handpiecesSterility.class5IndicatorsVerified ? "5 кл. ОК" : "—"}</td>
								<td>{rec.sterileTray.isCompleted ? "Укомплектован" : "—"}</td>
								<td>{rec.operatorStaffFullName}</td>
								<td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
									{rec.digitalStampHash}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
