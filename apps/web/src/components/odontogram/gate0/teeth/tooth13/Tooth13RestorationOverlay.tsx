import React from "react";
import { TOOTH13_RESTORATION_GEOMETRY } from "./tooth13RestorationGeometry";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth13RestorationOverlayProps {
	showPost?: boolean | undefined;
	showCore?: boolean | undefined;
	showCrown?: boolean | undefined;
	showComposite?: boolean | undefined;
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
	showComposite = false,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 13;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const r = TOOTH13_RESTORATION_GEOMETRY;
	const strokeColor = isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(51, 65, 85, 0.60)";

	return (
		<g id={sid(`tooth${tNum}-restoration-overlay`)} {...(className ? { className } : {})}>
			{/* 0. Light-Cured Composite Filling (Class III / Proximal) */}
			{showComposite && (
				<g id={sid(`tooth${tNum}-composite-filling`)}>
					<path
						d="M 40,142 C 45,138 55,138 60,142 C 58,148 42,148 40,142 Z"
						fill={`url(#${sid(isDark ? "dente-composite-filling-dark" : "dente-composite-filling")})`}
						stroke="rgba(130, 95, 55, 0.65)"
						strokeWidth="0.6"
					/>
				</g>
			)}
			{/* 1. Endodontic Fiber/Cast Post in Deep Canine Canal */}
			{showPost && (
				<g id={sid(`tooth${tNum}-endo-post`)}>
					<path
						d={r.caninePostPath}
						fill={`url(#${sid(`dente-fiber-post-${tNum}`)})`}
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
				<g id={sid(`tooth${tNum}-ferrule-and-core`)}>
					<path d={r.ferruleCollarPath} fill={isDark ? "#334155" : "#e2e8f0"} stroke={strokeColor} strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<path d={r.coreBuildUpPath} fill={`url(#${sid("dente-composite-core")})`} stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(180, 83, 9, 0.85)"} strokeWidth="0.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}

			{/* 3. Monolithic Translucent Zirconia Crown */}
			{showCrown && (
				<g id={sid(`tooth${tNum}-zirconia-crown`)}>
					<path d={r.zirconiaCrownPath} fill={`url(#${sid(isDark ? `dente-zirconia-crown-${tNum}-dark` : `dente-zirconia-crown-${tNum}`)})`} stroke={strokeColor} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
					<g clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}>
						<path d={r.zirconiaCrownPath} fill={`url(#${sid(isDark ? "dente-proximal-contour-dark" : "dente-proximal-contour")})`} vectorEffect="non-scaling-stroke" />
						<path d={r.zirconiaCrownPath} fill={`url(#${sid(isDark ? "dente-zirconia-glaze-dark" : "dente-zirconia-glaze")})`} opacity={0.65} pointerEvents="none" />
					</g>
					{/* Circular Chamfer Preparation Finish Line */}
					<path d={r.ferruleCollarPath} fill={`url(#${sid("dente-zirconia-chamfer")})`} opacity={isDark ? "0.60" : "0.75"} stroke="none" vectorEffect="non-scaling-stroke" />
					{/* Canine Cusp Slopes & Ridge Highlight */}
					<path d="M 28.0,134.5 C 35.0,142.5 43.0,149.0 51.5,152.5 C 59.5,148.5 66.0,143.0 72.0,137.5" fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.75)"} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path d="M 51.5,152.0 C 51.2,138.0 50.8,124.0 50.5,112.0" fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.65)"} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</g>
			)}
		</g>
	);
};
