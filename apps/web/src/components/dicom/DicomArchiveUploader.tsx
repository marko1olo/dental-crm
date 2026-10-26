/**
 * DicomArchiveUploader.tsx — Зона загрузки архивов DICOM и папок КЛКТ
 * Mandate 8b: строго <= 120 строк.
 */

import type React from "react";
import {
	filterDicomArchiveEntries,
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "./dicomArchiveFilter.js";
import {
	getDicomImageLoader,
	uploadDicomFileToStow,
} from "./archiveUploader/dicomStowUploader.js";
import { useDicomArchiveUploader } from "./archiveUploader/useDicomArchiveUploader.js";
import { DicomArchiveStatusHeader } from "./archiveUploader/DicomArchiveStatusHeader.js";
import { DicomArchiveDropzoneButtons } from "./archiveUploader/DicomArchiveDropzoneButtons.js";

export {
	getDicomImageLoader,
	uploadDicomFileToStow,
	filterDicomArchiveEntries,
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
};

export interface DicomArchiveUploaderProps {
	onImagesLoaded: (imageIds: string[]) => void;
	className?: string | undefined;
	uploadToServer?: boolean | undefined;
	patientId?: string | null | undefined;
	doctorId?: string | null | undefined;
}

export function DicomArchiveUploader({
	onImagesLoaded,
	className,
	uploadToServer = true,
	patientId,
	doctorId,
}: DicomArchiveUploaderProps) {
	const {
		isDragging, setIsDragging, loading, status, progressPercent,
		syncBadge, folderInputRef, fileInputRef, handleIncomingFiles, onDrop,
	} = useDicomArchiveUploader({ onImagesLoaded, uploadToServer, patientId, doctorId });

	const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) return;
		const files = Array.from(e.target.files);
		e.target.value = "";
		await handleIncomingFiles(files);
	};

	return (
		<div
			aria-label="Зона загрузки DICOM и КЛКТ"
			onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
			onDragLeave={() => setIsDragging(false)}
			onDrop={onDrop}
			className={`w-full h-full flex-1 flex flex-col items-center justify-center p-3 sm:p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/60 rounded-xl transition-all dicom-dropzone ${
				isDragging ? "dicom-dropzone--dragging" : ""
			} ${className ?? ""}`}
			style={{
				background: isDragging ? "var(--teal-soft, rgba(20,184,166,0.12))" : "var(--paper-soft, rgba(0,0,0,0.02))",
				borderColor: isDragging ? "var(--teal, #14b8a6)" : undefined,
				color: "var(--ink, #0f172a)",
			}}
		>
			<input ref={folderInputRef} id="dicom-folder-input" type="file" webkitdirectory="true" directory="true" multiple style={{ display: "none" }} onChange={onFileChange} />
			<input ref={fileInputRef} id="dicom-file-input" type="file" accept=".zip,.dcm,.dicom,application/zip,application/x-zip-compressed" multiple style={{ display: "none" }} onChange={onFileChange} />

			<DicomArchiveStatusHeader
				status={status}
				syncBadge={syncBadge}
				loading={loading}
				progressPercent={progressPercent}
			/>

			<DicomArchiveDropzoneButtons
				loading={loading}
				fileInputRef={fileInputRef}
				folderInputRef={folderInputRef}
			/>

			<div style={{ color: "var(--muted, #64748b)", fontSize: "10px", marginTop: "6px", textAlign: "center" }} className="hidden sm:block">
				Локальная обработка в браузере. Конфиденциальные данные исследования не передаются на сторонние серверы.
			</div>
		</div>
	);
}
