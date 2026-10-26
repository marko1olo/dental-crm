import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PatientBeforeAfterCase } from "../../patientCabinet/patientCabinetAppointments.js";
import { PlanBeforeAfterWiperCanvas } from "./PlanBeforeAfterWiperCanvas";

export interface PlanBeforeAfterWiperProps {
	readonly activeCase: PatientBeforeAfterCase;
	readonly sliderPercent: number;
	readonly onSliderChange: (percent: number) => void;
}

export const PlanBeforeAfterWiper: React.FC<PlanBeforeAfterWiperProps> = ({
	activeCase,
	sliderPercent,
	onSliderChange,
}) => {
	const [expanded, setExpanded] = useState(false);

	return (
		<div
			data-testid="before-after-active-wiper-card"
			style={{
				backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
				border: "1px solid var(--pc-border, #334155)",
				borderRadius: "10px",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div style={{ padding: "12px 14px", borderBottom: "1px solid var(--pc-border, #334155)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
				<div>
					<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", textTransform: "uppercase" }}>{activeCase.categoryRu}</span>
					<h5 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>{activeCase.titleRu}</h5>
				</div>
				<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>{activeCase.doctorName} &bull; {activeCase.durationRu}</div>
			</div>

			<PlanBeforeAfterWiperCanvas activeCase={activeCase} sliderPercent={sliderPercent} />

			<div style={{ padding: "10px 16px", backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))", borderTop: "1px solid var(--pc-border, #334155)", display: "flex", alignItems: "center", gap: "12px" }}>
				<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--pc-text-muted, #94a3b8)", whiteSpace: "nowrap" }}>До ({100 - sliderPercent}%)</span>
				<input
					type="range"
					min="0"
					max="100"
					value={sliderPercent}
					onChange={(e) => onSliderChange(Number(e.target.value))}
					aria-label="Сравнение До и После"
					data-testid="before-after-slider-input"
					style={{ flex: 1, minHeight: "44px", cursor: "pointer", accentColor: "var(--pc-primary, #0d9488)" }}
				/>
				<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", whiteSpace: "nowrap" }}>После ({sliderPercent}%)</span>
			</div>

			<div style={{ padding: "12px 16px", backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))", borderTop: "1px solid var(--pc-border, #334155)", fontSize: "12px", lineHeight: "1.4" }}>
				<p style={{ margin: "0 0 6px 0", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>{activeCase.descriptionRu}</p>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
					<span style={{ color: "var(--pc-text-muted, #94a3b8)" }}>{activeCase.toothFdi ? `Зубы FDI: ${activeCase.toothFdi}` : ""}</span>
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						style={{ minHeight: "44px", background: "transparent", border: "none", color: "var(--pc-primary, #0d9488)", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px" }}
					>
						{expanded ? (<><span>Скрыть детали</span><ChevronUp size={14} /></>) : (<><span>Клинические протоколы</span><ChevronDown size={14} /></>)}
					</button>
				</div>
				{expanded && (
					<div style={{ marginTop: "8px", padding: "10px", backgroundColor: "rgba(13, 148, 136, 0.08)", borderRadius: "6px", border: "1px solid rgba(13, 148, 136, 0.2)", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						<strong>Протокол фиксации и материалы:</strong> {activeCase.clinicalDetailsRu}
					</div>
				)}
			</div>
		</div>
	);
};
