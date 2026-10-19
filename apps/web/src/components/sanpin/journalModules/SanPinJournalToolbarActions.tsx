/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalToolbarActions.tsx
 *
 * Тулбар действий журнала автоклавирования и стерилизации (DENTE HIG).
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { Printer, ShieldCheck, Sparkles, Download, Plus, Settings } from "lucide-react";
import { SanPinJournalBatchButtons } from "./SanPinJournalBatchButtons";

export interface SanPinJournalToolbarActionsProps {
	readonly isAutofilling: boolean;
	readonly onAutofillNorms: () => void;
	readonly onOpenScannerModal: () => void;
	readonly onPrintForm257: () => void;
	readonly onExportCsv: () => void;
	readonly onOpenEquipmentModal?: (() => void) | undefined;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121", cycleName?: string) => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

const BTN_SEC = "secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all";

export const SanPinJournalToolbarActions: React.FC<SanPinJournalToolbarActionsProps> = ({
	isAutofilling,
	onAutofillNorms,
	onOpenScannerModal,
	onPrintForm257,
	onExportCsv,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	return (
		<div className="flex items-center justify-between gap-2.5 flex-wrap border-t border-[var(--line-subtle)] pt-2.5">
			<SanPinJournalBatchButtons
				isAutofilling={isAutofilling}
				onQuickBatchNorm={onQuickBatchNorm}
				onQuickPsoNorm={onQuickPsoNorm}
			/>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onAutofillNorms}
					aria-busy={isAutofilling}
					className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--teal,#0d9488)] bg-teal-500/10 hover:bg-teal-500/20 text-[var(--teal,#0d9488)] px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
					data-testid="autofill-norms-btn"
					title="Автоматическое заполнение журнала автоклавирования по нормам СанПиН"
				>
					<Sparkles size={14} />
					<span>{isAutofilling ? "Заполнение..." : "Заполнить по нормам"}</span>
				</button>

				<button
					type="button"
					onClick={onOpenScannerModal}
					className={BTN_SEC}
					data-testid="batch-verify-modal-btn"
					title="Подтверждение стерильности партии лотков для приёма"
				>
					<ShieldCheck size={14} />
					<span>Партия лотков к приёму</span>
				</button>

				{onOpenNewCycleModal && (
					<button
						type="button"
						onClick={onOpenNewCycleModal}
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						data-testid="start-cycle-btn"
						title="Зафиксировать цикл автоклава вручную"
					>
						<Plus size={14} />
						<span>+ Новый цикл</span>
					</button>
				)}

				{onOpenEquipmentModal && (
					<button type="button" onClick={onOpenEquipmentModal} className={BTN_SEC} data-testid="equipment-modal-btn">
						<Settings size={14} />
						<span>Оборудование ЦСО</span>
					</button>
				)}

				<button type="button" onClick={onPrintForm257} className={BTN_SEC} data-testid="print-form-257-btn" title="Официальный отчет для проверки Роспотребнадзора">
					<Printer size={14} />
					<span>Печать журнала (Роспотребнадзор)</span>
				</button>

				<button type="button" onClick={onExportCsv} className={BTN_SEC} data-testid="export-csv-btn" title="Экспорт в CSV">
					<Download size={14} />
					<span>CSV</span>
				</button>
			</div>
		</div>
	);
};

export default SanPinJournalToolbarActions;
