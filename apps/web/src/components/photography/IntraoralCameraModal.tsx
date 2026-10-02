/**
 * DENTE Dental CRM — Rapid Chairside Intraoral Camera / Webcam Capture Modal
 *
 * Designed for dental operatory workflows:
 * - Direct WebRTC capture from USB UVC intraoral cameras & webcams
 * - Device memory: remembers preferred intraoral camera in localStorage
 * - Hands-free / 1-finger operation: Spacebar / Enter capture trigger for chairside foot pedals
 * - Instant freeze-frame preview with 1-click attachment to Form 043/u
 * - Guaranteed WebRTC stream track disposal on close to prevent camera LED overheating
 * - 0 disabled buttons (Mandate 8e: Doctor Autonomy) & design token compliance
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Check, RefreshCw, X, Video, AlertCircle } from "lucide-react";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";

const PREFERRED_CAMERA_KEY = "dente_preferred_camera_device_id";

export interface IntraoralCameraModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCapturePhoto: (blob: Blob, fileName: string) => Promise<void> | void;
}

export const IntraoralCameraModal: React.FC<IntraoralCameraModalProps> = ({
	isOpen,
	onClose,
	onCapturePhoto,
}) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
		try {
			return localStorage.getItem(PREFERRED_CAMERA_KEY) || "";
		} catch {
			return "";
		}
	});

	const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
	const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Stop all active stream tracks
	const stopActiveStream = useCallback((mediaStream: MediaStream | null) => {
		if (mediaStream) {
			for (const track of mediaStream.getTracks()) {
				track.stop();
			}
		}
	}, []);

	// Enumerate available video inputs
	const refreshDevices = useCallback(async () => {
		try {
			if (!navigator.mediaDevices?.enumerateDevices) return;
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoInputs = devices.filter((d) => d.kind === "videoinput");
			setVideoDevices(videoInputs);

			// If current selected device is not in list or empty, choose first
			if (videoInputs.length > 0) {
				const hasSelected = videoInputs.some((d) => d.deviceId === selectedDeviceId);
				if (!hasSelected) {
					const firstId = videoInputs[0]?.deviceId || "";
					setSelectedDeviceId(firstId);
					try {
						localStorage.setItem(PREFERRED_CAMERA_KEY, firstId);
					} catch {
						// ignore
					}
				}
			}
		} catch (err) {
			logger.error("[IntraoralCameraModal] Enumerate devices failed", err);
		}
	}, [selectedDeviceId]);

	// Start video stream
	const startStream = useCallback(
		async (deviceId?: string) => {
			setIsLoading(true);
			setErrorMessage(null);

			// Stop previous stream
			stopActiveStream(stream);
			setStream(null);

			try {
				if (!navigator.mediaDevices?.getUserMedia) {
					throw new Error("Браузер не поддерживает видеозахват WebRTC (getUserMedia)");
				}

				const videoConstraints: MediaTrackConstraints = {
					width: { ideal: 1920, min: 640 },
					height: { ideal: 1080, min: 480 },
				};
				if (deviceId) {
					videoConstraints.deviceId = { exact: deviceId };
				} else {
					videoConstraints.facingMode = { ideal: "environment" };
				}

				const constraints: MediaStreamConstraints = {
					video: videoConstraints,
					audio: false,
				};

				const newStream = await navigator.mediaDevices.getUserMedia(constraints);
				setStream(newStream);

				if (videoRef.current) {
					videoRef.current.srcObject = newStream;
				}

				await refreshDevices();
			} catch (err) {
				logger.error("[IntraoralCameraModal] getUserMedia failed", err);
				const errStr = err instanceof Error ? err.message : String(err);
				setErrorMessage(
					errStr.includes("NotAllowedError") || errStr.includes("Permission")
						? "Доступ к камере заблокирован. Разрешите доступ к видеокамере в настройках браузера."
						: `Не удалось запустить видеокамеру: ${errStr}`,
				);
			} finally {
				setIsLoading(false);
			}
		},
		[stream, stopActiveStream, refreshDevices],
	);

	// Start camera when modal opens
	useEffect(() => {
		if (isOpen) {
			setCapturedDataUrl(null);
			setCapturedBlob(null);
			setErrorMessage(null);
			void startStream(selectedDeviceId);
		} else {
			stopActiveStream(stream);
			setStream(null);
			setCapturedDataUrl(null);
			setCapturedBlob(null);
		}
		// Cleanup when unmounting or modal closes
		return () => {
			stopActiveStream(stream);
		};
	}, [isOpen]); // Intentionally trigger only on isOpen toggle to prevent stream re-initialization loops

	// Handle device change
	const handleDeviceSelect = (deviceId: string) => {
		setSelectedDeviceId(deviceId);
		try {
			localStorage.setItem(PREFERRED_CAMERA_KEY, deviceId);
		} catch {
			// ignore
		}
		void startStream(deviceId);
	};

	// 1-Click Snapshot Capture from Video Element
	const captureFrame = useCallback(() => {
		const video = videoRef.current;
		if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
			showToast("Камера ещё инициализируется, подождите 1 секунду", "info");
			return;
		}

		try {
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Create WebP blob
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						showToast("Не удалось сформировать кадр со снимка", "error");
						return;
					}
					const dataUrl = canvas.toDataURL("image/webp", 0.9);
					setCapturedDataUrl(dataUrl);
					setCapturedBlob(blob);
				},
				"image/webp",
				0.9,
			);
		} catch (err) {
			logger.error("[IntraoralCameraModal] Frame capture failed", err);
			showToast("Ошибка фиксации кадра с камеры", "error");
		}
	}, []);

	// Confirm and attach photo
	const confirmAndUpload = useCallback(
		async (keepCapturing = false) => {
			if (!capturedBlob) return;
			setIsProcessing(true);
			try {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const fileName = `intraoral_camera_${timestamp}.webp`;
				await onCapturePhoto(capturedBlob, fileName);

				showToast("Снимок с камеры успешно прикреплен к приёму", "success");

				if (keepCapturing) {
					// Reset captured preview to allow taking another photo immediately
					setCapturedDataUrl(null);
					setCapturedBlob(null);
					if (videoRef.current && stream) {
						videoRef.current.srcObject = stream;
					}
				} else {
					onClose();
				}
			} catch (err) {
				logger.error("[IntraoralCameraModal] Upload failed", err);
				showToast("Не удалось прикрепить снимок к приёму", "error");
			} finally {
				setIsProcessing(false);
			}
		},
		[capturedBlob, onCapturePhoto, onClose, stream],
	);

	// Retake photo
	const handleRetake = () => {
		setCapturedDataUrl(null);
		setCapturedBlob(null);
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;
		}
	};

	// Keyboard controls (Space / Enter for capture / confirm, Esc for close)
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			} else if (e.key === " " || e.key === "Spacebar") {
				// Don't trigger if focus is on a select dropdown
				if ((e.target as HTMLElement)?.tagName === "SELECT") return;
				e.preventDefault();
				if (!capturedDataUrl) {
					captureFrame();
				} else {
					void confirmAndUpload(false);
				}
			} else if (e.key === "Enter") {
				if ((e.target as HTMLElement)?.tagName === "SELECT") return;
				e.preventDefault();
				if (capturedDataUrl) {
					void confirmAndUpload(false);
				} else {
					captureFrame();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, capturedDataUrl, captureFrame, confirmAndUpload, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150">
			<div className="w-full max-w-3xl rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2">
						<Video className="w-4 h-4 text-[var(--accent)]" />
						<h3 className="text-sm font-semibold text-[var(--ink)]">
							Быстрый снимок: Интраоральная / Веб-камера
						</h3>
					</div>

					<div className="flex items-center gap-3">
						{/* Device Selector */}
						{videoDevices.length > 1 && !capturedDataUrl && (
							<select
								value={selectedDeviceId}
								onChange={(e) => handleDeviceSelect(e.target.value)}
								className="text-xs bg-[var(--paper)] border border-[var(--line)] rounded-md px-2 py-1 text-[var(--ink)] max-w-[200px] truncate"
								title="Выберите интраоральную камеру или веб-камеру"
							>
								{videoDevices.map((dev, idx) => (
									<option key={dev.deviceId || idx} value={dev.deviceId}>
										{dev.label || `Камера ${idx + 1}`}
									</option>
								))}
							</select>
						)}

						<button
							type="button"
							onClick={onClose}
							className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
							title="Закрыть (Esc)"
							aria-label="Закрыть"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Video / Snapshot Viewport */}
				<div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] max-h-[60vh] overflow-hidden">
					{errorMessage ? (
						<div className="p-6 text-center text-white max-w-md space-y-3">
							<AlertCircle className="w-10 h-10 text-[var(--bad-fg)] mx-auto" />
							<p className="text-sm">{errorMessage}</p>
							<button
								type="button"
								onClick={() => startStream(selectedDeviceId)}
								className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)] transition-colors border border-[var(--line)]"
							>
								<RefreshCw className="w-3.5 h-3.5" />
								<span>Повторить запуск камеры</span>
							</button>
						</div>
					) : capturedDataUrl ? (
						<div className="relative w-full h-full flex items-center justify-center">
							<img
								src={capturedDataUrl}
								alt="Стоп-кадр интраорального снимка"
								className="max-h-[60vh] w-auto object-contain"
							/>
							<div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-xs font-mono flex items-center gap-1.5">
								<Check className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
								<span>Стоп-кадр зафиксирован</span>
							</div>
						</div>
					) : (
						<div className="relative w-full h-full flex items-center justify-center">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="max-h-[60vh] w-auto object-contain"
							/>
							{isLoading && (
								<div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs gap-2">
									<RefreshCw className="w-4 h-4 animate-spin" />
									<span>Инициализация видеопотока...</span>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer Controls */}
				<div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 bg-[var(--paper-soft)]">
					<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
						<span className="inline-block px-1.5 py-0.5 rounded bg-[var(--paper-strong)] border border-[var(--line)] font-mono text-[10px] text-[var(--ink)]">
							Пробел / Enter
						</span>
						<span>— {capturedDataUrl ? "прикрепить снимок" : "сделать снимок"}</span>
					</div>

					<div className="flex items-center gap-2">
						{capturedDataUrl ? (
							<>
								<button
									type="button"
									onClick={handleRetake}
									className="min-h-[40px] px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 transition-colors"
								>
									<RefreshCw className="w-3.5 h-3.5" />
									<span>Переснять</span>
								</button>
								<button
									type="button"
									onClick={() => confirmAndUpload(true)}
									className="min-h-[40px] px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 transition-colors"
									title="Прикрепить этот снимок и сразу сделать следующий"
								>
									<span>Прикрепить и снять ещё</span>
								</button>
								<button
									type="button"
									onClick={() => confirmAndUpload(false)}
									className="min-h-[40px] px-4 py-1.5 text-xs rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-medium flex items-center gap-1.5 transition-opacity shadow-sm"
								>
									<Check className="w-3.5 h-3.5" />
									<span>{isProcessing ? "Сохранение..." : "Прикрепить к приёму"}</span>
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={captureFrame}
								className="min-h-[40px] px-5 py-2 text-xs rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-semibold flex items-center gap-2 transition-opacity shadow-sm"
							>
								<Camera className="w-4 h-4" />
								<span>Сделать снимок</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
