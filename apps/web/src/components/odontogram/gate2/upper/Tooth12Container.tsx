import type React from "react";
import { DenteGlobalShaderDefs } from "../../shared/defs/DenteGlobalShaderDefs";
import { ApicalHaloOverlay } from "../../shared/overlays/ApicalHaloOverlay";
import { CrownMaterialOverlay } from "../../shared/overlays/CrownMaterialOverlay";
import { ImplantSlaOverlay } from "../../shared/overlays/ImplantSlaOverlay";
import type { UpperIncisorContainerProps, UpperIncisorLayerFlags } from "../types/upperIncisorTypes";
import { Tooth12Crown } from "./Tooth12Crown";
import { Tooth12EndoCanal } from "./Tooth12EndoCanal";
import { Tooth12Root } from "./Tooth12Root";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";
import { UpperIncisorOverlays } from "./UpperIncisorOverlays";

const DEFAULT_LAYERS: UpperIncisorLayerFlags = {
	roots: true, crown: true, cingulum: true, marginalRidges: true,
	lingualFossa: true, developmentalLobes: true, palatoradicularGroove: true,
	cej: true, grooves: true,
};

const IMPLANT_GEO_12 = {
	fixtureBodyPath: "M 38,96 L 43,24 C 45,16 55,16 57,24 L 62,96 Z",
	collarPath: "M 36,96 L 64,96 L 62,102 L 38,102 Z",
	abutmentPath: "M 40,102 L 60,102 L 56,122 L 44,122 Z",
	threads: ["M 40,36 L 60,38", "M 39,50 L 61,52", "M 38,64 L 62,66", "M 37,78 L 63,80"],
};

/**
 * DENTE Dental CRM — Maxillary Lateral Incisor (FDI 12 / 22) Sculpture Container
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth12Container: React.FC<UpperIncisorContainerProps> = ({
	toothNumber = 12,
	isDark = false,
	zoom = 1,
	layers = DEFAULT_LAYERS,
	className,
	style,
}) => {
	const a = { ...DEFAULT_LAYERS, ...layers };
	const isFlipped = toothNumber === 22;
	const g = TOOTH12_GEOMETRY;

	return (
		<svg
			viewBox={g.viewBox}
			width={100 * zoom}
			height={160 * zoom}
			className={className}
			style={{ display: "block", ...style }}
			aria-label={`Анатомический верхний латеральный резец ${toothNumber}`}
			role="img"
		>
			<DenteGlobalShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				{a.periapicalHalo && <ApicalHaloOverlay apices={[g.periapicalAnchor]} isDark={isDark} />}
				{a.roots && !a.implant && (
					<Tooth12Root isDark={isDark} showCej={a.cej ?? true} showGroove={a.grooves ?? true} />
				)}
				{a.implant && <ImplantSlaOverlay geometry={IMPLANT_GEO_12} isDark={isDark} />}
				{a.crown && !a.zirconiaCrown && (
					<Tooth12Crown
						isDark={isDark}
						showLobes={a.developmentalLobes ?? true}
						showCingulum={a.cingulum ?? true}
						showMarginalRidges={a.marginalRidges ?? true}
						showFossa={a.lingualFossa ?? true}
						showGroove={a.palatoradicularGroove ?? true}
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
					<Tooth12EndoCanal
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
