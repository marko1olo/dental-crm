/**
 * ScannerAttachmentActions.tsx
 *
 * Transactional action buttons: Shutter release, 90-degree rotate,
 * retake, and Single Primary CTA "Прикрепить к медкарте" (Mandates 8e, 8am).
 */

import React from "react";
import { Camera, Folder, RotateCw, Save } from "lucide-react";

export interface ScannerAttachmentActionsProps {
	readonly isCapturing: boolean;
	readonly cameraError: string | null;
	readonly rotationDeg: number;
	readonly isUploading: boolean;
	readonly onCapture: () => void;
	readonly onRetake: () => void;
	readonly onRotate: () => void;
	readonly onOpenFile: () => void;
	readonly onSaveAttachment: () => void;
}

export const ScannerAttachmentActions: React.FC<ScannerAttachmentActionsProps> = ({
	isCapturing,
	cameraError,
	rotationDeg,
	isUploading,
	onCapture,
	onRetake,
	onRotate,
	onOpenFile,
	onSaveAttachment,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-end gap-2 p-4 bg-[var(--paper-soft)] border-t border-[var(--line)]">
			{isCapturing ? (
				<>
					<button
						type="button"
						onClick={onOpenFile}
						className="min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
					>
						<Folder size={14} className="shrink-0" />
						<span>Файл</span>
					</button>

					<button
						type="button"
						data-testid="scanner-capture-button"
						onClick={cameraError ? onOpenFile : onCapture}
						className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--teal-dark)] transition-colors cursor-pointer"
					>
						{cameraError ? <Folder size={15} className="shrink-0" /> : <Camera size={15} className="shrink-0" />}
						<span>{cameraError ? "Выбрать файл" : "Сфотографировать"}</span>
					</button>
				</>
			) : (
				<>
					<button
						type="button"
						onClick={onRotate}
						className="min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
						title="Повернуть на 90 градусов"
					>
						<RotateCw size={14} className="shrink-0" />
						<span>{rotationDeg}°</span>
					</button>
					<button
						type="button"
						onClick={onRetake}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
					>
						Переснять
					</button>
					<button
						type="button"
						data-testid="scanner-save-attachment-button"
						onClick={onSaveAttachment}
						className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--teal-dark)] cursor-pointer"
					>
						<Save size={14} className="shrink-0" />
						<span>{isUploading ? "Сохраняю…" : "Прикрепить к медкарте"}</span>
					</button>
				</>
			)}
		</div>
	);
};
export default ScannerAttachmentActions;
