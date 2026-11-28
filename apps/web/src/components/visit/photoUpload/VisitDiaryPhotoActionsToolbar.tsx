import { Camera, MoveHorizontal, Paperclip, QrCode, Sparkles } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { navigateToStudio } from "../../../lib/clinicEventBus";

export interface VisitDiaryPhotoActionsToolbarProps {
	isLocked: boolean;
	diaryId: string | null;
	attachmentsCount: number;
	isUploading: boolean;
	onCameraOpen: () => void;
	onBeforeAfterOpen: () => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onQrBridgeOpen?: () => void;
	onDsdOpen?: () => void;
}

export function VisitDiaryPhotoActionsToolbar({
	isLocked,
	diaryId,
	attachmentsCount,
	isUploading,
	onCameraOpen,
	onBeforeAfterOpen,
	onFileInputChange,
	onQrBridgeOpen,
	onDsdOpen,
}: VisitDiaryPhotoActionsToolbarProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const cameraInputRef = useRef<HTMLInputElement>(null);

	const handleAttachClick = () => {
		if (isUploading) return;
		fileInputRef.current?.click();
	};

	const handleCameraClick = () => {
		if (isUploading) return;
		const isDesktopViewport =
			typeof window !== "undefined" &&
			window.innerWidth >= 1024 &&
			!document.documentElement.classList.contains("mobile-touch-shell");
		if (
			typeof window !== "undefined" &&
			!isDesktopViewport &&
			window.matchMedia("(pointer: coarse)").matches
		) {
			cameraInputRef.current?.click();
			return;
		}
		onCameraOpen();
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[var(--muted)]">
				<Camera className="w-4 h-4 text-[var(--ink-muted)]" />
				<span>Вложения (Фотографии)</span>
			</div>

			{!isLocked && diaryId && (
				<div className="flex flex-wrap items-center gap-2">
					<span
						className="hidden sm:inline-flex items-center text-[10px] text-[var(--muted)] font-mono border border-[var(--line)] px-2 py-1 rounded bg-[var(--paper)] select-none"
						title="Вставка снимка или скриншота прямо клавишами Ctrl+V"
					>
						Ctrl+V: вставить
					</span>

					{attachmentsCount >= 2 && (
						<button
							type="button"
							onClick={onBeforeAfterOpen}
							className="cursor-pointer text-xs min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg transition-colors border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 active:scale-[0.98]"
							title="Сравнить снимки До/После (интерактивная шторка для экрана пациента)"
						>
							<MoveHorizontal className="w-4 h-4 shrink-0" />
							<span>До / После</span>
						</button>
					)}

					{onQrBridgeOpen && (
						<button
							type="button"
							onClick={onQrBridgeOpen}
							className="cursor-pointer text-xs min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg transition-colors border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 active:scale-[0.98]"
							title="Загрузка фото со смартфона врача через динамический QR-код (Chairside QR Bridge)"
							data-testid="btn-visit-diary-qr-bridge"
						>
							<QrCode className="w-4 h-4 shrink-0" />
							<span>Телефон (QR)</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => {
							if (onDsdOpen) {
								onDsdOpen();
							} else {
								navigateToStudio({ kind: "photo_protocol", mode: "dsd" });
							}
						}}
						className="cursor-pointer text-xs min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg transition-colors border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 active:scale-[0.98]"
						title="Digital Smile Design (DSD): эстетический дизайн улыбки и золотое сечение"
						data-testid="btn-visit-diary-open-dsd"
					>
						<Sparkles className="w-4 h-4 shrink-0" />
						<span>DSD Эстетика</span>
					</button>

					<button
						type="button"
						onClick={handleCameraClick}
						className={`cursor-pointer text-xs min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg transition-colors border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 active:scale-[0.98] ${
							isUploading ? "opacity-60 cursor-wait" : ""
						}`}
						title="Сделать снимок с интраоральной USB/UVC камеры или веб-камеры (WebRTC захват, на мобильном — камера планшета)"
					>
						<Camera className="w-4 h-4 shrink-0" />
						<span>{isUploading ? "Сжатие..." : "Снимок с камеры"}</span>
					</button>

					<button
						type="button"
						onClick={handleAttachClick}
						className={`cursor-pointer text-xs min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg transition-colors border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 active:scale-[0.98] ${
							isUploading ? "opacity-60 cursor-wait" : ""
						}`}
						title="Выбрать готовое фото из галереи или файлов"
					>
						<Paperclip className="w-4 h-4" />
						<span>{isUploading ? "Сжатие..." : "Прикрепить фото"}</span>
					</button>

					<input
						ref={fileInputRef}
						id="visit-diary-photo-upload"
						type="file"
						accept="image/*,.heic,.heif,image/heic,image/heif"
						className="hidden"
						onChange={onFileInputChange}
					/>
					<input
						ref={cameraInputRef}
						id="visit-diary-camera-upload"
						type="file"
						accept="image/*,.heic,.heif,image/heic,image/heif"
						capture="environment"
						className="hidden"
						onChange={onFileInputChange}
					/>
				</div>
			)}
		</div>
	);
}
