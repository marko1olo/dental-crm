import React from "react";
import { Briefcase, Calculator } from "lucide-react";
import type { DoctorShiftFinancialMode } from "./shiftControlBarTypes";

export interface DoctorShiftFinancialModeToggleProps {
	readonly financialMode?: DoctorShiftFinancialMode | undefined;
	readonly onChangeFinancialMode?: ((mode: DoctorShiftFinancialMode) => void) | undefined;
	readonly className?: string | undefined;
}

export const DoctorShiftFinancialModeToggle: React.FC<DoctorShiftFinancialModeToggleProps> = React.memo(
	({ financialMode = "chair_rental", onChangeFinancialMode, className = "" }) => {
		if (!onChangeFinancialMode) return null;
		const isChairRental = financialMode === "chair_rental";

		return (
			<div
				className={`shift-financial-mode-toggle ${className}`.trim()}
				role="tablist"
				aria-label="Финансовый режим работы врача"
				style={{
					display: "inline-flex",
					alignItems: "center",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
					padding: "2px",
					gap: "2px",
				}}
				data-testid="shift-financial-mode-toggle"
			>
				<button
					type="button"
					role="tab"
					aria-selected={!isChairRental}
					onClick={() => onChangeFinancialMode("piece_rate")}
					data-testid="shift-mode-piece-rate"
					style={{
						height: "28px",
						padding: "0 8px",
						borderRadius: "6px",
						fontSize: "11.5px",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						border: !isChairRental ? "1px solid var(--line)" : "1px solid transparent",
						background: !isChairRental ? "var(--paper)" : "transparent",
						color: !isChairRental ? "var(--ink)" : "var(--muted)",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					<Briefcase size={12} style={{ flexShrink: 0 }} />
					<span>На проценте</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={isChairRental}
					onClick={() => onChangeFinancialMode("chair_rental")}
					data-testid="shift-mode-chair-rental"
					style={{
						height: "28px",
						padding: "0 8px",
						borderRadius: "6px",
						fontSize: "11.5px",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						border: isChairRental ? "1px solid var(--line)" : "1px solid transparent",
						background: isChairRental ? "var(--paper)" : "transparent",
						color: isChairRental ? "var(--teal)" : "var(--muted)",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					<Calculator size={12} style={{ flexShrink: 0 }} />
					<span>Субаренда кресла</span>
				</button>
			</div>
		);
	},
);

DoctorShiftFinancialModeToggle.displayName = "DoctorShiftFinancialModeToggle";
