import { cache } from "@cornerstonejs/core";
import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";

interface PanoramicRendererWindowProps {
	volumeId: string;
	splinePoints: any[]; // points from SplineROITool
	onClose: () => void;
	thickness?: number;
	blendMode?: "mip" | "average";
}

export function PanoramicRendererWindow({
	volumeId,
	splinePoints,
	onClose,
	thickness = 0,
	blendMode = "mip",
}: PanoramicRendererWindowProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		let worker: Worker | null = null;

		const volume = cache.getVolume(volumeId) as any;
		const scalarData = volume?.scalarData || volume?.voxelManager?.getScalarData();
		if (!volume || !scalarData) {
			setError("Volume not loaded in cache");
			setLoading(false);
			return;
		}

		try {
			worker = new Worker(
				new URL("../../workers/curvedMprWorker.ts", import.meta.url),
				{ type: "module" },
			);

			worker.onmessage = (e) => {
				if (e.data.type === "SUCCESS") {
					const { panorex } = e.data.payload;
					setLoading(false);

					const canvas = canvasRef.current;
					if (canvas && panorex) {
						// Adjust canvas dimensions to match generated image
						canvas.width = panorex.width;
						canvas.height = panorex.height;
						const ctx = canvas.getContext("2d");
						if (ctx) {
							const imgData = new ImageData(
								panorex.buffer,
								panorex.width,
								panorex.height,
							);
							ctx.putImageData(imgData, 0, 0);
						}
					}
				} else if (e.data.type === "ERROR") {
					setError(e.data.payload);
					setLoading(false);
				}
			};

			worker.postMessage({
				type: "GENERATE",
				scalarData,
				dimensions: volume.dimensions,
				spacing: volume.spacing,
				origin: volume.origin,
				direction: volume.direction,
				splinePoints,
				panorexHeight: 100, // 100mm height
				resolution: 0.5, // 0.5mm per pixel
			});
		} catch (err) {
			setError("Failed to initialize curved MPR worker.");
			setLoading(false);
		}

		return () => {
			if (worker) {
				worker.terminate();
			}
		};
	}, [volumeId, splinePoints]);

	return (
		<Rnd
			default={{
				x: 100,
				y: 100,
				width: 800,
				height: 300,
			}}
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
					<div className="absolute top-10 text-red-500 font-bold">{error}</div>
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
