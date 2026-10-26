/**
 * ImagingHeaderActions.tsx — Быстрые действия панели снимков и кнопка «Ещё» (Мандат 8b <= 120 строк).
 */

import React, { useRef } from "react";
import { Activity, Camera, ChevronDown, FileText, MoreHorizontal, Scan, UploadCloud } from "lucide-react";
import { ImagingHeaderMoreMenu } from "./ImagingHeaderMoreMenu";

interface Props {
	isBrowserImagingFolderPicking?: boolean | undefined;
	isCapturingCameraPhoto?: boolean | undefined;
	onPickFolder: () => void;
	onPickFiles: () => void;
	onCaptureCamera: () => void;
	onOpenCbctStudio: () => void;
	onOpenPanoramic: () => void;
	onOpenRadiologyModule: () => void;
	onOpenRvgCapture?: (() => void) | undefined;
	onOpenCtSelector?: (() => void) | undefined;
	onOpenPopoutStudio?: (() => void) | undefined;
	onOpenExport?: (() => void) | undefined;
	onOpenComparison?: (() => void) | undefined;
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	moreMenuRef: React.RefObject<HTMLDivElement | null>;
}

export const ImagingHeaderActions: React.FC<Props> = (props) => {
	const {
		isBrowserImagingFolderPicking, isCapturingCameraPhoto, onPickFolder, onPickFiles,
		onCaptureCamera, onOpenCbctStudio, onOpenRvgCapture, isMoreMenuOpen, setIsMoreMenuOpen, moreMenuRef,
	} = props;

	return (
		<div className="imaging-actions flex items-center gap-1.5 shrink-0">
			<button
				className="primary-button h-9 min-h-[36px] px-3.5 text-xs font-bold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs cursor-pointer transition-colors active:scale-98"
				type="button"
				data-testid="imaging-pick-dicom-files"
				onClick={onPickFiles}
				disabled={isBrowserImagingFolderPicking}
				title="Загрузить отдельные снимки"
			>
				<UploadCloud aria-hidden="true" size={16} className="shrink-0" />
				<span>+ Загрузить снимок</span>
			</button>

			<button
				className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
				type="button"
				data-testid="imaging-open-3d-mpr"
				onClick={onOpenCbctStudio}
				title="3D КЛКТ Студия: панорама, срезы, импланты"
			>
				<Activity aria-hidden="true" size={16} className="shrink-0 text-[var(--primary)]" />
				<span>3D КТ</span>
			</button>

			{onOpenRvgCapture && (
				<button
					className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
					type="button"
					data-testid="imaging-rvg-capture-btn"
					onClick={onOpenRvgCapture}
					title="Прямой захват RVG"
				>
					<Scan aria-hidden="true" size={16} className="shrink-0 text-[var(--primary)]" />
					<span>Захват RVG</span>
				</button>
			)}

			<button
				className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
				type="button"
				data-testid="imaging-camera-capture-btn"
				onClick={onCaptureCamera}
				disabled={isCapturingCameraPhoto || isBrowserImagingFolderPicking}
				title="Сделать снимок с камеры"
			>
				<Camera aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-muted)]" />
				<span>{isCapturingCameraPhoto ? "Загрузка..." : "Камера"}</span>
			</button>

			<button
				className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
				type="button"
				data-testid="imaging-pick-dicom-folder"
				onClick={onPickFolder}
				disabled={isBrowserImagingFolderPicking}
				title="Выбрать папку DICOM/КТ"
			>
				<FileText aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-muted)]" />
				<span>{isBrowserImagingFolderPicking ? "Сканирую..." : "Папка КТ"}</span>
			</button>

			<div className="relative shrink-0" ref={moreMenuRef}>
				<button
					className={`secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl border transition-colors cursor-pointer shadow-xs ${
						isMoreMenuOpen ? "border-[var(--primary)] text-[var(--ink)] bg-[var(--paper-soft)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					type="button"
					data-testid="imaging-more-menu-btn"
					aria-label="Дополнительные клинические модули"
					aria-expanded={isMoreMenuOpen}
					onClick={() => setIsMoreMenuOpen((v) => !v)}
				>
					<MoreHorizontal size={16} aria-hidden="true" />
					<span>Ещё</span>
					<ChevronDown size={14} aria-hidden="true" className="text-[var(--ink-muted)]" />
				</button>
				<ImagingHeaderMoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} {...props} />
			</div>
		</div>
	);
};
