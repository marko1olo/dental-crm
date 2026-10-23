import React, { useRef, useEffect, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import {
	createStrokeTracker,
	setupCanvasHighDpi,
	getPointerCoordinates,
	drawSmoothStrokeOnContext,
	drawAllStrokesOnCanvas,
	exportSignatureToSvg,
	exportSignatureToPng,
	type SignatureStroke,
} from "./signaturePadMath.js";

export interface SignaturePadCanvasProps {
	width?: number | undefined;
	height?: number | undefined;
	onStrokeEnd?: ((strokes: SignatureStroke[], svg: string, png: string) => void) | undefined;
	onClear?: (() => void) | undefined;
	disabled?: boolean | undefined;
	placeholder?: string | undefined;
	className?: string | undefined;
}

export const SignaturePadCanvas: React.FC<SignaturePadCanvasProps> = ({
	width = 360,
	height = 140,
	onStrokeEnd,
	onClear,
	disabled = false,
	placeholder = "Распишитесь пальцем или стилусом здесь",
	className = "",
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const trackerRef = useRef(createStrokeTracker({ maxPointsPerStroke: 2000 }));
	const isDrawingRef = useRef(false);

	const syncCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		drawAllStrokesOnCanvas(canvas, trackerRef.current.getStrokes(), {
			width,
			height,
			backgroundColor: "#ffffff",
			defaultColor: "#0f172a",
		});
	}, [width, height]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		setupCanvasHighDpi(canvas, width, height);
		syncCanvas();
	}, [width, height, syncCanvas]);

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (disabled) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		isDrawingRef.current = true;
		const pt = getPointerCoordinates(e.nativeEvent, e.currentTarget);
		trackerRef.current.startStroke(pt);
		const ctx = e.currentTarget.getContext("2d");
		if (ctx) drawSmoothStrokeOnContext(ctx, { points: [pt], isDot: true });
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawingRef.current || disabled) return;
		const pt = getPointerCoordinates(e.nativeEvent, e.currentTarget);
		trackerRef.current.addPoint(pt);
		const ctx = e.currentTarget.getContext("2d");
		if (ctx) drawSmoothStrokeOnContext(ctx, { points: trackerRef.current.getCurrentPoints() });
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawingRef.current) return;
		isDrawingRef.current = false;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
		trackerRef.current.endStroke();
		syncCanvas();
		const strokes = trackerRef.current.getStrokes();
		onStrokeEnd?.(strokes, exportSignatureToSvg(strokes, width, height), exportSignatureToPng(strokes, width, height));
	};

	const handleClear = () => {
		trackerRef.current.clear();
		syncCanvas();
		onClear?.();
	};

	return (
		<div className={`relative flex flex-col items-center select-none ${className}`}>
			<canvas
				ref={canvasRef}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				className="w-full touch-none rounded-xl border border-[var(--line,#cbd5e1)] bg-white cursor-crosshair shadow-sm"
				style={{ height: `${height}px` }}
			/>
			{trackerRef.current.getStrokes().length === 0 && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--muted,#64748b)]">
					{placeholder}
				</div>
			)}
			<div className="mt-2 flex w-full justify-between items-center text-xs text-[var(--muted,#64748b)]">
				<span>Штрихов: {trackerRef.current.getStrokes().length}</span>
				<button
					type="button"
					onClick={handleClear}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft,#f1f5f9)] active:scale-95 transition-all min-h-[44px] min-w-[44px]"
					title="Очистить поле подписи"
				>
					<RotateCcw size={14} />
					<span>Очистить</span>
				</button>
			</div>
		</div>
	);
};
