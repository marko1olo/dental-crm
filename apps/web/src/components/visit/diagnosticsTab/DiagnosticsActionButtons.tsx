import { Camera, Columns2, FileText, FolderInput, Plus } from "lucide-react";
import React from "react";
import type { DiagnosticTabMode } from "./types";

export interface DiagnosticsActionButtonsProps {
	readonly diagnosticMode: DiagnosticTabMode;
	readonly onOpenReportStudio: () => void;
	readonly onOpenRadiologyReferral: () => void;
	readonly onOpenDirectRvg?: () => void;
	readonly onOpenHotFolder?: () => void;
	readonly onOpenDicomViewer?: () => void;
	readonly onOpenComparison?: () => void;
}

export function DiagnosticsActionButtons({
	diagnosticMode,
	onOpenReportStudio,
	onOpenRadiologyReferral,
	onOpenDirectRvg,
	onOpenHotFolder,
	onOpenDicomViewer,
	onOpenComparison,
}: DiagnosticsActionButtonsProps) {
	return (
		<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
			{/* ЕДИНСТВЕННЫЙ Primary CTA в панели диагностики */}
			{diagnosticMode === "rvg" && onOpenDirectRvg && (
				<button
					type="button"
					onClick={onOpenDirectRvg}
					data-testid="btn-open-direct-rvg-modal"
					className="diag-btn-teal h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
					title="Прямой захват снимка с датчика визиографа"
				>
					<Camera size={14} />
					<span>+ Захват с датчика</span>
				</button>
			)}

			{/* Вторичные нейтральные действия: тонкий 1px бордер var(--line), без радуги */}
			{diagnosticMode === "rvg" && onOpenHotFolder && (
				<button
					type="button"
					onClick={onOpenHotFolder}
					data-testid="btn-open-hot-folder-modal"
					className="diag-btn h-7 px-2 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
					title="Папка автозахвата снимков: автоматический импорт из каталога визиографа"
				>
					<FolderInput size={13} className="text-[var(--muted)]" />
					<span>Автозахват</span>
				</button>
			)}

			{onOpenComparison && (
				<button
					type="button"
					onClick={onOpenComparison}
					data-testid="btn-compare-visiograph-scans"
					className="diag-btn h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0"
					title="Сравнение прицельных снимков визиографа До / После лечения (EzDent-i Dual View)"
				>
					<Columns2 size={13} className="text-[var(--muted)]" />
					<span>Сравнить (До/После)</span>
				</button>
			)}

			{onOpenDicomViewer && (
				<button
					type="button"
					onClick={onOpenDicomViewer}
					data-testid="btn-open-dicom-viewer-modal"
					className="diag-btn h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
					title="Открыть просмотрщик DICOM снимков"
				>
					<FileText size={13} className="text-[var(--muted)]" />
					<span>DICOM</span>
				</button>
			)}

			<button
				type="button"
				onClick={onOpenReportStudio}
				className="diag-btn h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
				data-testid="btn-open-radiology-report-studio"
				title="Открыть студию радиологического отчёта и печати бланка A4"
			>
				<FileText size={13} className="text-[var(--muted)]" />
				<span>Отчёт (A4)</span>
			</button>

			<button
				type="button"
				onClick={onOpenRadiologyReferral}
				className="diag-btn h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
				data-testid="btn-open-radiology-referral-modal"
				title="Выписать направление на КЛКТ / ОПТГ / ТРГ"
			>
				<Plus size={13} className="text-[var(--muted)]" />
				<span>Направление</span>
			</button>
		</div>
	);
}
