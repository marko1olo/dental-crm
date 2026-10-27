import React from "react";
import { TOOTH16_GEOMETRY } from "./tooth16Geometry";

export interface Tooth16RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth16Roots: React.FC<Tooth16RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const geo = TOOTH16_GEOMETRY;
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const grooveStroke = isDark ? "rgba(100, 116, 139, 0.40)" : "rgba(100, 116, 139, 0.25)";

	return (
		<g id="tooth16-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth16-root-clip">
				<path d={geo.rootMonolithPath} />
			</clipPath>

			{/* Monolithic 3-Root Silhouette */}
			<path
				id="tooth16-root-monolith"
				d={geo.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Palatal Root central columnar volume projection */}
			<path
				id="tooth16-palatal-root"
				d={geo.palatalRootBody}
				fill="url(#dente-root-dentin)"
				opacity="0.9"
			/>

			{/* Trifurcation ambient occlusion shadow */}
			<path
				id="tooth16-trifurcation-shadow"
				d={geo.trifurcationShadowPath}
				fill="url(#dente-furcation-shadow)"
				clipPath="url(#tooth16-root-clip)"
			/>

			{/* Cylindrical Volume Shading */}
			<g clipPath="url(#tooth16-root-clip)">
				<path
					d={geo.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* Developmental grooves & longitudinal sulci */}
			{showGrooves && (
				<g id="tooth16-root-grooves">
					<path d="M 21,22 C 19,36 18,52 17,68" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="2,1.5" fill="none" />
					<path d="M 79,24 C 80,38 81,54 81,68" stroke={grooveStroke} strokeWidth="0.7" strokeDasharray="2,1.5" fill="none" />
					<path d="M 50,14 C 50,30 50,46 50,62" stroke={grooveStroke} strokeWidth="0.6" strokeDasharray="2,1.5" fill="none" />
				</g>
			)}

			{/* Cervical line (CEJ) */}
			{showCej && (
				<path
					id="tooth16-cej-line"
					d={geo.cejCurve}
					stroke={strokeColor}
					strokeWidth="0.9"
					strokeLinecap="round"
					fill="none"
				/>
			)}
		</g>
	);
};
