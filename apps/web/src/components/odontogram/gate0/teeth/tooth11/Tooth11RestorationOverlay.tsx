import React from "react";
import { TOOTH11_RESTORATION_GEOMETRY } from "./tooth11RestorationGeometry";

export interface Tooth11RestorationOverlayProps {
	showPost?: boolean | undefined;
	showCore?: boolean | undefined;
	showCrown?: boolean | undefined;
	showComposite?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Orthopedic Restoration Overlay for Upper Central Incisor 11.
 * Monolithic zirconia crown with Chamfer shoulder + Ferrule 2mm + Straight post.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11RestorationOverlay: React.FC<Tooth11RestorationOverlayProps> = ({
	showPost = true,
	showCore = true,
	showCrown = true,
	showComposite = false,
	isDark = false,
	className,
}) => {
	const r = TOOTH11_RESTORATION_GEOMETRY;
	const strokeColor = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(51, 65, 85, 0.60)";

	return (
		<g id="tooth11-restoration-overlay" {...(className ? { className } : {})}>
			{/* 0. Light-Cured Composite Filling (Class IV / Proximal) */}
			{showComposite && (
				<g id="tooth11-composite-filling">
					<path
						d="M 58,140 C 65,140 73,143 74,152 L 62,152 C 58,148 58,142 58,140 Z"
						fill={isDark ? "url(#dente-composite-filling-dark)" : "url(#dente-composite-filling)"}
						stroke="rgba(130, 95, 55, 0.65)"
						strokeWidth="0.6"
					/>
				</g>
			)}
			{/* 1. Endodontic Fiber/Cast Post in Central Canal */}
			{showPost && (
				<g id="tooth11-endo-post">
					<path
						d={r.centralPostPath}
						fill="url(#dente-fiber-post-11)"
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
				<g id="tooth11-ferrule-and-core">
					<path d={r.ferruleCollarPath} fill={isDark ? "#334155" : "#e2e8f0"} stroke={strokeColor} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<path d={r.coreBuildUpPath} fill="url(#dente-composite-core)" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}

			{/* 3. Monolithic Translucent Zirconia Crown */}
			{showCrown && (
				<g id="tooth11-zirconia-crown">
					<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-zirconia-crown-11-dark)" : "url(#dente-zirconia-crown-11)"} stroke={strokeColor} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<g clipPath="url(#tooth11-crown-clip)">
						<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"} vectorEffect="non-scaling-stroke" />
						<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-zirconia-glaze-dark)" : "url(#dente-zirconia-glaze)"} opacity={0.65} pointerEvents="none" />
					</g>
					{/* Circular Chamfer Preparation Finish Line */}
					<path d={r.ferruleCollarPath} fill="url(#dente-zirconia-chamfer)" opacity={isDark ? "0.60" : "0.75"} stroke="none" vectorEffect="non-scaling-stroke" />
					{/* Incisal Edge Delicate Highlight Refraction */}
					<path d="M 26.0,150.5 C 34.0,152.0 44.0,152.0 50.0,152.0 C 60.0,152.0 68.0,152.2 74.0,152.5" fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.75)"} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}
		</g>
	);
};
