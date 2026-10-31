import { Camera, MoveHorizontal, Paperclip } from "lucide-react";
import type React from "react";
import { useRef } from "react";

export interface VisitDiaryPhotoActionsToolbarProps {
	isLocked: boolean;
	diaryId: string | null;
	attachmentsCount: number;
	isUploading: boolean;
	onCameraOpen: () => void;
	onBeforeAfterOpen: () => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function VisitDiaryPhotoActionsToolbar({
	isLocked,
	diaryId,
	attachmentsCount,
	isUploading,
	onCameraOpen,
	onBeforeAfterOpen,
	onFileInputChange,
}: VisitDiaryPhotoActionsToolbarProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleAttachClick = () => {
		if (isUploading) return;
		fileInputRef.current?.click();
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--muted)]">
				<Camera className="w-4 h-4 text-[var(--bad-fg)]" />
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
							<MoveHorizontal className="w-4 h-4 text-[var(--accent)]" />
							<span>До / После</span>
						</button>
					)}

					<button
						type="button"
						onClick={onCameraOpen}
						className={`cursor-pointer text-xs min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg transition-colors border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 active:scale-[0.98] ${
							isUploading ? "opacity-60 cursor-wait" : ""
						}`}
						title="Сделать снимок с интраоральной USB/UVC камеры или веб-камеры (WebRTC захват)"
					>
						<Camera className="w-4 h-4 text-[var(--accent)]" />
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
				</div>
			)}
		</div>
	);
}
