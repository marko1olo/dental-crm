import React from "react";
import { CheckCircle2, ChevronDown, ClipboardList, Download, MoreHorizontal, Printer, RotateCcw, Truck } from "lucide-react";

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
 * Primary CTA: «Прикрепить снимок к зубу и карте визита» (var(--teal))
 * Secondary action: «Переснять (Space)»
 * Actions dropdown: «В план лечения», «В лабораторию (ЗТЛ)», «Экспорт DICOM/JPEG», «Печать заключения».
 *
 * Governed by Mandate 8e (Doctor Autonomy) and Mandates 8am, 8zd.
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
	const [isMenuOpen, setIsMenuOpen] = React.useState(false);
	const toothLabel = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—";

	return (
		<div className="rvg-capture-footer">
			<div className="rvg-footer-left-info">
				<span className="font-mono text-xs text-[var(--muted,#94a3b8)]">
					Зуб FDI #{toothLabel} · Готовность к сохранению в карту визита
				</span>
			</div>

			<div className="rvg-footer-actions-group">
				{/* Secondary Action: Retake Scan (Space) */}
				{onRetake && (
					<button
						type="button"
						onClick={onRetake}
						className="secondary-button rvg-action-btn-secondary"
						title="Повторный захват кадра с датчика (Space)"
						data-testid="rvg-retake-btn"
					>
						<RotateCcw className="w-3.5 h-3.5 text-current opacity-80" />
						<span>Переснять (Space)</span>
					</button>
				)}

				{/* Collapsed Actions Dropdown Menu */}
				<div className="relative inline-block text-left">
					<button
						type="button"
						onClick={() => setIsMenuOpen((prev) => !prev)}
						className="secondary-button rvg-action-btn-secondary"
						title="Дополнительные клинические действия"
						data-testid="rvg-actions-dropdown-trigger"
						aria-expanded={isMenuOpen}
					>
						<MoreHorizontal className="w-3.5 h-3.5 text-current opacity-80" />
						<span>Действия</span>
						<ChevronDown className="w-3 h-3 text-current opacity-70 ml-0.5" />
					</button>

					<div
						className={`absolute right-0 bottom-full mb-2 w-56 rounded-lg bg-[var(--paper,#0b1120)] border border-[var(--line,#334155)] shadow-xl p-1 z-50 flex flex-col gap-1 backdrop-blur-md ${isMenuOpen ? "block" : "hidden"}`}
						role="menu"
					>
						{onSendToPlan && (
							<button
								type="button"
								onClick={() => { setIsMenuOpen(false); onSendToPlan(); }}
								className="w-full text-left px-3 py-2 text-xs rounded-md text-[var(--ink,#e2e8f0)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] flex items-center gap-2 transition-colors cursor-pointer"
								title="Прикрепить снимок к активному плану лечения пациента"
								data-testid="rvg-send-plan-btn"
							>
								<ClipboardList className="w-3.5 h-3.5 opacity-80" />
								<span>В план лечения</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => { setIsMenuOpen(false); onSendToLab(); }}
							className="w-full text-left px-3 py-2 text-xs rounded-md text-[var(--ink,#e2e8f0)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] flex items-center gap-2 transition-colors cursor-pointer"
							title="Прикрепить снимок к текущему заказу зуботехнической лаборатории"
							data-testid="rvg-send-lab-btn"
						>
							<Truck className="w-3.5 h-3.5 opacity-80" />
							<span>В лабораторию (ЗТЛ)</span>
						</button>

						<button
							type="button"
							onClick={() => { setIsMenuOpen(false); onExportDicom(); }}
							className="w-full text-left px-3 py-2 text-xs rounded-md text-[var(--ink,#e2e8f0)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] flex items-center gap-2 transition-colors cursor-pointer"
							title="Экспортировать снимок в DICOM 3.0 / TIFF / JPEG"
							data-testid="rvg-export-dicom-btn"
						>
							<Download className="w-3.5 h-3.5 opacity-80" />
							<span>Экспорт DICOM/JPEG</span>
						</button>

						{onPrintReport && (
							<button
								type="button"
								onClick={() => { setIsMenuOpen(false); onPrintReport(); }}
								className="w-full text-left px-3 py-2 text-xs rounded-md text-[var(--ink,#e2e8f0)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] flex items-center gap-2 transition-colors cursor-pointer"
								title="Печать заключения и рентгенологического протокола"
								data-testid="rvg-print-report-btn"
							>
								<Printer className="w-3.5 h-3.5 opacity-80" />
								<span>Печать заключения</span>
							</button>
						)}
					</div>
				</div>

				{/* Primary CTA: Exactly 1 Primary Action (#0d9488) */}
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
					<span>{isSaving ? "Сохранение..." : "Прикрепить снимок к зубу и карте визита"}</span>
				</button>
			</div>
		</div>
	);
};

export default DirectRvgFooter;
