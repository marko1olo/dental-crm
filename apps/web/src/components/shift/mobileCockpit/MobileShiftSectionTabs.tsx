import React from "react";
import { Calculator, Calendar } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface MobileShiftSectionTabsProps {
	readonly mobileSection: "queue" | "rental";
	readonly onSelectSection: (sec: "queue" | "rental") => void;
	readonly totalAppointmentsCount: number;
	readonly rentalNetProfitRub: number;
}

export const MobileShiftSectionTabs: React.FC<MobileShiftSectionTabsProps> = ({
	mobileSection,
	onSelectSection,
	totalAppointmentsCount,
	rentalNetProfitRub,
}) => (
	<div
		role="tablist"
		aria-label="Раздел мобильной смены врача"
		style={{
			display: "grid",
			gridTemplateColumns: "1fr 1fr",
			gap: "6px",
			padding: "4px",
			borderRadius: "12px",
			background: "var(--paper-soft)",
			border: "1px solid var(--line)",
		}}
		data-testid="mobile-shift-section-tabs"
	>
		<button
			type="button"
			role="tab"
			aria-selected={mobileSection === "queue"}
			onClick={() => onSelectSection("queue")}
			data-testid="mobile-shift-tab-queue"
			style={{
				minHeight: "44px",
				padding: "0 8px",
				borderRadius: "9px",
				fontSize: "12px",
				fontWeight: 700,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "5px",
				border: mobileSection === "queue" ? "1px solid var(--line)" : "1px solid transparent",
				background: mobileSection === "queue" ? "var(--paper)" : "transparent",
				color: mobileSection === "queue" ? "var(--ink)" : "var(--muted)",
				cursor: "pointer",
				whiteSpace: "nowrap",
			}}
		>
			<Calendar size={14} style={{ flexShrink: 0 }} />
			<span>Очередь ({totalAppointmentsCount})</span>
		</button>

		<button
			type="button"
			role="tab"
			aria-selected={mobileSection === "rental"}
			onClick={() => onSelectSection("rental")}
			data-testid="mobile-shift-tab-rental"
			style={{
				minHeight: "44px",
				padding: "0 8px",
				borderRadius: "9px",
				fontSize: "12px",
				fontWeight: 700,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "5px",
				border: mobileSection === "rental" ? "1px solid var(--line)" : "1px solid transparent",
				background: mobileSection === "rental" ? "var(--paper)" : "transparent",
				color: mobileSection === "rental" ? "var(--teal)" : "var(--muted)",
				cursor: "pointer",
				whiteSpace: "nowrap",
			}}
		>
			<Calculator size={14} style={{ flexShrink: 0 }} />
			<span>Субаренда ({money(rentalNetProfitRub)})</span>
		</button>
	</div>
);
