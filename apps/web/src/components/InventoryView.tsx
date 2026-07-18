import {
	History,
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Edit2,
	Package,
	Plus,
	Search,
	Trash2,
	TrendingUp,
	X,
} from "lucide-react";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { showToast } from "./GlobalToast";
import { useInventoryLogic } from "./inventory/useInventoryLogic";
import { InventoryRulesTab } from "./inventory/InventoryRulesTab";

export const InventoryView: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const inventory = useInventoryLogic(organizationId);
	const {
		items,
		isLoading,
		dashboard,
		scannedBarcode,
		isScannerActive,
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		setSelectedServiceId,
		rulesList,
		isLoadingRules,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		fetchRules,
		handleAddRule,
		handleDeleteRule,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		setEditingItem,
		formData,
		setFormData,
		confirmDialog,
		setConfirmDialog,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		fetchItems,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		handleAdjustStock,
		filteredItems,
		totalValue,
		lowStockCount,
		totalItems,
		itemHistory,
		isLoadingHistory,
		fetchHistory,
		setItemHistory
	} = inventory;
	const [viewingItemHistory, setViewingItemHistory] = useState<InventoryItem | null>(null);
	const [simulatedBarcode, setSimulatedBarcode] = useState("");
	const [isBarcodeGuideOpen, setIsBarcodeGuideOpen] = useState(false);

	const triggerBarcodeSimulation = (barcodeStr: string) => {
		const code = barcodeStr.trim();
		if (!code) return;
		
		// Simulate typing each character quickly to trigger hardware barcode scanner listener
		let delay = 0;
		for (let i = 0; i < code.length; i++) {
			const char = code[i] || "";
			setTimeout(() => {
				const event = new KeyboardEvent("keydown", {
					key: char,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);
			}, delay);
			delay += 12; // 12ms typing interval
		}
		
		// Send Enter at the end
		setTimeout(() => {
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);
		}, delay + 15);
	};

	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";



	if (isLoading && items.length === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					color: "var(--muted)",
					gap: 12,
				}}
			>
				<Package size={20} />
				Загрузка склада...
			</div>
		);
	}

	return (
		<div
			style={{
				padding: 24,
				maxWidth: 1200,
				margin: "0 auto",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				gap: 0,
			}}
		>
			{/* HEADER */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					marginBottom: 24,
					flexWrap: "wrap",
					gap: 16,
				}}
			>
				<div>
					<h1
						style={{
							fontSize: 24,
							fontWeight: 700,
							margin: 0,
							display: "flex",
							alignItems: "center",
							gap: 12,
							color: "var(--ink)",
						}}
					>
						<Package color="var(--teal)" size={28} /> Склад материалов
					</h1>
					<p
						style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: 14 }}
					>
						Учёт расходников, приход и списание
					</p>
				</div>
				{/* KPI CARDS */}
				<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 110,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							Позиций
						</span>
						<strong style={{ fontSize: 22, color: "var(--ink)" }}>
							{totalItems}
						</strong>
					</div>
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 110,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							В дефиците
						</span>
						<strong
							style={{
								fontSize: 22,
								color: lowStockCount > 0 ? "var(--tomato)" : "var(--teal)",
							}}
						>
							{lowStockCount}
						</strong>
					</div>
					{totalValue > 0 && (
						<div
							style={{
								background: paperBg,
								border: `1px solid ${borderColor}`,
								padding: "12px 20px",
								borderRadius: 12,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								minWidth: 140,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: "var(--muted)",
									textTransform: "uppercase",
									letterSpacing: 1,
								}}
							>
								Стоимость склада
							</span>
							<strong
								style={{
									fontSize: 18,
									color: "var(--teal)",
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<TrendingUp size={14} />
								{totalValue.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
					)}
				</div>
			</div>

			{/* SUB-TABS */}
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 20,
					borderBottom: `1px solid ${borderColor}`,
					paddingBottom: 8,
				}}
			>
				<button
					type="button"
					onClick={() => setActiveSubTab("inventory")}
					style={{
						padding: "8px 16px",
						borderRadius: 8,
						background:
							activeSubTab === "inventory"
								? "var(--teal-50, rgba(20, 184, 166, 0.1))"
								: "transparent",
						border: "none",
						color:
							activeSubTab === "inventory"
								? "var(--teal)"
								: "var(--muted)",
						fontWeight: 600,
						fontSize: 14,
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
				>
					📦 Складские остатки
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("rules")}
					style={{
						padding: "8px 16px",
						borderRadius: 8,
						background:
							activeSubTab === "rules"
								? "var(--teal-50, rgba(20, 184, 166, 0.1))"
								: "transparent",
						border: "none",
						color:
							activeSubTab === "rules"
								? "var(--teal)"
								: "var(--muted)",
						fontWeight: 600,
						fontSize: 14,
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
				>
					⚙️ Правила списания
				</button>
			</div>

			{activeSubTab === "inventory" ? (
				<>
					{/* 🏷️ BARCODE SCANNER SUPPORT PANEL */}
					<div
						style={{
							background: "var(--paper-soft)",
							border: "1px solid var(--line-strong, var(--line))",
							borderRadius: 16,
							padding: "16px 20px",
							marginBottom: 20,
							display: "flex",
							flexDirection: "column",
							gap: 12,
							boxShadow: "0 2px 8px rgba(0,0,0,0.01)"
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								cursor: "pointer",
								userSelect: "none"
							}}
							onClick={() => setIsBarcodeGuideOpen(!isBarcodeGuideOpen)}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
								<span style={{ fontSize: 20 }}>🏷️</span>
								<div>
									<strong style={{ fontSize: 14, color: "var(--ink)" }}>
										Интеграция со сканером штрих-кодов
									</strong>
									<span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
										{scannedBarcode 
											? `✅ Последний считанный код: ${scannedBarcode}` 
											: "🔌 Система готова к сканированию. Просто считайте код товара физическим сканером."
										}
									</span>
								</div>
							</div>
							<span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
								{isBarcodeGuideOpen ? "Свернуть инструкцию ▲" : "Показать симулятор / инструкцию ▼"}
							</span>
						</div>

						{isBarcodeGuideOpen && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								style={{
									borderTop: "1px dashed var(--line)",
									paddingTop: 12,
									marginTop: 4,
									display: "flex",
									flexDirection: "column",
									gap: 12
								}}
							>
								<p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>
									Вы можете подключить любой стандартный USB-сканер штрих-кодов (в режиме эмуляции клавиатуры).
									При сканировании система автоматически найдёт товар по штрих-коду или SKU и откроет окно редактирования/добавления.
								</p>
								
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 12,
										flexWrap: "wrap",
										background: "var(--paper)",
										padding: 12,
										borderRadius: 10,
										border: "1px solid var(--line)"
									}}
								>
									<span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
										💻 СИМУЛЯТОР СКАНИРОВАНИЯ:
									</span>
									<input
										type="text"
										placeholder="Штрихкод (например 4607001)"
										value={simulatedBarcode}
										onChange={(e) => setSimulatedBarcode(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												triggerBarcodeSimulation(simulatedBarcode);
												setSimulatedBarcode("");
											}
										}}
										style={{
											background: "var(--paper-soft)",
											border: "1px solid var(--line-strong)",
											borderRadius: 6,
											padding: "6px 10px",
											color: "var(--ink)",
											fontSize: 13,
											outline: "none",
											width: 220
										}}
									/>
									<button
										type="button"
										className="secondary-button"
										onClick={() => {
											triggerBarcodeSimulation(simulatedBarcode);
											setSimulatedBarcode("");
										}}
										disabled={!simulatedBarcode.trim()}
										style={{ padding: "6px 12px", fontSize: 12 }}
									>
										Считать код
									</button>
								</div>
							</motion.div>
						)}
					</div>

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
											colSpan={5}
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
										const isLowStock =
											item.stockQuantity <= item.criticalThreshold;
										const unitCost = Number(item.unitCostRub) || 0;
										const lineValue = item.stockQuantity * unitCost;
										return (
											<tr
												key={item.id}
												onClick={(e) => { e.stopPropagation(); setViewingItemHistory(item); fetchHistory(item.id); }}
												className="inventory-row-hover"
												style={{
													borderBottom: `1px solid ${borderColor}`,
													transition: "background 0.15s",
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
															color: isLowStock
																? "var(--tomato)"
																: "var(--teal)",
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
															<div
																style={{ color: "var(--ink)", fontWeight: 500 }}
															>
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
																		new Date(
																			Date.now() + 30 * 24 * 60 * 60 * 1000,
																		)
																			? "var(--tomato)"
																			: "var(--ink)",
																	fontWeight:
																		new Date(item.expirationDate) <
																		new Date(
																			Date.now() + 30 * 24 * 60 * 60 * 1000,
																		)
																			? 600
																			: 400,
																}}
															>
																Годен до:{" "}
																{new Date(
																	item.expirationDate,
																).toLocaleDateString("ru-RU")}
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
												<td
													style={{ padding: "14px 20px", textAlign: "right" }}
												>
													<div
														style={{
															display: "flex",
															justifyContent: "flex-end",
															gap: 6,
															flexWrap: "wrap",
														}}
													>
														<button
															onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
															style={{
																background: "var(--amber-50, rgba(245, 158, 11, 0.1))",
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
															onClick={() =>
																handleDeleteItem(item.id, item.name)
															}
															style={{
																background: "var(--red-50, rgba(239, 68, 68, 0.1))",
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
															onClick={() => {
																setAdjustingItem(item);
																setAdjustType("in");
																setAdjustAmount("");
															}}
															style={{
																background: "var(--brand-50, rgba(59, 130, 246, 0.1))",
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
															onClick={(e) => { e.stopPropagation();
																setAdjustingItem(item);
																setAdjustType("out");
																setAdjustAmount("");
															}}
															style={{
																background: "var(--red-50, rgba(239, 68, 68, 0.1))",
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
			) : (
				<InventoryRulesTab
					dashboard={dashboard}
					selectedServiceId={selectedServiceId}
					setSelectedServiceId={setSelectedServiceId}
					handleAddRule={handleAddRule}
					selectedInventoryItemId={selectedInventoryItemId}
					setSelectedInventoryItemId={setSelectedInventoryItemId}
					items={items}
					quantityToDeduct={quantityToDeduct}
					setQuantityToDeduct={setQuantityToDeduct}
					isLoadingRules={isLoadingRules}
					rulesList={rulesList}
					handleDeleteRule={handleDeleteRule}
				/>
			)}

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
									background: adjustType === "in" ? "var(--brand-600, #3b82f6)" : "var(--tomato)",
									fontSize: 15,
								}}
							>
								{adjustType === "in" ? "Оприходовать" : "Списать"}
							</button>
						</form>
					</div>
				</div>
			)}

		
			{/* INVENTORY ITEM DRAWER */}
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
						onClick={(e) => { if (e.target === e.currentTarget) { setViewingItemHistory(null); setItemHistory([]); } }}
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
								overflow: "hidden"
							}}
						>
							<div style={{ padding: 24, borderBottom: `1px solid var(--line)`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<div>
									<h2 style={{ margin: 0, fontSize: 22, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
										{viewingItemHistory.name}
									</h2>
									<div style={{ display: "flex", gap: 12, marginTop: 12 }}>
										<span style={{ fontSize: 14, color: "var(--teal)", fontWeight: 600 }}>
											Остаток: {viewingItemHistory.stockQuantity} шт.
										</span>
										<span style={{ fontSize: 14, color: "var(--muted)" }}>
											Цена: {Number(viewingItemHistory.unitCostRub || 0).toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>
								<button onClick={() => { setViewingItemHistory(null); setItemHistory([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
									<X size={24} />
								</button>
							</div>

							<div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--paper-soft)" }}>
								<h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
									<History size={18} /> Журнал операций
								</h3>
								
								{isLoadingHistory ? (
									<div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Загрузка истории...</div>
								) : itemHistory.length === 0 ? (
									<div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13, border: `1px dashed var(--line)`, borderRadius: 12 }}>
										История операций пуста.
									</div>
								) : (
									<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
										{itemHistory.map((tx: any) => {
											const isPositive = tx.quantityChanged > 0;
											return (
												<div key={tx.id} style={{ background: "var(--paper)", padding: 16, borderRadius: 12, border: `1px solid var(--line)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
													<div>
														<div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
															{tx.transactionType === "manual_adjust" ? "Ручная корректировка" : "Авто-списание"}
														</div>
														<div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
															{new Date(tx.createdAt).toLocaleString("ru-RU")}
														</div>
													</div>
													<div style={{ 
														fontSize: 16, 
														fontWeight: 700, 
														color: isPositive ? "var(--teal)" : "var(--tomato)",
														background: isPositive ? "var(--teal-50, rgba(20, 184, 166, 0.1))" : "var(--red-50, rgba(239, 68, 68, 0.1))",
														padding: "4px 10px",
														borderRadius: 8
													}}>
														{isPositive ? "+" : ""}{tx.quantityChanged} шт.
													</div>
												</div>
											)
										})}
									</div>
								)}
							</div>
							<div style={{ padding: 24, borderTop: `1px solid var(--line)`, display: "flex", gap: 12, background: "var(--paper)" }}>
								<button 
									className="primary-button" 
									style={{ flex: 1, justifyContent: "center" }}
									onClick={() => {
										setViewingItemHistory(null);
										openEditModal(viewingItemHistory);
									}}
								>
									<Edit2 size={16} /> Редактировать
								</button>
								<button 
									className="secondary-button" 
									style={{ flex: 1, justifyContent: "center" }}
									onClick={() => {
										setViewingItemHistory(null);
										setAdjustingItem(viewingItemHistory);
										setAdjustType("in");
										setAdjustAmount("");
									}}
								>
									<ArrowDownToLine size={16} /> Оприходовать
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

		</div>
	);
};
