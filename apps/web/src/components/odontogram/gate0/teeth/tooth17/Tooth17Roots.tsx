import React from "react";
import { TOOTH17_GEOMETRY } from "./tooth17Geometry";

export interface Tooth17RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth17Roots: React.FC<Tooth17RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const geo = TOOTH17_GEOMETRY;
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const grooveStroke = isDark ? "rgba(100, 116, 139, 0.40)" : "rgba(100, 116, 139, 0.25)";

	return (
		<g id="tooth17-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth17-root-clip">
				<path d={geo.rootMonolithPath} />
			</clipPath>

			{/* Monolithic 3-Root Parallel Silhouette */}
			<path
				id="tooth17-root-monolith"
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
				id="tooth17-palatal-root"
				d={geo.palatalRootBody}
				fill="url(#dente-root-dentin)"
				opacity="0.9"
			/>

			{/* Deep Trifurcation ambient occlusion shadow */}
			<path
				id="tooth17-trifurcation-shadow"
				d={geo.trifurcationShadowPath}
				fill="url(#dente-furcation-shadow)"
				clipPath="url(#tooth17-root-clip)"
			/>

			{/* Cylindrical Volume Shading */}
			<g clipPath="url(#tooth17-root-clip)">
				<path
					d={geo.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* Developmental grooves & longitudinal sulci */}
			{showGrooves && (
				<g id="tooth17-root-grooves">
					<path d="M 25,20 C 27,38 30,62 33,78" stroke={grooveStroke} strokeWidth="0.7" strokeDasharray="2,1.5" fill="none" />
					<path d="M 75,22 C 73,40 70,62 67,78" stroke={grooveStroke} strokeWidth="0.7" strokeDasharray="2,1.5" fill="none" />
					<path d="M 50,10 C 50,30 50,56 50,72" stroke={grooveStroke} strokeWidth="0.6" strokeDasharray="2,1.5" fill="none" />
				</g>
			)}

			{/* Cervical line (CEJ) */}
			{showCej && (
				<path
					id="tooth17-cej-line"
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
