import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import type {
	PanoramicWorkerRequest,
	PanoramicWorkerResponse,
	Point2D,
} from "../../mprMath";

/**
 * Volume slab extracted from the cornerstone cache on the UI thread and handed
 * to the MPR worker. `scalarData` is a caller-owned copy (see
 * `toTransferableScalarData`) whose buffer is transferred to the worker.
 */
export interface PanoramicVolumeInput {
	scalarData: Float32Array | Uint16Array;
	dimensions: [number, number, number];
	origin: [number, number, number];
	direction: Float32Array; // 16-element mat4 layout
	spacing: [number, number, number];
}

interface PanoramicRendererWindowProps {
	/** Curve control points in the axial world plane (from SplineROITool). */
	splinePoints: Point2D[];
	/**
	 * Volume slab to unwrap. When null the pipeline is not yet ready (volume
	 * still decoding) and the window shows a loading state instead of rendering.
	 */
	volume: PanoramicVolumeInput | null;
	onClose: () => void;
	thickness?: number;
	blendMode?: "mip" | "average";
	/** World-space Z extent of the unwrap. Defaults derived from the volume. */
	zStartWorld?: number;
	zEndWorld?: number;
	zStepWorld?: number;
}

/**
 * Paints a Float32 HU panorama into the canvas via a windowed grayscale ramp.
 * Kept out of the worker so the worker returns raw HU (transferable Float32)
 * and window/level can change without recomputing the MPR.
 */
function paintPanorama(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	pixels: Float32Array,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	canvas.width = width;
	canvas.height = height;

	// Derive a simple min/max window from the data (single pass, no allocation
	// inside the loop). A real viewer would take WW/WL from the toolbar.
	let min = Infinity;
	let max = -Infinity;
	for (let i = 0; i < pixels.length; i++) {
		const v = pixels[i]!;
		if (v < min) min = v;
		if (v > max) max = v;
	}
	const range = max - min || 1;

	const img = ctx.createImageData(width, height);
	const rgba = img.data;
	for (let i = 0; i < pixels.length; i++) {
		const g = Math.round(((pixels[i]! - min) / range) * 255);
		const o = i * 4;
		rgba[o] = g;
		rgba[o + 1] = g;
		rgba[o + 2] = g;
		rgba[o + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
}

export function PanoramicRendererWindow({
	splinePoints,
	volume,
	onClose,
	thickness = 0,
	blendMode = "mip",
	zStartWorld,
	zEndWorld,
	zStepWorld = 0.5,
}: PanoramicRendererWindowProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const workerRef = useRef<Worker | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Nothing to render until the volume slab is available.
		if (!volume || splinePoints.length < 2) {
			setLoading(!volume);
			return;
		}

		setLoading(true);
		setError(null);

		// Spawn a fresh worker per generation. A new spline/volume supersedes any
		// in-flight computation: we terminate the previous worker in cleanup so a
		// stale result can never paint over a newer one (last-write-wins race).
		const worker = new Worker(new URL("../../mprWorker.ts", import.meta.url), {
			type: "module",
		});
		workerRef.current = worker;

		// Default the Z extent to the full volume depth in world units if unset.
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
			const canvas = canvasRef.current;
			if (canvas) paintPanorama(canvas, res.width, res.height, res.pixels);
			setLoading(false);
		};

		worker.onerror = (ev) => {
			setError(ev.message || "MPR worker crashed");
			setLoading(false);
		};

		const req: PanoramicWorkerRequest = {
			scalarData: volume.scalarData,
			dimensions: volume.dimensions,
			origin: volume.origin,
			direction: volume.direction,
			spacing: volume.spacing,
			splinePoints,
			zStartWorld: zStart,
			zEndWorld: zEnd,
			zStepWorld,
			thickness,
			blendMode,
		};

		// Transfer the scalar buffer (zero-copy). `volume.scalarData` must be a
		// caller-owned copy — its buffer is detached here and unusable afterward.
		worker.postMessage(req, [req.scalarData.buffer]);

		return () => {
			// Kill the worker on unmount or before a superseding generation so we
			// never leak a zombie worker eating CPU/RAM in the background.
			worker.terminate();
			if (workerRef.current === worker) workerRef.current = null;
		};
	}, [
		volume,
		splinePoints,
		thickness,
		blendMode,
		zStartWorld,
		zEndWorld,
		zStepWorld,
	]);

	return (
		<Rnd
			default={{ x: 100, y: 100, width: 800, height: 300 }}
			minWidth={400}
			minHeight={200}
			bounds="window"
			className="bg-neutral-900 border border-neutral-700 shadow-2xl rounded-lg overflow-hidden flex flex-col z-50"
		>
			<div className="bg-neutral-800 p-2 flex justify-between items-center cursor-move handle">
				<h3 className="text-white font-medium text-sm">Panorex (Curved MPR)</h3>
				<button
					onClick={onClose}
					className="text-neutral-400 hover:text-white px-2"
				>
					&times;
				</button>
			</div>
			<div className="flex-1 relative bg-black flex items-center justify-center p-4">
				{loading && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
						<div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						<span className="text-blue-400 mt-4 text-sm font-medium animate-pulse">
							Calculating Trilinear Interpolation...
						</span>
					</div>
				)}
				{error && (
					<div className="text-red-500 text-sm px-4 text-center">{error}</div>
				)}
				<canvas
					ref={canvasRef}
					width={800}
					height={300}
					className="w-full h-full object-contain"
				/>
			</div>
		</Rnd>
	);
}
