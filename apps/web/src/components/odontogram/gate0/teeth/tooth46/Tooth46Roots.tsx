import React from "react";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth46RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
	toothNumber?: number | undefined;
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
	toothNumber,
}) => {
	const tNum = useToothNumber(toothNumber) ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark
		? "#94a3b8"
		: "rgba(71, 85, 105, 0.45)";
	const rootOpacity = "1.0";

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			{/* Monolithic Root Mass with Cylindrical Volume */}
			<path
				d={TOOTH46_GEOMETRY.rootMonolithPath}
				fill={`url(#${sid("dente-root-dentin")})`}
				fillOpacity={rootOpacity}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Smooth Anatomical Bifurcation Ambient Shadow (Clipped to roots) */}
			<path
				d={TOOTH46_GEOMETRY.bifurcationShadowPath}
				fill={`url(#${sid("dente-furcation-shadow")})`}
				clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}
				pointerEvents="none"
			/>

			{/* Cylindrical Volume Shading & Highlights (Pure shader depth, zero artificial white strokes) */}
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={TOOTH46_GEOMETRY.rootMonolithPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
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
