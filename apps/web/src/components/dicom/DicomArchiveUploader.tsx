import { Archive, Folder } from "lucide-react";
import type React from "react";
import {
	filterDicomArchiveEntries,
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "./dicomArchiveFilter";
import {
	getDicomImageLoader,
	uploadDicomFileToStow,
} from "./archiveUploader/dicomStowUploader";
import { useDicomArchiveUploader } from "./archiveUploader/useDicomArchiveUploader";

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
		isDragging,
		setIsDragging,
		loading,
		status,
		progressPercent,
		syncBadge,
		folderInputRef,
		fileInputRef,
		handleIncomingFiles,
		onDrop,
	} = useDicomArchiveUploader({
		onImagesLoaded,
		uploadToServer,
		patientId,
		doctorId,
	});

	return (
		<div
			aria-label="Зона загрузки DICOM и КЛКТ"
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={onDrop}
			className={`w-full h-full flex-1 flex flex-col items-center justify-center p-3 sm:p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/60 rounded-xl transition-all dicom-dropzone ${
				isDragging ? "dicom-dropzone--dragging" : ""
			} ${className ?? ""}`}
			style={{
				background: isDragging
					? "var(--teal-soft, rgba(20,184,166,0.12))"
					: "var(--paper-soft, rgba(0,0,0,0.02))",
				borderColor: isDragging
					? "var(--teal, #14b8a6)"
					: undefined,
				color: "var(--ink, #0f172a)",
			}}
		>
			<input
				ref={folderInputRef}
				id="dicom-folder-input"
				type="file"
				webkitdirectory="true"
				directory="true"
				multiple
				style={{ display: "none" }}
				onChange={async (e) => {
					if (!e.target.files) return;
					const files = Array.from(e.target.files);
					e.target.value = "";
					await handleIncomingFiles(files);
				}}
			/>
			<input
				ref={fileInputRef}
				id="dicom-file-input"
				type="file"
				accept=".zip,.dcm,.dicom,application/zip,application/x-zip-compressed"
				multiple
				style={{ display: "none" }}
				onChange={async (e) => {
					if (!e.target.files) return;
					const files = Array.from(e.target.files);
					e.target.value = "";
					await handleIncomingFiles(files);
				}}
			/>

			<div className="flex flex-col items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
				<div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-0.5 sm:mb-1 shrink-0">
					<Archive className="w-4 h-4 sm:w-6 sm:h-6" />
				</div>
				<div
					style={{
						color: "var(--ink)",
						fontWeight: 700,
						fontSize: "13px",
						textAlign: "center",
					}}
					className="sm:text-[15px]"
				>
					{status}
				</div>
				{syncBadge && (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 transition-all"
						style={{
							background:
								syncBadge.type === "synced"
									? "var(--teal-soft, rgba(20,184,166,0.12))"
									: "var(--amber-soft, rgba(245,158,11,0.12))",
							color:
								syncBadge.type === "synced"
									? "var(--teal, #14b8a6)"
									: "var(--amber, #d97706)",
							border: `1px solid ${
								syncBadge.type === "synced"
									? "var(--teal-soft, rgba(20,184,166,0.3))"
									: "var(--amber-soft, rgba(245,158,11,0.3))"
							}`,
						}}
					>
						<span className="w-1.5 h-1.5 rounded-full bg-current" />
						<span>{syncBadge.text}</span>
					</div>
				)}
			</div>

			{loading && (
				<div className="w-full max-w-xs my-2 flex flex-col items-center gap-2">
					<div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin"></div>
					{progressPercent !== null && (
						<div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-150"
								style={{ width: `${progressPercent}%` }}
							></div>
						</div>
					)}
				</div>
			)}

			<div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 sm:mt-3">
				<button
					type="button"
					onClick={() => {
						if (!loading) fileInputRef.current?.click();
					}}
					className="secondary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					style={{
						background: "var(--paper, #ffffff)",
						borderColor: "var(--line, #cbd5e1)",
						color: "var(--ink, #0f172a)",
						padding: "0 12px",
						opacity: loading ? 0.7 : 1,
					}}
				>
					<Archive size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Выбрать ZIP-архив / .DCM</span>
				</button>
				<button
					type="button"
					onClick={() => {
						if (!loading) folderInputRef.current?.click();
					}}
					className="secondary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					style={{
						background: "var(--paper, #ffffff)",
						borderColor: "var(--line, #cbd5e1)",
						color: "var(--ink, #0f172a)",
						padding: "0 12px",
						opacity: loading ? 0.7 : 1,
					}}
				>
					<Folder size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Выбрать папку КЛКТ</span>
				</button>
			</div>

			<div
				style={{
					color: "var(--muted, #64748b)",
					fontSize: "10px",
					marginTop: "6px",
					textAlign: "center",
				}}
				className="hidden sm:block"
			>
				Локальная обработка в браузере. Конфиденциальные данные исследования не
				передаются на сторонние серверы.
			</div>
		</div>
	);
}
