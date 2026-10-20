import type React from "react";
import { DenteGlobalShaderDefs } from "../../shared/defs/DenteGlobalShaderDefs";
import { FrontalSplintingOverlay } from "../overlays/FrontalSplintingOverlay";
import { LowerIncisorAbfractionOverlay } from "../overlays/LowerIncisorAbfractionOverlay";
import { LowerIncisorPeriodontalOverlay } from "../overlays/LowerIncisorPeriodontalOverlay";
import { LowerIncisorWearOverlay } from "../overlays/LowerIncisorWearOverlay";
import { Tooth32Crown } from "./Tooth32Crown";
import { Tooth32EndoCanal } from "./Tooth32EndoCanal";
import { Tooth32Root } from "./Tooth32Root";
import { TOOTH32_GEOMETRY } from "./tooth32GeometryConstants";
import {
	DEFAULT_LOWER_INCISOR_LAYERS,
	type ToothLowerContainerProps,
} from "./toothLowerTypes";

/**
 * Tooth 32 Container — Lower Left Lateral Incisor
 * Wider crown, distoincisal slope, distal twist, longer root with sulcus longitudinalis.
 * Supports bilateral flip for Tooth 42. Mandate 8b <= 120 lines.
 */
export const Tooth32Container: React.FC<ToothLowerContainerProps> = ({
	toothNumber = 32,
	isDark = false,
	zoom = 1,
	layers = DEFAULT_LOWER_INCISOR_LAYERS,
	className,
	style,
}) => {
	const a = { ...DEFAULT_LOWER_INCISOR_LAYERS, ...layers };
	const isFlipped = toothNumber === 42;
	const isWorn = (a.wearDegree ?? 0) > 0;

	return (
		<svg
			viewBox={TOOTH32_GEOMETRY.viewBox}
			width={100 * zoom}
			height={160 * zoom}
			className={className}
			style={{ display: "block", ...style }}
			aria-label={`Анатомический нижний латеральный резец ${toothNumber}`}
			role="img"
		>
			<DenteGlobalShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				{a.roots && !a.implant && (
					<Tooth32Root
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
					<Tooth32EndoCanal
						showPulp={Boolean(a.pulp)}
						showCanals={Boolean(a.canals)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						vertucciType={a.vertucciType ?? "II"}
						isDark={isDark}
					/>
				)}

				{a.crown && (
					<Tooth32Crown
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
