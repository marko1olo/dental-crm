/**
 * DENTE CRM — Endodontic Root Canal Schneider Curvature 3D Math
 * Standards: Schneider (1971), ESE, Mandate 8b (<= 120 lines).
 */

import type { Point3D } from "../cbctCaliperMeasureMath";
import {
	type EndoCurvatureGrade,
	type EndoCanalMeasurement,
	classifySchneiderCurvature,
} from "./endoCanalTypes";

export type { EndoCurvatureGrade, EndoCanalMeasurement };
export { classifySchneiderCurvature };

export function toPhysical3D(p: Point3D, spacing?: Point3D | number): Point3D {
	if (!spacing) return p;
	if (typeof spacing === "number") return { x: p.x * spacing, y: p.y * spacing, z: p.z * spacing };
	return { x: p.x * spacing.x, y: p.y * spacing.y, z: p.z * spacing.z };
}

export function calculateSchneiderAngle3D(
	orifice: Point3D,
	apex: Point3D,
	inflection?: Point3D,
	voxelSpacing?: Point3D | number,
): number {
	if (!inflection) return 0.0;
	const pO = toPhysical3D(orifice, voxelSpacing);
	const pA = toPhysical3D(apex, voxelSpacing);
	const pI = toPhysical3D(inflection, voxelSpacing);

	const v1x = pI.x - pO.x, v1y = pI.y - pO.y, v1z = pI.z - pO.z;
	const v2x = pA.x - pI.x, v2y = pA.y - pI.y, v2z = pA.z - pI.z;
	const len1 = Math.hypot(v1x, v1y, v1z);
	const len2 = Math.hypot(v2x, v2y, v2z);
	if (len1 === 0 || len2 === 0) return 0.0;

	const dot = v1x * v2x + v1y * v2y + v1z * v2z;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	return Number(((Math.acos(cosTheta) * 180) / Math.PI).toFixed(1));
}

export function calculateEndoCanalLength3DMm(
	orifice: Point3D,
	apex: Point3D,
	inflection?: Point3D,
	voxelSpacing?: Point3D | number,
): number {
	const pO = toPhysical3D(orifice, voxelSpacing);
	const pA = toPhysical3D(apex, voxelSpacing);
	if (!inflection) return Number(Math.hypot(pA.x - pO.x, pA.y - pO.y, pA.z - pO.z).toFixed(1));
	const pI = toPhysical3D(inflection, voxelSpacing);
	return Number((Math.hypot(pI.x - pO.x, pI.y - pO.y, pI.z - pO.z) + Math.hypot(pA.x - pI.x, pA.y - pI.y, pA.z - pI.z)).toFixed(1));
}

export function calculateEndoCanalMeasurement(params: {
	id?: string;
	plane?: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	orifice: Point3D;
	apex: Point3D;
	inflection?: Point3D;
	voxelSpacing?: Point3D | number;
	fdiTooth?: string | null;
	canalName?: string;
	label?: string;
}): EndoCanalMeasurement {
	const pO = toPhysical3D(params.orifice, params.voxelSpacing);
	const pA = toPhysical3D(params.apex, params.voxelSpacing);
	const pI = params.inflection ? toPhysical3D(params.inflection, params.voxelSpacing) : undefined;

	const coronalLengthMm = pI ? Number(Math.hypot(pI.x - pO.x, pI.y - pO.y, pI.z - pO.z).toFixed(1)) : Number(Math.hypot(pA.x - pO.x, pA.y - pO.y, pA.z - pO.z).toFixed(1));
	const apicalLengthMm = pI ? Number(Math.hypot(pA.x - pI.x, pA.y - pI.y, pA.z - pI.z).toFixed(1)) : 0.0;
	const lengthMm = Number((coronalLengthMm + apicalLengthMm).toFixed(1));
	const schneiderAngleDeg = calculateSchneiderAngle3D(params.orifice, params.apex, params.inflection, params.voxelSpacing);
	const classification = classifySchneiderCurvature(schneiderAngleDeg);

	const defaultLabel = params.canalName
		? (params.fdiTooth ? `Зуб ${params.fdiTooth} (${params.canalName})` : `Канал ${params.canalName}`)
		: (params.fdiTooth ? `Зуб ${params.fdiTooth}` : "Корневой канал");

	return {
		id: params.id || `endo-canal-${Date.now()}-${Math.abs(Math.round(lengthMm * 10)).toString(36)}`,
		plane: params.plane ?? "panoramic",
		orificeMm: params.orifice,
		apexMm: params.apex,
		inflectionMm: params.inflection,
		lengthMm,
		coronalLengthMm,
		apicalLengthMm,
		schneiderAngleDeg,
		curvatureGrade: classification.grade,
		curvatureGradeRu: classification.labelRu,
		clinicalAdviceRu: classification.clinicalAdviceRu,
		fdiTooth: params.fdiTooth ?? null,
		canalName: params.canalName,
		label: params.label || defaultLabel,
	};
}
