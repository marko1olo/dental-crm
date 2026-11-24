import { Download, Printer } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles } from "../acceptanceWaybillsEngine.js";
import type { AcceptanceWaybillDocument } from "./types.js";
import { WaybillItemsGrid } from "./WaybillItemsGrid.js";

export interface WaybillDetailsViewProps {
	readonly waybill: AcceptanceWaybillDocument;
	readonly onPrintWaybill?: ((wb: AcceptanceWaybillDocument) => void) | undefined;
	readonly onExportCsv: (wb: AcceptanceWaybillDocument) => void;
}

export const WaybillDetailsView: React.FC<WaybillDetailsViewProps> = ({
	waybill,
	onPrintWaybill,
	onExportCsv,
}) => {
	const handlePrint = () => {
		if (onPrintWaybill) {
			onPrintWaybill(waybill);
		}
	};

	return (
		<div
			className="flex-1 flex flex-col min-h-0 overflow-hidden"
			data-testid="waybill-details-view"
		>
			<div className="p-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0">
				<div>
					<div className="flex items-center gap-2">
						<h4 className="text-sm font-bold text-[var(--ink)]">
							Накладная № {waybill.waybillNumber}
						</h4>
						<span
							className="text-[10px] font-semibold px-2 py-0.5 rounded border"
							style={{
								backgroundColor: waybill.status === "posted" ? "var(--success-soft, rgba(16, 185, 129, 0.15))" : "var(--warning-soft, rgba(245, 158, 11, 0.15))",
								color: waybill.status === "posted" ? "var(--success-ink, #065f46)" : "var(--warning-ink, #92400e)",
								borderColor: waybill.status === "posted" ? "var(--success-line, rgba(16, 185, 129, 0.3))" : "var(--warning-line, rgba(245, 158, 11, 0.3))",
							}}
						>
							{waybill.status === "posted" ? "Проведена" : "Черновик"}
						</span>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Поставщик: <strong>{waybill.supplier.name}</strong> • ИНН{" "}
						{waybill.supplier.inn} • Дата: {waybill.receiptDate}
					</p>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handlePrint}
						className="secondary-button h-8 px-2.5 text-xs font-semibold gap-1.5"
						title="Печать приходной накладной"
						data-testid="btn-print-waybill"
					>
						<Printer size={13} />
						<span>Печать накладной</span>
					</button>

					<button
						type="button"
						onClick={() => onExportCsv(waybill)}
						className="secondary-button h-8 px-2.5 text-xs font-semibold gap-1.5"
						title="Экспорт накладной в CSV"
						data-testid="btn-export-waybill-csv"
					>
						<Download size={13} />
						<span>CSV</span>
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-3">
				<WaybillItemsGrid items={waybill.items} mode="view" />
			</div>

			<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0 text-xs">
				<div className="text-[var(--muted)]">
					Сумма без НДС:{" "}
					{money(kopecksToRubles(waybill.totals.subtotalKopecks))} • НДС:{" "}
					{money(kopecksToRubles(waybill.totals.totalVatKopecks))}
				</div>
				<div>
					<span>Итого к оплате: </span>
					<strong className="text-sm font-bold text-[var(--teal,#0d9488)] font-mono tabular-nums">
						{money(kopecksToRubles(waybill.totals.totalCostKopecks))}
					</strong>
				</div>
			</div>
		</div>
	);
};

export default WaybillDetailsView;
