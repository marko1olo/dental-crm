import React from "react";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";

export interface Tooth46RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Divergent Multi-Root Body for Mandibular Molar 46
 * Features full 14mm roots, Wheeler Ch. 11 bifurcation ambient occlusion,
 * and 3D double-lobed mesial root with deep sulcus longitudinalis.
 */
export const Tooth46Roots: React.FC<Tooth46RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	isEndo = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";
	const rootOpacity = "1.0";

	return (
		<g id="tooth46-roots" {...(className ? { className } : {})}>
			{/* Monolithic Root Mass with Cylindrical Volume */}
			<path
				d={TOOTH46_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity={rootOpacity}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Smooth Anatomical Bifurcation Ambient Shadow (Clipped to roots) */}
			<path
				d={TOOTH46_GEOMETRY.bifurcationShadowPath}
				fill="url(#dente-furcation-shadow)"
				clipPath="url(#tooth46-root-clip)"
				pointerEvents="none"
			/>

			{/* Cylindrical Volume Shading & Highlights (Pure shader depth, zero artificial white strokes) */}
			<g clipPath="url(#tooth46-root-clip)">
				<path
					d={TOOTH46_GEOMETRY.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					d={TOOTH46_GEOMETRY.cejCurve}
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
