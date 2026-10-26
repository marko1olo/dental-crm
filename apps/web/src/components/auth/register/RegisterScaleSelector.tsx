import React from "react";
import { Building, Stethoscope } from "lucide-react";
import type { PracticeScale } from "./registerHelpers";

interface RegisterScaleSelectorProps {
	scale: PracticeScale;
	onScaleChange: (scale: PracticeScale) => void;
}

export function RegisterScaleSelector({ scale, onScaleChange }: RegisterScaleSelectorProps) {
	return (
		<div className="auth-scale-selector">
			<button
				type="button"
				onClick={() => onScaleChange("solo")}
				className={`auth-scale-btn ${scale === "solo" ? "active" : ""}`}
			>
				<Stethoscope size={16} />
				<div className="auth-scale-btn-text">
					<strong>Частная практика</strong>
					<span>1 врач, 1 кресло</span>
				</div>
			</button>

			<button
				type="button"
				onClick={() => onScaleChange("clinic")}
				className={`auth-scale-btn ${scale === "clinic" ? "active" : ""}`}
			>
				<Building size={16} />
				<div className="auth-scale-btn-text">
					<strong>Клиника / Центр</strong>
					<span>2+ кресла, филиалы</span>
				</div>
			</button>
		</div>
	);
}
