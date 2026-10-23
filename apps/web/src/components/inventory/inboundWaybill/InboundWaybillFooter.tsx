import React from "react";
import { CheckCircle2, Download, Printer, Truck } from "lucide-react";
import type { WaybillTotals } from "./inboundWaybillTypes.js";

interface InboundWaybillFooterProps {
	readonly totals: WaybillTotals;
	readonly isPosting: boolean;
	readonly onPrintWaybill: () => void;
	readonly onExportCsv: () => void;
	readonly onClose: () => void;
	readonly onPostWaybill: () => Promise<void>;
}

export const InboundWaybillFooter: React.FC<InboundWaybillFooterProps> = ({
	totals,
	isPosting,
	onPrintWaybill,
	onExportCsv,
	onClose,
	onPostWaybill,
}) => {
	return (
		<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-4 text-xs">
				<div>
					<span className="text-[var(--muted)]">Позиций: </span>
					<strong className="text-[var(--ink)]">{totals.positionsCount}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)]">Всего единиц: </span>
					<strong className="text-[var(--ink)]">{totals.totalQty} шт.</strong>
				</div>
				<div>
					<span className="text-[var(--muted)]">Итого: </span>
					<strong className="text-sm font-bold text-[var(--primary)] font-mono">
						{totals.totalSumFormatted}
					</strong>
				</div>
				{totals.resolvingDeficitCount > 0 && (
					<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
						<CheckCircle2 size={13} />
						<span>Погашает дефицит ({totals.resolvingDeficitCount} поз.)</span>
					</span>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onPrintWaybill}
					className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
					title="Печать приходной накладной"
					data-testid="btn-print-inbound-waybill"
				>
					<Printer size={15} />
					<span>Печать накладной</span>
				</button>

				<button
					type="button"
					onClick={onExportCsv}
					className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
					title="Выгрузить в CSV"
				>
					<Download size={15} />
					<span>CSV</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					disabled={isPosting}
					className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold transition cursor-pointer"
				>
					Отмена
				</button>

				{/* Primary CTA: ровно 1 по Мандату 8am */}
				<button
					type="button"
					onClick={onPostWaybill}
					disabled={isPosting}
					className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-[var(--primary)] text-white hover:brightness-110 active:scale-95 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
					data-testid="btn-post-inbound-waybill"
				>
					<Truck size={16} />
					<span>{isPosting ? "Оприходование..." : "✓ Оприходовать накладную"}</span>
				</button>
			</div>
		</div>
	);
};
