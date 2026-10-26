/**
 * ImagingToolbarRightActions.tsx — Правая группа кнопок тулбара (печать, скачивание, сброс)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { ImagingToothVisitGroup } from "./ImagingToothVisitGroup.js";
import { downloadStudyImageAsJpg, printStudyForPatient } from "../imagingExportPrintHelper.js";

interface Props {
	selectedImagingStudy?: any;
	activeAppointment?: any;
	activePatient?: any;
	previewSrc?: string | null | undefined;
	rulerMeasurementsCount: number;
	onAttachToTooth?: ((toothCode: string) => Promise<void> | void) | undefined;
	onAttachToVisit?: ((visitId: string) => Promise<void> | void) | undefined;
	onReset: () => void;
}

export const ImagingToolbarRightActions: React.FC<Props> = ({
	selectedImagingStudy,
	activeAppointment,
	activePatient,
	previewSrc,
	rulerMeasurementsCount,
	onAttachToTooth,
	onAttachToVisit,
	onReset,
}) => {
	const handleDownloadJpg = () => {
		if (!previewSrc) return;
		downloadStudyImageAsJpg(
			previewSrc,
			selectedImagingStudy?.kind === "opg" ? "panoramic_opg" : "dental_rvg",
			selectedImagingStudy?.toothCode,
		);
	};

	const handlePrint = () => {
		if (!previewSrc) return;
		printStudyForPatient({
			imageUrl: previewSrc,
			studyTitle: selectedImagingStudy?.title,
			toothCode: selectedImagingStudy?.toothCode,
			patientName: activePatient?.fullName || activePatient?.name || activeAppointment?.patientName,
			measurementsCount: rulerMeasurementsCount,
		});
	};

	const actionBtnClass =
		"h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs";

	return (
		<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
			<ImagingToothVisitGroup
				selectedImagingStudy={selectedImagingStudy}
				activeAppointment={activeAppointment}
				onAttachToTooth={onAttachToTooth}
				onAttachToVisit={onAttachToVisit}
			/>
			{previewSrc && (
				<>
					<button
						className={actionBtnClass}
						type="button"
						data-testid="btn-print-xray"
						title="Печать снимка с протоколом для пациента"
						aria-label="Печать снимка"
						onClick={handlePrint}
					>
						<Printer size={13} aria-hidden="true" />
						<span className="text-xs font-semibold">Печать</span>
					</button>
					<button
						className={actionBtnClass}
						type="button"
						data-testid="btn-download-jpg"
						title="Скачать снимок в формате JPG"
						aria-label="Скачать снимок JPG"
						onClick={handleDownloadJpg}
					>
						<Download size={13} aria-hidden="true" />
						<span className="text-xs font-semibold">JPG</span>
					</button>
				</>
			)}
			<button
				className="viewer-tool-button h-8 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
				type="button"
				title="Сбросить все параметры просмотра"
				aria-label="Сбросить настройки снимка"
				onClick={onReset}
			>
				<RefreshCw size={13} aria-hidden="true" />
				<span className="text-xs font-semibold">Сброс</span>
			</button>
		</div>
	);
};
