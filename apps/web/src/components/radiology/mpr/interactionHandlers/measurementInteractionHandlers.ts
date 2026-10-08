import type React from "react";
import { showToast } from "../../../GlobalToast";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctProbeMarker,
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	calculateAngleBetween3Points3D,
	getTissueNameFromHU,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	mapCanvasPointerToWorldMmWithTransform,
	sampleVoxelHU,
	worldMmToVoxel,
} from "../../cbctMprMath";
import {
	projectMeasurementsToSlice,
	updateDraggedMeasurementAngle,
	updateDraggedMeasurementRuler,
} from "../cbctInteractionHelpers";
import {
	MEASUREMENT_HANDLE_HIT_RADIUS,
	MEASUREMENT_OBJECT_HIT_RADIUS,
	RULER_MIN_VALID_DISTANCE_MM,
} from "./constants";

/**
 * Layer 2: Measurement (Rulers, Angles, Hounsfield Probes) Interaction Handlers.
 */

export interface MeasurementInteractionContext {
	volume: CbctVoxelVolume;
	plane: MprPlane;
	canvas: HTMLCanvasElement;
	pointerPx: Point2D;
	currentTransform: ViewportTransform;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	rulers: CbctMeasurementRuler[];
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>;
	angles: CbctAngleMeasurement[];
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>;
	probeMarkers: CbctProbeMarker[];
	setProbeMarkers: React.Dispatch<React.SetStateAction<CbctProbeMarker[]>>;
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	setActiveRuler: React.Dispatch<
		React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>
	>;
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	setActiveAngle: React.Dispatch<
		React.SetStateAction<(CbctAngleMeasurement & { currentMm: Point3D }) | null>
	>;
	activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null;
	setActiveProbe: React.Dispatch<
		React.SetStateAction<
			(CbctProbeMarker & { hu: number; tissueName: string }) | null
		>
	>;
	setSelectedMeasurement: React.Dispatch<
		React.SetStateAction<
			CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null
		>
	>;
	setDraggingMeasurementHandle: React.Dispatch<
		React.SetStateAction<{
			id: string;
			handleIndex: number;
			plane?: MprPlane;
			type?: string;
		} | null>
	>;
}

/**
 * Handles mouse down for existing measurement handles and objects (selection & deletion).
 * Returns true if the event was consumed by a measurement object.
 */
export function handleMeasurementMouseDownHits(
	ctx: MeasurementInteractionContext,
): boolean {
	const {
		plane,
		volume,
		pointerPx,
		rulers,
		angles,
		probeMarkers,
		setDraggingMeasurementHandle,
		setSelectedMeasurement,
		setRulers,
		setAngles,
		setProbeMarkers,
	} = ctx;

	const { projectedRulers, projectedAngles, projectedProbes } =
		projectMeasurementsToSlice(plane, volume, rulers, angles, probeMarkers);

	const handleHit = hitTestMeasurementHandle(
		pointerPx,
		projectedRulers,
		projectedAngles,
		MEASUREMENT_HANDLE_HIT_RADIUS,
	);
	if (handleHit) {
		setDraggingMeasurementHandle({
			type: handleHit.type,
			id: handleHit.id,
			handleIndex: handleHit.handleIndex,
			plane,
		});
		setSelectedMeasurement({
			type: handleHit.type,
			id: handleHit.id,
		} as unknown as CbctMeasurementRuler);
		return true;
	}

	const objectHit = hitTestMeasurementObject(
		pointerPx,
		projectedRulers,
		projectedAngles,
		projectedProbes,
		MEASUREMENT_OBJECT_HIT_RADIUS,
	);
	if (objectHit) {
		if (objectHit.isDeleteButtonHit) {
			if (objectHit.type === "ruler") {
				setRulers((prev) => prev.filter((r) => r.id !== objectHit.id));
				showToast("Измерение линейки удалено", "info");
			} else if (objectHit.type === "angle") {
				setAngles((prev) => prev.filter((a) => a.id !== objectHit.id));
				showToast("Измерение угла удалено", "info");
			} else if (objectHit.type === "probe") {
				setProbeMarkers((prev) => prev.filter((p) => p.id !== objectHit.id));
				showToast("Метка плотности удалена", "info");
			}
			setSelectedMeasurement(null);
			return true;
		}
		setSelectedMeasurement({
			type: objectHit.type,
			id: objectHit.id,
		} as unknown as CbctMeasurementRuler);
		return true;
	}

	return false;
}

