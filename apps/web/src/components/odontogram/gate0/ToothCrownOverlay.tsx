import React from "react";
import {
	getCrownFill,
	getCrownFissureStroke,
	getCrownStroke,
	getCuspSlopeColors,
	getGlazeStroke,
} from "./Tooth46CrownMaps";
import { scopeOdontogramId, useOdontogramIdPrefix } from "./OdontogramSharedDefsContext";
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
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const stroke = getCrownStroke(material, isDark);
	const fissureColor = getCrownFissureStroke(material, isDark);
	const glazeStroke = getGlazeStroke(material);
	const slopes = getCuspSlopeColors(material);
	const highlightFill = material === "emax" ? `url(#${sid("dente-emax-opalescent")})` : slopes.highlight;

	return (
		<g
			id={sid(`tooth${toothId}-crown-overlay`)}
			data-testid={`tooth${toothId}-crown`}
			data-crown-material={material}
			data-crown-condition={condition}
			data-implant-crown={isImplant ? "true" : undefined}
			className={className}
		>
			<clipPath id={sid(`tooth${toothId}-overlay-crown-clip`)}>
				<path d={crownPath} />
			</clipPath>
			<path
				id={sid(`tooth${toothId}-crown-shell`)}
				d={crownPath}
				fill={getCrownFill(material, prefix)}
				fillOpacity={translucent ? "0.62" : undefined}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath={`url(#${sid(`tooth${toothId}-overlay-crown-clip`)})`}>
				<path
					d={crownPath}
					fill={`url(#${sid(isDark ? "dente-proximal-contour-dark" : "dente-proximal-contour")})`}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{material === "pfm" && cervicalShoulderPath && (
				<path d={cervicalShoulderPath} fill={`url(#${sid("dente-pfm-metal-collar")})`} stroke="none" />
			)}
			{(material === "zirconia" || material === "emax") && cervicalShoulderPath && (
				<path d={cervicalShoulderPath} fill={`url(#${sid("dente-zirconia-chamfer")})`} stroke="none" />
			)}
			{Array.isArray(cuspSlopes) && cuspSlopes.map((s) => (
				<path key={`sl-${s.id}`} d={s.d} fill={s.type === "highlight" ? highlightFill : slopes.shadow} stroke="none" />
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
