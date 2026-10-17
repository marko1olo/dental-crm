import React, { useRef, useState } from "react";
import { Box, Upload, FileText, CheckCircle2, X, Camera } from "lucide-react";
import { is3DScanUrl } from "../dentalLabOrderEngine";

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

		// Формируем безопасный виртуальный URI или относительный путь для CRM
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
		if (files && files.length > 0) {
			const file = files[0];
			if (file) handleFile(file);
		}
	};

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (file) handleFile(file);
		}
	};

	const handleClear = () => {
		setFormAttachedScanUrl("");
		setAttachedFileName("");
		setAttachedFileSize("");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
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

			{/* Drag & Drop область */}
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragOver(true);
				}}
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
							onClick={(e) => {
								e.stopPropagation();
								handleClear();
							}}
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

			{/* Быстрые демо-пресеты сканов */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Быстрые сканы:</span>
				<button
					type="button"
					onClick={() => {
						setFormAttachedScanUrl("/scans/patient_jaw_scan_maxilla.stl");
						setAttachedFileName("jaw_scan_upper_maxilla.stl");
						setAttachedFileSize("18.4 МБ");
					}}
					className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:border-teal-500 transition cursor-pointer inline-flex items-center gap-1"
					data-testid="btn-demo-stl-attach"
				>
					<Box size={11} className="text-teal-600" />
					<span>+ В/Ч STL скан</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setFormAttachedScanUrl("/scans/patient_jaw_scan_mandible.stl");
						setAttachedFileName("jaw_scan_lower_mandible.stl");
						setAttachedFileSize("21.2 МБ");
					}}
					className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:border-teal-500 transition cursor-pointer inline-flex items-center gap-1"
				>
					<Box size={11} className="text-teal-600" />
					<span>+ Н/Ч STL скан</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setFormAttachedScanUrl("/photos/bite_registration_occlusion.jpg");
						setAttachedFileName("bite_registration_front.jpg");
						setAttachedFileSize("4.6 МБ");
					}}
					className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:border-teal-500 transition cursor-pointer inline-flex items-center gap-1"
				>
					<Camera size={11} className="text-amber-600" />
					<span>+ Фото прикуса</span>
				</button>
			</div>
		</div>
	);
}
