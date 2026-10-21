import React, { useRef } from "react";
import { PenTool, RotateCcw } from "lucide-react";

export interface AcceptanceSignatureDrawerProps {
	readonly risksAccepted: boolean;
	readonly onRisksChange: (accepted: boolean) => void;
	readonly onSignedChange: (signed: boolean) => void;
}

export const AcceptanceSignatureDrawer: React.FC<AcceptanceSignatureDrawerProps> = ({
	risksAccepted,
	onRisksChange,
	onSignedChange,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef<boolean>(false);

	const handleClearSignature = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		onSignedChange(false);
	};

	const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		isDrawingRef.current = true;
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;

		ctx.beginPath();
		ctx.moveTo(clientX - rect.left, clientY - rect.top);
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.strokeStyle = "var(--ink, #0f172a)";
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawingRef.current) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;

		ctx.lineTo(clientX - rect.left, clientY - rect.top);
		ctx.stroke();
		onSignedChange(true);
	};

	const stopDrawing = () => {
		isDrawingRef.current = false;
	};

	return (
		<div className="mt-3 pt-3 border-t border-[var(--line-subtle)] max-w-xl mx-auto flex flex-col gap-2.5 animate-in fade-in-50 duration-150">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<PenTool size={14} className="text-[var(--teal)]" />
					Электронная подпись пациента (пальцем или стилусом на экране):
				</span>
				<button
					type="button"
					onClick={handleClearSignature}
					className="text-[11px] text-[var(--muted)] hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
				>
					<RotateCcw size={12} />
					Очистить
				</button>
			</div>

			<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
				<canvas
					ref={canvasRef}
					width={540}
					height={120}
					className="w-full h-[100px] touch-none cursor-crosshair bg-white dark:bg-slate-900"
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
			</div>

			<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
				<label className="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						checked={risksAccepted}
						onChange={(e) => onRisksChange(e.target.checked)}
						className="rounded border-[var(--line)] text-[var(--teal)]"
					/>
					<span>С планом, рисками и стоимостью ознакомлен</span>
				</label>
				<span className="italic">ст. 20 № 323-ФЗ</span>
			</div>
		</div>
	);
};
