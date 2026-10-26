/**
 * usePanoramicWorker.ts — Жизненный цикл Web Worker для панорамной реконструкции (Мандат 8b <= 120 строк).
 */

import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { PanoramicWorkerRequest, PanoramicWorkerResponse, Point2D } from "../../../../utils/math/mprMath";
import { isLowSpecHardware, isHostUnderHeavyLoad } from "../../../../utils/deviceDetection.js";
import type { VisiographWindowPreset } from "../../../visiograph/VisiographWindowPresets";
import { paintHuPixelsToCanvas, type PanoramicVolumeInput } from "../panoramicTypes";

export interface UsePanoramicWorkerParams {
	volume: PanoramicVolumeInput | null;
	effectiveControlPoints: Point2D[];
	sliceThicknessMm: number;
	blendMode: "mip" | "average";
	zStartWorld?: number | undefined;
	zEndWorld?: number | undefined;
	zStepWorld?: number | undefined;
	currentPreset: VisiographWindowPreset;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	onRepaintCrossSection: () => void;
}

export function usePanoramicWorker(params: UsePanoramicWorkerParams) {
	const {
		volume, effectiveControlPoints, sliceThicknessMm, blendMode,
		zStartWorld, zEndWorld, zStepWorld = 0.5, currentPreset,
		canvasRef, onRepaintCrossSection,
	} = params;

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const workerRef = useRef<Worker | null>(null);
	const rawPixelsRef = useRef<{ width: number; height: number; pixels: Float32Array } | null>(null);
	const repaintRef = useRef(onRepaintCrossSection);
	repaintRef.current = onRepaintCrossSection;

	useEffect(() => {
		if (!volume || effectiveControlPoints.length < 2) {
			setLoading(false);
			if (!volume) {
				setError("Исследование КЛКТ не передано. Панорамная реконструкция строится по вокселям активного 3D-объема.");
			} else if (effectiveControlPoints.length < 2) {
				setError("Недостаточно контрольных точек зубной дуги. Разметьте как минимум 2 точки на аксиальном срезе.");
			}
			return;
		}

		setLoading(true);
		setError(null);
		const worker = new Worker(new URL("../../../workers/mprWorker.ts", import.meta.url), { type: "module" });
		workerRef.current = worker;

		const depthWorld = volume.dimensions[2] * volume.spacing[2];
		const zStart = zStartWorld ?? volume.origin[2];
		const zEnd = zEndWorld ?? volume.origin[2] + depthWorld;

		worker.onmessage = (e: MessageEvent<PanoramicWorkerResponse>) => {
			const res = e.data;
			if (!res.success) {
				setError(res.error);
				setLoading(false);
				return;
			}
			rawPixelsRef.current = { width: res.width, height: res.height, pixels: res.pixels };
			const canvas = canvasRef.current;
			if (canvas) {
				paintHuPixelsToCanvas(canvas, res.width, res.height, res.pixels, currentPreset);
			}
			repaintRef.current();
			setLoading(false);
		};

		worker.onerror = (ev) => {
			setError(ev.message || "MPR worker error");
			setLoading(false);
		};

		const isLowSpec = isLowSpecHardware();
		const isHeavy = isHostUnderHeavyLoad();
		const effectiveZStepWorld = zStepWorld !== undefined
			? (isHeavy ? Math.max(zStepWorld, 1.5) : isLowSpec ? Math.max(zStepWorld, 1.0) : zStepWorld)
			: (isHeavy ? 1.5 : isLowSpec ? 1.0 : 0.5);

		const req: PanoramicWorkerRequest = {
			scalarData: volume.scalarData, dimensions: volume.dimensions,
			origin: volume.origin, direction: volume.direction, spacing: volume.spacing,
			splinePoints: effectiveControlPoints, zStartWorld: zStart, zEndWorld: zEnd,
			zStepWorld: effectiveZStepWorld, thickness: sliceThicknessMm, blendMode,
		};
		worker.postMessage(req);

		return () => {
			worker.onmessage = null;
			worker.onerror = null;
			worker.terminate();
			if (workerRef.current === worker) workerRef.current = null;
		};
	}, [volume, effectiveControlPoints, sliceThicknessMm, blendMode, zStartWorld, zEndWorld, zStepWorld, currentPreset]);

	useEffect(() => {
		return () => {
			if (workerRef.current) {
				workerRef.current.onmessage = null;
				workerRef.current.onerror = null;
				workerRef.current.terminate();
				workerRef.current = null;
			}
			rawPixelsRef.current = null;
		};
	}, []);

	return { loading, error, rawPixelsRef };
}
