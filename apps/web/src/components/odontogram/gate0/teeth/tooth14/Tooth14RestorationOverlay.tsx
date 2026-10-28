import React from "react";
import { TOOTH14_RESTORATION_GEOMETRY } from "./tooth14RestorationGeometry";

export interface Tooth14RestorationOverlayProps {
	showPost?: boolean | undefined;
	showCore?: boolean | undefined;
	showCrown?: boolean | undefined;
	showComposite?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Orthopedic Restoration Overlay for Upper First Premolar 14.
 * Monolithic zirconia crown + Ferrule + Post in straighter Palatal canal.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14RestorationOverlay: React.FC<Tooth14RestorationOverlayProps> = ({
	showPost = true,
	showCore = true,
	showCrown = true,
	showComposite = false,
	isDark = false,
	className,
}) => {
	const r = TOOTH14_RESTORATION_GEOMETRY;
	const strokeColor = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(51, 65, 85, 0.60)";

	return (
		<g id="tooth14-restoration-overlay" {...(className ? { className } : {})}>
			{/* 0. Light-Cured Composite Filling */}
			{showComposite && (
				<g id="tooth14-composite-filling">
					<path
						d="M 38,142 C 44,137 56,137 62,142 C 59,148 41,148 38,142 Z"
						fill={isDark ? "url(#dente-composite-filling-dark)" : "url(#dente-composite-filling)"}
						stroke="rgba(130, 95, 55, 0.65)"
						strokeWidth="0.6"
					/>
				</g>
			)}
			{/* 1. Endodontic Fiber/Cast Post in Palatal Canal */}
			{showPost && (
				<g id="tooth14-endo-post">
					<path
						d={r.palatalFiberPostPath}
						fill="url(#dente-fiber-post-14)"
						stroke="#64748b"
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					{r.postSerrations.map((s) => (
						<line
							key={s.y}
							x1={s.x1}
							y1={s.y}
							x2={s.x2}
							y2={s.y}
							stroke="#94a3b8"
							strokeWidth="0.5"
							vectorEffect="non-scaling-stroke"
						/>
					))}
				</g>
			)}

			{/* 2. Ferrule Collar & Chamfer Finish Line */}
			{showCore && (
				<g id="tooth14-ferrule-and-core">
					<path
						d={r.ferruleCollarPath}
						fill={isDark ? "#334155" : "#e2e8f0"}
						stroke={strokeColor}
						strokeWidth="0.7"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={r.coreBuildUpPath}
						fill="url(#dente-composite-core)"
						stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(180, 83, 9, 0.85)"}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* 3. Monolithic Translucent Zirconia Crown */}
			{showCrown && (
				<g id="tooth14-zirconia-crown">
					<path
						d={r.zirconiaCrownPath}
						fill={isDark ? "url(#dente-zirconia-crown-14-dark)" : "url(#dente-zirconia-crown-14)"}
						stroke={strokeColor}
						strokeWidth="0.8"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={r.zirconiaCrownPath}
						fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
						vectorEffect="non-scaling-stroke"
						pointerEvents="none"
					/>
					<path
						d={r.zirconiaCrownPath}
						fill={isDark ? "url(#dente-zirconia-glaze-dark)" : "url(#dente-zirconia-glaze)"}
						opacity={0.70}
						pointerEvents="none"
					/>
				</g>
			)}
		</g>
	);
};
