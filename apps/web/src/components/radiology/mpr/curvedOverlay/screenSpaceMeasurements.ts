import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	Point3D,
} from "../../cbctMprMath";
import { calculateAngleBetween3Points3D } from "../../cbctMprMath";
import {
	drawCbctAngleMeasurement,
	drawCbctMeasurementRuler,
} from "../../cbctOverlayMeasurementRenderers";

export function drawScreenSpaceMeasurements(
	ctx: CanvasRenderingContext2D,
	plane: "panoramic" | "cross_section",
	toScreen: (pt: Point3D) => { x: number; y: number },
	invertColors: boolean,
	rulers: readonly CbctMeasurementRuler[],
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null,
	angles: readonly CbctAngleMeasurement[],
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null,
	selectedId?: string,
	hoveredHandle?: { id: string; handleIndex: number } | null,
	draggingHandle?: { id: string; handleIndex: number } | null,
): void {
	for (const r of rulers) {
		if (r.plane !== plane) continue;
		const h = hoveredHandle?.id === r.id ? hoveredHandle.handleIndex : draggingHandle?.id === r.id ? draggingHandle.handleIndex : null;
		drawCbctMeasurementRuler(ctx, toScreen(r.startMm), toScreen(r.endMm), r.distanceMm, selectedId === r.id, h, invertColors);
	}
	if (activeRuler && activeRuler.plane === plane) {
		const dist = Math.hypot(activeRuler.currentMm.x - activeRuler.startMm.x, activeRuler.currentMm.z - activeRuler.startMm.z);
		drawCbctMeasurementRuler(ctx, toScreen(activeRuler.startMm), toScreen(activeRuler.currentMm), dist, true, null, invertColors);
	}
	for (const a of angles) {
		if (a.plane !== plane) continue;
		const h = hoveredHandle?.id === a.id ? hoveredHandle.handleIndex : draggingHandle?.id === a.id ? draggingHandle.handleIndex : null;
		drawCbctAngleMeasurement(ctx, toScreen(a.startMm), toScreen(a.vertexMm), toScreen(a.endMm), a.angleDeg, selectedId === a.id, h);
	}
	if (activeAngle && activeAngle.plane === plane) {
		const pv = activeAngle.vertexMm ? toScreen(activeAngle.vertexMm) : toScreen(activeAngle.currentMm);
		const deg = activeAngle.vertexMm ? calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, activeAngle.currentMm) : 0;
		drawCbctAngleMeasurement(ctx, toScreen(activeAngle.startMm), pv, toScreen(activeAngle.currentMm), deg, true, null);
	}
}
