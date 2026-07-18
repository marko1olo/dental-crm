import { X, History } from "lucide-react";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { InventoryItem } from "./useInventoryLogic";

export interface InventoryHistoryDrawerProps {
	viewingItemHistory: InventoryItem | null;
	setViewingItemHistory: (item: InventoryItem | null) => void;
	itemHistory: any[];
	setItemHistory: (history: any[]) => void;
	isLoadingHistory: boolean;
}

export const InventoryHistoryDrawer: React.FC<InventoryHistoryDrawerProps> = ({
	viewingItemHistory,
	setViewingItemHistory,
	itemHistory,
	setItemHistory,
	isLoadingHistory,
}) => {
	return (
		<AnimatePresence>
			{viewingItemHistory && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 90,
						display: "flex",
						justifyContent: "flex-end",
						background: "rgba(0,0,0,0.3)",
						backdropFilter: "blur(2px)",
					}}
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setViewingItemHistory(null);
							setItemHistory([]);
						}
					}}
				>
					<motion.div
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{ type: "spring", damping: 25, stiffness: 200 }}
						style={{
							width: "500px",
							maxWidth: "100%",
							background: "var(--paper)",
							borderLeft: `1px solid var(--line)`,
							boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
							height: "100%",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								padding: 24,
								borderBottom: `1px solid var(--line)`,
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<h2
									style={{
										margin: 0,
										fontSize: 22,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										gap: 8,
									}}
								>
									{viewingItemHistory.name}
								</h2>
								<div style={{ display: "flex", gap: 12, marginTop: 12 }}>
									<span
										style={{
											fontSize: 14,
											color: "var(--teal)",
											fontWeight: 600,
										}}
									>
										Остаток: {viewingItemHistory.stockQuantity} шт.
									</span>
									<span style={{ fontSize: 14, color: "var(--muted)" }}>
										Цена:{" "}
										{Number(viewingItemHistory.unitCostRub || 0).toLocaleString(
											"ru-RU"
										)}{" "}
										₽
									</span>
								</div>
							</div>
							<button
								onClick={() => {
									setViewingItemHistory(null);
									setItemHistory([]);
								}}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									color: "var(--muted)",
								}}
							>
								<X size={24} />
							</button>
						</div>

						<div
							style={{
								flex: 1,
								overflowY: "auto",
								padding: 24,
								background: "var(--paper-soft)",
							}}
						>
							<h3
								style={{
									margin: "0 0 16px 0",
									fontSize: 16,
									color: "var(--ink)",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<History size={18} /> Журнал операций
							</h3>

							{isLoadingHistory ? (
								<div
									style={{
										color: "var(--muted)",
										textAlign: "center",
										padding: 24,
									}}
								>
									Загрузка истории...
								</div>
							) : itemHistory.length === 0 ? (
								<div
									style={{
										textAlign: "center",
										padding: 24,
										color: "var(--muted)",
										fontSize: 13,
										border: `1px dashed var(--line)`,
										borderRadius: 12,
									}}
								>
									История операций пуста.
								</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
									{itemHistory.map((tx: any) => {
										const isPositive = tx.quantityChanged > 0;
										return (
											<div
												key={tx.id}
												style={{
													background: "var(--paper)",
													padding: 16,
													borderRadius: 12,
													border: `1px solid var(--line)`,
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
												}}
											>
												<div>
													<div
														style={{
															fontSize: 14,
															color: "var(--ink)",
															fontWeight: 500,
														}}
													>
														{tx.transactionType === "manual_adjust"
															? "Ручная корректировка"
															: "Авто-списание"}
													</div>
													<div
														style={{
															fontSize: 12,
															color: "var(--muted)",
															marginTop: 4,
														}}
													>
														{new Date(tx.createdAt).toLocaleString("ru-RU")}
													</div>
												</div>
												<div
													style={{
														fontSize: 16,
														fontWeight: 700,
														color: isPositive
															? "var(--teal)"
															: "var(--tomato)",
														background: isPositive
															? "var(--teal-50, rgba(20, 184, 166, 0.1))"
															: "var(--red-50, rgba(239, 68, 68, 0.1))",
														padding: "4px 10px",
														borderRadius: 8,
													}}
												>
													{isPositive ? "+" : ""}
													{tx.quantityChanged} шт.
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};
