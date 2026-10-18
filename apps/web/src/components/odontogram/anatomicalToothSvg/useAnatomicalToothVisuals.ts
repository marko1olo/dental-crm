/**
 * DENTE Dental CRM — Anatomical Tooth Visuals & Geometries Hook
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useMemo } from "react";
import type { AnatomicalToothSVGProps } from "./anatomicalToothSvgProps";
import {
	getAnatomicalToothGeometry,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	getPhysiologicalRootResorptionGeometry,
} from "../anatomicalToothGeometries";
import {
	getAnatomicalToothColors,
	isLowSpecFilterDisabled,
	scaleCssPx,
} from "../AnatomicalToothColors";
import { resolvePeriapicalLesionSize } from "./ToothPeriapicalLayer";

export function useAnatomicalToothVisuals(props: AnatomicalToothSVGProps) {
	const {
		number, state, scale, material, isPontic, bridgeMaterial, canalObturation,
		periapicalLesionSize, hasPost, boneLossLevel = 0, boneLossType = "horizontal",
		furcation = 0, mobility = 0, gingivalRecession = 0, periapicalLesion = false,
		rootResorptionStage = 0, rootResorption, showPulpAndCanals = false,
		showPeriapicalHalos = true, showPeriodontalBoneLoss = true,
	} = props;

	const geom = useMemo(() => getAnatomicalToothGeometry(number), [number]);
	const isTop = geom.arch === "maxillary";
	const effectiveMaterial = material ?? bridgeMaterial;
	const isImplantState = state === "Implant" || state === "Planned_Implant";
	const effectiveResorptionStage = rootResorptionStage || rootResorption || 0;

	const colors = useMemo(() => {
		return getAnatomicalToothColors(state, effectiveMaterial);
	}, [state, effectiveMaterial]);

	const scaledWidth = scaleCssPx(String(geom.standardWidthPx), scale);
	const scaledHeight = scaleCssPx(String(geom.standardHeightPx), scale);
	const isLowSpec = useMemo(() => isLowSpecFilterDisabled(), []);

	const resorptionGeom = useMemo(
		() => getPhysiologicalRootResorptionGeometry(number, effectiveResorptionStage),
		[number, effectiveResorptionStage],
	);

	const effectiveRootPath = resorptionGeom.isResorbed ? resorptionGeom.rootPath : geom.rootPath;
	const effectiveCanals = resorptionGeom.showCanals ? resorptionGeom.canals : geom.canals;
	const effectiveCanalObturation = canalObturation ?? (state === "Root_Canal_Treated" ? "gutta_percha" : "unfilled");
	const isPulpitis = state === "Pulpitis" || state === "pulpitis" || state === "treatment";
	const shouldRenderCanals = showPulpAndCanals || isPulpitis || Boolean(hasPost || canalObturation || state === "Root_Canal_Treated");

	const { boneLine, resorptionArea } = useMemo(
		() => showPeriodontalBoneLoss ? getPeriodontalBoneLevelPath(number, boneLossLevel, boneLossType) : { boneLine: "", resorptionArea: "" },
		[number, boneLossLevel, boneLossType, showPeriodontalBoneLoss],
	);
	const recessionPath = useMemo(
		() => showPeriodontalBoneLoss ? getGingivalRecessionPath(number, gingivalRecession) : "",
		[number, gingivalRecession, showPeriodontalBoneLoss],
	);

	const hasPeriapical = Boolean(periapicalLesion || state === "Periodontitis");
	const effectiveLesionSize = showPeriapicalHalos ? resolvePeriapicalLesionSize(hasPeriapical, periapicalLesionSize) : 0;

	return {
		geom, isTop, effectiveMaterial, isImplantState, colors, scaledWidth, scaledHeight,
		isLowSpec, resorptionGeom, effectiveRootPath, effectiveCanals, effectiveCanalObturation,
		shouldRenderCanals, boneLine, resorptionArea, recessionPath, effectiveLesionSize, isPulpitis,
	};
}
