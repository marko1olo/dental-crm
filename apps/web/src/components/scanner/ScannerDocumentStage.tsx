/**
 * ScannerDocumentStage.tsx
 *
 * Viewport stage for live document camera scanning, hardware video device selection,
 * aspect-ratio guide framing, drag & drop, and binarization / contrast enhancements.
 */

import React, { useCallback } from "react";
import {
	Camera,
	ClipboardList,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Folder,
	Info,
	Paperclip,
	RotateCw,
	Shield,
} from "lucide-react";
import {
	DOCUMENT_PRESETS_LIST,
	type DocumentFilterMode,
	type DocumentPresetIcon,
	type DocumentType,
} from "./documentScannerEngine";
import type { useScannerCockpit } from "./useScannerCockpit";

export interface ScannerDocumentStageProps {
	cockpit: ReturnType<typeof useScannerCockpit>;
}

const renderPresetIcon = (iconName: DocumentPresetIcon, size = 16) => {
	switch (iconName) {
		case "CreditCard":
			return <CreditCard size={size} />;
		case "Shield":
			return <Shield size={size} />;
		case "FileSpreadsheet":
			return <FileSpreadsheet size={size} />;
		case "FileText":
			return <FileText size={size} />;
		case "ClipboardList":
			return <ClipboardList size={size} />;
		case "Paperclip":
		default:
			return <Paperclip size={size} />;
	}
};

