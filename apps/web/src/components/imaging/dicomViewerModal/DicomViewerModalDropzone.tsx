import React from "react";
import { Activity, FileText, FileUp, UploadCloud } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

export interface DicomViewerModalDropzoneProps {
	readonly isDragOver: boolean;
	readonly setIsDragOver: (over: boolean) => void;
	readonly onDrop: (e: React.DragEvent) => void;
	readonly onFileInputClick: () => void;
	readonly onConnectRvg?: (() => void) | undefined;
	readonly onUploadDicom?: (() => void) | undefined;
	readonly onReferToRadiology?: (() => void) | undefined;
	readonly onLoadDemoScan: () => void;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
}

export const DicomViewerModalDropzone: React.FC<DicomViewerModalDropzoneProps> = ({
	isDragOver,
	setIsDragOver,
	onDrop,
	onFileInputClick,
	onConnectRvg,
	onUploadDicom,
	onReferToRadiology,
	onLoadDemoScan,
	toothFdiCode,
	patientName,
	patientId,
}) => {
	const btnStyle = "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-3 py-2 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs cursor-pointer inline-flex items-center gap-2";

	return (
		<div
			data-testid="dicom-viewer-dropzone"
			onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={onDrop}
			onClick={onFileInputClick}
			className={`flex-1 flex flex-col items-center justify-center p-8 m-6 rounded-xl border-2 border-dashed cursor-pointer text-center transition-colors ${
				isDragOver ? "bg-slate-900 border-[var(--teal)]" : "bg-slate-950 border-slate-700"
			}`}
		>
			<div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-4 text-[var(--teal)]">
				<UploadCloud size={32} />
			</div>
			<div className="text-base font-bold text-slate-100 mb-1.5">
				Область загрузки снимка: перетащите файл (RVG / DICOM / PNG / TIFF)
			</div>
			<div className="text-xs text-slate-400 max-w-md leading-relaxed mb-5">
				Мгновенное открытие снимка &lt;50мс в полном разрешении датчика. Никаких задержек и ожидания ИИ.
			</div>
			<div className="flex gap-2.5 items-center justify-center flex-wrap" onClick={(e) => e.stopPropagation()}>
				<button
					type="button"
					data-testid="btn-dicom-connect-rvg"
					className={btnStyle}
					onClick={() => {
						if (onConnectRvg) onConnectRvg();
						else {
							window.dispatchEvent(new CustomEvent("dente-open-rvg-capture", { detail: { toothFdiCode, patientName, patientId } }));
							showToast("Запуск прямого захвата с визиографа RVG...", "info");
						}
					}}
				>
					<Activity size={14} className="text-[var(--teal)]" /> Подключить визиограф RVG
				</button>
				<button
					type="button"
					data-testid="btn-dicom-upload-archive"
					className={btnStyle}
					onClick={() => {
						if (onUploadDicom) onUploadDicom();
						else onFileInputClick();
					}}
				>
					<FileUp size={14} /> Загрузить DICOM / КТ-архив
				</button>
				<button
					type="button"
					data-testid="btn-dicom-referral"
					className={btnStyle}
					onClick={() => {
						if (onReferToRadiology) onReferToRadiology();
						else {
							window.dispatchEvent(new CustomEvent("dente-open-radiology-referral", { detail: { toothFdiCode, patientName, patientId } }));
							showToast("Открытие формы направления на рентген-диагностику", "info");
						}
					}}
				>
					<FileText size={14} /> Направить на рентген
				</button>
				<button
					type="button"
					data-testid="btn-dicom-load-demo"
					className={btnStyle}
					onClick={onLoadDemoScan}
				>
					Показать демо-снимок
				</button>
			</div>
		</div>
	);
};
