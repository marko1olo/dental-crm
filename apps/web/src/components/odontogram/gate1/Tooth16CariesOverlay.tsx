import type React from "react";
import { TOOTH16_CARIES_GEOMETRY } from "./Tooth16CariesGeometry";

export interface Tooth16CariesOverlayProps {
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Organic Caries Overlay for Upper Molars 16 / 26
 * Compliant with Mandate 8b <= 120 lines.
 */
export const Tooth16CariesOverlay: React.FC<Tooth16CariesOverlayProps> = ({
	isDark = false,
}) => {
	const chalkyHalo = isDark ? "#fef08a" : "#fef9c3";
	const amberDentin = isDark ? "#d97706" : "#b45309";
	const necroticBase = isDark ? "#1c0a00" : "#0f0500";
	const fissureColor = isDark ? "#78350f" : "#451a03";

	return (
		<g id="tooth16-caries-overlay">
			{/* 1. Central Fossa Organic Caries */}
			<g id="tooth16-central-caries">
				<path
					d={TOOTH16_CARIES_GEOMETRY.centralPitHalo}
					fill={chalkyHalo}
					opacity="0.85"
				/>
				<path
					d={TOOTH16_CARIES_GEOMETRY.centralPitDentin}
					fill={amberDentin}
					opacity="0.95"
				/>
				<path
					d={TOOTH16_CARIES_GEOMETRY.centralPitNecrotic}
					fill={necroticBase}
				/>
			</g>

			{/* 2. Distopalatal Groove Fissure Caries along Oblique Ridge */}
			<g id="tooth16-distopalatal-caries">
				<path
					d={TOOTH16_CARIES_GEOMETRY.distalGrooveCaries}
					fill={amberDentin}
					opacity="0.80"
				/>
				<path
					d={TOOTH16_CARIES_GEOMETRY.distalNecroticFissure}
					stroke={fissureColor}
					strokeWidth="1.2"
					fill="none"
					strokeLinecap="round"
				/>
			</g>

			{/* 3. Carabelli Pit Caries */}
			<g id="tooth16-carabelli-caries">
				<path
					d={TOOTH16_CARIES_GEOMETRY.carabelliPitHalo}
					fill={chalkyHalo}
					opacity="0.75"
				/>
				<path
					d={TOOTH16_CARIES_GEOMETRY.carabelliNecroticCore}
					fill={necroticBase}
				/>
			</g>
		</g>
	);
};
