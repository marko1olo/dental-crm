/**
 * DENTE CRM — Patient Status Filter Bar
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import type { DentalHealthIndexResult, PatientToothStatus } from "../patientFriendlyOdontogramEngine";

export interface PatientStatusFilterBarProps {
	readonly statusFilter: "all" | PatientToothStatus;
	readonly onStatusFilterChange: (status: "all" | PatientToothStatus) => void;
	readonly healthIndex: DentalHealthIndexResult;
}

const filterBtnStyle = (active: boolean, color: string, bg: string): React.CSSProperties => ({
	padding: "6px 12px",
	minHeight: "36px",
	borderRadius: "8px",
	border: active ? `1.5px solid ${color}` : "1px solid var(--pc-border, #334155)",
	backgroundColor: active ? bg : "transparent",
	color: active ? color : "var(--pc-text-main, var(--ink, #0f172a))",
	fontSize: "12px",
	fontWeight: active ? 700 : 500,
	cursor: "pointer",
	touchAction: "manipulation",
	display: "flex",
	alignItems: "center",
	gap: "4px",
});

const dotStyle = (color: string): React.CSSProperties => ({
	width: "8px",
	height: "8px",
	borderRadius: "50%",
	backgroundColor: color,
	flexShrink: 0,
});

export const PatientStatusFilterBar: React.FC<PatientStatusFilterBarProps> = memo(({
	statusFilter,
	onStatusFilterChange,
	healthIndex,
}) => (
	<div
		style={{
			display: "flex",
			flexWrap: "wrap",
			gap: "6px",
			justifyContent: "center",
			padding: "8px",
			backgroundColor: "var(--pc-surface, #1e293b)",
			borderRadius: "10px",
			border: "1px solid var(--pc-border, #334155)",
		}}
	>
		<button
			type="button"
			onClick={() => onStatusFilterChange("all")}
			data-testid="filter-teeth-all"
			style={filterBtnStyle(statusFilter === "all", "var(--pc-primary, #0d9488)", "var(--pc-primary-light, rgba(13, 148, 136, 0.15))")}
		>
			Все зубы ({healthIndex.totalTeeth})
		</button>
		<button
			type="button"
			onClick={() => onStatusFilterChange("healthy")}
			data-testid="filter-teeth-healthy"
			style={filterBtnStyle(statusFilter === "healthy", "#10b981", "rgba(16, 185, 129, 0.15)")}
		>
			<span style={dotStyle("#10b981")} />
			<span>Здоровы / Вылечены ({healthIndex.healthyCount})</span>
		</button>
		<button
			type="button"
			onClick={() => onStatusFilterChange("in_treatment")}
			data-testid="filter-teeth-in_treatment"
			style={filterBtnStyle(statusFilter === "in_treatment", "#f59e0b", "rgba(245, 158, 11, 0.15)")}
		>
			<span style={dotStyle("#f59e0b")} />
			<span>В процессе ({healthIndex.inTreatmentCount})</span>
		</button>
		<button
			type="button"
			onClick={() => onStatusFilterChange("needs_treatment")}
			data-testid="filter-teeth-needs_treatment"
			style={filterBtnStyle(statusFilter === "needs_treatment", "#ef4444", "rgba(239, 68, 68, 0.15)")}
		>
			<span style={dotStyle("#ef4444")} />
			<span>Требуют внимания ({healthIndex.needsTreatmentCount})</span>
		</button>
		<button
			type="button"
			onClick={() => onStatusFilterChange("missing_or_implant")}
			data-testid="filter-teeth-missing_or_implant"
			style={filterBtnStyle(statusFilter === "missing_or_implant", "#64748b", "rgba(100, 116, 139, 0.15)")}
		>
			<span style={dotStyle("#64748b")} />
			<span>Имплантат / Замещен ({healthIndex.missingOrImplantCount})</span>
		</button>
	</div>
));

PatientStatusFilterBar.displayName = "PatientStatusFilterBar";
