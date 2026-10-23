import type React from "react";
import { Trash2 } from "lucide-react";
import type { ChestnyZnakScannedItem } from "@dental/shared";
import { MdlpStatusBadge } from "./MdlpStatusBadge.js";

export interface MdlpScannedMobileCardsProps {
	readonly scannedItems: readonly ChestnyZnakScannedItem[];
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpScannedMobileCards: React.FC<MdlpScannedMobileCardsProps> = ({
	scannedItems,
	onRemoveItem,
}) => {
	return (
		<div className="mdlp-mobile-cards-list flex flex-col gap-2.5 sm:hidden" data-testid="mdlp-mobile-cards">
			{scannedItems.map((item, index) => (
				<div
					key={item.id}
					className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2"
					data-testid={`mdlp-mobile-card-${item.id}`}
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="w-5 h-5 rounded-full bg-[var(--paper)] text-[var(--muted)] text-[11px] font-bold flex items-center justify-center shrink-0">
								{scannedItems.length - index}
							</span>
							<div>
								<div className="font-bold text-xs text-[var(--ink)] leading-snug">{item.tradeName}</div>
								<div className="text-[11px] text-[var(--muted)]">{item.inn} · {item.dosageForm}</div>
							</div>
						</div>
						<MdlpStatusBadge item={item} />
					</div>

					<div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--paper)] p-2 rounded-lg border border-[var(--line-subtle,rgba(255,255,255,0.05))]">
						<div>
							<span className="text-[var(--muted)] block text-[10px]">GTIN:</span>
							<span className="font-mono text-[var(--ink)]">{item.gtin || "—"}</span>
						</div>
						<div>
							<span className="text-[var(--muted)] block text-[10px]">Серия / Годен:</span>
							<span className="font-mono text-[var(--ink)]">{item.series || "—"} · {item.expirationDate || "—"}</span>
						</div>
					</div>

					<div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
						<span className="text-xs font-bold text-emerald-400">
							{item.costRub != null ? `${item.costRub.toFixed(2)} ₽` : "—"}
						</span>
						<button
							type="button"
							onClick={() => onRemoveItem(item.id)}
							className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
							data-testid={`delete-item-mobile-${item.id}`}
							title="Удалить позицию"
						>
							<Trash2 className="w-4 h-4 shrink-0" />
							<span>Удалить</span>
						</button>
					</div>
				</div>
			))}
		</div>
	);
};
