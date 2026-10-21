/**
 * DENTE Dental CRM — Funnel Budget Adjuster Component
 * Mandate 8b (<= 120 lines)
 */

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import React from "react";
import { FunnelBudgetChannelInput } from "./FunnelBudgetChannelInput";
import {
	type CanonicalMarketingChannelKey,
	type ChannelSpendMap,
	MARKETING_CHANNELS,
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
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ duration: 0.2 }}
					style={{
						overflow: "hidden",
						background: "var(--paper-soft)",
						borderBottom: "1px solid var(--line)",
						padding: "16px 24px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 12,
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span
								style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}
							>
								Маркетинговые расходы за период (₽)
							</span>
							<span style={{ fontSize: 11, color: "var(--muted)" }}>
								— введите реальные затраты клиники для точного расчета CAC и
								ROMI
							</span>
						</div>
						<button
							type="button"
							onClick={onResetBudgets}
							style={{
								background: "none",
								border: "none",
								color: "var(--muted)",
								fontSize: 11,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<RefreshCw size={12} /> Сбросить по умолчанию
						</button>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: "10px",
						}}
					>
						{MARKETING_CHANNELS.map((ch) => (
							<FunnelBudgetChannelInput
								key={ch.key}
								ch={ch}
								currentVal={customSpends[ch.key] ?? 0}
								onBudgetChange={onBudgetChange}
							/>
						))}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
