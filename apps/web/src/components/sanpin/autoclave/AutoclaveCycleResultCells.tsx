import type { SterilizationLogRecord } from "@dental/shared";
import React from "react";
import { AutoclaveIndicatorBadge } from "./AutoclaveIndicatorBadge.js";

export interface AutoclaveCycleResultCellsProps {
	readonly log: SterilizationLogRecord;
}

export function AutoclaveCycleResultCells({ log }: AutoclaveCycleResultCellsProps) {
	return (
		<>
			<td style={{ width: "7%", whiteSpace: "nowrap" }}>
				<AutoclaveIndicatorBadge
					indicatorType={log.indicatorType}
					passed={log.passedIndicator !== false}
				/>
			</td>

			<td style={{ width: "7%", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
				{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
					<span style={{ fontWeight: 600, color: "#059669" }}>
						{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
					</span>
				) : (
					<span style={{ color: "var(--muted)" }}>Сразу</span>
				)}
			</td>

			<td style={{ width: "10%", minWidth: "110px", whiteSpace: "nowrap", overflow: "hidden" }}>
				{log.barcode ? (
					<span
						style={{
							fontSize: "0.72rem",
							fontFamily: "monospace",
							color: "var(--brand-primary, #2563eb)",
							fontWeight: 700,
							background: "rgba(37, 99, 235, 0.08)",
							padding: "0.15rem 0.4rem",
							borderRadius: "4px",
							whiteSpace: "nowrap",
							maxWidth: "100%",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "inline-block",
							verticalAlign: "middle",
						}}
						title={`Штрихкод крафт-пакета: ${log.barcode}`}
					>
						{log.barcode}
					</span>
				) : (
					<span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>
				)}
			</td>
		</>
	);
}
