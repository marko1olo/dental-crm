import React from "react";
import { ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";

export function InventoryModals({
	showModal,
	setShowModal,
	editingItem,
	formData,
	setFormData,
	handleSaveItem,
	adjustingItem,
	setAdjustingItem,
	adjustType,
	setAdjustType,
	adjustAmount,
	setAdjustAmount,
	handleAdjustStock,
}: {
	showModal: boolean;
	setShowModal: (show: boolean) => void;
	editingItem: any;
	formData: any;
	setFormData: (data: any) => void;
	handleSaveItem: (e: React.FormEvent) => void;
	adjustingItem: any;
	setAdjustingItem: (item: any) => void;
	adjustType: "in" | "out";
	setAdjustType: (type: "in" | "out") => void;
	adjustAmount: string;
	setAdjustAmount: (amount: string) => void;
	handleAdjustStock: (e: React.FormEvent) => void;
}) {
	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	return (
		<>
			{/* ADD/EDIT MODAL */}
			{showModal && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
				>
					<div
						style={{
							background: paperBg,
							width: 440,
							maxWidth: "95vw",
							borderRadius: 16,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginBottom: 20,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								{editingItem ? "Редактировать материал" : "Добавить материал"}
							</h2>
							<button
								onClick={() => setShowModal(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>
						<form
							onSubmit={handleSaveItem}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Наименование *
								</label>
								<input
									type="text"
									required
									autoFocus
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="Перчатки нитриловые, Альгинат..."
								/>
							</div>
							<div style={{ display: "flex", gap: 12 }}>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label
										style={{
											fontSize: 13,
											color: "var(--muted)",
											fontWeight: 500,
										}}
									>
										Минимальный остаток (шт)
									</label>
									<input
										type="number"
										min="0"
										required
										value={formData.threshold}
										onChange={(e) =>
											setFormData({ ...formData, threshold: e.target.value })
										}
										style={{
											padding: "10px 14px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											outline: "none",
										}}
									/>
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label
										style={{
											fontSize: 13,
											color: "var(--muted)",
											fontWeight: 500,
										}}
									>
										Цена за единицу (₽)
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										value={formData.unitCostRub}
										onChange={(e) =>
											setFormData({ ...formData, unitCostRub: e.target.value })
										}
										style={{
											padding: "10px 14px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											outline: "none",
										}}
									/>
								</div>
							</div>
							<button
								type="submit"
								className="primary-button"
								style={{ marginTop: 8, justifyContent: "center" }}
							>
								Сохранить
							</button>
						</form>
					</div>
				</div>
			)}

			{/* ADJUST STOCK MODAL */}
			{adjustingItem && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={(e) =>
						e.target === e.currentTarget && setAdjustingItem(null)
					}
				>
					<div
						style={{
							background: paperBg,
							width: 380,
							maxWidth: "95vw",
							borderRadius: 16,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginBottom: 16,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								{adjustType === "in" ? "Приход на склад" : "Списание со склада"}
							</h2>
							<button
								onClick={() => setAdjustingItem(null)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>
						<p
							style={{
								margin: "0 0 4px 0",
								color: "var(--muted)",
								fontSize: 13,
							}}
						>
							Материал
						</p>
						<p
							style={{
								margin: "0 0 20px 0",
								color: "var(--teal)",
								fontWeight: 600,
								fontSize: 15,
							}}
						>
							{adjustingItem.name}
						</p>
						<p
							style={{
								margin: "0 0 16px 0",
								color: "var(--muted)",
								fontSize: 13,
							}}
						>
							Текущий остаток:{" "}
							<strong style={{ color: "var(--ink)" }}>
								{adjustingItem.stockQuantity} шт.
							</strong>
						</p>

						{/* Toggle direction */}
						<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
							{(["in", "out"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setAdjustType(t)}
									style={{
										flex: 1,
										padding: "8px 0",
										borderRadius: 8,
										border: `1px solid ${adjustType === t ? (t === "in" ? "var(--brand-600, #3b82f6)" : "var(--tomato)") : borderColor}`,
										background:
											adjustType === t
												? t === "in"
													? "var(--brand-50, rgba(59,130,246,0.12))"
													: "var(--red-50, rgba(239,68,68,0.12))"
												: "transparent",
										color:
											adjustType === t
												? t === "in"
													? "var(--brand-600, #3b82f6)"
													: "var(--tomato)"
												: "var(--muted)",
										fontWeight: 600,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: 6,
										transition: "all 0.15s",
									}}
								>
									{t === "in" ? (
										<>
											<ArrowDownToLine size={14} /> Приход
										</>
									) : (
										<>
											<ArrowUpFromLine size={14} /> Списание
										</>
									)}
								</button>
							))}
						</div>

						<form
							onSubmit={handleAdjustStock}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Количество (шт.)
								</label>
								<input
									type="number"
									min="1"
									required
									autoFocus
									value={adjustAmount}
									onChange={(e) => setAdjustAmount(e.target.value)}
									style={{
										padding: "14px 16px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										fontSize: 22,
										fontWeight: 700,
										outline: "none",
										textAlign: "center",
									}}
								/>
							</div>
							{adjustAmount && !isNaN(parseInt(adjustAmount)) && (
								<p
									style={{
										margin: 0,
										textAlign: "center",
										color: "var(--muted)",
										fontSize: 13,
									}}
								>
									Будет:{" "}
									<strong style={{ color: "var(--ink)" }}>
										{Math.max(
											0,
											adjustingItem.stockQuantity +
												(adjustType === "in" ? 1 : -1) *
													(parseInt(adjustAmount) || 0),
										)}{" "}
										шт.
									</strong>
								</p>
							)}
							<button
								type="submit"
								style={{
									padding: "12px",
									borderRadius: 8,
									border: "none",
									fontWeight: 600,
									color: "var(--paper)",
									cursor: "pointer",
									background:
										adjustType === "in"
											? "var(--brand-600, #3b82f6)"
											: "var(--tomato)",
									fontSize: 15,
								}}
							>
								{adjustType === "in" ? "Оприходовать" : "Списать"}
							</button>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
