import React from "react";
import { TOOTH12_RESTORATION_GEOMETRY } from "./tooth12RestorationGeometry";

export interface Tooth12RestorationOverlayProps {
	showPost?: boolean | undefined;
	showCore?: boolean | undefined;
	showCrown?: boolean | undefined;
	showComposite?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Orthopedic Restoration Overlay for Upper Lateral Incisor 12.
 * Monolithic zirconia crown with Chamfer shoulder + Ferrule 2mm + Slender curved post.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth12RestorationOverlay: React.FC<Tooth12RestorationOverlayProps> = ({
	showPost = true,
	showCore = true,
	showCrown = true,
	showComposite = false,
	isDark = false,
	className,
}) => {
	const r = TOOTH12_RESTORATION_GEOMETRY;
	const strokeColor = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(51, 65, 85, 0.60)";

	return (
		<g id="tooth12-restoration-overlay" {...(className ? { className } : {})}>
			{/* 0. Light-Cured Composite Filling (Class IV / Proximal) */}
			{showComposite && (
				<g id="tooth12-composite-filling">
					<path
						d="M 56,138 C 62,138 70,141 71,150 L 59,150 C 56,146 56,140 56,138 Z"
						fill={isDark ? "url(#dente-composite-filling-dark)" : "url(#dente-composite-filling)"}
						stroke="rgba(130, 95, 55, 0.65)"
						strokeWidth="0.6"
					/>
				</g>
			)}
			{/* 1. Endodontic Fiber/Cast Post in Lateral Canal */}
			{showPost && (
				<g id="tooth12-endo-post">
					<path
						d={r.lateralPostPath}
						fill="url(#dente-fiber-post-12)"
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
				<g id="tooth12-ferrule-and-core">
					<path d={r.ferruleCollarPath} fill={isDark ? "#334155" : "#e2e8f0"} stroke={strokeColor} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<path d={r.coreBuildUpPath} fill="url(#dente-composite-core)" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}

			{/* 3. Monolithic Translucent Zirconia Crown */}
			{showCrown && (
				<g id="tooth12-zirconia-crown">
					<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-zirconia-crown-12-dark)" : "url(#dente-zirconia-crown-12)"} stroke={strokeColor} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<g clipPath="url(#tooth12-crown-clip)">
						<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"} vectorEffect="non-scaling-stroke" />
						<path d={r.zirconiaCrownPath} fill={isDark ? "url(#dente-zirconia-glaze-dark)" : "url(#dente-zirconia-glaze)"} opacity={0.65} pointerEvents="none" />
					</g>
					{/* Circular Chamfer Preparation Finish Line */}
					<path d={r.ferruleCollarPath} fill="url(#dente-zirconia-chamfer)" opacity={isDark ? "0.60" : "0.75"} stroke="none" vectorEffect="non-scaling-stroke" />
					{/* Incisal Edge Delicate Highlight Refraction */}
					<path d="M 30.0,146.5 C 35.0,148.5 45.0,150.0 50.0,150.0 C 58.0,150.5 65.0,150.5 70.0,150.5" fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.75)"} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}
		</g>
	);
};
