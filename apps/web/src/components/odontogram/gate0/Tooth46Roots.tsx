import type React from "react";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";

export interface Tooth46RootsProps {
	showGrooves?: boolean;
	showCej?: boolean;
	isDark?: boolean;
	className?: string;
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
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";
	const grooveColor = isDark
		? "rgba(148, 163, 184, 0.65)"
		: "rgba(100, 116, 139, 0.55)";

	return (
		<g id="tooth46-roots" className={className}>
			{/* Monolithic Root Mass with Cylindrical Volume */}
			<path
				d={TOOTH46_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Mesial Root Dual-Lobe Longitudinal Modeling (West Lobe Sheen) */}
			<path
				d={TOOTH46_GEOMETRY.mesialSulcusLobeWest}
				fill="none"
				stroke="url(#dente-ridge-highlight)"
				strokeWidth="1.4"
				strokeOpacity="0.45"
				clipPath="url(#tooth46-root-clip)"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Smooth Anatomical Bifurcation Ambient Shadow (Clipped to roots) */}
			<path
				d={TOOTH46_GEOMETRY.bifurcationShadowPath}
				fill="url(#dente-furcation-shadow)"
				clipPath="url(#tooth46-root-clip)"
				pointerEvents="none"
			/>

			{/* Mesial and Distal Sulcus Longitudinalis */}
			{showGrooves && (
				<g id="tooth46-root-grooves" clipPath="url(#tooth46-root-clip)">
					{/* Deep mesial sulcus shadow trough (creates double-lobed 3D volume) */}
					<path
						d={TOOTH46_GEOMETRY.mesialLongitudinalGroove}
						fill="none"
						stroke="url(#dente-root-sulcus-shadow)"
						strokeWidth="2.4"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH46_GEOMETRY.mesialLongitudinalGroove}
						fill="none"
						stroke={grooveColor}
						strokeWidth="0.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Distal root longitudinal furrow */}
					<path
						d={TOOTH46_GEOMETRY.distalLongitudinalGroove}
						fill="none"
						stroke="url(#dente-root-sulcus-shadow)"
						strokeWidth="1.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH46_GEOMETRY.distalLongitudinalGroove}
						fill="none"
						stroke={grooveColor}
						strokeWidth="0.7"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

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
