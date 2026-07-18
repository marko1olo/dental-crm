import React from "react";
import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Edit2,
	Plus,
	Search,
	Trash2,
} from "lucide-react";

export function InventoryListTable({
	searchQuery,
	setSearchQuery,
	openAddModal,
	filteredItems,
	setViewingItemHistory,
	fetchHistory,
	openEditModal,
	handleDeleteItem,
	setAdjustingItem,
	setAdjustType,
	setAdjustAmount,
}: {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	openAddModal: () => void;
	filteredItems: any[];
	setViewingItemHistory: (item: any) => void;
	fetchHistory: (id: string) => void;
	openEditModal: (item: any) => void;
	handleDeleteItem: (id: string, name: string) => void;
	setAdjustingItem: (item: any) => void;
	setAdjustType: (type: "in" | "out") => void;
	setAdjustAmount: (amount: string) => void;
}) {
	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	return (
		<>
			{/* CONTROLS */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 16,
					gap: 12,
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						position: "relative",
						minWidth: 260,
						flex: 1,
						maxWidth: 360,
					}}
				>
					<Search
						size={16}
						color="var(--muted)"
						style={{
							position: "absolute",
							left: 12,
							top: "50%",
							transform: "translateY(-50%)",
						}}
					/>
					<input
						type="text"
						placeholder="Поиск материала..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						style={{
							width: "100%",
							padding: "10px 12px 10px 36px",
							borderRadius: 8,
							border: `1px solid ${borderColor}`,
							background: paperBg,
							color: "var(--ink)",
							outline: "none",
							boxSizing: "border-box",
						}}
					/>
				</div>
				<button className="primary-button" onClick={openAddModal}>
					<Plus size={18} /> Добавить позицию
				</button>
			</div>

			{/* TABLE */}
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					background: paperBg,
					borderRadius: 16,
					border: `1px solid ${borderColor}`,
				}}
			>
				<table
					style={{
						width: "100%",
						borderCollapse: "collapse",
						textAlign: "left",
					}}
				>
					<thead
						style={{
							position: "sticky",
							top: 0,
							background: paperSoftBg,
							zIndex: 10,
						}}
					>
						<tr>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Наименование
							</th>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Остаток
							</th>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Мин. запас
							</th>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Цена / ед.
							</th>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Партия / Срок
							</th>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Штрихкод
							</th>
							<th
								style={{
									padding: "14px 20px",
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									textTransform: "uppercase",
									letterSpacing: 0.5,
									textAlign: "right",
								}}
							>
								Действия
							</th>
						</tr>
					</thead>
					<tbody>
						{filteredItems.length === 0 ? (
							<tr>
								<td
									colSpan={7}
									style={{
										padding: 48,
										textAlign: "center",
										color: "var(--muted)",
									}}
								>
									{searchQuery
										? "Материалы не найдены по запросу"
										: "Склад пуст. Добавьте первый материал."}
								</td>
							</tr>
						) : (
							filteredItems.map((item) => {
								const isLowStock = item.stockQuantity <= item.criticalThreshold;
								const unitCost = Number(item.unitCostRub) || 0;
								const lineValue = item.stockQuantity * unitCost;
								return (
									<tr
										key={item.id}
										onClick={(e) => {
											e.stopPropagation();
											setViewingItemHistory(item);
											fetchHistory(item.id);
										}}
										className="inventory-row-hover"
										style={{
											borderBottom: `1px solid ${borderColor}`,
											transition: "background 0.15s",
											cursor: "pointer",
										}}
									>
										<td
											style={{
												padding: "14px 20px",
												color: "var(--ink)",
												fontWeight: 500,
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
												}}
											>
												{isLowStock && (
													<AlertTriangle size={15} color="var(--tomato)" />
												)}
												{item.name}
											</div>
										</td>
										<td style={{ padding: "14px 20px" }}>
											<span
												style={{
													background: isLowStock
														? "var(--red-50, rgba(239, 68, 68, 0.1))"
														: "var(--teal-50, rgba(16, 185, 129, 0.1))",
													color: isLowStock ? "var(--tomato)" : "var(--teal)",
													padding: "4px 10px",
													borderRadius: 6,
													fontWeight: 600,
													fontSize: 14,
													border: isLowStock
														? "1px solid var(--red-300, rgba(239, 68, 68, 0.3))"
														: "1px solid var(--teal-200, rgba(16, 185, 129, 0.2))",
												}}
											>
												{item.stockQuantity} шт.
											</span>
										</td>
										<td
											style={{
												padding: "14px 20px",
												color: "var(--muted)",
												fontSize: 14,
											}}
										>
											{item.criticalThreshold} шт.
										</td>
										<td style={{ padding: "14px 20px", fontSize: 14 }}>
											{unitCost > 0 ? (
												<div>
													<div style={{ color: "var(--ink)", fontWeight: 500 }}>
														{unitCost.toLocaleString("ru-RU")} ₽
													</div>
													{lineValue > 0 && (
														<div
															style={{
																color: "var(--muted)",
																fontSize: 12,
															}}
														>
															итого: {lineValue.toLocaleString("ru-RU")} ₽
														</div>
													)}
												</div>
											) : (
												<span
													style={{
														color: "var(--muted)",
														fontStyle: "italic",
													}}
												>
													—
												</span>
											)}
										</td>
										<td
											style={{
												padding: "14px 20px",
												color: "var(--muted)",
												fontSize: 14,
											}}
										>
											{item.expirationDate ? (
												<div
													style={{
														display: "flex",
														flexDirection: "column",
													}}
												>
													<span
														style={{
															color:
																new Date(item.expirationDate) <
																new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
																	? "var(--tomato)"
																	: "var(--ink)",
															fontWeight:
																new Date(item.expirationDate) <
																new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
																	? 600
																	: 400,
														}}
													>
														Годен до:{" "}
														{new Date(item.expirationDate).toLocaleDateString(
															"ru-RU",
														)}
													</span>
													{item.lotNumber && (
														<span style={{ fontSize: 12 }}>
															Партия: {item.lotNumber}
														</span>
													)}
												</div>
											) : (
												<span style={{ fontStyle: "italic", opacity: 0.5 }}>
													Не указан
												</span>
											)}
										</td>
										<td
											style={{
												padding: "14px 20px",
												color: "var(--muted)",
												fontSize: 14,
											}}
										>
											{item.barcode ? (
												<span
													style={{
														fontFamily: "monospace",
														background: "rgba(0,0,0,0.05)",
														padding: "2px 6px",
														borderRadius: 4,
													}}
												>
													{item.barcode}
												</span>
											) : (
												<span style={{ fontStyle: "italic", opacity: 0.5 }}>
													Нет
												</span>
											)}
										</td>
										<td style={{ padding: "14px 20px", textAlign: "right" }}>
											<div
												style={{
													display: "flex",
													justifyContent: "flex-end",
													gap: 6,
													flexWrap: "wrap",
												}}
											>
												<button
													onClick={(e) => {
														e.stopPropagation();
														openEditModal(item);
													}}
													style={{
														background:
															"var(--amber-50, rgba(245, 158, 11, 0.1))",
														color: "var(--amber-600)",
														border: "none",
														width: 32,
														height: 32,
														borderRadius: 6,
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
													title="Редактировать"
												>
													<Edit2 size={14} />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteItem(item.id, item.name);
													}}
													style={{
														background:
															"var(--red-50, rgba(239, 68, 68, 0.1))",
														color: "var(--tomato)",
														border: "none",
														width: 32,
														height: 32,
														borderRadius: 6,
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
													title="Удалить"
												>
													<Trash2 size={14} />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														setAdjustingItem(item);
														setAdjustType("in");
														setAdjustAmount("");
													}}
													style={{
														background:
															"var(--brand-50, rgba(59, 130, 246, 0.1))",
														color: "var(--brand-600, #3b82f6)",
														border: "none",
														padding: "6px 12px",
														borderRadius: 6,
														fontWeight: 600,
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														gap: 5,
														fontSize: 13,
													}}
													title="Оприходовать"
												>
													<ArrowDownToLine size={14} /> ПРИХОД
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														setAdjustingItem(item);
														setAdjustType("out");
														setAdjustAmount("");
													}}
													style={{
														background:
															"var(--red-50, rgba(239, 68, 68, 0.1))",
														color: "var(--tomato)",
														border: "none",
														padding: "6px 12px",
														borderRadius: 6,
														fontWeight: 600,
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														gap: 5,
														fontSize: 13,
													}}
													title="Списать"
												>
													<ArrowUpFromLine size={14} /> РАСХОД
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</>
	);
}
