/**
 * ScannerCameraViewport.tsx
 *
 * Live camera feed viewport with target document aspect-ratio framing,
 * fallback dropzone, and captured photo/PDF preview.
 */

import React from "react";
import { FileText, Folder } from "lucide-react";
import type { DocumentPreset } from "../documentScannerEngine";

export interface ScannerCameraViewportProps {
	readonly videoRef: React.RefObject<HTMLVideoElement | null>;
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly isCapturing: boolean;
	readonly cameraError: string | null;
	readonly preset: DocumentPreset;
	readonly capturedDataUrl: string | null;
	readonly capturedBlob: Blob | null;
	readonly isDragOver: boolean;
	readonly onDragOver: (e: React.DragEvent) => void;
	readonly onDragLeave: (e: React.DragEvent) => void;
	readonly onDrop: (e: React.DragEvent) => void;
	readonly onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ScannerCameraViewport: React.FC<ScannerCameraViewportProps> = ({
	videoRef,
	canvasRef,
	fileInputRef,
	isCapturing,
	cameraError,
	preset,
	capturedDataUrl,
	capturedBlob,
	isDragOver,
	onDragOver,
	onDragLeave,
	onDrop,
	onFileChange,
}) => {
	const isPdf = capturedBlob && (capturedBlob.type === "application/pdf" || (capturedBlob as File).name?.toLowerCase().endsWith(".pdf"));

	return (
		<div
			className={`relative flex flex-1 flex-col items-center justify-center bg-black min-h-[300px] max-h-[460px] overflow-hidden transition-all ${
				isDragOver ? "ring-4 ring-[var(--teal)] ring-inset" : ""
			}`}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			{isCapturing ? (
				cameraError ? (
					<div className="flex flex-col items-center justify-center p-6 text-center text-white">
						<p className="text-sm text-[var(--danger,#ef4444)] mb-2 font-semibold">{cameraError}</p>
						<p className="text-xs text-[var(--muted)] mb-4">
							Камера недоступна. Выберите снимок или PDF-документ с устройства:
						</p>
						<button
							type="button"
							data-testid="scanner-fallback-file-button"
							onClick={() => fileInputRef.current?.click()}
							className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--teal-dark)] cursor-pointer"
						>
							<Folder size={16} className="shrink-0" />
							<span>Выбрать файл с диска</span>
						</button>
					</div>
				) : (
					<div className="relative w-full h-full flex items-center justify-center">
						<video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-contain max-h-[420px]" />
						<div
							className="absolute pointer-events-none rounded-xl border-2 border-dashed border-[var(--teal)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
							style={{ width: "84%", aspectRatio: String(preset.aspectRatio), maxWidth: "460px" }}
						>
							<div className="absolute top-2 left-2 right-2 flex justify-between items-center text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
								<span>{preset.shortTitle}</span>
								<span>{preset.expectedFormatHint}</span>
							</div>
						</div>
					</div>
				)
			) : (
				<div className="relative w-full h-full flex flex-col items-center justify-center p-2">
					{capturedDataUrl ? (
						<img src={capturedDataUrl} alt="Скан документа" loading="lazy" decoding="async" className="max-h-[380px] w-auto rounded-lg object-contain shadow-lg" />
					) : isPdf ? (
						<div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-lg text-center max-w-sm">
							<FileText size={44} className="text-[var(--teal)] mb-2" />
							<span className="text-sm font-bold text-[var(--ink)] mb-1">{(capturedBlob as File).name || `${preset.shortTitle}.pdf`}</span>
							<span className="text-xs text-[var(--muted)]">PDF-документ готов к отправке ({Math.round(capturedBlob.size / 1024)} КБ)</span>
						</div>
					) : null}
				</div>
			)}

			<canvas ref={canvasRef} className="hidden" />
			<input ref={fileInputRef} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={onFileChange} />
		</div>
	);
};
export default ScannerCameraViewport;
