import React, { useState } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import type { ImagingExportOptions, ImagingStudy } from "./types";

export interface ImagingExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	study?: ImagingStudy | null;
	patient?: {
		fullName?: string;
		name?: string;
		birthDate?: string;
		medicalCardNumber?: string;
		cardNumber?: string;
	} | null;
	doctorName?: string;
	clinicName?: string;
	previewUrl?: string | null;
	reportSummary?: string | null;
}

export function ImagingExportModal({
	isOpen,
	onClose,
	study,
	patient,
	doctorName = "Лечащий врач",
	clinicName = "ООО «ДЕНТЕ»",
	previewUrl,
	reportSummary,
}: ImagingExportModalProps) {
	const [options, setOptions] = useState<ImagingExportOptions>({
		format: "jpg",
		withPatientData: true,
		withMeasurements: true,
		withAnnotations: true,
		quality: 0.92,
	});

	if (!isOpen || !study) return null;

	const patientName = patient?.fullName || patient?.name || "Пациент";
	const cardNum = patient?.medicalCardNumber || patient?.cardNumber || "—";

	const handleDownload = () => {
		if (!previewUrl) return;
		const a = document.createElement("a");
		a.href = previewUrl;
		a.download = `${study.title || "radiology_scan"}_${patientName}_${study.capturedAt.slice(0, 10)}.${options.format}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		onClose();
	};

	const handlePrint = () => {
		window.print();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in"
			role="dialog"
			aria-modal="true"
			aria-labelledby="imaging-export-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-lg rounded-2xl border border-[var(--line,#334155)] bg-[var(--paper,#0f172a)] p-5 text-[var(--ink,#f8fafc)] shadow-2xl flex flex-col gap-4">
				<div className="flex items-center justify-between border-b border-[var(--line,#334155)] pb-3">
					<div className="flex items-center gap-2">
						<Download className="w-5 h-5 text-[var(--teal,#0d9488)]" />
						<h3 id="imaging-export-modal-title" className="text-sm sm:text-base font-bold m-0">
							Экспорт и печать снимка
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Study & Patient Context Card */}
				<div className="p-3 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] flex flex-col gap-1 text-xs">
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Исследование:</span>
						<strong className="font-semibold">{study.title}</strong>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Пациент:</span>
						<strong>{patientName}</strong>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Амб. карта:</span>
						<span className="font-mono">{cardNum}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Дата съёмки:</span>
						<span>{new Date(study.capturedAt).toLocaleDateString("ru-RU")}</span>
					</div>
				</div>

				{/* Export Format Selector */}
				<div className="flex flex-col gap-1.5 text-xs">
					<label className="font-semibold text-[var(--ink,#f8fafc)]">Формат файла:</label>
					<div className="grid grid-cols-3 gap-2">
						{(["jpg", "png", "dicom"] as const).map((fmt) => (
							<button
								key={fmt}
								type="button"
								onClick={() => setOptions((prev) => ({ ...prev, format: fmt }))}
								className={`py-2 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
									options.format === fmt
										? "border-[var(--teal,#0d9488)] bg-teal-500/15 text-teal-300 shadow-xs"
										: "border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] text-[var(--muted,#94a3b8)] hover:border-[var(--line-strong,#475569)]"
								}`}
							>
								{fmt}
							</button>
						))}
					</div>
				</div>

				{/* Overlays Checkboxes */}
				<div className="flex flex-col gap-2 pt-1 text-xs">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={options.withPatientData}
							onChange={(e) =>
								setOptions((prev) => ({ ...prev, withPatientData: e.target.checked }))
							}
							className="rounded accent-[var(--teal,#0d9488)]"
						/>
						<span>Впечатать паспортные данные пациента и клиники</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={options.withMeasurements}
							onChange={(e) =>
								setOptions((prev) => ({ ...prev, withMeasurements: e.target.checked }))
							}
							className="rounded accent-[var(--teal,#0d9488)]"
						/>
						<span>Включить калиброванные замеры расстояний</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={options.withAnnotations}
							onChange={(e) =>
								setOptions((prev) => ({ ...prev, withAnnotations: e.target.checked }))
							}
							className="rounded accent-[var(--teal,#0d9488)]"
						/>
						<span>Включить заключение врача / ShadowAnalyst</span>
					</label>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#334155)]">
					<button
						type="button"
						onClick={handlePrint}
						className="secondary-button text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer"
					>
						<Printer size={14} />
						<span>Печать бланка</span>
					</button>
					<button
						type="button"
						onClick={handleDownload}
						className="primary-button text-xs py-2 px-4 inline-flex items-center gap-1.5 font-semibold cursor-pointer"
					>
						<Download size={14} />
						<span>Сохранить файл</span>
					</button>
				</div>
			</div>
		</div>
	);
}
