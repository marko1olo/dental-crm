import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { STATUTORY_STERILIZATION_REGIMES, type SterilizationRegimeId } from "../autoclaveLogPresets.js";

export interface NewCycleRegimesSelectorProps {
	readonly selectedRegimeId: SterilizationRegimeId;
	readonly onSelectRegime: (id: SterilizationRegimeId) => void;
}

export const NewCycleRegimesSelector: React.FC<NewCycleRegimesSelectorProps> = ({
	selectedRegimeId,
	onSelectRegime,
}) => (
	<div>
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
			<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
				<Sparkles size={16} color="var(--teal, #0d9488)" />
				Режимы стерилизации
			</span>
			<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
				Автоматическая калибровка T°, давления и времени
			</span>
		</div>
		<div className="autoclave-regime-grid">
			{STATUTORY_STERILIZATION_REGIMES.map((reg) => {
				const isSelected = reg.id === selectedRegimeId;
				return (
					<button
						key={reg.id}
						type="button"
						onClick={() => onSelectRegime(reg.id)}
						className={`autoclave-regime-card ${isSelected ? "selected" : ""}`}
					>
						<div className="autoclave-regime-card-header">
							<span>{reg.shortLabelRu}</span>
							{isSelected && <CheckCircle2 size={16} color="var(--teal, #0d9488)" />}
						</div>
						<div className="autoclave-regime-card-sub">{reg.targetItemsDescriptionRu}</div>
					</button>
				);
			})}
		</div>
	</div>
);
