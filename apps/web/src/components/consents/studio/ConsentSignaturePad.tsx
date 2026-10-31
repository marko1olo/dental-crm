/**
 * apps/web/src/components/consents/studio/ConsentSignaturePad.tsx
 *
 * Интерактивный сенсорный холст электронной подписи пациента (ПЭП по 63-ФЗ).
 * Поддерживает ввод стилусом, пальцем и мышью с экспортом в чистый векторный SVG.
 * Поддерживает 1-кликовое переключение в режим бумажного оригинала (Мандат 8e).
 * Сенсорная эргономика Apple HIG: тач-таргеты >= 44x44px, touch-action: none.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { FileSignature, RotateCcw } from "lucide-react";

export interface ConsentSignaturePadProps {
	readonly isPaperChecked: boolean;
	readonly onPaperCheckChange: (checked: boolean) => void;
	readonly signatureSvg: string;
	readonly onSignatureChange: (svg: string) => void;
	readonly selectedCount: number;
}

interface Point {
	x: number;
	y: number;
}

export const ConsentSignaturePad: React.FC<ConsentSignaturePadProps> = ({
	isPaperChecked,
	onPaperCheckChange,
	signatureSvg,
	onSignatureChange,
	selectedCount,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [points, setPoints] = useState<Point[]>([]);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);

	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (points.length < 2) return;

		ctx.beginPath();
		ctx.strokeStyle = "#0f172a";
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.moveTo(points[0].x, points[0].y);

		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		ctx.stroke();
	}, [points]);

	useEffect(() => {
		redrawCanvas();
	}, [redrawCanvas]);

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.setPointerCapture(e.pointerId);
		setIsDrawing(true);
		const rect = canvas.getBoundingClientRect();
		const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		setPoints([p]);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		setPoints((prev) => [...prev, p]);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		setIsDrawing(false);
		const canvas = canvasRef.current;
		if (canvas && canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
		if (points.length > 2) {
			const d = points.reduce(
				(acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
				"",
			);
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" width="100%" height="100%"><path d="${d.trim()}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
			onSignatureChange(svg);
		}
	};

	const handleClear = () => {
		setPoints([]);
		onSignatureChange("");
		redrawCanvas();
	};

	return (
		<div className="mt-2 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FileSignature size={18} className="text-[var(--teal,#0d9488)]" />
					<span className="text-xs md:text-sm font-semibold text-[var(--ink,#0f172a)]">
						Электронная подпись пациента (Пакет из {selectedCount} бланков)
					</span>
				</div>
				<span className="text-xs text-[var(--ink-muted,#64748b)]">
					Сенсорный ввод или бумажный оригинал
				</span>
			</div>

			<label className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer transition-colors min-h-[44px]">
				<input
					type="checkbox"
					checked={isPaperChecked}
					onChange={(e) => onPaperCheckChange(e.target.checked)}
					className="w-4 h-4 rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] border-[var(--line,#cbd5e1)] cursor-pointer"
				/>
				<span className="text-xs md:text-sm text-[var(--ink,#0f172a)] font-medium">
					✓ Подписано пациентом на бумажном носителе (оригинал хранится в архиве)
				</span>
			</label>

			{!isPaperChecked && (
				<div className="space-y-2">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted,#64748b)]">
						<span>Распишитесь пальцем или стилусом на экране (накладывается на весь пакет):</span>
						<button
							type="button"
							onClick={handleClear}
							className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] min-h-[36px] px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] cursor-pointer"
							title="Очистить холст"
						>
							<RotateCcw size={13} />
							<span>Очистить подпись</span>
						</button>
					</div>
					<div className="relative touch-none border border-[var(--line,#cbd5e1)] rounded-xl bg-white overflow-hidden shadow-2xs">
						<canvas
							ref={canvasRef}
							width={360}
							height={120}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							className="w-full h-[120px] cursor-crosshair"
						/>
						{points.length === 0 && !signatureSvg && (
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
								Поле для сенсорной подписи пациента (стилус или палец)
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
