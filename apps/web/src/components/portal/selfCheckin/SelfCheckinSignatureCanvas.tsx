import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileSignature, RotateCcw } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";

export interface SelfCheckinSignatureCanvasProps {
	readonly consentTitle: string;
	readonly signerPhone?: string | undefined;
	readonly isSubmitting?: boolean | undefined;
	readonly onConfirmSignature: (signatureSvg: string) => void;
	readonly onCancel?: (() => void) | undefined;
}

export const SelfCheckinSignatureCanvas: React.FC<SelfCheckinSignatureCanvasProps> = ({
	consentTitle,
	signerPhone,
	isSubmitting = false,
	onConfirmSignature,
	onCancel,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasStrokes, setHasStrokes] = useState(false);
	const [pointsCount, setPointsCount] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const lastPointRef = useRef<{ x: number; y: number } | null>(null);
	const strokePointsCountRef = useRef<number>(0);
	const totalLengthRef = useRef<number>(0);

	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const effectiveWidth = rect.width > 0 ? rect.width : 340;
		const effectiveHeight = rect.height > 0 ? rect.height : 140;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

		canvas.width = effectiveWidth * dpr;
		canvas.height = effectiveHeight * dpr;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.lineWidth = 2.5;

			const isDark =
				document.documentElement.classList.contains("dark") ||
				document.documentElement.getAttribute("data-theme") === "dark" ||
				(typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

			ctx.strokeStyle = isDark ? "#38bdf8" : "#0f172a";
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(setupCanvas, 50);
		window.addEventListener("resize", setupCanvas);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("resize", setupCanvas);
		};
	}, [setupCanvas]);

	const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();

		if ("touches" in e) {
			const touch = e.touches[0];
			if (!touch) return { x: 0, y: 0 };
			return {
				x: touch.clientX - rect.left,
				y: touch.clientY - rect.top,
			};
		}
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	};

	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		if ("touches" in e) {
			e.preventDefault();
		}
		const { x, y } = getCanvasCoords(e);
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;

		ctx.beginPath();
		ctx.moveTo(x, y);
		lastPointRef.current = { x, y };
		strokePointsCountRef.current += 1;
		setPointsCount(strokePointsCountRef.current);
		setIsDrawing(true);
		setError(null);
		triggerHaptic("light");
	};

	const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		if ("touches" in e) {
			e.preventDefault();
		}
		const { x, y } = getCanvasCoords(e);
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx || !lastPointRef.current) return;

		const lastPoint = lastPointRef.current;
		const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
		if (dist < 1.2) return;

		strokePointsCountRef.current += 1;
		totalLengthRef.current += dist;
		setPointsCount(strokePointsCountRef.current);

		const midPointX = (lastPoint.x + x) / 2;
		const midPointY = (lastPoint.y + y) / 2;
		ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPointX, midPointY);
		ctx.stroke();

		lastPointRef.current = { x, y };
		if (strokePointsCountRef.current >= 10 && totalLengthRef.current >= 25) {
			setHasStrokes(true);
		}
	};

	const stopDrawing = () => {
		if (!isDrawing) return;
		const ctx = canvasRef.current?.getContext("2d");
		if (ctx && lastPointRef.current) {
			ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
			ctx.stroke();
		}
		lastPointRef.current = null;
		setIsDrawing(false);
		if (strokePointsCountRef.current >= 10 && totalLengthRef.current >= 25) {
			setHasStrokes(true);
		}
	};

	const clearCanvas = () => {
		triggerHaptic("medium");
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setupCanvas();
		lastPointRef.current = null;
		strokePointsCountRef.current = 0;
		totalLengthRef.current = 0;
		setPointsCount(0);
		setHasStrokes(false);
		setError(null);
	};

	const handleConfirm = () => {
		if (isSubmitting) return;
		if (!canvasRef.current || !hasStrokes || pointsCount < 10) {
			triggerHaptic("error");
			setError("Пожалуйста, распишитесь пальцем в поле выше (не менее 10 точек росчерка).");
			return;
		}

		triggerHaptic("success");
		const signaturePng = canvasRef.current.toDataURL("image/png");
		const nowStr = new Date().toLocaleString("ru-RU");
		const phoneFormatted = signerPhone ? `***-**-${signerPhone.slice(-4)}` : "Терминал / Смартфон";

		const signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 90" width="340" height="90"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><image href="${signaturePng}" x="12" y="10" width="140" height="70" preserveAspectRatio="xMidYMid meet"/><text x="165" y="32" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ЛИЧНАЯ ПОДПИСЬ ПАЦИЕНТА</text><text x="165" y="50" font-family="sans-serif" font-size="10" fill="#166534">Сенсорный экран • ${phoneFormatted}</text><text x="165" y="68" font-family="sans-serif" font-size="9" fill="#64748b">${nowStr}</text></svg>`;

		onConfirmSignature(signatureSvg);
	};

	return (
		<div
			className="signature-pad-container"
			style={{
				padding: "12px",
				borderRadius: "14px",
				backgroundColor: "var(--paper-soft, var(--paper))",
				border: "1px solid var(--line)",
				marginTop: "10px",
			}}
			data-testid="selfcheckin-touch-signature-pad"
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "8px",
				}}
			>
				<span
					style={{
						fontSize: "13px",
						fontWeight: 700,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<FileSignature size={16} className="text-teal-600" />
					<span>Распишитесь пальцем на экране:</span>
				</span>

				<button
					type="button"
					onClick={clearCanvas}
					className="signature-pad-btn signature-pad-btn-outline"
					style={{
						minHeight: "48px",
						padding: "6px 12px",
						fontSize: "13px",
						fontWeight: 600,
						display: "flex",
						alignItems: "center",
						gap: "6px",
						borderRadius: "10px",
						border: "1px solid var(--line)",
						backgroundColor: "var(--paper-card, var(--paper))",
						color: "var(--muted)",
						cursor: "pointer",
					}}
					title="Очистить роспись и повторить ввод"
					data-testid="signature-clear-btn"
				>
					<RotateCcw size={16} />
					<span>Очистить</span>
				</button>
			</div>

			{/* Interactive Retina Canvas */}
			<div
				className="signature-pad-canvas-wrapper"
				style={{
					position: "relative",
					width: "100%",
					height: "140px",
					borderRadius: "10px",
					border: hasStrokes ? "2px solid var(--teal)" : "2px dashed var(--line)",
					backgroundColor: "var(--paper-card, var(--paper))",
					overflow: "hidden",
					touchAction: "none",
					cursor: "crosshair",
				}}
			>
				<canvas
					ref={canvasRef}
					className="signature-pad-canvas"
					style={{ width: "100%", height: "100%", display: "block" }}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
					data-testid="touchscreen-signature-canvas"
				/>

				{!hasStrokes && (
					<div
						className="signature-pad-placeholder"
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--muted)",
							pointerEvents: "none",
							userSelect: "none",
							fontSize: "13px",
							fontWeight: 500,
							opacity: 0.7,
						}}
					>
						<FileSignature size={24} style={{ marginBottom: "4px" }} />
						<span>Проведите роспись пальцем или стилусом</span>
					</div>
				)}
			</div>

			{error && (
				<div
					style={{
						color: "var(--danger, #dc2626)",
						fontSize: "12px",
						fontWeight: 600,
						marginTop: "6px",
					}}
					data-testid="signature-error-msg"
				>
					{error}
				</div>
			)}

			{/* Action confirmation row */}
			<div
				style={{
					display: "flex",
					gap: "8px",
					marginTop: "10px",
					alignItems: "center",
				}}
			>
				<button
					type="button"
					className="selfcheckin-btn-primary"
					onClick={handleConfirm}
					style={{
						flex: 1,
						minHeight: "52px",
						fontSize: "15px",
						fontWeight: 700,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
						borderRadius: "12px",
						backgroundColor: hasStrokes ? "var(--teal)" : "var(--paper-soft)",
						color: hasStrokes ? "var(--on-teal, #ffffff)" : "var(--muted)",
						border: "1px solid var(--line)",
						cursor: hasStrokes ? "pointer" : "default",
						transition: "all 0.15s ease",
					}}
					title={isSubmitting ? "Сохранение подписи..." : "Подтвердить роспись на сенсорном экране"}
					data-testid="confirm-touch-signature-btn"
				>
					<CheckCircle2 size={16} />
					<span>Подтвердить подпись пальцем</span>
				</button>

				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						style={{
							minHeight: "44px",
							padding: "0 14px",
							fontSize: "13px",
							fontWeight: 600,
							borderRadius: "10px",
							border: "1px solid var(--line)",
							backgroundColor: "transparent",
							color: "var(--muted)",
							cursor: "pointer",
						}}
					>
						Отмена
					</button>
				)}
			</div>
		</div>
	);
};
