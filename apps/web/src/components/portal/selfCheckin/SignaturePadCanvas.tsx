import React, {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export interface Point {
	x: number;
	y: number;
	time: number;
}

export interface Stroke {
	points: Point[];
	color: string;
	width: number;
}

export interface SignaturePadProps {
	width?: number;
	height?: number;
	strokeColor?: string;
	strokeWidth?: number;
	placeholderText?: string;
	onSignatureChange?: (svgData: string, strokeCount: number) => void;
	className?: string;
}

/**
 * Converts an array of Strokes to an SVG string containing smoothed quadratic bezier curves
 */
export function strokesToSvg(
	strokes: Stroke[],
	width: number,
	height: number,
	strokeColor = "#0f172a",
): string {
	if (!strokes.length) return "";

	const paths = strokes
		.map((stroke) => {
			const pts = stroke.points;
			if (!pts || pts.length === 0) return "";
			if (pts.length === 1) {
				const pt = pts[0];
				if (!pt) return "";
				return `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(stroke.width / 2).toFixed(1)}" fill="${stroke.color || strokeColor}" />`;
			}

			let d = `M ${pts[0]?.x.toFixed(1)} ${pts[0]?.y.toFixed(1)}`;
			for (let i = 1; i < pts.length; i++) {
				const p0 = pts[i - 1];
				const p1 = pts[i];
				if (!p0 || !p1) continue;
				const midX = (p0.x + p1.x) / 2;
				const midY = (p0.y + p1.y) / 2;
				d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
			}
			const lastPt = pts[pts.length - 1];
			if (lastPt) {
				d += ` T ${lastPt.x.toFixed(1)} ${lastPt.y.toFixed(1)}`;
			}

			return `<path d="${d}" fill="none" stroke="${stroke.color || strokeColor}" stroke-width="${stroke.width.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" />`;
		})
		.filter(Boolean)
		.join("\n  ");

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  ${paths}\n</svg>`;
}

export const SignaturePadCanvas: React.FC<SignaturePadProps> = ({
	width = 380,
	height = 180,
	strokeColor = "#1e293b",
	strokeWidth = 2.5,
	placeholderText = "Распишитесь пальцем или стилусом здесь",
	onSignatureChange,
	className,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const currentStrokeRef = useRef<Stroke | null>(null);

	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.scale(dpr, dpr);

		// Draw baseline guide
		ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(20, height - 35);
		ctx.lineTo(width - 20, height - 35);
		ctx.stroke();
		ctx.setLineDash([]);

		// Draw all strokes
		const allStrokes = currentStrokeRef.current
			? [...strokes, currentStrokeRef.current]
			: strokes;

		for (const stroke of allStrokes) {
			const pts = stroke.points;
			if (!pts || pts.length === 0) continue;

			ctx.strokeStyle = stroke.color;
			ctx.lineWidth = stroke.width;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			if (pts.length === 1) {
				const pt0 = pts[0];
				if (pt0) {
					ctx.fillStyle = stroke.color;
					ctx.beginPath();
					ctx.arc(pt0.x, pt0.y, stroke.width / 2, 0, Math.PI * 2);
					ctx.fill();
				}
				continue;
			}

			ctx.beginPath();
			const startPt = pts[0];
			if (startPt) {
				ctx.moveTo(startPt.x, startPt.y);
			}

			for (let i = 1; i < pts.length; i++) {
				const p0 = pts[i - 1];
				const p1 = pts[i];
				if (!p0 || !p1) continue;
				const midX = (p0.x + p1.x) / 2;
				const midY = (p0.y + p1.y) / 2;
				ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
			}

			const lastPt = pts[pts.length - 1];
			if (lastPt) {
				ctx.lineTo(lastPt.x, lastPt.y);
			}
			ctx.stroke();
		}

		ctx.restore();
	}, [strokes, width, height]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		redrawCanvas();
	}, [width, height, redrawCanvas]);

	const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0, time: Date.now() };
		const rect = canvas.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(width, e.clientX - rect.left)),
			y: Math.max(0, Math.min(height, e.clientY - rect.top)),
			time: Date.now(),
		};
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		const pt = getCanvasCoords(e);
		const newStroke: Stroke = {
			points: [pt],
			color: strokeColor,
			width: strokeWidth,
		};
		currentStrokeRef.current = newStroke;
		setIsDrawing(true);
		redrawCanvas();
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing || !currentStrokeRef.current) return;
		const pt = getCanvasCoords(e);
		currentStrokeRef.current.points.push(pt);
		redrawCanvas();
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing || !currentStrokeRef.current) return;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			// Pointer capture might have ended
		}
		const finishedStroke = currentStrokeRef.current;
		currentStrokeRef.current = null;
		setIsDrawing(false);

		const updatedStrokes = [...strokes, finishedStroke];
		setStrokes(updatedStrokes);
		const svg = strokesToSvg(updatedStrokes, width, height, strokeColor);
		onSignatureChange?.(svg, updatedStrokes.length);
	};

	const handleClear = () => {
		currentStrokeRef.current = null;
		setStrokes([]);
		setIsDrawing(false);
		onSignatureChange?.("", 0);
	};

	const handleUndo = () => {
		if (!strokes.length) return;
		const updated = strokes.slice(0, -1);
		setStrokes(updated);
		const svg = strokesToSvg(updated, width, height, strokeColor);
		onSignatureChange?.(svg, updated.length);
	};

	const isEmpty = strokes.length === 0 && !isDrawing;

	return (
		<div className={`signature-pad-container ${className || ""}`}>
			<div className="signature-pad-canvas-wrapper" style={{ width, height }}>
				<canvas
					ref={canvasRef}
					className="signature-pad-canvas"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
					style={{ touchAction: "none", cursor: "crosshair" }}
				/>
				{isEmpty && (
					<div className="signature-pad-placeholder">
						<span className="signature-pad-placeholder-icon">✍️</span>
						<span>{placeholderText}</span>
					</div>
				)}
			</div>

			<div className="signature-pad-actions">
				<button
					type="button"
					className="signature-pad-btn signature-pad-btn-secondary"
					onClick={handleUndo}
					disabled={isEmpty}
					title="Отменить последний штрих"
				>
					↩ Отменить
				</button>
				<button
					type="button"
					className="signature-pad-btn signature-pad-btn-outline"
					onClick={handleClear}
					disabled={isEmpty}
					title="Очистить поле подписи"
				>
					🗑️ Очистить
				</button>
				<div className="signature-pad-status">
					{isEmpty ? (
						<span className="signature-status-pending">Подпись не поставлена</span>
					) : (
						<span className="signature-status-valid">
							✓ Росчерк зафиксирован ({strokes.length}{" "}
							{strokes.length === 1 ? "штрих" : "штриха"})
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
