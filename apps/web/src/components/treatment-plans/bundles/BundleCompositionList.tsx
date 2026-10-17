import React from "react";
import { RotateCcw } from "lucide-react";
import type { ClinicalBundleDefinition, ClinicalBundleId } from "../treatmentPlanBundlesEngine";

export interface BundleCompositionListProps {
	readonly bundle: ClinicalBundleDefinition;
	readonly selectedIds: readonly string[];
	readonly onToggleItem: (bundleId: string, itemId: string) => void;
	readonly onResetSelection: (bundleId: ClinicalBundleId) => void;
}

export const BundleCompositionList: React.FC<BundleCompositionListProps> = ({
	bundle,
	selectedIds,
	onToggleItem,
	onResetSelection,
}) => {
	return (
		<div className="p-3.5 sm:p-4 bg-[var(--paper-soft)] border-t border-[var(--line)] space-y-2.5 animate-in fade-in duration-150">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">
						Состав пакета лечения (клинические услуги):
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						Снимите отметку, если позиция не проводилась
					</span>
				</div>

				<button
					type="button"
					onClick={() => onResetSelection(bundle.id)}
					className="text-[11px] text-[var(--teal)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
					title="Вернуть все позиции пакета по умолчанию"
				>
					<RotateCcw size={12} />
					<span>Сбросить к «Все включено»</span>
				</button>
			</div>

			<div className="grid grid-cols-1 gap-2">
				{bundle.items.map((item) => {
					const isChecked = selectedIds.includes(item.id);

					return (
						<label
							key={item.id}
							className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
								isChecked
									? "bg-[var(--paper)] border-[var(--line)] shadow-2xs"
									: "bg-[var(--paper-soft)]/60 border-dashed border-[var(--line)] opacity-60"
							}`}
							data-testid={`item-checkbox-${bundle.id}-${item.id}`}
						>
							<div className="flex items-start gap-3 min-w-0">
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => onToggleItem(bundle.id, item.id)}
									className="mt-0.5 h-4 w-4 rounded text-[var(--teal)] border-[var(--line)] focus:ring-[var(--teal)] cursor-pointer shrink-0"
								/>
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-mono text-[11px] font-bold text-[var(--teal)] bg-[var(--teal)]/10 px-1.5 py-0.5 rounded shrink-0">
											{item.code804n}
										</span>
										<span className={`text-xs font-bold break-words leading-snug ${isChecked ? "text-[var(--ink)]" : "text-[var(--muted)] line-through"}`}>
											{item.name}
										</span>
										{item.optional && (
											<span className="text-[10px] text-[var(--muted)] font-medium shrink-0">
												(опционально)
											</span>
										)}
									</div>
									<p className="text-[11px] text-[var(--muted)] mt-1 break-words">
										<strong className="text-[var(--ink)]/80">Материалы:</strong> {item.materials}
									</p>
								</div>
							</div>

							<div className="text-right shrink-0">
								<span className="font-mono font-bold text-xs text-[var(--ink)]">
									{item.defaultPriceRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);
};
