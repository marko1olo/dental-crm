import type React from "react";
import { TOOTH46_PERIAPICAL_GEOMETRY } from "./Tooth46PeriapicalGeometry";
import type { PeriapicalCondition } from "./tooth46Types";

export interface Tooth46CystOverlayProps {
	condition?: PeriapicalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical inflammatory defect overlay:
 * 1. "granuloma": circumscribed osteolytic lesion with fibrous capsule rim.
 * 2. "cyst": well-demarcated radicular cyst with white sclerotic hyperostotic border.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46CystOverlay: React.FC<Tooth46CystOverlayProps> = ({
	condition = "granuloma",
	isDark = false,
	className,
}) => {
	const geo = TOOTH46_PERIAPICAL_GEOMETRY;

	if (condition === "cyst") {
		const cyst = geo.radicularCyst;
		const outerBorder = isDark ? "#ffffff" : "#f1f5f9";
		return (
			<g
				id="tooth46-radicular-cyst"
				data-testid="tooth46-radicular-cyst"
				className={className}
			>
				{/* Inner Cystic Amber-Dark Osteolytic Fluid */}
				<path d={cyst.lumen} fill="url(#dente-cyst-fluid)" stroke="none" />
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
			</g>
		);
	}

	// Circumscribed Granuloma with Fibrous Capsule Rim
	const gran = geo.granuloma;
	return (
		<g
			id="tooth46-circumscribed-granuloma"
			data-testid="tooth46-granuloma"
			className={`tooth46-periapical-halo-group ${className ?? ""}`}
		>
			{/* Mesial Apex Granuloma & Capsule */}
			<path
				d={gran.mesial.capsuleRim}
				fill="url(#dente-granuloma-capsule)"
				stroke="rgba(239, 68, 68, 0.60)"
				strokeWidth="0.6"
			/>
			<path
				d={gran.mesial.core}
				fill="url(#dente-granuloma-core)"
				stroke="rgba(185, 28, 28, 0.50)"
				strokeWidth="0.5"
			/>
			{/* Distal Apex Granuloma & Capsule */}
			<path
				d={gran.distal.capsuleRim}
				fill="url(#dente-granuloma-capsule)"
				stroke="rgba(239, 68, 68, 0.60)"
				strokeWidth="0.6"
			/>
			<path
				d={gran.distal.core}
				fill="url(#dente-granuloma-core)"
				stroke="rgba(185, 28, 28, 0.50)"
				strokeWidth="0.5"
			/>
		</g>
	);
};
