/**
 * ImagingEmptyStateStage.tsx — Заглушка пустого экрана лучевой диагностики
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Film, Scan } from "lucide-react";
import { useImagingStageDrop } from "./stage/useImagingStageDrop.js";
import { ImagingStageButtons } from "./stage/ImagingStageButtons.js";

export interface ImagingEmptyStateStageProps {
	activePatient?: any;
	activeAppointment?: any;
	onPickFiles: () => void;
	onPickFolder?: () => void;
	onCaptureCamera?: () => void;
	onOpenRvgCapture?: () => void;
	onStudyUploaded?: (study: any) => void;
}

export function ImagingEmptyStateStage({
	activePatient, activeAppointment, onPickFiles,
	onPickFolder, onCaptureCamera, onOpenRvgCapture, onStudyUploaded,
}: ImagingEmptyStateStageProps) {
	const { isDragging, setIsDragging, isUploading, uploadStatus, handleDrop } = useImagingStageDrop({
		activePatient, activeAppointment, onStudyUploaded,
	});
	const patientName = activePatient?.fullName ?? activePatient?.name ?? null;

	return (
		<div
			className={`imaging-empty-state-stage w-full h-full min-h-[460px] flex-1 flex flex-col items-center justify-center p-6 sm:p-10 rounded-xl border-2 transition-all select-none ${
				isDragging
					? "border-[var(--primary)] bg-[var(--primary-soft,rgba(13,148,136,0.1))] shadow-lg scale-[0.99]"
					: "border-dashed border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--primary)]/50"
			}`}
			data-testid="imaging-empty-state-stage"
			onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
			onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
			onDrop={handleDrop}
			style={{ minHeight: "460px" }}
		>
			<div className="flex flex-col items-center max-w-md text-center gap-3.5">
				<div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
					<Film className="w-8 h-8 text-[var(--primary)]" aria-hidden="true" />
					<div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[var(--primary)] text-white shadow-xs">
						<Scan size={12} aria-hidden="true" />
					</div>
				</div>

				<div className="space-y-1">
					<h3 className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
						У выбранного пациента нет рентгеновских снимков
					</h3>
					<p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
						{patientName
							? `В карте пациента «${patientName}» пока нет исследований.`
							: "Выберите пациента в картотеке или загрузите снимок."}{" "}
						Перетащите файл снимка (RVG, КТ, ОПТГ, DICOM, JPEG, PNG) на этот холст или нажмите кнопку загрузки.
					</p>
				</div>

				{isUploading ? (
					<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
						<div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
						<span className="text-xs font-semibold text-[var(--ink)]">{uploadStatus}</span>
					</div>
				) : (
					<ImagingStageButtons
						onPickFiles={onPickFiles}
						onPickFolder={onPickFolder}
						onOpenRvgCapture={onOpenRvgCapture}
						onCaptureCamera={onCaptureCamera}
					/>
				)}

				<span className="text-[11px] text-[var(--ink-muted)] pt-1 font-mono">
					Поддерживаются форматы: .DCM, .DICOM, .ZIP (КЛКТ), .PNG, .JPG, .HEIC, .RVG
				</span>
			</div>
		</div>
	);
}
