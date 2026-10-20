import type React from "react";
import { DenteGlobalShaderDefs } from "../../shared/defs/DenteGlobalShaderDefs";
import { ApicalHaloOverlay } from "../../shared/overlays/ApicalHaloOverlay";
import { CrownMaterialOverlay } from "../../shared/overlays/CrownMaterialOverlay";
import { ImplantSlaOverlay } from "../../shared/overlays/ImplantSlaOverlay";
import type { UpperIncisorContainerProps, UpperIncisorLayerFlags } from "../types/upperIncisorTypes";
import { Tooth11Crown } from "./Tooth11Crown";
import { Tooth11EndoCanal } from "./Tooth11EndoCanal";
import { Tooth11Root } from "./Tooth11Root";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";
import { UpperIncisorOverlays } from "./UpperIncisorOverlays";

const DEFAULT_LAYERS: UpperIncisorLayerFlags = {
	roots: true, crown: true, cingulum: true, marginalRidges: true,
	lingualFossa: true, developmentalLobes: true, cej: true, grooves: true,
};

const IMPLANT_GEO_11 = {
	fixtureBodyPath: "M 36,96 L 42,24 C 44,16 56,16 58,24 L 64,96 Z",
	collarPath: "M 33,96 L 67,96 L 65,102 L 35,102 Z",
	abutmentPath: "M 38,102 L 62,102 L 58,124 L 42,124 Z",
	threads: ["M 38,36 L 62,38", "M 37,50 L 63,52", "M 36,64 L 64,66", "M 35,78 L 65,80"],
};

/**
 * DENTE Dental CRM — Maxillary Central Incisor (FDI 11 / 21) Sculpture Container
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth11Container: React.FC<UpperIncisorContainerProps> = ({
	toothNumber = 11,
	isDark = false,
	zoom = 1,
	layers = DEFAULT_LAYERS,
	className,
	style,
}) => {
	const a = { ...DEFAULT_LAYERS, ...layers };
	const isFlipped = toothNumber === 21;
	const g = TOOTH11_GEOMETRY;

	return (
		<svg
			viewBox={g.viewBox}
			width={100 * zoom}
			height={160 * zoom}
			className={className}
			style={{ display: "block", ...style }}
			aria-label={`Анатомический верхний центральный резец ${toothNumber}`}
			role="img"
		>
			<DenteGlobalShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				{a.periapicalHalo && <ApicalHaloOverlay apices={[g.periapicalAnchor]} isDark={isDark} />}
				{a.roots && !a.implant && (
					<Tooth11Root isDark={isDark} showCej={a.cej ?? true} showGroove={a.grooves ?? true} />
				)}
				{a.implant && <ImplantSlaOverlay geometry={IMPLANT_GEO_11} isDark={isDark} />}
				{a.crown && !a.zirconiaCrown && (
					<Tooth11Crown
						isDark={isDark}
						showLobes={a.developmentalLobes ?? true}
						showCingulum={a.cingulum ?? true}
						showMarginalRidges={a.marginalRidges ?? true}
						showFossa={a.lingualFossa ?? true}
					/>
				)}
				{a.zirconiaCrown && (
					<CrownMaterialOverlay
						material={a.crownMaterial ?? "zirconia"}
						condition={a.crownCondition ?? "adequate"}
						geometry={{ crownShellPath: g.crownMonolithPath }}
						isDark={isDark}
					/>
				)}
				{(a.canal || a.pulp || a.guttaPercha) && !a.implant && (
					<Tooth11EndoCanal
						showPulp={Boolean(a.pulp)}
						showCanal={Boolean(a.canal)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						isDark={isDark}
					/>
				)}
				<UpperIncisorOverlays
					layers={a}
					overlays={g.overlays}
					crownMonolithPath={g.crownMonolithPath}
					rootMonolithPath={g.rootMonolithPath}
					isDark={isDark}
				/>
			</g>
		</svg>
	);
};
