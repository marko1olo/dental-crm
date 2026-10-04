import React from "react";
import { CheckCircle2, ClipboardList, Download, RotateCcw, Truck } from "lucide-react";

export interface DirectRvgFooterProps {
	selectedTeeth: string[];
	calculatedDoseMicrosv?: number;
	isSaving: boolean;
	onExportDicom: () => void;
	onSendToLab: () => void;
	onSaveToEmr: () => void;
	onSendToPlan?: () => void;
	onRetake?: () => void;
}

/**
 * DirectRvgFooter
 *
 * Strict, high-contrast action bar for the chairside dental RVG workstation.
 * Primary CTA: «Сохранить в карту»
 * Secondary actions: «Переснять (Space)», «В план лечения», «В лабораторию (ЗТЛ)», «Экспорт DICOM».
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
}) => {
	return (
		<div className="rvg-capture-footer">
			<div className="rvg-footer-left-info">
				<span className="font-mono text-xs text-[var(--muted,#94a3b8)]">
					Зуб FDI #{selectedTeeth.join(", ")} · Готовность к сохранению в карту
				</span>
			</div>

			<div className="rvg-footer-actions-group">
				{/* Secondary Action 1: Retake Scan (Space) */}
				{onRetake && (
					<button
						type="button"
						onClick={onRetake}
						className="rvg-action-btn-secondary"
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
						className="rvg-action-btn-secondary"
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
					className="rvg-action-btn-secondary"
					title="Прикрепить снимок к текущему заказу зуботехнической лаборатории"
					data-testid="rvg-send-lab-btn"
				>
					<Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>В лабораторию (ЗТЛ)</span>
				</button>

				{/* Secondary Action 4: Export DICOM */}
				<button
					type="button"
					onClick={onExportDicom}
					className="rvg-action-btn-secondary"
					title="Экспортировать снимок в DICOM 3.0 / TIFF высокой четкости"
					data-testid="rvg-export-dicom-btn"
				>
					<Download className="w-3.5 h-3.5 text-[var(--muted,#94a3b8)]" />
					<span>Экспорт DICOM</span>
				</button>

				{/* Primary CTA: Save to EMR 043/u */}
				<button
					type="button"
					onClick={onSaveToEmr}
					disabled={isSaving}
					className="rvg-action-btn-primary"
					title={
						isSaving
							? "Сохранение снимка и протокола исследования в медицинскую карту..."
							: "Сохранить исследование в медицинскую карту пациента"
					}
					data-testid="rvg-save-emr-btn"
				>
					<CheckCircle2 className="w-4 h-4" />
					<span>{isSaving ? "Сохранение..." : "Сохранить в карту"}</span>
				</button>
			</div>
		</div>
	);
};

export default DirectRvgFooter;
