import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	FileSignature,
	RotateCcw,
} from "lucide-react";

export interface PublicBudgetSignaturePadProps {
	defaultSignerName?: string;
	isSubmitting: boolean;
	error?: string | null;
	onSign: (data: { signaturePng: string; signerName: string }) => Promise<void> | void;
}

export const PublicBudgetSignaturePad: React.FC<PublicBudgetSignaturePadProps> = ({
	defaultSignerName = "",
	isSubmitting,
	error,
	onSign,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [hasStrokes, setHasStrokes] = useState<boolean>(false);
	const [pointsCount, setPointsCount] = useState<number>(0);
	const [signerName, setSignerName] = useState<string>(defaultSignerName);
	const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
	const [localError, setLocalError] = useState<string | null>(null);

	const lastPointRef = useRef<{ x: number; y: number } | null>(null);
	const strokePointsCountRef = useRef<number>(0);
	const totalLengthRef = useRef<number>(0);

	useEffect(() => {
		if (defaultSignerName && !signerName) {
			setSignerName(defaultSignerName);
		}
	}, [defaultSignerName, signerName]);

	// Setup Retina canvas resolution and styles
	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const effectiveWidth = rect.width > 0 ? rect.width : 360;
		const effectiveHeight = rect.height > 0 ? rect.height : 155;
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
				(typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
			ctx.strokeStyle = isDark ? "#38bdf8" : "#0f172a"; // Crisp neon cyan in dark mode, deep clinical dark navy ink in light mode
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(setupCanvas, 100);
		window.addEventListener("resize", setupCanvas);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("resize", setupCanvas);
		};
	}, [setupCanvas]);

	const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
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

	const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
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
		setLocalError(null);
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawing) return;
		if ("touches" in e) {
			e.preventDefault();
		}
		const { x, y } = getCanvasCoords(e);
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx || !lastPointRef.current) return;

		const lastPoint = lastPointRef.current;
		const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
		if (dist < 1.5) return; // Подавление микро-дребезга сенсора

		strokePointsCountRef.current += 1;
		totalLengthRef.current += dist;
		setPointsCount(strokePointsCountRef.current);

		// Плавная аппроксимация мазков чернил через квадратичные кривые Безье
		const midPointX = (lastPoint.x + x) / 2;
		const midPointY = (lastPoint.y + y) / 2;
		ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPointX, midPointY);
		ctx.stroke();

		lastPointRef.current = { x, y };
		if (strokePointsCountRef.current >= 15 && totalLengthRef.current >= 35) {
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
		if (strokePointsCountRef.current >= 15 && totalLengthRef.current >= 35) {
			setHasStrokes(true);
		}
	};

	const clearCanvas = () => {
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
		setLocalError(null);
	};

	const handleSubmit = () => {
		if (!canvasRef.current || !hasStrokes || pointsCount < 15) {
			setLocalError("Пожалуйста, поставьте полноценную личную подпись в поле выше (не менее 15 точек росчерка).");
			return;
		}
		if (!signerName.trim()) {
			setLocalError("Пожалуйста, укажите имя или фамилию подписывающего лица.");
			return;
		}
		if (!agreedToTerms) {
			setLocalError("Необходимо подтвердить ознакомление с планом лечения и сметой.");
			return;
		}

		setLocalError(null);
		const signaturePng = canvasRef.current.toDataURL("image/png");
		onSign({ signaturePng, signerName: signerName.trim() });
	};

	const effectiveError = localError || error;

	return (
		<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
			{/* Header bar: Strict legal icon + Ghost Clear Button */}
			<div className="flex items-center justify-between gap-3">
				<label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
					<FileSignature className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
					<span className="truncate">Подпись пациента (ПЭП)</span>
				</label>
				<button
					type="button"
					onClick={clearCanvas}
					className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-1.5 transition-all relative before:absolute before:-inset-1.5 before:content-[''] shrink-0 select-none"
					title="Очистить поле подписи"
				>
					<RotateCcw className="w-3.5 h-3.5" />
					<span>Очистить</span>
				</button>
			</div>

			{/* Signature Canvas container with baseline signature guide */}
			<div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden touch-none h-[155px]">
				{/* Эстетичная базовая направляющая линия подписи и юридический ориентир */}
				<div className="absolute left-6 right-6 bottom-5 pointer-events-none select-none flex flex-col gap-1.5 z-0">
					<div className="flex items-center gap-2 text-slate-300 dark:text-slate-700">
						<span className="text-xs font-serif text-slate-400 dark:text-slate-600 select-none">✕</span>
						<div className="flex-1 border-b border-dashed border-slate-300 dark:border-slate-700/80" />
					</div>
					<div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium px-4">
						<span>Личная подпись пациента</span>
						<span className="text-[9px] text-slate-400/80 dark:text-slate-600">Электронная подпись (ПЭП)</span>
					</div>
				</div>

				<canvas
					ref={canvasRef}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
					className="w-full h-full cursor-crosshair block relative z-10 bg-transparent"
				/>
				{!hasStrokes && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500 text-xs font-medium z-0">
						Распишитесь пальцем или стилусом здесь
					</div>
				)}
			</div>

			{/* Signer full name input */}
			<div className="space-y-1">
				<label htmlFor="signerNameInput" className="text-xs text-slate-600 dark:text-slate-400 block">
					ФИО подписывающего лица:
				</label>
				<input
					id="signerNameInput"
					type="text"
					value={signerName}
					onChange={(e) => setSignerName(e.target.value)}
					placeholder="Иванов И.И."
					className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-cyan-500 transition"
				/>
			</div>

			{/* Consent checkbox */}
			<label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
				<input
					type="checkbox"
					checked={agreedToTerms}
					onChange={(e) => setAgreedToTerms(e.target.checked)}
					className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-0 bg-white dark:bg-slate-950"
				/>
				<span>
					Я подтверждаю согласие с предложенным планом лечения и стоимостью (ст. 20 323-ФЗ и ПП РФ №659).
				</span>
			</label>

			{effectiveError && (
				<div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
					<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
					<span>{effectiveError}</span>
				</div>
			)}

			{/* Primary CTA (Natural Thumb Zone, touch target >= 44px) */}
			<button
				type="button"
				onClick={handleSubmit}
				disabled={isSubmitting || !hasStrokes || pointsCount < 15}
				className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-medium text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2"
			>
				{isSubmitting ? (
					<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
				) : (
					<>
						<CheckCircle2 className="w-4 h-4" />
						<span>Подписать и согласовать смету</span>
					</>
				)}
			</button>
		</div>
	);
};
