import type React from "react";
import { ShieldCheck } from "lucide-react";
import { EMERGENCY_DISPENSE_PRESETS } from "../mdlpPresetsData.js";

export interface MdlpEmergencyDrawerProps {
	readonly show: boolean;
	readonly onEmergencyDispense: (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => void;
}

export const MdlpEmergencyDrawer: React.FC<MdlpEmergencyDrawerProps> = ({
	show,
	onEmergencyDispense,
}) => {
	if (!show) return null;

	return (
		<div className="mdlp-emergency-bypass-box" data-testid="mdlp-emergency-scanner-bypass">
			<div className="mdlp-emergency-title">
				<ShieldCheck className="w-4 h-4 text-emerald-400" />
				<span>Аварийная выдача медикаментов и имплантатов (поломка 2D-сканера или сбой сети):</span>
			</div>
			<div className="mdlp-emergency-pills-row">
				{EMERGENCY_DISPENSE_PRESETS.map((preset) => (
					<button
						key={preset.label}
						type="button"
						onClick={() => onEmergencyDispense(preset)}
						className="mdlp-emergency-pill"
						data-testid={`emergency-dispense-${preset.shortName.replace(/[^a-zA-Z0-9а-яА-Я]/g, "_")}`}
						title={`Немедленно выдать врачу: ${preset.label}`}
					>
						<span className="mdlp-emergency-pill-tag">{preset.badge}</span>
						<span>+ {preset.shortName}</span>
					</button>
				))}
			</div>
		</div>
	);
};
