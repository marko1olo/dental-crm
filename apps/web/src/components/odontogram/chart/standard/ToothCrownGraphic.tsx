import type React from "react";
import type { RestorativeMaterialKey } from "../../anatomicalToothGeometries";
import type { ToothState } from "../toothChartTypes";
import type { ToothVisualProps } from "../ToothColors";

export interface ToothCrownGraphicProps {
	geom: any;
	state: ToothState;
	colors: ToothVisualProps;
	material?: RestorativeMaterialKey | undefined;
	isTop: boolean;
	cfg: { viewX: number; viewWidth: number };
}

export const ToothCrownGraphic: React.FC<ToothCrownGraphicProps> = ({
	geom, state, colors, material, isTop, cfg,
}) => {
	const cejD = isTop ? "M 25 85 Q 50 82 75 85" : "M 25 75 Q 50 78 75 75";
	const collarD = isTop ? "M 22 85 Q 50 82 78 85 Q 50 88 22 85" : "M 22 75 Q 50 78 78 75 Q 50 72 22 75";
	const sheenD = isTop ? "M 32 135 Q 50 145 68 135" : "M 32 30 Q 50 20 68 30";

	return (
		<>
			{/* Crown Anatomical Contour */}
			{state !== "Root" && (
				<path
					d={geom.crown}
					fill={colors.crownFill}
					fillOpacity={colors.opacity}
					stroke={colors.stroke}
					strokeWidth={colors.isMissing ? "1.4" : "2.2"}
					strokeDasharray={state === "Retained" ? "3 2" : colors.isMissing ? "4 3" : undefined}
					strokeLinejoin="round"
					className="tooth-crown-path"
				/>
			)}
			{state === "Root" && (
				<g className="tooth-root-stump-layer">
					<path d={cejD} fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
				</g>
			)}

			{/* Photopolymer composite resin surface stipple texture */}
			{state === "Filled" && material === "composite" && (
				<path d={geom.crown} fill="url(#composite-resin-pattern)" opacity="0.4" pointerEvents="none" />
			)}

			{/* Cementoenamel Junction / Cervical Margin Accent */}
			{!colors.isMissing && (
				<path d={cejD} fill="none" stroke="rgba(100, 116, 139, 0.4)" strokeWidth="1" strokeLinecap="round" />
			)}

			{/* Crown Cervical Collar Ring */}
			{state === "Crown" && (
				<path d={collarD} fill={colors.collarFill ?? "url(#dente-cervical-collar)"} stroke="#334155" strokeWidth="1.2" />
			)}

			{/* Natural Enamel Specular Highlight Sheen */}
			{!colors.isMissing && state !== "Crown" && (
				<path d={sheenD} fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
			)}

			{/* Occlusal Fissures */}
			{geom.fissures && state !== "Crown" && !colors.isMissing && (
				<path d={geom.fissures} fill="none" stroke={state === "Caries" ? "#7f1d1d" : "rgba(15, 23, 42, 0.35)"} strokeWidth="1" strokeLinecap="round" />
			)}

			{/* Missing Tooth Ghost Diagonal X */}
			{colors.isMissing && (
				<g className="missing-tooth-cross" opacity="0.95">
					<line x1={cfg.viewX + 6} y1="8" x2={cfg.viewX + cfg.viewWidth - 6} y2="152" stroke="#ef4444" strokeWidth="3.2" strokeLinecap="round" />
					<line x1={cfg.viewX + cfg.viewWidth - 6} y1="8" x2={cfg.viewX + 6} y2="152" stroke="#ef4444" strokeWidth="3.2" strokeLinecap="round" />
				</g>
			)}
		</>
	);
};
