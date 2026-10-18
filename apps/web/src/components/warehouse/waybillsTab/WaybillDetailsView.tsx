import { Download, Printer } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles } from "../../inventory/acceptanceWaybillsEngine.js";
import { WaybillItemsGrid } from "./WaybillItemsGrid.js";
import type { AcceptanceWaybillDocument } from "./types.js";

export interface WaybillDetailsViewProps {
	readonly waybill: AcceptanceWaybillDocument;
	readonly onPrintTorg12: (wb: AcceptanceWaybillDocument) => void;
	readonly onExportCsv: (wb: AcceptanceWaybillDocument) => void;
}

export const WaybillDetailsView: React.FC<WaybillDetailsViewProps> = ({
	waybill, onPrintTorg12, onExportCsv,
}) => {
	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden" data-testid="waybill-details-view">
			<div className="p-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0">
				<div>
					<div className="flex items-center gap-2">
						<h4 className="text-sm font-bold text-[var(--ink)]">
							Накладная № {waybill.waybillNumber}
						</h4>
						<span
							className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
								waybill.status === "posted"
									? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
									: "bg-amber-500/20 text-amber-800 dark:text-amber-200"
							}`}
						>
							{waybill.status === "posted" ? "Проведена" : "Черновик"}
						</span>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Поставщик: <strong>{waybill.supplier.name}</strong> • ИНН {waybill.supplier.inn} • Дата: {waybill.receiptDate}
					</p>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => onPrintTorg12(waybill)}
						className="secondary-button h-8 px-2.5 text-xs font-semibold gap-1.5"
						title="Печать накладной поступления"
						data-testid="btn-print-torg12"
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
					Сумма без НДС: {money(kopecksToRubles(waybill.totals.subtotalKopecks))} • НДС: {money(kopecksToRubles(waybill.totals.totalVatKopecks))}
				</div>
				<div>
					<span>Итого к оплате: </span>
					<strong className="text-sm font-bold text-teal-700 dark:text-teal-300">
						{money(kopecksToRubles(waybill.totals.totalCostKopecks))}
					</strong>
				</div>
			</div>
		</div>
	);
};

export default WaybillDetailsView;
