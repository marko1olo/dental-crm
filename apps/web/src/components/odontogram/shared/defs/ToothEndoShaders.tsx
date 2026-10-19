import type React from "react";
import { DENTE_SHADER_IDS } from "./shaderConstants";

/**
 * Endodontic Pulp & Gutta-Percha Shaders (Mandate 8b <= 120 lines).
 * Vital ruby gel, necrotic devitalized pulp, luminous cone and coral sheath.
 */
export const ToothEndoShaders: React.FC = () => {
	const s = DENTE_SHADER_IDS;
	return (
		<>
			{/* Vital Coronal Pulp & Neurovascular Bundle (Ruby Gel) */}
			<linearGradient id={s.pulpVital} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fda4af" stopOpacity="0.95" />
				<stop offset="30%" stopColor="#f43f5e" stopOpacity="0.92" />
				<stop offset="70%" stopColor="#be123c" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#881337" stopOpacity="0.98" />
			</linearGradient>

			{/* Devitalized / Gangrenous Necrotic Pulp Tissue */}
			<linearGradient id={s.pulpNecrotic} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#78716c" stopOpacity="0.85" />
				<stop offset="40%" stopColor="#57534e" stopOpacity="0.90" />
				<stop offset="100%" stopColor="#292524" stopOpacity="0.95" />
			</linearGradient>

			{/* Tapered Gutta-Percha Radiant Core */}
			<linearGradient id={s.guttaperchaCone} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fda4af" stopOpacity="1" />
				<stop offset="35%" stopColor="#fb7185" stopOpacity="1" />
				<stop offset="75%" stopColor="#f43f5e" stopOpacity="1" />
				<stop offset="100%" stopColor="#be123c" stopOpacity="1" />
			</linearGradient>

			{/* Gutta-Percha Outer Coral Sheath */}
			<linearGradient id={s.guttaperchaSheath} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#fb7185" stopOpacity="1" />
				<stop offset="50%" stopColor="#f43f5e" stopOpacity="1" />
				<stop offset="100%" stopColor="#be123c" stopOpacity="1" />
			</linearGradient>
		</>
	);
};
