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
import { exportSignatureToSvg, type SignatureStroke } from "../signaturePadMath";

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
	const strokesRef = useRef<SignatureStroke[]>([]);
	const currentStrokeRef = useRef<Point[]>([]);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [strokeCount, setStrokeCount] = useState<number>(0);

	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const displayWidth = 360;
		const displayHeight = 120;

		// Поддержка четкого HiDPI рендеринга без блюра
		if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
			canvas.width = displayWidth * dpr;
			canvas.height = displayHeight * dpr;
		}

		ctx.save();
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, displayWidth, displayHeight);

		const allStrokes: SignatureStroke[] = [...strokesRef.current];
		if (currentStrokeRef.current.length > 0) {
			allStrokes.push({
				points: currentStrokeRef.current.map((pt) => ({ x: pt.x, y: pt.y, time: Date.now() })),
				color: "#0d9488",
				width: 2.5,
			});
		}

		for (const stroke of allStrokes) {
			if (stroke.points.length === 0) continue;
			const color = stroke.color || "#0d9488";
			const width = stroke.width || 2.5;

			if (stroke.points.length === 1) {
				const p = stroke.points[0]!;
				ctx.beginPath();
				ctx.fillStyle = color;
				ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
				ctx.fill();
				continue;
			}

			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			const first = stroke.points[0]!;
			ctx.moveTo(first.x, first.y);

			for (let i = 1; i < stroke.points.length - 1; i++) {
				const current = stroke.points[i]!;
				const next = stroke.points[i + 1]!;
				const midX = (current.x + next.x) / 2;
				const midY = (current.y + next.y) / 2;
				ctx.quadraticCurveTo(current.x, current.y, midX, midY);
			}

			const last = stroke.points[stroke.points.length - 1]!;
			ctx.lineTo(last.x, last.y);
			ctx.stroke();
		}

		ctx.restore();
	}, []);

	useEffect(() => {
		redrawCanvas();
	}, [redrawCanvas, strokeCount]);

	const getScaledPoint = (e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point => {
		const rect = canvas.getBoundingClientRect();
		const scaleX = rect.width > 0 ? 360 / rect.width : 1;
		const scaleY = rect.height > 0 ? 120 / rect.height : 1;
		return {
			x: Math.max(0, Math.min(360, (e.clientX - rect.left) * scaleX)),
			y: Math.max(0, Math.min(120, (e.clientY - rect.top) * scaleY)),
		};
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.setPointerCapture(e.pointerId);
		setIsDrawing(true);
		const p = getScaledPoint(e, canvas);
		currentStrokeRef.current = [p];
		redrawCanvas();
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const p = getScaledPoint(e, canvas);
		currentStrokeRef.current.push(p);
		redrawCanvas();
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		setIsDrawing(false);
		const canvas = canvasRef.current;
		if (canvas && canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
		if (currentStrokeRef.current.length > 0) {
			strokesRef.current.push({
				points: currentStrokeRef.current.map((pt) => ({
					x: pt.x,
					y: pt.y,
					time: Date.now(),
				})),
				color: "#0d9488",
				width: 2.5,
			});
			currentStrokeRef.current = [];
		}

		if (strokesRef.current.length > 0) {
			const svg = exportSignatureToSvg(strokesRef.current, 360, 120);
			onSignatureChange(svg);
			setStrokeCount(strokesRef.current.length);
		}
		redrawCanvas();
	};

	const handleClear = () => {
		strokesRef.current = [];
		currentStrokeRef.current = [];
		setStrokeCount(0);
		onSignatureChange("");
		redrawCanvas();
	};

	const hasDrawing = strokeCount > 0 || currentStrokeRef.current.length > 0;

	return (
		<div
			data-testid="consent-signature-pad"
			className="mt-2 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs space-y-4"
		>
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
					Подписано пациентом на бумажном носителе (оригинал хранится в архиве)
				</span>
			</label>

			{!isPaperChecked && (
				<div className="space-y-2">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted,#64748b)]">
						<span>Распишитесь пальцем или стилусом на экране (накладывается на весь пакет):</span>
						<button
							type="button"
							data-testid="btn-clear-signature"
							onClick={handleClear}
							className="dente-btn dente-btn-secondary inline-flex items-center gap-1 text-xs text-[var(--ink,#0f172a)] min-h-[36px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer"
							title="Очистить холст"
						>
							<RotateCcw size={13} className="text-current shrink-0" />
							<span>Очистить подпись</span>
						</button>
					</div>
					<div className="relative touch-none border border-[var(--line,#cbd5e1)] rounded-xl bg-[var(--paper-strong,#ffffff)] overflow-hidden shadow-2xs">
						<canvas
							ref={canvasRef}
							style={{ width: "100%", height: "120px" }}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							className="cursor-crosshair block"
						/>
						{!hasDrawing && !signatureSvg && (
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--ink-muted,#64748b)]">
								Поле для сенсорной подписи пациента (стилус или палец)
							</div>
						)}
						{!hasDrawing && signatureSvg && (
							<div
								className="pointer-events-none absolute inset-0 flex items-center justify-center p-2 opacity-80"
								dangerouslySetInnerHTML={{ __html: signatureSvg }}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
