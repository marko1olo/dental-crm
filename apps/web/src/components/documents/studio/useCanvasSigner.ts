/**
 * apps/web/src/components/documents/studio/useCanvasSigner.ts
 *
 * Канонический хук рисования подписи стилусом/пальцем на Canvas (Мандаты 8e, 8n).
 */

import { useRef, useCallback } from "react";

export function useCanvasSigner(onClear?: () => void) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef<boolean>(false);

	const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
		return { x: clientX - rect.left, y: clientY - rect.top, ctx: canvas.getContext("2d") };
	}, []);

	const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const coords = getCanvasCoords(e);
		if (!coords?.ctx) return;
		isDrawingRef.current = true;
		coords.ctx.beginPath();
		coords.ctx.moveTo(coords.x, coords.y);
	}, [getCanvasCoords]);

	const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		if (!isDrawingRef.current) return;
		const coords = getCanvasCoords(e);
		if (!coords?.ctx) return;
		coords.ctx.lineWidth = 2.5;
		coords.ctx.lineCap = "round";
		coords.ctx.strokeStyle = "#0d9488";
		coords.ctx.lineTo(coords.x, coords.y);
		coords.ctx.stroke();
	}, [getCanvasCoords]);

	const stopDrawing = useCallback(() => {
		isDrawingRef.current = false;
	}, []);

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		onClear?.();
	}, [onClear]);

	const getSignatureDataUrl = useCallback((): string | undefined => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;
		try {
			return canvas.toDataURL("image/png");
		} catch {
			return undefined;
		}
	}, []);

	return {
		canvasRef,
		startDrawing,
		draw,
		stopDrawing,
		clearCanvas,
		getSignatureDataUrl,
	};
}
