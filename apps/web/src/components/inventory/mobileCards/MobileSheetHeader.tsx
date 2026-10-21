import { X } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { formatExpDate } from "../inventoryExpiryUtils.js";

export interface MobileSheetHeaderProps {
	readonly activeSheetItem: InventoryItem;
	readonly onClose: () => void;
}

export const MobileSheetHeader: React.FC<MobileSheetHeaderProps> = ({
	activeSheetItem,
	onClose,
}) => {
	return (
		<>
			<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,#94a3b8)] mx-auto -mt-1 mb-2 opacity-80" />

			<div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 mb-1 flex-wrap">
						<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal)]">
							Складской оборот FEFO
						</span>
						{activeSheetItem.lotNumber && (
							<span className="text-[10px] font-mono text-[var(--muted)]">
								#{activeSheetItem.lotNumber}
							</span>
						)}
					</div>
					<h3 id="mobile-sheet-title" className="text-base font-extrabold text-[var(--ink)] leading-snug">
						{activeSheetItem.name}
					</h3>
					<p className="text-xs text-[var(--muted)] mt-0.5">
						Текущий остаток:{" "}
						<strong className="text-[var(--ink)] font-mono font-bold">
							{activeSheetItem.stockQuantity} {activeSheetItem.unit || "шт."}
						</strong>
						{activeSheetItem.expirationDate && (
							<span> • Годен до {formatExpDate(activeSheetItem.expirationDate)}</span>
						)}
					</p>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
					aria-label="Закрыть шторку"
				>
					<X size={18} />
				</button>
			</div>
		</>
	);
};

export default MobileSheetHeader;
