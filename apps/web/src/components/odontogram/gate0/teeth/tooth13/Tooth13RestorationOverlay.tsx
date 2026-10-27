import React from "react";
import { TOOTH13_RESTORATION_GEOMETRY } from "./tooth13RestorationGeometry";

export interface Tooth13RestorationOverlayProps {
	showPost?: boolean | undefined;
	showCore?: boolean | undefined;
	showCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Orthopedic Restoration Overlay for Upper Canine 13.
 * Monolithic zirconia crown with Chamfer shoulder + Ferrule 2mm + Deep canine post.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13RestorationOverlay: React.FC<Tooth13RestorationOverlayProps> = ({
	showPost = true,
	showCore = true,
	showCrown = true,
	isDark = false,
	className,
}) => {
	const r = TOOTH13_RESTORATION_GEOMETRY;
	const strokeColor = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(51, 65, 85, 0.60)";

	return (
		<g id="tooth13-restoration-overlay" {...(className ? { className } : {})}>
			{/* 1. Endodontic Fiber/Cast Post in Deep Canine Canal */}
			{showPost && (
				<g id="tooth13-endo-post">
					<path
						d={r.caninePostPath}
						fill="url(#dente-fiber-post-13)"
						stroke="#64748b"
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					{r.postSerrations.map((s) => (
						<line key={s.y} x1={s.x1} y1={s.y} x2={s.x2} y2={s.y} stroke="#94a3b8" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
					))}
				</g>
			)}

			{/* 2. Ferrule Collar & Core Build-up */}
			{showCore && (
				<g id="tooth13-ferrule-and-core">
					<path d={r.ferruleCollarPath} fill={isDark ? "#334155" : "#e2e8f0"} stroke={strokeColor} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<path d={r.coreBuildUpPath} fill="url(#dente-composite-core)" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}

			{/* 3. Monolithic Translucent Zirconia Crown */}
			{showCrown && (
				<g id="tooth13-zirconia-crown">
					<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-zirconia-crown-13-dark)" : "url(#dente-zirconia-crown-13)"} stroke={strokeColor} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<g clipPath="url(#tooth13-crown-clip)">
						<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"} vectorEffect="non-scaling-stroke" />
						<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-zirconia-glaze-dark)" : "url(#dente-zirconia-glaze)"} opacity={0.65} pointerEvents="none" />
					</g>
					{/* Circular Chamfer Preparation Finish Line */}
					<path d={r.ferruleCollarPath} fill="url(#dente-zirconia-chamfer)" opacity={isDark ? "0.60" : "0.75"} stroke="none" vectorEffect="non-scaling-stroke" />
					{/* Canine Cusp Slopes & Ridge Highlight */}
					<path d="M 28.0,134.5 C 35.0,142.5 43.0,149.0 51.5,152.5 C 59.5,148.5 66.0,143.0 72.0,137.5" fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.75)"} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path d="M 51.5,152.0 C 51.2,138.0 50.8,124.0 50.5,112.0" fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.65)"} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}
		</g>
	);
};
