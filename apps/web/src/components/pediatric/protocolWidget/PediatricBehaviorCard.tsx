import React from "react";
import { Check } from "lucide-react";
import type { FranklRating } from "../odontogram/pediatricDentitionEngine";
import { FRANKL_EXPRESS_ITEMS } from "./constants";
import type { FranklExpressItem } from "./types";

export interface PediatricBehaviorCardProps {
	readonly franklRating: FranklRating;
	readonly activeFrankl: FranklExpressItem;
	readonly onSelectFrankl: (rating: FranklRating) => void;
}

export const PediatricBehaviorCard: React.FC<PediatricBehaviorCardProps> = ({
	franklRating,
	activeFrankl,
	onSelectFrankl,
}) => {
	return (
		<div className="mb-4">
			<div className="mb-2 flex items-center justify-between gap-2 min-w-0">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] shrink-0">
					Шкала поведения Франкла (экспресс-выбор в 1 клик):
				</span>
				<span className="text-xs font-medium text-[var(--muted,#64748b)] truncate min-w-0">
					{activeFrankl.clinicalTacticRu}
				</span>
			</div>
			<div
				className="grid grid-cols-2 gap-2 sm:grid-cols-4"
				data-testid="frankl-express-grid"
			>
				{FRANKL_EXPRESS_ITEMS.map((item) => {
					const isCurrent = franklRating === item.rating;
					const ItemIcon = item.icon;
					return (
						<button
							key={item.rating}
							type="button"
							onClick={() => onSelectFrankl(item.rating)}
							className={`flex min-h-[52px] sm:min-h-[36px] sm:h-9 max-h-none sm:max-h-9 items-center justify-between rounded-xl border px-2.5 py-1 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
								isCurrent
									? item.activeClass
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							title={`${item.titleRu}: ${item.descriptionRu}`}
							data-testid={`frankl-express-btn-${item.rating}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] shrink-0">
									<ItemIcon className="h-3.5 w-3.5" />
								</div>
								<div className="min-w-0">
									<div className="text-xs font-extrabold truncate font-mono">
										Рейтинг {item.symbol}
									</div>
									<div className="text-[10px] text-[var(--muted,#64748b)] truncate hidden sm:block">
										{item.rating === 1
											? "Негативное (--)"
											: item.rating === 2
												? "Насторожен (-)"
												: item.rating === 3
													? "Позитивное (+)"
													: "Партнерство (++)"}
									</div>
								</div>
							</div>
							{isCurrent && (
								<Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 ml-1" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};
