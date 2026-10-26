import type React from "react";
import { TOOTH14_GEOMETRY } from "./tooth14Geometry";

export interface Tooth14RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Dual Divergent Roots for Maxillary First Premolar 14
 * Wheeler Ch. 10 — Bifurcated Buccal & Palatal roots with trunk depression
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth14Roots: React.FC<Tooth14RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";
	const shadowColor = isDark
		? "rgba(15, 23, 42, 0.70)"
		: "rgba(100, 116, 139, 0.35)";

	return (
		<g id="tooth14-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth14-root-clip">
				<path d={TOOTH14_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Dual Root Mass (Buccal & Palatal) */}
			<path
				id="tooth14-root-monolith"
				d={TOOTH14_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Cylindrical Volume Shading & Highlights */}
			<g clipPath="url(#tooth14-root-clip)">
				<path
					d={TOOTH14_GEOMETRY.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				{/* Parabolic Bifurcation Fornix Shadow */}
				<path
					d={TOOTH14_GEOMETRY.bifurcationShadow}
					fill={shadowColor}
					stroke="none"
				/>
				{/* Mid-root Trunk Sulcus Groove */}
				{showGrooves && (
					<path
						d={TOOTH14_GEOMETRY.rootTrunkSulcus}
						fill="none"
						stroke={strokeColor}
						strokeWidth="0.65"
						strokeLinecap="round"
						opacity="0.6"
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</g>

			{/* Scalloped Cemento-Enamel Junction (CEJ) */}
			{showCej && (
				<path
					d={TOOTH14_GEOMETRY.cejCurve}
					fill="none"
					stroke={strokeColor}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
