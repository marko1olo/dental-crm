import React, { useState } from "react";
import { Film, Scan, UploadCloud, Folder, Camera } from "lucide-react";
import { uploadImagingScanFile } from "./imagingUploadService";
import { showToast } from "../GlobalToast";

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
	activePatient,
	activeAppointment,
	onPickFiles,
	onPickFolder,
	onCaptureCamera,
	onOpenRvgCapture,
	onStudyUploaded,
}: ImagingEmptyStateStageProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadStatus, setUploadStatus] = useState<string | null>(null);

	const patientName = activePatient?.fullName ?? activePatient?.name ?? null;

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length === 0) return;

		if (!activePatient?.id) {
			showToast("Выберите пациента перед загрузкой снимка", "warning");
			return;
		}

		setIsUploading(true);
		setUploadStatus(`Загрузка снимков (${files.length})...`);

		try {
			for (const file of files) {
				setUploadStatus(`Загрузка «${file.name}»...`);
				const res = await uploadImagingScanFile(file, {
					patientId: activePatient.id,
					visitId: activeAppointment?.id,
				});
				if (res.success && res.study && onStudyUploaded) {
					onStudyUploaded(res.study);
				}
			}
		} finally {
			setIsUploading(false);
			setUploadStatus(null);
		}
	};

	return (
		<div
			className={`imaging-empty-state-stage w-full h-full min-h-[460px] flex-1 flex flex-col items-center justify-center p-6 sm:p-10 rounded-xl border-2 transition-all select-none ${
				isDragging
					? "border-[var(--primary)] bg-[var(--primary-soft,rgba(13,148,136,0.1))] shadow-lg scale-[0.99]"
					: "border-dashed border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--primary)]/50"
			}`}
			data-testid="imaging-empty-state-stage"
			onDragOver={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setIsDragging(true);
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setIsDragging(false);
			}}
			onDrop={handleDrop}
			style={{
				minHeight: "460px",
			}}
		>
			<div className="flex flex-col items-center max-w-md text-center gap-3.5">
				{/* Vector Icons: Film / Scan in a tactile clinical circle */}
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
							: "Выберите пациента в картотеке или загрузите снимок."}
						{" "}Перетащите файл снимка (RVG, КТ, ОПТГ, DICOM, JPEG, PNG) на этот холст или нажмите кнопку загрузки.
					</p>
				</div>

				{isUploading ? (
					<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
						<div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
						<span className="text-xs font-semibold text-[var(--ink)]">{uploadStatus}</span>
					</div>
				) : (
					<div className="flex flex-col items-center gap-2.5 w-full pt-1">
						{/* Exactly 1 Primary CTA Button per Mandate 8am */}
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

						{/* Secondary Action Cluster */}
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
				)}

				<span className="text-[11px] text-[var(--ink-muted)] pt-1 font-mono">
					Поддерживаются форматы: .DCM, .DICOM, .ZIP (КЛКТ), .PNG, .JPG, .HEIC, .RVG
				</span>
			</div>
		</div>
	);
}
