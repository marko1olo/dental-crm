/**
 * ImagingStageButtons.tsx — Кнопки действий на пустом экране лучевой диагностики
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Camera, Folder, Scan, UploadCloud } from "lucide-react";

interface Props {
	onPickFiles: () => void;
	onPickFolder?: (() => void) | undefined;
	onCaptureCamera?: (() => void) | undefined;
	onOpenRvgCapture?: (() => void) | undefined;
}

export const ImagingStageButtons: React.FC<Props> = ({
	onPickFiles,
	onPickFolder,
	onCaptureCamera,
	onOpenRvgCapture,
}) => {
	return (
		<div className="flex flex-col items-center gap-2.5 w-full pt-1">
			<button
				type="button"
				data-testid="btn-empty-state-upload-xray"
				onClick={onPickFiles}
				className="primary-button h-10 px-5 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs cursor-pointer transition-transform active:scale-98"
				title="Загрузить снимок RVG, КТ, ОПТГ, DICOM или фотопротокол"
			>
				<UploadCloud size={16} aria-hidden="true" />
				<span>+ Загрузить снимок (DICOM/RVG)</span>
			</button>

			<div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
				{onPickFolder && (
					<button
						type="button"
						onClick={onPickFolder}
						className="secondary-button h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
						title="Выбрать папку КЛКТ или серию срезов"
					>
						<Folder size={13} className="text-[var(--ink-muted)]" />
						<span>Папка КТ</span>
					</button>
				)}

				{onOpenRvgCapture && (
					<button
						type="button"
						onClick={onOpenRvgCapture}
						className="secondary-button h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
						title="Прямой захват с визиографа (Vatech, EzSensor, KaVo)"
					>
						<Scan size={13} className="text-[var(--primary)]" />
						<span>Захват RVG</span>
					</button>
				)}

				{onCaptureCamera && (
					<button
						type="button"
						onClick={onCaptureCamera}
						className="secondary-button h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
						title="Снимок с веб-камеры или негатоскопа"
					>
						<Camera size={13} className="text-[var(--ink-muted)]" />
						<span>Камера</span>
					</button>
				)}
			</div>
		</div>
	);
};
