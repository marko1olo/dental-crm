import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw } from "lucide-react";

export interface ConsentSignCanvasProps {
	onSignatureChange: (dataUrl: string | null) => void;
	height?: number | undefined;
}

export const ConsentSignCanvas: React.FC<ConsentSignCanvasProps> = ({
	onSignatureChange,
	height = 140,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasPoints, setHasPoints] = useState(false);

	const clear = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasPoints(false);
		onSignatureChange(null);
	}, [onSignatureChange]);

	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		setIsDrawing(true);
		setHasPoints(true);
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
		const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
		ctx.beginPath();
		ctx.moveTo(clientX - rect.left, clientY - rect.top);
	};

	const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
		const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.strokeStyle = "var(--ink, #0f172a)";
		ctx.lineTo(clientX - rect.left, clientY - rect.top);
		ctx.stroke();
	};

	const stopDrawing = () => {
		if (!isDrawing) return;
		setIsDrawing(false);
		const canvas = canvasRef.current;
		if (canvas && hasPoints) {
			onSignatureChange(canvas.toDataURL("image/png"));
		}
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.width = canvas.parentElement?.clientWidth || 400;
		canvas.height = height;
	}, [height]);

	return (
		<div className="flex flex-col gap-1.5 w-full">
			<div className="flex justify-between items-center text-xs">
				<span className="font-semibold text-[var(--ink)]">Подпись пациента (пальцем или стилусом):</span>
				<button
					type="button"
					className="text-xs text-[var(--muted)] hover:text-[var(--teal,#0d9488)] flex items-center gap-1 cursor-pointer"
					onClick={clear}
				>
					<RotateCcw size={12} />
					<span>Очистить</span>
				</button>
			</div>
			<div className="w-full rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--paper)] overflow-hidden relative touch-none">
				<canvas
					ref={canvasRef}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
					style={{ display: "block", width: "100%", height: `${height}px`, cursor: "crosshair" }}
				/>
				{!hasPoints && (
					<div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] text-xs pointer-events-none select-none">
						Распишитесь здесь
					</div>
				)}
			</div>
		</div>
	);
};
