/**
 * DENTE Dental CRM — Funnel Budget Adjuster Component
 * Inline editor for marketing channels advertising spends (CAC / ROMI calculation).
 * Mandate 8b (<= 120 lines). Clean Apple HIG tokens.
 */

import React from "react";
import { RotateCcw } from "lucide-react";
import { MARKETING_CHANNELS } from "./funnelTypes/marketingChannelData";
import type {
	CanonicalMarketingChannelKey,
	ChannelSpendMap,
} from "./leadsFunnelTypes";

export interface FunnelBudgetAdjusterProps {
	readonly isOpen: boolean;
	readonly customSpends: ChannelSpendMap;
	readonly onBudgetChange: (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => void;
	readonly onResetBudgets: () => void;
}

export const FunnelBudgetAdjuster: React.FC<FunnelBudgetAdjusterProps> = ({
	isOpen,
	customSpends,
	onBudgetChange,
	onResetBudgets,
}) => {
	if (!isOpen) return null;

	return (
		<div
			data-testid="funnel-budget-adjuster"
			className="p-4 mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3"
		>
			<div className="flex items-center justify-between gap-2">
				<div>
					<h3 className="text-xs font-bold text-[var(--ink)] m-0">
						Рекламные бюджеты каналов (руб/мес)
					</h3>
					<p className="text-[11px] text-[var(--ink-muted)] m-0">
						Задайте фактические расходы на рекламу для расчёта стоимости привлечения (CAC) и окупаемости (ROMI).
					</p>
				</div>
				<button
					type="button"
					onClick={onResetBudgets}
					className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
					title="Сбросить бюджеты к стандартным значениям"
				>
					<RotateCcw size={13} />
					<span>Сбросить</span>
				</button>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
				{MARKETING_CHANNELS.map((ch) => {
					const spend = customSpends[ch.key] ?? ch.defaultSpendRub ?? 0;
					return (
						<div
							key={ch.key}
							className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1"
						>
							<label
								htmlFor={`budget-${ch.key}`}
								className="text-[11px] font-semibold text-[var(--ink-muted)] flex items-center gap-1.5 truncate"
								title={ch.label}
							>
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: ch.color || "var(--teal)" }}
								/>
								<span className="truncate">{ch.label}</span>
							</label>
							<div className="relative">
								<input
									id={`budget-${ch.key}`}
									type="text"
									inputMode="numeric"
									value={spend > 0 ? spend.toLocaleString("ru-RU") : "0"}
									onChange={(e) => onBudgetChange(ch.key, e.target.value)}
									className="w-full h-8 pl-2 pr-6 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
									placeholder="0"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--ink-muted)] pointer-events-none">
									₽
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
