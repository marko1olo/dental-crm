import type React from "react";
import { TOOTH16_PATHOLOGY_GEOMETRY } from "./Tooth16PathologyGeometry";
import { Tooth16PathologyShaders } from "./Tooth16PathologyShaders";

export interface Tooth16PathologyOverlayProps {
	showAbfraction?: boolean;
	showPostCore?: boolean;
	showCalculus?: boolean;
	showCrack?: boolean;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Pathology Overlay for Upper Molars 16 / 26
 * Abfraction, Palatal Post & Core, Calculus, Craze line.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16PathologyOverlay: React.FC<
	Tooth16PathologyOverlayProps
> = ({
	showAbfraction = false,
	showPostCore = false,
	showCalculus = false,
	showCrack = false,
	isDark = false,
}) => {
	const crackColor = isDark ? "#f87171" : "#b91c1c";

	return (
		<g id="tooth16-pathology-overlay">
			<Tooth16PathologyShaders />

			{/* 1. Cervical wedge defect (Abfraction) */}
			{showAbfraction && (
				<g id="tooth16-abfraction-group">
					<path
						id="tooth16-abfraction-wedge"
						d={TOOTH16_PATHOLOGY_GEOMETRY.abfractionCervicalWedge}
						fill={isDark ? "#b45309" : "#d97706"}
						stroke={isDark ? "#78350f" : "#92400e"}
						strokeWidth="0.8"
					/>
					<path
						d={TOOTH16_PATHOLOGY_GEOMETRY.abfractionExposedDentin}
						fill="#78350f"
					/>
				</g>
			)}

			{/* 2. Post & Core in Palatal root canal */}
			{showPostCore && (
				<g id="tooth16-post-core-group">
					<path
						id="tooth16-post-pin"
						d={TOOTH16_PATHOLOGY_GEOMETRY.palatalPostPin}
						fill="url(#dente16-fiber-post)"
						stroke={
							isDark ? "rgba(56, 189, 248, 0.7)" : "rgba(14, 165, 233, 0.6)"
						}
						strokeWidth="0.6"
					/>
					<path
						id="tooth16-core-stump"
						d={TOOTH16_PATHOLOGY_GEOMETRY.anatomicalCoreBuildUp}
						fill="url(#dente16-core-stump)"
						stroke={isDark ? "#f59e0b" : "#d97706"}
						strokeWidth="0.8"
					/>
				</g>
			)}

			{/* 3. Dental Calculus */}
			{showCalculus && (
				<g id="tooth16-calculus-group">
					<path
						id="tooth16-calculus-band"
						d={TOOTH16_PATHOLOGY_GEOMETRY.calculusBuccalBand}
						fill="url(#dente16-calculus-mineral)"
					/>
					<path
						id="tooth16-calculus-furcation"
						d={TOOTH16_PATHOLOGY_GEOMETRY.calculusFurcationSpot}
						fill="url(#dente16-calculus-mineral)"
					/>
				</g>
			)}

			{/* 4. Enamel Craze Line crossing Crista Obliqua */}
			{showCrack && (
				<path
					id="tooth16-craze-line"
					d={TOOTH16_PATHOLOGY_GEOMETRY.crazeLineFissureCross}
					stroke={crackColor}
					strokeWidth="0.55"
					strokeDasharray="2,0.8"
					fill="none"
				/>
			)}
		</g>
	);
};
