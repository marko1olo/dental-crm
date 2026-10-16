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
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121") => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

const BTN_BASE: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: 5,
	height: 30,
	padding: "0 10px",
	borderRadius: 6,
	fontSize: "0.75rem",
	fontWeight: 600,
	whiteSpace: "nowrap",
	cursor: "pointer",
};

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
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--line-subtle, #f1f5f9)", paddingTop: 6 }}>
			<SanPinJournalBatchButtons
				isAutofilling={isAutofilling}
				onQuickBatchNorm={onQuickBatchNorm}
				onQuickPsoNorm={onQuickPsoNorm}
			/>

			<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
				<button
					type="button"
					onClick={onAutofillNorms}
					aria-busy={isAutofilling}
					className="secondary-button"
					style={{ height: 32, padding: "0 10px", fontSize: "0.78125rem", border: "1px solid var(--teal, #0d9488)", color: "var(--teal, #0d9488)", cursor: isAutofilling ? "wait" : "pointer" }}
					data-testid="autofill-norms-btn"
					title="Автоматическое заполнение журнала работы автоклавов по нормам СанПиН"
				>
					<Sparkles size={13} />
					<span>{isAutofilling ? "Заполнение..." : "Заполнить по нормам"}</span>
				</button>

				<button
					type="button"
					onClick={onOpenScannerModal}
					className="secondary-button"
					style={{ height: 32, padding: "0 10px", fontSize: "0.78125rem" }}
					data-testid="batch-verify-modal-btn"
					title="Подтверждение стерильности партии лотков для приёма без поштучного сканирования"
				>
					<ShieldCheck size={13} />
					<span>Партия лотков к приёму</span>
				</button>

				{onOpenNewCycleModal && (
					<button
						type="button"
						onClick={onOpenNewCycleModal}
						className="primary-button"
						style={{ height: 32, padding: "0 12px", fontSize: "0.78125rem" }}
						data-testid="start-cycle-btn"
						title="Зафиксировать цикл автоклава смены"
					>
						<Plus size={13} />
						<span>+ Зафиксировать цикл автоклава</span>
					</button>
				)}

				{onOpenEquipmentModal && (
					<button
						type="button"
						onClick={onOpenEquipmentModal}
						className="secondary-button"
						style={{ height: 32, padding: "0 10px", fontSize: "0.78125rem" }}
						data-testid="equipment-modal-btn"
					>
						<Settings size={13} />
						<span>Оборудование ЦСО</span>
					</button>
				)}

				<button
					type="button"
					onClick={onPrintForm257}
					className="secondary-button"
					style={{ height: 32, padding: "0 10px", fontSize: "0.78125rem" }}
					data-testid="print-form-257-btn"
					title="Печать журнала автоклавирования и стерилизации (экспорт для проверки Роспотребнадзора)"
				>
					<Printer size={13} />
					<span>Экспорт журнала для проверки</span>
				</button>

				<button
					type="button"
					onClick={onExportCsv}
					className="secondary-button"
					style={{ height: 32, padding: "0 8px", fontSize: "0.78125rem" }}
					title="Экспорт в CSV для проверяющих органов"
					data-testid="export-csv-btn"
				>
					<Download size={13} />
					<span>Экспорт CSV</span>
				</button>
			</div>
		</div>
	);
};