export const ScannerDocumentStage: React.FC<ScannerDocumentStageProps> = ({ cockpit }) => {
	const {
		selectedDocType,
		setSelectedDocType,
		preset,
		cameraError,
		isCapturing,
		filterMode,
		setFilterMode,
		capturedDataUrl,
		capturedBlob,
		rotationDeg,
		availableCameras,
		selectedCameraId,
		setSelectedCameraId,
		videoRef,
		canvasRef,
		fileInputRef,
		isDragOver,
		setIsDragOver,
		handleCapture,
		handleRetake,
		handleRotate,
		processFile,
		ocrSummary,
	} = cockpit;

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				processFile(file);
			}
			if (e.target) {
				e.target.value = "";
			}
		},
		[processFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, [setIsDragOver]);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, [setIsDragOver]);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);
			const file = e.dataTransfer.files?.[0];
			if (file) {
				processFile(file);
			}
		},
		[processFile, setIsDragOver],
	);

	return (
		<div className="flex flex-col gap-3">
			{/* Presets and Camera Selector Header */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="scanner-presets-bar">
					{DOCUMENT_PRESETS_LIST.map((p) => {
						const isSelected = selectedDocType === p.id;
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => setSelectedDocType(p.id)}
								className={`scanner-preset-btn ${isSelected ? "active" : ""}`}
								title={p.title}
							>
								{renderPresetIcon(p.icon, 15)}
								<span>{p.shortTitle}</span>
							</button>
						);
					})}
				</div>

				{availableCameras.length > 1 && (
					<div className="flex items-center gap-1.5 shrink-0">
						<Camera size={14} className="text-[var(--muted)]" />
						<select
							value={selectedCameraId}
							onChange={(e) => setSelectedCameraId(e.target.value)}
							className="h-8 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-2 text-xs text-[var(--ink)] cursor-pointer outline-none"
							title="Выбор камеры или документ-сканера"
						>
							{availableCameras.map((cam, idx) => (
								<option key={cam.deviceId || idx} value={cam.deviceId}>
									{cam.label || `Камера ${idx + 1}`}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* Main Viewport Card */}
			<div className="scanner-viewport-card">
				<div
					className={`scanner-stage-container ${isDragOver ? "drag-over" : ""}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					{isCapturing ? (
						<>
							{cameraError ? (
								<div className="flex flex-col items-center justify-center p-8 text-center text-white">
									<p className="text-sm font-semibold text-[var(--danger,#ef4444)] mb-2">
										{cameraError}
									</p>
									<p className="text-xs text-[var(--muted)] mb-4 max-w-sm">
										Подключите веб-камеру/документ-сканер либо загрузите PDF или изображение документа с диска:
									</p>
									<button
										type="button"
										data-testid="scanner-fallback-file-button"
										onClick={() => fileInputRef.current?.click()}
										className="scanner-secondary-btn"
									>
										<Folder size={15} />
										<span>Выбрать файл с диска</span>
									</button>
								</div>
							) : (
								<div className="relative w-full h-full flex items-center justify-center">
									<video
										ref={videoRef}
										playsInline
										muted
										autoPlay
										className="scanner-video-feed"
									/>

									{/* Guide Overlay with Target Document Ratio */}
									<div
										className="scanner-guide-overlay"
										style={{
											width: "82%",
											aspectRatio: String(preset.aspectRatio),
											maxWidth: "520px",
										}}
									>
										<div className="scanner-guide-pill">
											<span>{preset.shortTitle}</span>
											<span>{preset.expectedFormatHint}</span>
										</div>
									</div>
								</div>
							)}
						</>
					) : (
						<div className="relative w-full h-full flex flex-col items-center justify-center p-3">
							{capturedDataUrl ? (
								<img
									src={capturedDataUrl}
									alt="Скан документа"
									className="scanner-preview-img"
								/>
							) : capturedBlob &&
								(capturedBlob.type === "application/pdf" ||
									(capturedBlob as File).name?.toLowerCase().endsWith(".pdf")) ? (
								<div className="scanner-pdf-card">
									<FileText size={44} className="text-[var(--teal)] mb-3" />
									<span className="text-sm font-bold text-[var(--ink)] mb-1">
										{(capturedBlob as File).name || `${preset.shortTitle}.pdf`}
									</span>
									<span className="text-xs text-[var(--muted)]">
										PDF готов к прикреплению ({Math.round(capturedBlob.size / 1024)} КБ)
									</span>
								</div>
							) : null}
						</div>
					)}

					<canvas ref={canvasRef} className="hidden" />
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,.pdf"
						className="hidden"
						onChange={handleFileInputChange}
					/>
				</div>

				{/* OCR Telemetry Strip */}
				{ocrSummary && (
					<div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--teal-surface)] px-4 py-2.5 text-xs text-[var(--teal-dark)] font-medium">
						<Info size={15} className="shrink-0" />
						<span>{ocrSummary}</span>
					</div>
				)}

				{/* Controls Bar */}
				<div className="scanner-controls-bar">
					<div className="scanner-filters-group">
						{(
							[
								{ id: "auto_contrast", label: "Контраст" },
								{ id: "high_contrast_bw", label: "Ч/Б текст" },
								{ id: "grayscale", label: "Серое" },
								{ id: "original", label: "Оригинал" },
							] as const
						).map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setFilterMode(f.id as DocumentFilterMode)}
								className={`scanner-filter-btn ${filterMode === f.id ? "active" : ""}`}
							>
								{f.label}
							</button>
						))}
					</div>

					<div className="scanner-action-buttons">
						{isCapturing ? (
							<>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="scanner-secondary-btn"
								>
									<Folder size={14} />
									<span>Файл</span>
								</button>
								{cameraError ? (
									<button
										type="button"
										data-testid="scanner-capture-button"
										onClick={() => fileInputRef.current?.click()}
										className="scanner-secondary-btn"
									>
										<Folder size={14} />
										<span>Выбрать файл</span>
									</button>
								) : (
									<button
										type="button"
										data-testid="scanner-capture-button"
										onClick={handleCapture}
										className="scanner-secondary-btn"
									>
										<Camera size={14} />
										<span>Сфотографировать</span>
									</button>
								)}
							</>
						) : (
							<>
								<button
									type="button"
									onClick={handleRotate}
									className="scanner-secondary-btn"
									title="Повернуть на 90 градусов"
								>
									<RotateCw size={14} />
									<span>{rotationDeg}°</span>
								</button>
								<button
									type="button"
									onClick={handleRetake}
									className="scanner-secondary-btn"
								>
									Переснять
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
export default ScannerDocumentStage;
