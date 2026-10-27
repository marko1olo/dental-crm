import React from "react";
import type { T13RowData } from "./types";

interface RosterT13RowProps {
	row: T13RowData;
}

const getCodeStyle = (code: string): React.CSSProperties => {
	switch (code) {
		case "Я":
			return { backgroundColor: "var(--ok-bg, #f0fdf4)", color: "var(--ok-fg, #166534)" };
		case "Н":
			return { backgroundColor: "var(--info-bg, #e0e7ff)", color: "var(--info-fg, #3730a3)" };
		case "Б":
			return { backgroundColor: "var(--bad-bg, #fee2e2)", color: "var(--bad-fg, #991b1b)" };
		case "ОТ":
			return { backgroundColor: "var(--teal-soft, #dcfce7)", color: "var(--muted, #64748b)" };
		default:
			return { backgroundColor: "transparent", color: "var(--muted, #64748b)" };
	}
};

export const RosterT13Row: React.FC<RosterT13RowProps> = ({ row }) => {
	return (
		<React.Fragment>
			<tr>
				<td rowSpan={2} style={{ fontWeight: 700 }}>
					{row.tabNumber}
				</td>
				<td rowSpan={2} style={{ textAlign: "left", fontWeight: 600 }}>
					{row.staffName}
				</td>
				<td rowSpan={2} style={{ textAlign: "left", color: "var(--muted, #64748b)" }}>
					{row.position}
				</td>
				{row.days.map((d) => (
					<td key={d.dayOfMonth} className="t13-cell-code" style={getCodeStyle(d.code)}>
						{d.code}
					</td>
				))}
				<td rowSpan={2} style={{ fontWeight: 700 }}>
					{row.totalMonthDays}
				</td>
				<td rowSpan={2} style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>
					{row.totalMonthHours.toFixed(1)}
				</td>
				<td rowSpan={2}>{row.totalNightHours.toFixed(1)}</td>
				<td rowSpan={2} style={{ color: row.overtimeHours > 0 ? "var(--bad-fg, #ef4444)" : "inherit" }}>
					{row.overtimeHours > 0 ? `+${row.overtimeHours.toFixed(1)}` : "—"}
				</td>
			</tr>
			<tr>
				{row.days.map((d) => (
					<td key={`h-${d.dayOfMonth}`} className="t13-cell-hours">
						{d.hours > 0 ? d.hours.toFixed(1) : ""}
					</td>
				))}
			</tr>
		</React.Fragment>
	);
};
