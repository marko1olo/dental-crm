import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import type React from "react";
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
								style={{
									fontSize: 13,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								Маркетинговые расходы за период (₽)
							</span>
							<span style={{ fontSize: 11, color: "var(--muted)" }}>
								— введите реальные затраты клиники для точного расчета CAC и ROMI
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
						{MARKETING_CHANNELS.map((ch) => {
							const currentVal = customSpends[ch.key] ?? 0;
							return (
								<div
									key={ch.key}
									style={{
										background: "var(--paper)",
										border: "1px solid var(--line)",
										borderRadius: 8,
										padding: "8px 10px",
										display: "flex",
										flexDirection: "column",
										gap: 4,
									}}
								>
									<label
										htmlFor={`budget-input-${ch.key}`}
										style={{
											fontSize: 11,
											fontWeight: 600,
											color: "var(--muted)",
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										<span
											style={{
												width: 8,
												height: 8,
												borderRadius: "50%",
												background: ch.color,
												display: "inline-block",
											}}
										/>
										{ch.label}
									</label>
									<div style={{ position: "relative" }}>
										<input
											id={`budget-input-${ch.key}`}
											type="text"
											value={currentVal.toLocaleString("ru-RU")}
											onChange={(e) =>
												onBudgetChange(ch.key, e.target.value)
											}
											style={{
												width: "100%",
												padding: "4px 24px 4px 8px",
												borderRadius: 6,
												border: "1px solid var(--line)",
												background: "var(--paper-soft)",
												color: "var(--ink)",
												fontSize: 13,
												fontWeight: 600,
												boxSizing: "border-box",
											}}
										/>
										<span
											style={{
												position: "absolute",
												right: 8,
												top: "50%",
												transform: "translateY(-50%)",
												fontSize: 12,
												color: "var(--muted)",
												pointerEvents: "none",
											}}
										>
											₽
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
