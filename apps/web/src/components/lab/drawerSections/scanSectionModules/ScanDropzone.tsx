import React from "react";
import { Box, Camera, Upload, X } from "lucide-react";
import { is3DScanUrl } from "../../dentalLabOrderEngine";

export interface ScanDropzoneProps {
	formAttachedScanUrl: string;
	attachedFileName: string;
	attachedFileSize: string;
	isDragOver: boolean;
	setIsDragOver: (over: boolean) => void;
	onDrop: (e: React.DragEvent) => void;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleClear: () => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ScanDropzone({
	formAttachedScanUrl, attachedFileName, attachedFileSize, isDragOver, setIsDragOver,
	onDrop, onFileChange, handleClear, fileInputRef,
}: ScanDropzoneProps): React.JSX.Element {
	const isAttached = Boolean(formAttachedScanUrl);
	const is3D = is3DScanUrl(formAttachedScanUrl);

	return (
		<div
			onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={onDrop}
			onClick={() => fileInputRef.current?.click()}
			className={`relative p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 ${
				isDragOver
					? "border-teal-500 bg-teal-500/10 scale-[1.01]"
					: isAttached
						? "border-teal-500/40 bg-teal-500/5 hover:border-teal-500"
						: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 hover:bg-[var(--paper-soft,#f8fafc)]"
			}`}
			data-testid="scan-dropzone"
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".stl,.ply,.obj,.jpg,.jpeg,.png"
				onChange={onFileChange}
				className="hidden"
				data-testid="scan-file-input"
			/>

			{isAttached ? (
				<div className="w-full flex items-center justify-between gap-2 text-xs">
					<div className="flex items-center gap-2 min-w-0">
						<span className="p-2 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 shrink-0">
							{is3D ? <Box size={18} /> : <Camera size={18} />}
						</span>
						<div className="text-left min-w-0">
							<div className="font-bold text-[var(--ink,#0f172a)] truncate">
								{attachedFileName || formAttachedScanUrl.split("/").pop()}
							</div>
							<div className="text-[10px] text-[var(--muted,#64748b)]">
								{attachedFileSize ? `${attachedFileSize} • ` : ""}
								{is3D ? "Интраоральный 3D меш" : "Фотопротокол окклюзии"}
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); handleClear(); }}
						className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
						title="Удалить файл"
					>
						<X size={15} />
					</button>
				</div>
			) : (
				<>
					<span className="p-2 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
						<Upload size={18} />
					</span>
					<div>
						<span className="text-xs font-semibold text-[var(--ink,#0f172a)] block">
							Перетащите STL / PLY / OBJ скан челюсти или фото
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)] block mt-0.5">
							или нажмите для выбора файла (до 250 МБ без зависания)
						</span>
					</div>
				</>
			)}
		</div>
	);
}
