import type React from "react";
import {
	CROWN_FILL_MAP,
	getCrownFissureStroke,
	getCrownStroke,
	getCuspSlopeColors,
	getGlazeStroke,
} from "./Tooth46CrownMaps";
import type { CrownMaterial, RestorationCondition } from "./tooth46Types";

export interface ToothCrownOverlayProps {
	toothId: string;
	crownPath: string;
	cervicalShoulderPath?: string | undefined;
	fissures?: readonly { id: string; d: string }[] | undefined;
	cuspSlopes?: readonly { id: string; d: string; type: "highlight" | "shadow" }[] | undefined;
	specularRidges?: readonly { id: string; d: string }[] | undefined;
	equatorHighlight?: string | undefined;
	material?: CrownMaterial | undefined;
	condition?: RestorationCondition | undefined;
	translucent?: boolean | undefined;
	isDark?: boolean | undefined;
	isImplant?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Universal anatomical orthopedic crown overlay (Mandate 8b <= 120 lines).
 */
export const ToothCrownOverlay: React.FC<ToothCrownOverlayProps> = ({
	toothId,
	crownPath,
	cervicalShoulderPath,
	fissures,
	cuspSlopes,
	specularRidges,
	equatorHighlight,
	material = "zirconia",
	condition = "adequate",
	translucent = false,
	isDark = false,
	isImplant = false,
	className,
}) => {
	const stroke = getCrownStroke(material, isDark);
	const fissureColor = getCrownFissureStroke(material, isDark);
	const glazeStroke = getGlazeStroke(material);
	const slopes = getCuspSlopeColors(material);

	return (
		<g
			id={`tooth${toothId}-crown-overlay`}
			data-testid={`tooth${toothId}-crown`}
			data-crown-material={material}
			data-crown-condition={condition}
			data-implant-crown={isImplant ? "true" : undefined}
			className={className}
		>
			<clipPath id={`tooth${toothId}-crown-clip`}>
				<path d={crownPath} />
			</clipPath>
			<path
				id={`tooth${toothId}-crown-shell`}
				d={crownPath}
				fill={CROWN_FILL_MAP[material]}
				fillOpacity={translucent ? "0.62" : undefined}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath={`url(#tooth${toothId}-crown-clip)`}>
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{material === "pfm" && cervicalShoulderPath && (
				<path d={cervicalShoulderPath} fill="url(#dente-pfm-metal-collar)" stroke="none" />
			)}
			{(material === "zirconia" || material === "emax") && cervicalShoulderPath && (
				<path d={cervicalShoulderPath} fill="url(#dente-zirconia-chamfer)" stroke="none" />
			)}
			{Array.isArray(cuspSlopes) && cuspSlopes.map((s) => (
				<path key={`sl-${s.id}`} d={s.d} fill={s.type === "highlight" ? slopes.highlight : slopes.shadow} stroke="none" />
			))}
			{Array.isArray(fissures) && fissures.map((f) => (
				<path key={`fs-${f.id}`} d={f.d} fill="none" stroke={fissureColor} strokeWidth="0.55" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
			))}
			{material !== "pmma" && Array.isArray(specularRidges) && specularRidges.map((g) => (
				<path key={`gz-${g.id}`} d={g.d} fill="none" stroke={glazeStroke} strokeWidth="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={material === "emax" ? "0.95" : "0.85"} />
			))}
			{equatorHighlight && (
				<path d={equatorHighlight} fill="none" stroke={glazeStroke} strokeWidth="0.6" opacity="0.35" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
			)}
		</g>
	);
};
