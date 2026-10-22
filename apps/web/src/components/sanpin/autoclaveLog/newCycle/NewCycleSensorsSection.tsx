import React from "react";
import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import type { CycleComplianceEvaluation } from "../autoclaveLogEngine.js";
import { STATUTORY_STERILIZATION_REGIMES, type SterilizationRegimeId } from "../autoclaveLogPresets.js";

export interface NewCycleSensorsSectionProps {
	readonly selectedRegimeId: SterilizationRegimeId;
	readonly actualTemp: number;
	readonly onActualTempChange: (t: number) => void;
	readonly actualPressure: number;
	readonly onActualPressureChange: (p: number) => void;
	readonly actualTime: number;
	readonly onActualTimeChange: (t: number) => void;
	readonly compliance: CycleComplianceEvaluation;
}

export const NewCycleSensorsSection: React.FC<NewCycleSensorsSectionProps> = ({
	selectedRegimeId, actualTemp, onActualTempChange, actualPressure,
	onActualPressureChange, actualTime, onActualTimeChange, compliance,
}) => {
	const currentRegime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === selectedRegimeId) ?? STATUTORY_STERILIZATION_REGIMES[0];

	return (
		<div style={{ background: "var(--paper-strong, #f8fafc)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "10px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
					<Gauge size={16} color="var(--brand-500, #3b82f6)" /> Физический контроль по датчикам автоклава
				</span>
				{compliance.isCompliant ? (
					<span className="status-badge passed"><CheckCircle2 size={14} /> Параметры в норме</span>
				) : (
					<span className="status-badge failed"><AlertTriangle size={14} /> Отклонение от нормы</span>
				)}
			</div>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
				<div className="autoclave-form-group">
					<label className="autoclave-form-label" style={{ fontSize: "0.75rem" }}>
						Температура (°C) [Норма: {currentRegime?.tempToleranceCelsius.min}–{currentRegime?.tempToleranceCelsius.max}]
					</label>
					<input type="number" step="0.1" className="autoclave-input" value={actualTemp} onChange={(e) => onActualTempChange(Number(e.target.value))} />
				</div>
				<div className="autoclave-form-group">
					<label className="autoclave-form-label" style={{ fontSize: "0.75rem" }}>
						Давление пара (бар) [Норма: {currentRegime?.pressureToleranceBar.min}–{currentRegime?.pressureToleranceBar.max}]
					</label>
					<input
						type="number" step="0.05" className="autoclave-input" value={actualPressure} onChange={(e) => onActualPressureChange(Number(e.target.value))}
						readOnly={currentRegime?.methodType === "dry_heat_air"}
						title={currentRegime?.methodType === "dry_heat_air" ? "Сухожаровой шкаф работает при атмосферном давлении (0 бар)" : "Давление пара в камере автоклава"}
					/>
				</div>
				<div className="autoclave-form-group">
					<label className="autoclave-form-label" style={{ fontSize: "0.75rem" }}>
						Экспозиция (мин) [Норма: ≥ {currentRegime?.exposureTimeMinutes}]
					</label>
					<input type="number" step="0.5" className="autoclave-input" value={actualTime} onChange={(e) => onActualTimeChange(Number(e.target.value))} />
				</div>
			</div>
			{!compliance.isCompliant && (
				<div style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: 600 }}>
					Внимание: {compliance.failureReasons.join("; ")}
				</div>
			)}
		</div>
	);
};
