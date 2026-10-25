import React from "react";
import { Scan, UploadCloud } from "lucide-react";

interface PatientRadiologyEmptyStateProps {
	onUpload: () => void;
}

export const PatientRadiologyEmptyState: React.FC<PatientRadiologyEmptyStateProps> = ({ onUpload }) => {
	return (
		<div
			className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-[var(--paper-soft)] rounded-2xl border border-dashed border-[var(--line)]"
			data-testid="patient-radiology-empty"
		>
			<div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center">
				<Scan className="w-6 h-6" />
			</div>
			<div className="max-w-md">
				<h4 className="text-sm font-bold text-[var(--ink)]">Снимки еще не привязаны</h4>
				<p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
					У пациента пока нет сохраненных КЛКТ или рентгеновских снимков в базе. Вы можете
					принять снимок из папки аппарата или загрузить DICOM файл.
				</p>
			</div>
			<button
				type="button"
				onClick={onUpload}
				className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer mt-1"
			>
				<UploadCloud className="w-4 h-4" />
				<span>Загрузить исследование</span>
			</button>
		</div>
	);
};
