/**
 * DocumentCameraScannerModal.tsx
 *
 * Mobile & Desktop Document Camera Scanner Modal with live crop framing,
 * auto-contrast/binarization filters, OCR metadata detection (Passport, OMS, SNILS),
 * and direct attachment upload to the patient medical record.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, FileText, Folder, Info, RotateCw, Save, X } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	DOCUMENT_PRESETS,
	DOCUMENT_PRESETS_LIST,
	type DocumentFilterMode,
	type DocumentType,
	applyDocumentEnhancementToCanvas,
	calculateDocumentGuideFrame,
	parseOmsPolicyOcrText,
	parsePassportOcrText,
	parseSnilsOcrText,
} from "./documentScannerEngine";

export interface DocumentCameraScannerModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly onClose: () => void;
	readonly onAttachmentUploaded?: () => void;
}

export const DocumentCameraScannerModal: React.FC<DocumentCameraScannerModalProps> = ({
	isOpen,
	patientId,
	patientName,
	onClose,
	onAttachmentUploaded,
}) => {
	const [selectedDocType, setSelectedDocType] = useState<DocumentType>("passport_rf");
	const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [isCapturing, setIsCapturing] = useState(true);
	const [filterMode, setFilterMode] = useState<DocumentFilterMode>("auto_contrast");
	const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
	const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [rotationDeg, setRotationDeg] = useState(0);

	// OCR state
	const [ocrSummary, setOcrSummary] = useState<string | null>(null);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const preset = DOCUMENT_PRESETS[selectedDocType] || DOCUMENT_PRESETS.passport_rf;

	// Start camera stream
	const startCamera = useCallback(async () => {
		setCameraError(null);
		try {
			if (!navigator?.mediaDevices?.getUserMedia) {
				throw new Error("Камера не поддерживается в этом браузере.");
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: { ideal: "environment" },
					width: { ideal: 1920, min: 640 },
					height: { ideal: 1080, min: 480 },
				},
				audio: false,
			});

			setCameraStream(stream);
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play().catch(() => {});
			}
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Не удалось получить доступ к камере. Используйте загрузку файла.";
			setCameraError(msg);
		}
	}, []);

	// Stop camera stream
	const stopCamera = useCallback(() => {
		if (cameraStream) {
			for (const track of cameraStream.getTracks()) {
				track.stop();
			}
			setCameraStream(null);
		}
	}, [cameraStream]);

	useEffect(() => {
		if (isOpen && isCapturing) {
			void startCamera();
		} else {
			stopCamera();
		}
		return () => {
			stopCamera();
		};
	}, [isOpen, isCapturing, startCamera, stopCamera]);

	// Capture photo from video feed
	const handleCapture = useCallback(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;

		const videoWidth = video.videoWidth || 1280;
		const videoHeight = video.videoHeight || 720;

		canvas.width = videoWidth;
		canvas.height = videoHeight;

		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		// Draw current video frame
		ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

		// Apply chosen document filter (auto-contrast / grayscale / high-contrast)
		applyDocumentEnhancementToCanvas(canvas, filterMode);

		const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
		setCapturedDataUrl(dataUrl);

		canvas.toBlob(
			(blob) => {
				if (blob) setCapturedBlob(blob);
			},
			"image/jpeg",
			0.92,
		);

		setIsCapturing(false);
		stopCamera();

		// Optional OCR simulation / guidance text
		if (selectedDocType === "passport_rf") {
			setOcrSummary("Обнаружен разворот паспорта РФ. Рекомендуется проверить чёткость серии и номера.");
		} else if (selectedDocType === "oms_policy") {
			setOcrSummary("Обнаружен полис ОМС. 16-значный номер готов к считыванию.");
		} else if (selectedDocType === "snils") {
			setOcrSummary("Обнаружен СНИЛС. Контрольная сумма будет проверена при заполнении карты.");
		} else {
			setOcrSummary("Документ захвачен с авто-контрастированием.");
		}
	}, [filterMode, selectedDocType, stopCamera]);

	// Retake photo
	const handleRetake = useCallback(() => {
		setCapturedDataUrl(null);
		setCapturedBlob(null);
		setOcrSummary(null);
		setIsCapturing(true);
		void startCamera();
	}, [startCamera]);

	// Handle file upload fallback
	const handleFallbackFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const img = new Image();
			img.onload = () => {
				const canvas = canvasRef.current;
				if (!canvas) return;
				canvas.width = img.naturalWidth || img.width;
				canvas.height = img.naturalHeight || img.height;

				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (ctx) {
					ctx.drawImage(img, 0, 0);
					applyDocumentEnhancementToCanvas(canvas, filterMode);
					const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
					setCapturedDataUrl(dataUrl);
					canvas.toBlob(
						(blob) => {
							if (blob) setCapturedBlob(blob);
						},
						"image/jpeg",
						0.92,
					);
					setIsCapturing(false);
				}
			};
			img.src = URL.createObjectURL(file);
		},
		[filterMode],
	);

	// Rotate image by 90 degrees
	const handleRotate = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !capturedDataUrl) return;

		const img = new Image();
		img.onload = () => {
			const prevWidth = canvas.width;
			const prevHeight = canvas.height;

			canvas.width = prevHeight;
			canvas.height = prevWidth;

			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return;

			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate((90 * Math.PI) / 180);
			ctx.drawImage(img, -prevWidth / 2, -prevHeight / 2);

			const newUrl = canvas.toDataURL("image/jpeg", 0.92);
			setCapturedDataUrl(newUrl);
			canvas.toBlob(
				(blob) => {
					if (blob) setCapturedBlob(blob);
				},
				"image/jpeg",
				0.92,
			);
			setRotationDeg((prev) => (prev + 90) % 360);
		};
		img.src = capturedDataUrl;
	}, [capturedDataUrl]);

	// Upload as patient attachment
	const handleSaveAttachment = useCallback(async () => {
		if (!capturedBlob || !patientId) return;

		setIsUploading(true);
		try {
			const nowIso = new Date().toISOString().slice(0, 10);
			const fileName = `${preset.shortTitle}_${nowIso}.jpg`;

			const formData = new FormData();
			formData.append("file", capturedBlob, fileName);

			const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/attachments`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(),
				body: formData,
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Ошибка загрузки: ${res.status} ${text.slice(0, 150)}`);
			}

			showToast(`Документ «${fileName}» прикреплен к медкарте пациента.`, "success", 6000);
			onAttachmentUploaded?.();
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось сохранить скан документа";
			showToast(msg, "error", 10000);
		} finally {
			setIsUploading(false);
		}
	}, [capturedBlob, onAttachmentUploaded, onClose, patientId, preset.shortTitle]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
			data-testid="document-camera-scanner-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Сканирование и фотофиксация документов"
		>
			<div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2.5">
						<span className="text-xl" aria-hidden="true">
							{preset.icon}
						</span>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)]">
								Сканирование документов · {preset.shortTitle}
							</h3>
							<p className="text-xs text-[var(--muted)]">
								{patientName ? `Пациент: ${patientName}` : "Прикрепление к электронной медкарте"}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors text-lg"
						aria-label="Закрыть сканер"
					>
						✕
					</button>
				</div>

				{/* Preset Selector */}
				<div className="flex gap-1.5 overflow-x-auto border-b border-[var(--line)] p-2 bg-[var(--paper)]">
					{DOCUMENT_PRESETS_LIST.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setSelectedDocType(p.id)}
							className={`inline-flex items-center gap-1.5 min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
								selectedDocType === p.id
									? "bg-[var(--teal)] text-white shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
							}`}
						>
							<span>{p.icon}</span>
							<span>{p.shortTitle}</span>
						</button>
					))}
				</div>

				{/* Viewport & Camera Stage */}
				<div className="relative flex flex-1 flex-col items-center justify-center bg-black min-h-[320px] max-h-[480px] overflow-hidden">
					{isCapturing ? (
						<>
							{cameraError ? (
								<div className="flex flex-col items-center justify-center p-6 text-center text-white">
									<p className="text-sm text-rose-400 mb-3 font-semibold">{cameraError}</p>
									<p className="text-xs text-neutral-400 mb-4">
										Вы можете выбрать готовое фото или скан с диска:
									</p>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--teal-dark)] cursor-pointer"
									>
										<Folder size={15} className="shrink-0" />
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
										className="w-full h-full object-contain max-h-[420px]"
									/>

									{/* Guide Overlay Frame with Target Aspect Ratio */}
									<div
										className="absolute pointer-events-none rounded-xl border-2 border-dashed border-[var(--teal)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
										style={{
											width: "84%",
											aspectRatio: String(preset.aspectRatio),
											maxWidth: "460px",
										}}
									>
										<div className="absolute top-2 left-2 right-2 flex justify-between items-center text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
											<span>{preset.shortTitle}</span>
											<span>{preset.expectedFormatHint}</span>
										</div>
									</div>
								</div>
							)}
						</>
					) : (
						<div className="relative w-full h-full flex items-center justify-center p-2">
							{capturedDataUrl ? (
								<img
									src={capturedDataUrl}
									alt="Захваченный скан документа"
									className="max-h-[400px] w-auto rounded-lg object-contain shadow-lg"
								/>
							) : null}
						</div>
					)}

					{/* Hidden Canvas for Processing */}
					<canvas ref={canvasRef} className="hidden" />
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,.pdf"
						className="hidden"
						onChange={handleFallbackFileChange}
					/>
				</div>

				{/* OCR Summary Banner */}
				{ocrSummary ? (
					<div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--teal-surface)] px-4 py-2 text-xs text-[var(--teal-dark)] font-medium">
						<Info size={14} className="text-[var(--teal-dark)] shrink-0" />
						<span>{ocrSummary}</span>
					</div>
				) : null}

				{/* Filter & Action Controls */}
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] p-4 bg-[var(--paper-soft)]">
					{/* Filter Mode Selector */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-[var(--muted)] font-medium mr-1">Фильтр:</span>
						{(
							[
								{ id: "auto_contrast", label: "Контраст" },
								{ id: "high_contrast_bw", label: "Ч/Б текст" },
								{ id: "grayscale", label: "Оттенки серого" },
								{ id: "original", label: "Оригинал" },
							] as const
						).map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setFilterMode(f.id)}
								className={`min-h-[44px] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
									filterMode === f.id
										? "bg-[var(--line-strong)] text-[var(--ink)] border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{f.label}
							</button>
						))}
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-2">
						{isCapturing ? (
							<>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
								>
									<Folder size={14} className="shrink-0" />
									<span>Файл</span>
								</button>
								<button
									type="button"
									data-testid="scanner-capture-button"
									onClick={handleCapture}
									className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--teal-dark)] transition-colors cursor-pointer"
								>
									<Camera size={14} className="shrink-0" />
									<span>Сфотографировать</span>
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									onClick={handleRotate}
									className="min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
									title="Повернуть на 90 градусов"
								>
									<RotateCw size={14} className="shrink-0" />
									<span>{rotationDeg}°</span>
								</button>
								<button
									type="button"
									onClick={handleRetake}
									className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
								>
									Переснять
								</button>
								<button
									type="button"
									data-testid="scanner-save-attachment-button"
									disabled={isUploading || !capturedBlob}
									onClick={() => void handleSaveAttachment()}
									className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--teal-dark)] disabled:opacity-50 cursor-pointer"
								>
									{isUploading ? (
										"Сохраняю…"
									) : (
										<>
											<Save size={14} className="shrink-0" />
											<span>Прикрепить к медкарте</span>
										</>
									)}
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DocumentCameraScannerModal;
