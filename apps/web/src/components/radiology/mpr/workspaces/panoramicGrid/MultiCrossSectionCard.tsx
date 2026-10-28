import React, { useRef, useEffect } from "react";
import type { MultiCrossSectionItem } from "./multiCrossSectionExtractor";

export interface MultiCrossSectionCardProps {
	readonly item: MultiCrossSectionItem;
	readonly indexInGrid: number;
	readonly onClick: () => void;
}

export const MultiCrossSectionCard: React.FC<MultiCrossSectionCardProps> = ({
	item,
	indexInGrid,
	onClick,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const { slice, isCenter, labelMm } = item;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !slice.pixelData || slice.pixelData.length === 0) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = slice.widthPx;
		const height = slice.heightPx;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		const imgData = new ImageData(new Uint8ClampedArray(slice.pixelData), width, height);
		ctx.putImageData(imgData, 0, 0);
	}, [slice]);

	return (
		<div
			onClick={onClick}
			className={`flex flex-col min-h-0 min-w-0 rounded overflow-hidden border transition-all cursor-pointer relative bg-black select-none ${
				isCenter
					? "border-amber-500/90 shadow-[0_0_8px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/70"
					: "border-zinc-850 hover:border-zinc-700 hover:bg-zinc-950/60"
			}`}
			data-testid={`cbct-multi-cross-card-${indexInGrid}`}
			role="button"
			tabIndex={0}
			aria-pressed={isCenter}
			title={`Срез со смещением ${labelMm}. Клик для центрирования.`}
		>
			<div className="flex-1 relative min-h-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
				<canvas
					ref={canvasRef}
					className="w-full h-full object-contain pointer-events-none"
					data-testid={`cbct-multi-cross-canvas-${indexInGrid}`}
				/>
				<span className="absolute bottom-0.5 left-1 text-[8px] font-mono font-bold text-zinc-600 uppercase pointer-events-none select-none">
					B
				</span>
				<span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-zinc-600 uppercase pointer-events-none select-none">
					L
				</span>
			</div>

			<div
				className={`h-4.5 px-1 flex items-center justify-between text-[10px] font-mono shrink-0 border-t ${
					isCenter
						? "bg-amber-950/40 border-amber-600/40 text-amber-300 font-bold"
						: "bg-zinc-950/90 border-zinc-900 text-zinc-500"
				}`}
			>
				<span className="truncate">{labelMm}</span>
			</div>
		</div>
	);
};
