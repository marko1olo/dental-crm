import React from "react";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../../types";
import { isMicroConsumable } from "../../treatmentPlanConsumables";
import { MissingPriceAlert } from "../../MissingPriceAlert";

export interface StageMobileCardsProps {
	readonly stage: TreatmentPlanStage;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: ((fn: (prev: boolean) => boolean) => void) | React.Dispatch<React.SetStateAction<boolean>> | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
}

export const StageMobileCards: React.FC<StageMobileCardsProps> = ({
	stage,
	showMicroConsumables,
	setShowMicroConsumables,
	onUpdateItemPrice,
}) => {
	const microConsumables = stage.items.filter(isMicroConsumable);
	const displayList = showMicroConsumables
		? stage.items
		: stage.items.filter((it) => !isMicroConsumable(it));

	return (
		<div className="md:hidden space-y-2 py-2" data-testid={"stage-mobile-cards-" + stage.stageNumber}>
			{displayList.length === 0 ? (
				<div className="py-4 text-center text-xs text-[var(--tp-text-muted)]">
					В данном этапе пока нет назначенных медицинских услуг.
				</div>
			) : (
				displayList.map((item, idx) => (
					<div
						key={item.id || idx}
						className="p-3 rounded-xl bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] space-y-1.5"
						data-testid={`stage-item-mobile-${idx}`}
					>
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="code-804n-badge text-[10px]">{item.serviceCode || item.code804n}</span>
								{item.toothNumber && (
									<span className="tooth-fdi-badge text-[11px] w-6 h-6">{item.toothNumber}</span>
								)}
							</div>
							<span
								className={`font-bold font-mono text-xs whitespace-nowrap ${
									item.requiresManualPricing || item.priceRub === 0
										? "text-amber-600 dark:text-amber-400"
										: "text-[var(--tp-text-main)]"
								}`}
							>
								{(item.priceRub || 0).toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="text-xs font-semibold text-[var(--tp-text-main)] leading-snug break-words">
							{item.name}
						</div>

						{item.clinicalRationale && (
							<div className="text-[11px] text-[var(--tp-text-muted)] leading-tight">
								{item.clinicalRationale}
							</div>
						)}

						<div className="flex items-center justify-between text-[11px] text-[var(--tp-text-muted)] pt-1 border-t border-[var(--tp-border)]/50">
							<span>Кол-во: {item.quantity} шт.</span>
							<span>{(item.unitPriceRub || 0).toLocaleString("ru-RU")} ₽/ед.</span>
						</div>

						{(item.requiresManualPricing || item.priceRub === 0) && (
							<div className="mt-1">
								<MissingPriceAlert
									item={item}
									onUpdatePrice={onUpdateItemPrice}
									variant="inline"
								/>
							</div>
						)}
					</div>
				))
			)}
			{microConsumables.length > 0 && (
				<div className="p-2.5 rounded-xl bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] space-y-1">
					<div className="leading-snug">
						Сопутствующие микро-расходники ({microConsumables.length} поз.) включены в стоимость процедур.
					</div>
					<button
						type="button"
						onClick={() => setShowMicroConsumables?.((prev) => !prev)}
						className="text-[var(--tp-primary)] hover:underline font-bold text-xs cursor-pointer"
					>
						{showMicroConsumables ? "Скрыть микро-расходники" : "Показать список"}
					</button>
				</div>
			)}
		</div>
	);
};
