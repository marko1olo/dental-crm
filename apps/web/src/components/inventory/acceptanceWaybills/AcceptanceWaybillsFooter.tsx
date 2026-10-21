import { CheckCircle2, Download, Printer } from "lucide-react";
import type React from "react";
import { type AcceptanceWaybillDocument, formatRubCurrency } from "../acceptanceWaybillsEngine.js";

export interface AcceptanceWaybillsFooterProps {
	readonly waybill: AcceptanceWaybillDocument;
	readonly isPosting: boolean;
	readonly onPrintTorg12: () => void;
	readonly onExportCsv: () => void;
	readonly onPostWaybill: () => void;
}

export const AcceptanceWaybillsFooter: React.FC<AcceptanceWaybillsFooterProps> = ({
	waybill,
	isPosting,
	onPrintTorg12,
	onExportCsv,
	onPostWaybill,
}) => {
	return (
		<footer className="acceptance-modal-footer">
			<div className="acceptance-summary-block">
				<div className="acceptance-summary-item">
					<span className="acceptance-summary-label">Позиций</span>
					<span className="acceptance-summary-value">{waybill.totals.totalPositions}</span>
				</div>
				<div className="acceptance-summary-item">
					<span className="acceptance-summary-label">Количество ед.</span>
					<span className="acceptance-summary-value">{waybill.totals.totalQuantity}</span>
				</div>
				<div className="acceptance-summary-item">
					<span className="acceptance-summary-label">Сумма без НДС</span>
					<span className="acceptance-summary-value">
						{formatRubCurrency(waybill.totals.subtotalKopecks)}
					</span>
				</div>
				<div className="acceptance-summary-item">
					<span className="acceptance-summary-label">НДС</span>
					<span className="acceptance-summary-value">
						{formatRubCurrency(waybill.totals.totalVatKopecks)}
					</span>
				</div>
				<div className="acceptance-summary-item">
					<span className="acceptance-summary-label">Итого с НДС</span>
					<span className="acceptance-summary-value" style={{ color: "var(--teal, #0d9488)", fontSize: 16 }}>
						{formatRubCurrency(waybill.totals.totalCostKopecks)}
					</span>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<button
					type="button"
					className="acceptance-btn-secondary"
					onClick={onPrintTorg12}
					title="Печать приходной накладной (форма ТОРГ-12)"
					data-testid="btn-print-torg12"
				>
					<Printer size={15} />
					<span>Печать накладной</span>
				</button>

				<button
					type="button"
					className="acceptance-btn-secondary"
					onClick={onExportCsv}
					title="Экспорт в CSV файл"
					data-testid="btn-export-csv"
				>
					<Download size={15} />
					<span>CSV</span>
				</button>

				<button
					type="button"
					className="acceptance-btn-primary"
					onClick={onPostWaybill}
					disabled={isPosting || waybill.items.length === 0}
					data-testid="btn-post-acceptance-waybill"
				>
					<CheckCircle2 size={16} />
					<span>{isPosting ? "Проведение..." : "Провести накладную"}</span>
				</button>
			</div>
		</footer>
	);
};

export default AcceptanceWaybillsFooter;
