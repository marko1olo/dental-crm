/**
 * StudyViewerHeader.tsx — Верхняя панель заголовка просмотрщика визиографии.
 * Отображает название исследования, имя пациента, выбранный зуб и расчетную лучевую нагрузку.
 * Mandate 8b: строго < 80 строк.
 */

import React from "react";
import { Activity, X } from "lucide-react";

export interface StudyViewerHeaderProps {
	readonly studyTitle: string;
	readonly patientName: string;
	readonly selectedTooth: string;
	readonly doseMsv: number;
	readonly modality: "rvg" | "opg" | "cbct_slice";
	readonly onClose?: () => void;
}

export const StudyViewerHeader: React.FC<StudyViewerHeaderProps> = ({
	studyTitle,
	patientName,
	selectedTooth,
	doseMsv,
	modality,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(13,148,136,0.12)] text-[var(--teal,#0d9488)]">
					<Activity className="h-4 w-4" />
				</div>
				<div className="flex flex-col min-w-0">
					<span className="text-[13px] font-semibold truncate leading-tight">
						<span className="sm:hidden">RVG #{selectedTooth} — {patientName}</span>
						<span className="hidden sm:inline">{studyTitle} — {patientName}</span>
					</span>
					<span className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 leading-tight">
						<span>Зуб {selectedTooth}</span>
						<span>•</span>
						<span>Доза: {doseMsv} мЗв ({modality === "opg" ? "18-25" : "2-5"} мкЗв, норма)</span>
					</span>
				</div>
			</div>

			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px]"
					title="Закрыть просмотрщик"
					data-testid="btn-close-viewer"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
};
