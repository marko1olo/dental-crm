import type React from "react";
import { DenteGlobalShaderDefs } from "../../shared/defs/DenteGlobalShaderDefs";
import { FrontalSplintingOverlay } from "../overlays/FrontalSplintingOverlay";
import { LowerIncisorAbfractionOverlay } from "../overlays/LowerIncisorAbfractionOverlay";
import { LowerIncisorPeriodontalOverlay } from "../overlays/LowerIncisorPeriodontalOverlay";
import { LowerIncisorWearOverlay } from "../overlays/LowerIncisorWearOverlay";
import { Tooth31Crown } from "./Tooth31Crown";
import { Tooth31EndoCanal } from "./Tooth31EndoCanal";
import { Tooth31Root } from "./Tooth31Root";
import { TOOTH31_GEOMETRY } from "./tooth31GeometryConstants";
import {
	DEFAULT_LOWER_INCISOR_LAYERS,
	type ToothLowerContainerProps,
} from "./toothLowerTypes";

/**
 * Tooth 31 Container — Lower Left Central Incisor
 * Symmetrical chisel crown, 3 mamelons, compressed root with sulcus longitudinalis.
 * Supports bilateral flip for Tooth 41. Mandate 8b <= 120 lines.
 */
export const Tooth31Container: React.FC<ToothLowerContainerProps> = ({
	toothNumber = 31,
	isDark = false,
	zoom = 1,
	layers = DEFAULT_LOWER_INCISOR_LAYERS,
	className,
	style,
}) => {
	const a = { ...DEFAULT_LOWER_INCISOR_LAYERS, ...layers };
	const isFlipped = toothNumber === 41;
	const isWorn = (a.wearDegree ?? 0) > 0;

	return (
		<svg
			viewBox={TOOTH31_GEOMETRY.viewBox}
			width={100 * zoom}
			height={160 * zoom}
			className={className}
			style={{ display: "block", ...style }}
			aria-label={`Анатомический нижний центральный резец ${toothNumber}`}
			role="img"
		>
			<DenteGlobalShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				{a.roots && !a.implant && (
					<Tooth31Root
						showGrooves={a.sulcusLongitudinalis ?? true}
						showCej={a.cej ?? true}
						isDark={isDark}
					/>
				)}

				{(a.boneRecession || (a.mobilityGrade ?? 0) > 0) && (
					<LowerIncisorPeriodontalOverlay
						recessionLevel={a.recessionLevel ?? "moderate"}
						mobilityGrade={a.mobilityGrade ?? 0}
						toothNumber={toothNumber}
						isDark={isDark}
					/>
				)}

				{(a.canals || a.pulp) && !a.implant && (
					<Tooth31EndoCanal
						showPulp={Boolean(a.pulp)}
						showCanals={Boolean(a.canals)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						vertucciType={a.vertucciType ?? "II"}
						isDark={isDark}
					/>
				)}

				{a.crown && (
					<Tooth31Crown
						showMamelons={a.mamelons ?? true}
						isWorn={isWorn}
						isDark={isDark}
					/>
				)}

				{isWorn && (
					<LowerIncisorWearOverlay
						degree={a.wearDegree ?? 0}
						toothNumber={toothNumber}
						isDark={isDark}
					/>
				)}

				{a.abfraction && (
					<LowerIncisorAbfractionOverlay
						toothNumber={toothNumber}
						isDark={isDark}
					/>
				)}

				{a.splinting && (
					<FrontalSplintingOverlay
						splintType={a.splintType ?? "fiberglass"}
						toothNumber={toothNumber}
						isDark={isDark}
					/>
				)}
			</g>
		</svg>
	);
};
