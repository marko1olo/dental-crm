import React from "react";
import { CheckCircle2, ClipboardList, Download, Printer, RotateCcw, Truck } from "lucide-react";

export interface DirectRvgFooterProps {
	selectedTeeth: string[];
	calculatedDoseMicrosv?: number | undefined;
	isSaving: boolean;
	onExportDicom: () => void;
	onSendToLab: () => void;
	onSaveToEmr: () => void;
	onSendToPlan?: (() => void) | undefined;
	onRetake?: (() => void) | undefined;
	onPrintReport?: (() => void) | undefined;
}

/**
 * DirectRvgFooter
 *
 * Strict, high-contrast action bar for the chairside dental RVG workstation.
 * Primary CTA: «✓ Прикрепить снимок к зубу и карте визита» (#0d9488)
 * Secondary actions: «Переснять (Space)», «В план лечения», «В лабораторию (ЗТЛ)», «Экспорт DICOM/JPEG», «Печать заключения».
 *
 * Governed by Mandate 8e (Doctor Autonomy) and Mandate 8zd.
 */
export const DirectRvgFooter: React.FC<DirectRvgFooterProps> = ({
	selectedTeeth,
	isSaving,
	onExportDicom,
	onSendToLab,
	onSaveToEmr,
	onSendToPlan,
	onRetake,
	onPrintReport,
}) => {
	const toothLabel = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—";

	return (
		<div className="rvg-capture-footer">
			<div className="rvg-footer-left-info">
				<span className="font-mono text-xs text-[var(--muted,#94a3b8)]">
					Зуб FDI #{toothLabel} · Готовность к сохранению в карту визита
				</span>
			</div>

			<div className="rvg-footer-actions-group">
				{/* Secondary Action 1: Retake Scan (Space) */}
				{onRetake && (
					<button
						type="button"
						onClick={onRetake}
						className="secondary-button rvg-action-btn-secondary"
						title="Повторный захват кадра с датчика (Space)"
						data-testid="rvg-retake-btn"
					>
						<RotateCcw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
						<span>Переснять (Space)</span>
					</button>
				)}

				{/* Secondary Action 2: Send to Treatment Plan */}
				{onSendToPlan && (
					<button
						type="button"
						onClick={onSendToPlan}
						className="secondary-button rvg-action-btn-secondary"
						title="Прикрепить снимок к активному плану лечения пациента"
						data-testid="rvg-send-plan-btn"
					>
						<ClipboardList className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>В план лечения</span>
					</button>
				)}

				{/* Secondary Action 3: Send to Dental Lab (ЗТЛ) */}
				<button
					type="button"
					onClick={onSendToLab}
					className="secondary-button rvg-action-btn-secondary"
					title="Прикрепить снимок к текущему заказу зуботехнической лаборатории"
					data-testid="rvg-send-lab-btn"
				>
					<Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>В лабораторию (ЗТЛ)</span>
				</button>

				{/* Secondary Action 4: Export DICOM / JPEG */}
				<button
					type="button"
					onClick={onExportDicom}
					className="secondary-button rvg-action-btn-secondary"
					title="Экспортировать снимок в DICOM 3.0 / TIFF / JPEG"
					data-testid="rvg-export-dicom-btn"
				>
					<Download className="w-3.5 h-3.5 text-[var(--muted,#94a3b8)]" />
					<span>Экспорт DICOM/JPEG</span>
				</button>

				{/* Secondary Action 5: Print Report */}
				{onPrintReport && (
					<button
						type="button"
						onClick={onPrintReport}
						className="secondary-button rvg-action-btn-secondary"
						title="Печать заключения и рентгенологического протокола"
						data-testid="rvg-print-report-btn"
					>
						<Printer className="w-3.5 h-3.5 text-[var(--muted,#94a3b8)]" />
						<span>Печать заключения</span>
					</button>
				)}

				{/* Primary CTA: Attach to Tooth and Visit Card (#0d9488) */}
				<button
					type="button"
					onClick={isSaving ? undefined : onSaveToEmr}
					aria-busy={isSaving}
					className="primary-button rvg-action-btn-primary"
					title={
						isSaving
							? "Сохранение снимка и протокола исследования в медицинскую карту..."
							: "Прикрепить снимок к зубу и карте визита"
					}
					data-testid="rvg-save-emr-btn"
				>
					<CheckCircle2 className="w-4 h-4" />
					<span>{isSaving ? "Сохранение..." : "✓ Прикрепить снимок к зубу и карте визита"}</span>
				</button>
			</div>
		</div>
	);
};

export default DirectRvgFooter;
