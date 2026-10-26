/**
 * usePhotoCapture.ts
 *
 * Canvas photo capture, binarization filters, 90-degree rotations,
 * and drag-and-drop file processing hook.
 */

import { useCallback, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { applyDocumentEnhancementToCanvas, type DocumentFilterMode } from "../documentScannerEngine";

export function usePhotoCapture(onCaptureDone?: () => void, onRetakePhoto?: () => void) {
	const [isCapturing, setIsCapturing] = useState(true);
	const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
	const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
	const [rotationDeg, setRotationDeg] = useState(0);
	const [filterMode, setFilterMode] = useState<DocumentFilterMode>("auto_contrast");
	const [isDragOver, setIsDragOver] = useState(false);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleCapture = useCallback(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;
		const w = video.videoWidth || 1280;
		const h = video.videoHeight || 720;
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;
		ctx.drawImage(video, 0, 0, w, h);
		applyDocumentEnhancementToCanvas(canvas, filterMode);
		const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
		setCapturedDataUrl(dataUrl);
		canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, "image/jpeg", 0.92);
		setIsCapturing(false);
		onCaptureDone?.();
	}, [filterMode, onCaptureDone]);

	const handleRetake = useCallback(() => {
		setCapturedDataUrl(null);
		setCapturedBlob(null);
		setIsCapturing(true);
		onRetakePhoto?.();
	}, [onRetakePhoto]);

	const handleRotate = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !capturedDataUrl) {
			showToast("Сначала сделайте снимок или загрузите файл для поворота", "info");
			return;
		}
		const img = new Image();
		img.onload = () => {
			const prevW = canvas.width;
			const prevH = canvas.height;
			canvas.width = prevH;
			canvas.height = prevW;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return;
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate((90 * Math.PI) / 180);
			ctx.drawImage(img, -prevW / 2, -prevH / 2);
			const newUrl = canvas.toDataURL("image/jpeg", 0.92);
			setCapturedDataUrl(newUrl);
			canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, "image/jpeg", 0.92);
			setRotationDeg((prev) => (prev + 90) % 360);
		};
		img.src = capturedDataUrl;
	}, [capturedDataUrl]);

	const processFile = useCallback((file: File, onDone?: (hint?: string) => void) => {
		if (!file) return;
		if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
			setCapturedBlob(file);
			setCapturedDataUrl(null);
			setIsCapturing(false);
			onDone?.(file.name);
			return;
		}
		const objectUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(objectUrl);
			const canvas = canvasRef.current;
			if (!canvas) return;
			canvas.width = img.naturalWidth || img.width;
			canvas.height = img.naturalHeight || img.height;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (ctx) {
				ctx.drawImage(img, 0, 0);
				applyDocumentEnhancementToCanvas(canvas, filterMode);
				setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.92));
				canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, "image/jpeg", 0.92);
				setIsCapturing(false);
				onDone?.(file.name);
			}
		};
		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			showToast("Не удалось открыть изображение. Проверьте формат файла.", "error");
		};
		img.src = objectUrl;
	}, [filterMode]);

	return {
		isCapturing, setIsCapturing, capturedDataUrl, setCapturedDataUrl, capturedBlob, setCapturedBlob,
		rotationDeg, setRotationDeg, filterMode, setFilterMode, isDragOver, setIsDragOver,
		videoRef, canvasRef, fileInputRef, handleCapture, handleRetake, handleRotate, processFile,
	};
}
