/**
 * DENTE Dental CRM — Anatomical Restorative Material Accents
 *
 * Renders specular sheens, burnished metallic edges, porcelain glaze highlights,
 * and cervical collars for composite, amalgam, e.max, zirconia, PFM, and gold restorations.
 */

import React from "react";
import type { ToothState, ToothVisualProps } from "./ToothChart";
import type {
	AnatomicalToothGeometry,
	RestorativeMaterialKey,
} from "./anatomicalToothGeometries";

export interface AnatomicalRestorativeAccentsProps {
	state: ToothState;
	material?: RestorativeMaterialKey | undefined;
	hasActiveSurfaces: boolean;
	geom: AnatomicalToothGeometry;
	isTop: boolean;
	colors: ToothVisualProps;
}

export const AnatomicalRestorativeAccents: React.FC<AnatomicalRestorativeAccentsProps> = ({
	state,
	material,
	hasActiveSurfaces,
	geom,
	isTop,
	colors,
}) => {
	return (
		<>
			{/* 1. Photopolymer Composite Resin Multi-layer Stipple & Specular Sheen */}
			{!hasActiveSurfaces &&
				state === "Filled" &&
				(material === "composite" || !material) && (
					<g pointerEvents="none" className="composite-material-layer">
						<path
							d={geom.crownPath}
							fill="url(#composite-resin-pattern)"
							opacity="0.38"
						/>
						<path
							d={isTop ? "M 28 132 Q 50 144 72 132" : "M 28 32 Q 50 20 72 32"}
							fill="none"
							stroke="rgba(255, 255, 255, 0.75)"
							strokeWidth="1.5"
							strokeLinecap="round"
							opacity="0.85"
						/>
					</g>
				)}

			{/* 2. Silver Amalgam Burnished Texture & Dark Silver Oxide Edge */}
			{!hasActiveSurfaces && state === "Filled" && material === "amalgam" && (
				<g pointerEvents="none" className="amalgam-material-layer">
					<path
						d={geom.crownPath}
						fill="url(#amalgam-burnish-pattern)"
						opacity="0.5"
					/>
					<path
						d={geom.crownPath}
						fill="none"
						stroke="#0f172a"
						strokeWidth="1.2"
						opacity="0.7"
					/>
				</g>
			)}

			{/* 3. Ceramic IPS E.max Translucent Porcelain Glaze Reflection */}
			{!hasActiveSurfaces &&
				(state === "Filled" || state === "Crown") &&
				material === "ceramic_emax" && (
					<path
						d={geom.crownPath}
						fill="url(#ceramic-glaze-specular)"
						opacity="0.45"
						pointerEvents="none"
						className="ceramic-glaze-layer"
					/>
				)}

			{/* 4. Monolithic Zirconia & PFM Cusp Highlights & Cervical Collar Ring */}
			{state === "Crown" && (
				<g className="crown-restoration-accents">
					{material === "zirconia" && (
						<path
							d={isTop ? "M 30 134 Q 50 146 70 134" : "M 30 30 Q 50 18 70 30"}
							fill="none"
							stroke="rgba(255, 255, 255, 0.85)"
							strokeWidth="1.6"
							strokeLinecap="round"
							opacity="0.9"
						/>
					)}
					<path
						d={
							isTop
								? "M 20 96 Q 50 92 80 96 Q 50 100 20 96"
								: "M 20 64 Q 50 68 80 64 Q 50 60 20 64"
						}
						fill={colors.collarFill ?? "url(#dente-cervical-collar)"}
						stroke="#334155"
						strokeWidth="1.2"
					/>
				</g>
			)}

			{/* 5. Cast Gold 24K Specular Golden Metallic Highlight & Marginal Burnish Line */}
			{!hasActiveSurfaces &&
				(state === "Filled" || state === "Crown") &&
				material === "gold" && (
					<path
						d={isTop ? "M 26 138 Q 50 148 74 138" : "M 26 26 Q 50 16 74 26"}
						fill="none"
						stroke="#fef08a"
						strokeWidth="1.6"
						strokeLinecap="round"
						opacity="0.9"
						pointerEvents="none"
						className="gold-marginal-burnish-layer"
					/>
				)}
		</>
	);
};