/**
 * Handles creation step on mouse down when active tool is ruler, angle, or probe.
 * Returns true if handled.
 */
export function handleMeasurementCreationMouseDown(
	activeTool: CbctToolMode,
	ctx: MeasurementInteractionContext,
): boolean {
	const {
		canvas,
		pointerPx,
		plane,
		crosshairMm,
		obliqueAngles,
		currentTransform,
		volume,
		setActiveRuler,
		activeAngle,
		setActiveAngle,
		setAngles,
		setSelectedMeasurement,
		setProbeMarkers,
	} = ctx;

	if (activeTool === "ruler") {
		const pointMm = mapCanvasPointerToWorldMmWithTransform(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		setActiveRuler({
			id: `ruler-${Date.now()}`,
			plane,
			startMm: pointMm,
			endMm: pointMm,
			currentMm: pointMm,
			distanceMm: 0,
		});
		return true;
	}

	if (activeTool === "angle") {
		const pointMm = mapCanvasPointerToWorldMmWithTransform(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		if (!activeAngle) {
			setActiveAngle({
				id: `angle-${Date.now()}`,
				plane,
				startMm: pointMm,
				vertexMm: pointMm,
				endMm: pointMm,
				currentMm: pointMm,
				angleDeg: 0,
				step: "vertex",
			} as unknown as CbctAngleMeasurement & { currentMm: Point3D });
			showToast(
				"Точка 1 (плечо) установлена. Кликните для установки вершины угла",
				"info",
			);
			return true;
		}
		if (
			(activeAngle as unknown as { step?: "vertex" | "end" }).step === "vertex"
		) {
			setActiveAngle({
				...activeAngle,
				vertexMm: pointMm,
				endMm: pointMm,
				currentMm: pointMm,
				step: "end",
			} as unknown as CbctAngleMeasurement & {
				currentMm: Point3D;
				step?: "vertex" | "end";
			});
			showToast(
				"Вершина угла зафиксирована. Кликните для фиксации второго плеча",
				"info",
			);
			return true;
		}
		const finalAngleDeg = calculateAngleBetween3Points3D(
			activeAngle.startMm,
			activeAngle.vertexMm,
			pointMm,
		);
		const fullAngle: CbctAngleMeasurement = {
			id: activeAngle.id,
			plane: activeAngle.plane,
			startMm: activeAngle.startMm,
			vertexMm: activeAngle.vertexMm,
			endMm: pointMm,
			angleDeg: finalAngleDeg,
		};
		setAngles((prev) => [...prev, fullAngle]);
		setActiveAngle(null);
		setSelectedMeasurement(fullAngle);
		showToast(`Измерение угла зафиксировано: ${finalAngleDeg}°`, "success");
		return true;
	}

	if (activeTool === "probe") {
		const pointMm = mapCanvasPointerToWorldMmWithTransform(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		const vox = worldMmToVoxel(pointMm, volume);
		const hu = sampleVoxelHU(vox.x, vox.y, vox.z, volume);
		const tissueName = getTissueNameFromHU(hu);
		const newProbe: CbctProbeMarker = {
			id: `probe-${Date.now()}`,
			plane,
			worldMm: pointMm,
			hu,
			tissueName,
		};
		setProbeMarkers((prev) => [...prev, newProbe]);
		setSelectedMeasurement(newProbe);
		showToast(`Метка плотности: ${hu} HU (${tissueName})`, "info");
		return true;
	}

	return false;
}

/**
 * Handles mouse move when dragging an existing handle or previewing active measurement.
 * Returns true if handled.
 */
export function handleMeasurementMouseMove(
	draggingMeasurementHandle: {
		id: string;
		handleIndex: number;
		plane?: MprPlane;
		type?: string;
	} | null,
	activeTool: CbctToolMode,
	ctx: MeasurementInteractionContext,
): boolean {
	const {
		plane,
		pointerPx,
		canvas,
		crosshairMm,
		obliqueAngles,
		currentTransform,
		volume,
		setRulers,
		setAngles,
		activeRuler,
		setActiveRuler,
		activeAngle,
		setActiveAngle,
		setActiveProbe,
	} = ctx;

	if (
		draggingMeasurementHandle &&
		draggingMeasurementHandle.plane === plane
	) {
		const currentMm = mapCanvasPointerToWorldMmWithTransform(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		if (draggingMeasurementHandle.type === "ruler") {
			setRulers((prev) =>
				updateDraggedMeasurementRuler(
					prev,
					draggingMeasurementHandle.id,
					draggingMeasurementHandle.handleIndex,
					currentMm,
				),
			);
			return true;
		}
		if (draggingMeasurementHandle.type === "angle") {
			setAngles((prev) =>
				updateDraggedMeasurementAngle(
					prev,
					draggingMeasurementHandle.id,
					draggingMeasurementHandle.handleIndex,
					currentMm,
				),
			);
			return true;
		}
	}

	if (activeRuler && activeRuler.plane === plane) {
		setActiveRuler((prev) =>
			prev
				? {
						...prev,
						currentMm: mapCanvasPointerToWorldMmWithTransform(
							pointerPx,
							{ width: canvas.width, height: canvas.height },
							plane,
							crosshairMm,
							obliqueAngles,
							currentTransform,
							volume,
						),
					}
				: null,
		);
		return true;
	}

	if (activeAngle && activeAngle.plane === plane) {
		const currentMm = mapCanvasPointerToWorldMmWithTransform(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		setActiveAngle((prev) => {
			if (!prev) return null;
			if ((prev as unknown as { step?: "vertex" | "end" }).step === "vertex")
				return { ...prev, vertexMm: currentMm, currentMm };
			return {
				...prev,
				endMm: currentMm,
				currentMm,
				angleDeg: calculateAngleBetween3Points3D(
					prev.startMm,
					prev.vertexMm,
					currentMm,
				),
			};
		});
		return true;
	}

	if (activeTool === "probe" && volume) {
		const pointMm = mapCanvasPointerToWorldMmWithTransform(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		const vox = worldMmToVoxel(pointMm, volume);
		const hu = sampleVoxelHU(vox.x, vox.y, vox.z, volume);
		setActiveProbe({
			id: "active-probe",
			plane,
			worldMm: pointMm,
			hu,
			tissueName: getTissueNameFromHU(hu),
		});
	}

	return false;
}

/**
 * Commits active ruler on mouse up if distance exceeds threshold.
 */
export function handleActiveRulerMouseUp(
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null,
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>,
	setSelectedMeasurement: React.Dispatch<
		React.SetStateAction<
			CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null
		>
	>,
	setActiveRuler: React.Dispatch<
		React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>
	>,
): void {
	if (!activeRuler) return;
	const dist = Math.hypot(
		activeRuler.currentMm.x - activeRuler.startMm.x,
		activeRuler.currentMm.y - activeRuler.startMm.y,
		activeRuler.currentMm.z - activeRuler.startMm.z,
	);
	if (dist > RULER_MIN_VALID_DISTANCE_MM) {
		const newRuler: CbctMeasurementRuler = {
			id: `ruler-${Date.now()}`,
			plane: activeRuler.plane,
			startMm: activeRuler.startMm,
			endMm: activeRuler.currentMm,
			distanceMm: Number(dist.toFixed(1)),
		};
		setRulers((prev) => [...prev, newRuler]);
		setSelectedMeasurement(newRuler);
	}
	setActiveRuler(null);
}
