import type React from "react";
import {
	CROWN_FILL_MAP,
	DENTE_SHADER_IDS,
	getCrownFissureStroke,
	getCrownStroke,
} from "../defs/shaderConstants";
import type { CrownMaterialOverlayProps } from "../types/crownTypes";
import { CrownDefectsOverlay } from "./CrownDefectsOverlay";

/**
 * Universal Orthopedic Crown Material Overlay for 32 Teeth.
 * Renders 6 clinical materials (ZrO2, PFM, E-Max, Gold, Co-Cr, PMMA) in
 * both sound/adequate and defective/failed states.
 * Mandate 8b <= 120 lines.
 */
export const CrownMaterialOverlay: React.FC<CrownMaterialOverlayProps> = ({
	material = "zirconia",
	condition = "adequate",
	geometry,
	isDark = false,
	className,
}) => {
	const stroke = getCrownStroke(material, isDark);
	const fissureColor = getCrownFissureStroke(material, isDark);
	const s = DENTE_SHADER_IDS;
	const isEmax = material === "emax";
	const glazeFill =
		material === "gold"
			? `url(#${s.goldSpecular})`
			: material === "metal"
				? `url(#${s.metalSheen})`
				: `url(#${s.zirconiaGlaze})`;

	return (
		<g
			id="dente-crown-material-overlay"
			data-crown-material={material}
			data-crown-condition={condition}
			className={className}
		>
			<path
				d={geometry.crownShellPath}
				fill={CROWN_FILL_MAP[material]}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={geometry.crownShellPath}
				fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
				vectorEffect="non-scaling-stroke"
				pointerEvents="none"
			/>
			{material === "pfm" && geometry.pfmCollarPath && (
				<path
					d={geometry.pfmCollarPath}
					fill={`url(#${s.pfmMetalCollar})`}
					stroke="none"
				/>
			)}
			{(material === "zirconia" || isEmax) && geometry.cervicalShoulderPath && (
				<path
					d={geometry.cervicalShoulderPath}
					fill={`url(#${s.zirconiaChamfer})`}
					stroke="none"
				/>
			)}
			{geometry.triangularRidges?.map((tr) => (
				<path
					key={`tr-${tr.id}`}
					d={tr.d}
					fill={
						isEmax ? `url(#${s.emaxOpalescent})` : "rgba(255, 255, 255, 0.15)"
					}
					stroke="none"
				/>
			))}
			{geometry.milledFissures?.map((f) => (
				<path
					key={`mf-${f.id}`}
					d={f.d}
					fill="none"
					stroke={fissureColor}
					strokeWidth="0.55"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}
			{material !== "pmma" &&
				geometry.specularHigh?.map((g) => (
					<ellipse
						key={`glaze-${g.id}`}
						cx={g.cx}
						cy={g.cy}
						rx={g.rx}
						ry={g.ry}
						transform={`rotate(${g.angle} ${g.cx} ${g.cy})`}
						fill={glazeFill}
						opacity={isEmax ? "0.95" : "0.85"}
					/>
				))}
			{condition === "defective" && (
				<CrownDefectsOverlay
					defects={geometry.defects}
					material={material}
					isDark={isDark}
				/>
			)}
		</g>
	);
};
