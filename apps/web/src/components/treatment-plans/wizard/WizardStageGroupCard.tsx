import React from "react";
import { Check, Trash2 } from "lucide-react";
import type { WizardStageGroup } from "./wizardTypes";

export interface WizardStageGroupCardProps {
	readonly group: WizardStageGroup;
	readonly onToggleExclude: (itemKey: string) => void;
	readonly isExcluded: (itemKey: string) => boolean;
}

export const WizardStageGroupCard: React.FC<WizardStageGroupCardProps> = ({
	group,
	onToggleExclude,
	isExcluded,
}) => {
	if (group.items.length === 0) return null;

	return (
		<div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
					{group.stageTitle}
				</span>
				<span className="text-xs font-bold text-[var(--ink)] font-mono">
					{group.totalRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
			<div className="overflow-x-auto">
				<div className="flex flex-col gap-1.5 min-w-[540px]">
					{group.items.map((it) => {
						const itemKey = `${it.toothNumber}-${it.code}`;
						const excluded = isExcluded(itemKey);
						return (
							<div
								key={itemKey}
								className={`flex items-center justify-between p-2 rounded-lg text-xs transition-opacity ${
									excluded
										? "opacity-40 line-through bg-[var(--paper)]"
										: "bg-[var(--paper-strong)] border border-[var(--line-subtle)]"
								}`}
							>
								<div className="flex items-center gap-2 min-w-0 pr-2">
									{it.toothNumber > 0 && (
										<span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-bold text-[11px] shrink-0">
											Зуб {it.toothNumber}
										</span>
									)}
									<span className="font-mono text-[11px] text-[var(--muted)] shrink-0">
										{it.code}
									</span>
									<span className="truncate text-[var(--ink)]">{it.title}</span>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<span className="font-mono text-[var(--ink)] whitespace-nowrap">
										{it.price.toLocaleString("ru-RU")} ₽
									</span>
									<button
										type="button"
										onClick={() => onToggleExclude(itemKey)}
										className="p-1 rounded text-[var(--muted)] hover:text-rose-600 cursor-pointer transition-colors"
										title={excluded ? "Вернуть в план" : "Исключить из плана"}
									>
										{excluded ? <Check size={14} className="text-teal-600" /> : <Trash2 size={14} />}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
