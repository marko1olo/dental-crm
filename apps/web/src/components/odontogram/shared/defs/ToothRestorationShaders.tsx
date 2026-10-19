import type React from "react";
import { DENTE_SHADER_IDS } from "./shaderConstants";

/**
 * Composite Resin, Adhesive Seam & Secondary Caries Margin Shaders.
 * Mandate 8b <= 120 lines.
 */
export const ToothRestorationShaders: React.FC = () => {
	const s = DENTE_SHADER_IDS;
	return (
		<>
			{/* Nanohybrid Light-Cure Composite (A2/A3 Enamel-Dentin) */}
			<linearGradient id={s.compositeBody} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#f8fafc" stopOpacity="0.98" />
				<stop offset="35%" stopColor="#f1f5f9" stopOpacity="0.96" />
				<stop offset="70%" stopColor="#ede8e1" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#e2dcd2" stopOpacity="0.92" />
			</linearGradient>

			{/* Submicron Marginal Seal (Enamel Bevel Transition) */}
			<linearGradient id={s.compositeEdge} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.70" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.85" />
			</linearGradient>

			{/* Secondary / Recurrent Caries Marginal Leakage Seam */}
			<linearGradient id={s.secondaryCaries} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#78350f" stopOpacity="0.95" />
				<stop offset="60%" stopColor="#451a03" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#1c1917" stopOpacity="0.98" />
			</linearGradient>
		</>
	);
};
