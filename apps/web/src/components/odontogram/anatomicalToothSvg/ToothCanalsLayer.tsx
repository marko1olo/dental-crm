/**
 * DENTE Dental CRM — Anatomical Tooth Pulp & Canals Layer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { CanalDefinition, CanalObturationMaterial, PostCoreType } from "../anatomicalGeometriesTypes";
import { CANAL_OBTURATIONS } from "../anatomicalMaterialsAndSurfaces";

export interface ToothCanalsLayerProps {
	pulpChamberPath?: string | undefined;
	effectiveCanals: readonly CanalDefinition[];
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	isTop: boolean;
	effectiveCanalObturation: CanalObturationMaterial;
	effectiveCanalLevel: "full" | "two_thirds" | "half";
}

export const ToothCanalsLayer: React.FC<ToothCanalsLayerProps> = ({
	pulpChamberPath,
	effectiveCanals,
	hasPost,
	postType,
	isTop,
	effectiveCanalObturation,
	effectiveCanalLevel,
}) => {
	const obturation = CANAL_OBTURATIONS[effectiveCanalObturation] ?? CANAL_OBTURATIONS.unfilled;

	return (
		<g className="tooth-canals-group pointer-events-none">
			{pulpChamberPath && (
				<path
					d={pulpChamberPath}
					fill="url(#dente-pulp-healthy)"
					stroke="#e11d48"
					strokeWidth="0.8"
					opacity={0.85}
				/>
			)}
			{effectiveCanals.map((c) => {
				const dashArray =
					effectiveCanalLevel === "half" ? "12 12" : effectiveCanalLevel === "two_thirds" ? "18 8" : undefined;
				return (
					<path
						key={c.id}
						d={c.path}
						fill="none"
						stroke={obturation.strokeColor}
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeDasharray={dashArray}
					/>
				);
			})}
			{hasPost && (
				<path
					d={isTop ? "M 50 110 L 50 45" : "M 50 50 L 50 115"}
					stroke={postType === "fiber" ? "#6366f1" : postType === "titanium" ? "#475569" : "#334155"}
					strokeWidth="3.2"
					strokeLinecap="square"
				/>
			)}
		</g>
	);
};
