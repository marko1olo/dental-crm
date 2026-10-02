/**
 * DENTE CRM — Empty CBCT Volume Dropzone Component
 * Decomposed from CbctMprViewportsGrid.tsx per Mandate 8b.
 * Standards: DICOM Part 3, Mandate 8k (Clinical Density 28–36px)
 */

import React from "react";
import { Box, FolderOpen, RotateCcw, Sparkles, UploadCloud } from "lucide-react";

export interface CbctEmptyVolumeDropzoneProps {
	readonly dicomLoadingStatus: string | null;
	readonly dicomProgress: number;
	readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
	readonly zipInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleDicomFilesChange: (files: FileList | File[]) => void;
	readonly onLoadDemoVolume?: (() => void) | undefined;
}

export const CbctEmptyVolumeDropzone: React.FC<CbctEmptyVolumeDropzoneProps> = ({
	dicomLoadingStatus,
	dicomProgress,
	folderInputRef,
	zipInputRef,
	handleDicomFilesChange,
	onLoadDemoVolume,
}) => {
	return (
		<div
			className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 border border-dashed border-zinc-800 rounded-lg m-1 select-none"
			data-testid="cbct-empty-volume-dropzone"
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => {
				e.preventDefault();
				if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
					handleDicomFilesChange(e.dataTransfer.files);
				}
			}}
		>
			{dicomLoadingStatus ? (
				<div className="flex flex-col items-center justify-center gap-3">
					<div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-inner">
						<RotateCcw className="w-6 h-6 animate-spin text-cyan-400" />
					</div>
					<h3 className="text-sm font-bold text-zinc-200 mb-1">
						{dicomLoadingStatus}
					</h3>
					<div className="w-64 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
						<div
							className="h-full bg-cyan-500 transition-all duration-200"
							style={{ width: `${Math.max(5, Math.min(100, dicomProgress))}%` }}
						/>
					</div>
					<span className="text-xs font-mono text-zinc-400">{dicomProgress}%</span>
				</div>
			) : (
				<>
					<div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
						<Box className="w-6 h-6" />
					</div>
					<h3 className="text-sm font-bold text-[var(--ink,#f4f4f5)] mb-1">
						Исследование КЛКТ не загружено
					</h3>
					<p className="text-xs text-[var(--muted,#a1a1aa)] max-w-md mb-4">
						Перетащите папку со срезами DICOM (.dcm) или архив .zip сюда, либо выберите файлы для построения мультипланарной реконструкции (MPR) и имплантологического планирования.
					</p>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => folderInputRef.current?.click()}
							className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 hover:text-cyan-100 border border-cyan-500/50 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer min-h-[36px]"
							data-testid="cbct-btn-select-folder-empty"
						>
							<FolderOpen className="w-4 h-4" />
							<span>Выбрать папку DICOM</span>
						</button>
						<button
							type="button"
							onClick={() => zipInputRef.current?.click()}
							className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-colors border border-zinc-700 shadow-xs cursor-pointer min-h-[36px]"
							data-testid="cbct-btn-select-zip-empty"
						>
							<UploadCloud className="w-4 h-4" />
							<span>Архив .ZIP</span>
						</button>
						{onLoadDemoVolume && (
							<button
								type="button"
								onClick={onLoadDemoVolume}
								className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-500/40 shadow-xs cursor-pointer min-h-[36px]"
								data-testid="cbct-btn-load-demo-empty"
								title="Загрузить синтетический демо-фантом КЛКТ челюсти"
							>
								<Sparkles className="w-4 h-4 text-amber-300" />
								<span>Демо-исследование</span>
							</button>
						)}
					</div>
				</>
			)}
		</div>
	);
};
