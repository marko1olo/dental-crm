import React from "react";
import { FileArchive, Folder, Scan, UploadCloud } from "lucide-react";

export interface CtSelectorDropzoneSectionProps {
	readonly zipInputRef: React.RefObject<HTMLInputElement | null>;
	readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
	readonly filesInputRef: React.RefObject<HTMLInputElement | null>;
	readonly isDragOver: boolean;
	readonly isExtracting: boolean;
	readonly extractionStatus: string;
	readonly extractionPercent: number | null;
	readonly processFileList: (files: FileList | File[]) => Promise<void>;
	readonly processZipFile: (file: File) => Promise<void>;
	readonly handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const CtSelectorDropzoneSection: React.FC<CtSelectorDropzoneSectionProps> = ({
	zipInputRef,
	folderInputRef,
	filesInputRef,
	isDragOver,
	isExtracting,
	extractionStatus,
	extractionPercent,
	processFileList,
	processZipFile,
	handleDragOver,
	handleDragLeave,
	handleDrop,
}) => {
	return (
		<section className="flex flex-col gap-2">
			<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
				Добавление КТ вручную или перетаскиванием
			</span>

			{/* Скрытые файловые инпуты */}
			<input
				ref={zipInputRef}
				type="file"
				accept=".zip,.rar,.7z,application/zip,application/x-zip-compressed"
				className="hidden"
				data-testid="input-pick-zip-archive"
				onChange={(e) => {
					if (e.target.files && e.target.files[0]) {
						void processZipFile(e.target.files[0]);
					}
					e.target.value = "";
				}}
			/>
			<input
				ref={folderInputRef}
				type="file"
				multiple
				// @ts-expect-error standard directory picker attribute
				webkitdirectory=""
				className="hidden"
				data-testid="input-pick-dicom-folder"
				onChange={(e) => {
					if (e.target.files && e.target.files.length > 0) {
						void processFileList(e.target.files);
					}
					e.target.value = "";
				}}
			/>
			<input
				ref={filesInputRef}
				type="file"
				multiple
				accept=".dcm,.dicom,application/dicom"
				className="hidden"
				data-testid="input-pick-dcm-files"
				onChange={(e) => {
					if (e.target.files && e.target.files.length > 0) {
						void processFileList(e.target.files);
					}
					e.target.value = "";
				}}
			/>

			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				data-testid="ct-selector-dropzone"
				className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center transition-all ${
					isDragOver
						? "border-teal-500 bg-teal-500/10 scale-[1.01]"
						: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-teal-500/50 hover:bg-[var(--paper)]"
				}`}
			>
				<div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center">
					<UploadCloud size={24} />
				</div>

				<div>
					<strong className="text-sm font-bold text-[var(--ink)] block">
						Перетащите сюда архив КТ от Пикассо или папку со срезами
					</strong>
					<span className="text-xs text-[var(--muted)] block mt-0.5 max-w-md">
						Поддерживаются ZIP-архивы, папки DICOM, файлы срезов .dcm от томографов KaVo,
						Vatech, Planmeca, Sirona, CyberMed
					</span>
				</div>

				{/* Extraction Progress Bar if active */}
				{isExtracting && (
					<div className="w-full max-w-md flex flex-col gap-1.5 my-1">
						<div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
							<span>{extractionStatus || "Обработка архива..."}</span>
							<span>{extractionPercent !== null ? `${extractionPercent}%` : ""}</span>
						</div>
						<div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
							<div
								className="h-full bg-teal-500 transition-all duration-150"
								style={{
									width: `${extractionPercent !== null ? extractionPercent : 100}%`,
								}}
							/>
						</div>
					</div>
				)}

				<div className="flex flex-wrap items-center justify-center gap-2 mt-1">
					<button
						type="button"
						onClick={() => zipInputRef.current?.click()}
						disabled={isExtracting}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
						data-testid="btn-pick-zip-archive"
					>
						<FileArchive size={14} />
						<span>Выбрать ZIP-архив</span>
					</button>

					<button
						type="button"
						onClick={() => folderInputRef.current?.click()}
						disabled={isExtracting}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
						data-testid="btn-pick-dicom-folder"
					>
						<Folder size={14} />
						<span>Выбрать папку DICOM</span>
					</button>

					<button
						type="button"
						onClick={() => filesInputRef.current?.click()}
						disabled={isExtracting}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
						data-testid="btn-pick-dcm-files"
					>
						<Scan size={14} />
						<span>Файлы .dcm</span>
					</button>
				</div>
			</div>
		</section>
	);
};
