import { useEffect, useRef, useState, useCallback } from "react";

export function useBudgetCanvasDrawing(signerName: string, defaultPatientName?: string) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [hasStrokes, setHasStrokes] = useState<boolean>(false);

	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const effectiveWidth = rect.width > 0 ? rect.width : 400;
		const effectiveHeight = rect.height > 0 ? rect.height : 140;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		canvas.width = effectiveWidth * dpr;
		canvas.height = effectiveHeight * dpr;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = "#0d9488";
			ctx.lineWidth = 2.5;
		}
	}, []);

	const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		ctx.beginPath();
		ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
		setIsDrawing(true);
		setHasStrokes(true);
	};

	const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
		ctx.stroke();
	};

	const stopDrawing = () => setIsDrawing(false);

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		setHasStrokes(false);
	};

	const handleOneClickPep = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const w = (canvas.width || 400 * dpr) / dpr;
		const h = (canvas.height || 140 * dpr) / dpr;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "rgba(13, 148, 136, 0.08)";
		ctx.fillRect(8, 8, w - 16, h - 16);
		ctx.strokeStyle = "#0d9488";
		ctx.lineWidth = 2;
		ctx.strokeRect(8, 8, w - 16, h - 16);
		ctx.fillStyle = "#0f766e";
		ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("ПОДПИСАНО В ПОРТАЛЕ ПАЦИЕНТА", w / 2, h / 2 - 16);
		ctx.fillStyle = "#115e59";
		ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillText("Электронная подпись • Подтверждено пациентом", w / 2, h / 2 + 6);
		const dateStr = new Date().toLocaleString("ru-RU");
		ctx.fillStyle = "#64748b";
		ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillText(`${signerName.trim() || defaultPatientName || "Пациент"} • ${dateStr}`, w / 2, h / 2 + 24);
		setHasStrokes(true);
	}, [signerName, defaultPatientName]);

	return {
		canvasRef,
		hasStrokes,
		setupCanvas,
		startDrawing,
		draw,
		stopDrawing,
		clearCanvas,
		handleOneClickPep,
	};
}
