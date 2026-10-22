import type { SterilizationLogRecord } from "@dental/shared";
import React from "react";
import { getPackagingLabel } from "./types.js";

export interface AutoclaveCycleInfoCellsProps {
	readonly log: SterilizationLogRecord;
	readonly safeDate: Date;
	readonly deviceName: string;
}

export function AutoclaveCycleInfoCells({
	log,
	safeDate,
	deviceName,
}: AutoclaveCycleInfoCellsProps) {
	return (
		<>
			<td style={{ width: "10%", whiteSpace: "nowrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
					<span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--ink)" }}>№{log.cycleNumber}</span>
					<span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
						{safeDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
						{safeDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</span>
				</div>
			</td>

			<td style={{ width: "13%" }}>
				<div
					style={{ fontWeight: 600, fontSize: "0.76rem", lineHeight: 1.25, wordBreak: "break-word" }}
					title={`${deviceName}${log.serialNumber ? ` (Зав. №${log.serialNumber})` : ""}`}
				>
					{deviceName}
				</div>
			</td>

			<td style={{ width: "19%" }}>
				<div
					style={{ fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.25, wordBreak: "break-word" }}
					title={log.itemsDescription || "Стоматологический набор"}
				>
					{log.itemsDescription || "Стоматологический набор"}
				</div>
			</td>

			<td style={{ width: "11%" }}>
				<div
					style={{ fontSize: "0.74rem", color: "var(--ink)", lineHeight: 1.25, wordBreak: "break-word" }}
					title={getPackagingLabel(log.packagingType)}
				>
					{getPackagingLabel(log.packagingType)}
				</div>
			</td>
		</>
	);
}
