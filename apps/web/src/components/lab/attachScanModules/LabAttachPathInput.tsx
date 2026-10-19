import { Upload } from "lucide-react";
import type React from "react";

export interface LabAttachPathInputProps {
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly filePath: string;
	readonly setFilePath: (p: string) => void;
	readonly fileSizeInfo: string | null;
	readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LabAttachPathInput({
	inputRef,
	fileInputRef,
	filePath,
	setFilePath,
	fileSizeInfo,
	onFileSelect,
}: LabAttachPathInputProps) {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor="lab-attach-path-input"
				className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between"
			>
				<span>Путь к файлу скана или URL:</span>
				{fileSizeInfo && (
					<span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">
						Размер: {fileSizeInfo}
					</span>
				)}
			</label>
			<div className="flex gap-2">
				<input
					id="lab-attach-path-input"
					ref={inputRef}
					type="text"
					value={filePath}
					onChange={(e) => setFilePath(e.target.value)}
					placeholder="scans/upper_jaw_scan.stl или https://..."
					className="flex-1 h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
					data-testid="lab-attach-scan-path-input"
				/>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
					title="Выбрать файл"
				>
					<Upload className="w-3.5 h-3.5" />
					<span>Обзор...</span>
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".stl,.ply,.obj,.3mf,image/*"
					className="hidden"
					onChange={onFileSelect}
				/>
			</div>
		</div>
	);
}
