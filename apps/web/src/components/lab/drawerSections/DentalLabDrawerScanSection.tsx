import React, { useRef, useState } from "react";
import { Box, CheckCircle2 } from "lucide-react";
import { is3DScanUrl } from "../dentalLabOrderEngine";
import { ScanDropzone } from "./scanSectionModules/ScanDropzone";
import { ScanQuickPresets } from "./scanSectionModules/ScanQuickPresets";

export interface DentalLabDrawerScanSectionProps {
	readonly formAttachedScanUrl: string;
	readonly setFormAttachedScanUrl: (val: string) => void;
}

export function DentalLabDrawerScanSection({
	formAttachedScanUrl,
	setFormAttachedScanUrl,
}: DentalLabDrawerScanSectionProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const [attachedFileName, setAttachedFileName] = useState<string>("");
	const [attachedFileSize, setAttachedFileSize] = useState<string>("");
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleFile = (file: File) => {
		if (!file) return;
		const name = file.name;
		const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
		setAttachedFileName(name);
		setAttachedFileSize(`${sizeMb} МБ`);

		const ext = name.split(".").pop()?.toLowerCase();
		if (ext === "stl" || ext === "ply" || ext === "obj") {
			setFormAttachedScanUrl(`/scans/${name}`);
		} else {
			setFormAttachedScanUrl(`/photos/${name}`);
		}
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const files = e.dataTransfer.files;
		if (files && files.length > 0 && files[0]) {
			handleFile(files[0]);
		}
	};

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && files[0]) {
			handleFile(files[0]);
		}
	};

	const handleClear = () => {
		setFormAttachedScanUrl("");
		setAttachedFileName("");
		setAttachedFileSize("");
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const isAttached = Boolean(formAttachedScanUrl);
	const is3D = is3DScanUrl(formAttachedScanUrl);

	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2.5">
			<div className="flex items-center justify-between">
				<label className="font-semibold text-xs text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Box size={15} className="text-teal-600 dark:text-teal-400" />
					<span>3D-скан челюсти (STL / PLY / OBJ) и фото прикуса:</span>
				</label>
				{isAttached && (
					<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30 inline-flex items-center gap-1">
						<CheckCircle2 size={11} className="text-teal-600 dark:text-teal-400" />
						<span>{is3D ? "3D-скан прикреплен" : "Фотография прикреплена"}</span>
					</span>
				)}
			</div>

			<ScanDropzone
				formAttachedScanUrl={formAttachedScanUrl} attachedFileName={attachedFileName}
				attachedFileSize={attachedFileSize} isDragOver={isDragOver} setIsDragOver={setIsDragOver}
				onDrop={onDrop} onFileChange={onFileChange} handleClear={handleClear}
				fileInputRef={fileInputRef}
			/>

			<ScanQuickPresets
				setFormAttachedScanUrl={setFormAttachedScanUrl}
				setAttachedFileName={setAttachedFileName}
				setAttachedFileSize={setAttachedFileSize}
			/>
		</div>
	);
}
