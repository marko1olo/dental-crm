import React from "react";
import { TOOTH46_PERIAPICAL_GEOMETRY } from "./Tooth46PeriapicalGeometry";
import type { PeriapicalCondition } from "./tooth46Types";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";

export interface Tooth46CystOverlayProps {
	condition?: PeriapicalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical inflammatory defect overlay:
 * 1. "granuloma": circumscribed osteolytic lesion with fibrous capsule rim.
 * 2. "cyst": radicular cyst with white sclerotic hyperostotic border & trabecular spicules.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46CystOverlay: React.FC<Tooth46CystOverlayProps> = ({
	condition = "granuloma",
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const capsuleFill = `url(#${sid("dente-granuloma-capsule")})`;
	const coreFill = `url(#${sid("dente-granuloma-core")})`;
	const geo = TOOTH46_PERIAPICAL_GEOMETRY;

	if (condition === "cyst") {
		const cyst = geo.radicularCyst;
		const outerBorder = isDark ? "#ffffff" : "#f1f5f9";
		const spiculeStroke = isDark
			? "rgba(226, 232, 240, 0.5)"
			: "rgba(100, 116, 139, 0.5)";

		return (
			<g
				id={sid(`tooth${tNum}-radicular-cyst`)}
				data-testid="tooth46-radicular-cyst"
				className={className}
			>
				{/* Inner Cystic Amber-Dark Osteolytic Fluid */}
				<path d={cyst.lumen} fill={`url(#${sid("dente-cyst-fluid")})`} stroke="none" />
				{/* Inner Diffuse Border */}
				<path
					d={cyst.corticalInnerGlow}
					fill="none"
					stroke="rgba(148, 163, 184, 0.40)"
					strokeWidth="0.8"
				/>
				{/* Hyperostotic Sclerotic Radiopaque Cortical Rim */}
				<path
					d={cyst.corticalBorder}
					fill="none"
					stroke={outerBorder}
					strokeWidth="1.2"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				{/* Trabecular Bone Spicules Radiating into Host Bone */}
				{cyst.trabeculaeSpicules.map((spicule) => (
					<path
						key={`spicule-${spicule.slice(0, 12)}`}
						d={spicule}
						data-component="cyst-spicule"
						fill="none"
						stroke={spiculeStroke}
						strokeWidth="0.6"
						strokeLinecap="round"
					/>
				))}
			</g>
		);
	}

	// Circumscribed Granuloma with Fibrous Capsule Rim
	const gran = geo.granuloma;
	return (
		<g
			id={sid(`tooth${tNum}-circumscribed-granuloma`)}
			data-testid="tooth46-granuloma"
			className={`tooth46-periapical-halo-group ${className ?? ""}`}
		>
			{/* Mesial Apex Granuloma Diffuse Halo */}
			<path
				d={gran.mesial.capsuleRim}
				fill={capsuleFill}
				stroke="none"
				opacity="0.85"
			/>
			<path
				d={gran.mesial.core}
				fill={coreFill}
				stroke="none"
				opacity="0.9"
			/>
			{/* Distal Apex Granuloma Diffuse Halo */}
			<path
				d={gran.distal.capsuleRim}
				fill={capsuleFill}
				stroke="none"
				opacity="0.85"
			/>
			<path
				d={gran.distal.core}
				fill={coreFill}
				stroke="none"
				opacity="0.9"
			/>
		</g>
	);
};
