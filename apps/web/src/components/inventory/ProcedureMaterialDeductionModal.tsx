/**
 * ProcedureMaterialDeductionModal.tsx — Интерактивное модальное окно списания расходников
 * по технологическим картам и нормам Минздрава РФ с контролем складских остатков.
 *
 * ФУНКЦИОНАЛ:
 * 1. Автоматический выбор и комбинирование технологических карт (СИЗ, Анестезия, Кариес, Эндодонтия, Гигиена, Хирургия).
 * 2. Сенсорные регуляторы (steppers >= 48px) и быстрые чипы количества (+0.1, +0.5, +1, +2).
 * 3. Расчет себестоимости с точностью до копейки без погрешностей double.
 * 4. Предупреждения о дефиците и падении остатка ниже критического порога.
 * 5. Поиск и добавление любых дополнительных материалов из номенклатуры склада.
 */

import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Copy,
	Package,
	Plus,
	Printer,
	Search,
	ShieldAlert,
	ShieldCheck,
	ShoppingCart,
	Trash2,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	ALL_PROCEDURE_TECH_MAPS,
	type DeductionLineItem,
	type DeductionSummary,
	type SupplierPurchaseOrderView,
	TECH_MAP_CATEGORY_COLORS,
	TECH_MAP_CATEGORY_LABELS,
	type TechMapCategory,
	calculateDeductionSummary,
	calculateLineCostKopecks,
	createDeductionLinesFromTechMaps,
	createSupplierPurchaseOrderFromLines,
	evaluateStockStatus,
	formatSupplierPurchaseOrderTextRu,
} from "./inventoryMath";
import type { InventoryItem } from "./useInventoryLogic";
import "./inventoryDeduction.css";

export interface ProcedureMaterialDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmDeduction?: (
		lines: DeductionLineItem[],
		summary: DeductionSummary,
	) => void | Promise<void>;
	readonly initialTechMapCodes?: readonly string[];
	readonly serviceName?: string;
	readonly patientName?: string;
	readonly toothNumber?: number | string;
	readonly warehouseItems?: readonly InventoryItem[];
	readonly isDeducting?: boolean;
}

export function ProcedureMaterialDeductionModal({
	isOpen,
	onClose,
	onConfirmDeduction,
	initialTechMapCodes = ["SANPIN_PPE"],
	serviceName,
	patientName,
	toothNumber,
	warehouseItems = [],
	isDeducting = false,
}: ProcedureMaterialDeductionModalProps) {
	// Выбранные шаблоны техкарт
	const [selectedMapCodes, setSelectedMapCodes] = useState<string[]>(() =>
		initialTechMapCodes.length > 0
			? [...initialTechMapCodes]
			: ["SANPIN_PPE"],
	);

	// Строки списания
	const [lines, setLines] = useState<DeductionLineItem[]>(() =>
		createDeductionLinesFromTechMaps(
			initialTechMapCodes.length > 0 ? initialTechMapCodes : ["SANPIN_PPE"],
			warehouseItems,
			true,
		),
	);

	// Фильтры и поиск
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<TechMapCategory | "all">("all");

	// Выбор кастомного материала со склада
	const [selectedCustomId, setSelectedCustomId] = useState("");

	// Защита от отрицательных остатков (Default: true)
	const [preventNegativeStock, setPreventNegativeStock] = useState(true);

	// Модальное окно 1-кликового формирования заказа поставщику
	const [showPoModal, setShowPoModal] = useState(false);
	const [copiedPo, setCopiedPo] = useState(false);

	// Синхронизация при открытии
	useEffect(() => {
		if (isOpen) {
			const initialCodes =
				initialTechMapCodes.length > 0
					? [...initialTechMapCodes]
					: ["SANPIN_PPE"];
			setSelectedMapCodes(initialCodes);
			setLines(
				createDeductionLinesFromTechMaps(
					initialCodes,
					warehouseItems,
					true,
				),
			);
			setSearchQuery("");
			setActiveCategory("all");
		}
	}, [isOpen, initialTechMapCodes, warehouseItems]);

	// Переключение техкарты
	const handleToggleTechMap = (code: string) => {
		setSelectedMapCodes((prev) => {
			const nextCodes = prev.includes(code)
				? prev.filter((c) => c !== code)
				: [...prev, code];

			// Пересоздаем строки с сохранением уже измененных количеств
			const generated = createDeductionLinesFromTechMaps(
				nextCodes,
				warehouseItems,
				nextCodes.includes("SANPIN_PPE") || prev.includes("SANPIN_PPE"),
			);

			setLines((oldLines) => {
				const oldQtyMap = new Map<string, number>();
				for (const o of oldLines) {
					oldQtyMap.set(o.materialName.toLowerCase().trim(), o.quantity);
				}
				return generated.map((g) => {
					const oldQty = oldQtyMap.get(g.materialName.toLowerCase().trim());
					return oldQty !== undefined ? { ...g, quantity: oldQty } : g;
				});
			});

			return nextCodes;
		});
	};

	// Изменение количества через кнопки степпера
	const handleStepQuantity = (lineId: string, delta: number) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id !== lineId) return line;
				const step = line.unit === "г" || line.unit === "мл" ? 0.1 : 1;
				const current = Number.isFinite(line.quantity) ? line.quantity : 0;
				const newQty = Math.max(
					0,
					Number((current + (delta > 0 ? step : -step)).toFixed(3)),
				);
				return { ...line, quantity: newQty };
			}),
		);
	};

	// Быстрое прибавление чипом (+0.1, +0.5, +1, +2, reset)
	const handleQuickIncrement = (lineId: string, amount: number | "reset") => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id !== lineId) return line;
				if (amount === "reset") {
					return { ...line, quantity: line.standardQuantity };
				}
				const current = Number.isFinite(line.quantity) ? line.quantity : 0;
				const newQty = Number((current + amount).toFixed(3));
				return { ...line, quantity: newQty };
			}),
		);
	};

	// Прямой ввод числа
	const handleDirectQuantityChange = (lineId: string, rawVal: string) => {
		const parsed = Number(rawVal.replace(",", "."));
		setLines((prev) =>
			prev.map((line) => {
				if (line.id !== lineId) return line;
				return {
					...line,
					quantity: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
				};
			}),
		);
	};

	// Удаление строки
	const handleRemoveLine = (lineId: string) => {
		setLines((prev) => prev.filter((l) => l.id !== lineId));
	};

	// Добавление произвольного материала со склада
	const handleAddCustomMaterial = () => {
		if (!selectedCustomId) return;
		const item = warehouseItems.find((w) => w.id === selectedCustomId);
		if (!item) return;

		// Проверяем, есть ли уже этот материал
		const existing = lines.find((l) => l.inventoryItemId === item.id);
		if (existing) {
			setLines((prev) =>
				prev.map((l) =>
					l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l,
				),
			);
		} else {
			let costKopecks = 0;
			try {
				costKopecks = item.unitCostRub ? Math.round(Number(item.unitCostRub) * 100) : 0;
			} catch {
				costKopecks = 0;
			}

			const newLine: DeductionLineItem = {
				id: `custom-${item.id}-${Date.now()}`,
				materialName: item.name,
				category: "other",
				unit: "шт.",
				quantity: 1,
				standardQuantity: 1,
				unitCostKopecks: costKopecks,
				stockQuantity: item.stockQuantity,
				criticalThreshold: item.criticalThreshold,
				inventoryItemId: item.id,
				lotNumber: item.lotNumber,
				expirationDate: item.expirationDate,
				source: "manual",
				mandatory: false,
			};
			setLines((prev) => [...prev, newLine]);
		}
		setSelectedCustomId("");
	};

	// Сводный расчет
	const summary = useMemo(() => calculateDeductionSummary(lines), [lines]);

	// Автоматически сформированный проект заказа поставщику при критических остатках
	const generatedPurchaseOrder = useMemo<SupplierPurchaseOrderView | null>(() => {
		if (!summary.hasDeficit && summary.warningCount === 0) return null;
		return createSupplierPurchaseOrderFromLines(lines);
	}, [lines, summary.hasDeficit, summary.warningCount]);

	const handleCopyPurchaseOrder = () => {
		if (!generatedPurchaseOrder) return;
		const text = formatSupplierPurchaseOrderTextRu(generatedPurchaseOrder);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
		}
		setCopiedPo(true);
		setTimeout(() => setCopiedPo(false), 2500);
	};

	const handlePrintPurchaseOrder = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	// Фильтрованный список строк
	const filteredLines = useMemo(() => {
		return lines.filter((line) => {
			if (activeCategory !== "all" && line.category !== activeCategory) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				return (
					line.materialName.toLowerCase().includes(q) ||
					line.unit.toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [lines, activeCategory, searchQuery]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="inventory-deduction-backdrop"
			data-testid="procedure-material-deduction-modal"
			onClick={(e) => e.target === e.currentTarget && onClose()}
			onKeyDown={(e) => {
				if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
					onClose();
				}
			}}
		>
			<div
				className="inventory-deduction-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Списание расходных материалов по технологической карте"
			>
				{/* HEADER */}
				<header className="inventory-deduction-header">
					<div className="inventory-deduction-title-wrap">
						<div className="inventory-deduction-icon-badge">
							<Package size={26} />
						</div>
						<div>
							<h2 className="inventory-deduction-title">
								Списание материалов по техкартам
							</h2>
							<p className="inventory-deduction-subtitle">
								{serviceName ? `Услуга: ${serviceName}` : "Клинический прием"}
								{toothNumber ? ` • Зуб №${toothNumber}` : ""}
								{patientName ? ` • Пациент: ${patientName}` : ""}
							</p>
						</div>
					</div>
					<button
						type="button"
						className="inventory-deduction-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</header>

				{/* TECH MAP SELECTOR BAR */}
				<div className="inventory-tech-maps-bar">
					<div className="inventory-tech-maps-label">
						Технологические карты процедур:
					</div>
					<div className="inventory-tech-maps-chips">
						{ALL_PROCEDURE_TECH_MAPS.map((tm) => {
							const isActive = selectedMapCodes.includes(tm.code);
							return (
								<button
									key={tm.id}
									type="button"
									className={`inventory-tech-map-chip ${isActive ? "active" : ""}`}
									onClick={() => handleToggleTechMap(tm.code)}
								>
									{isActive && <CheckCircle2 size={16} />}
									{tm.title}
								</button>
							);
						})}
					</div>
				</div>

				{/* CRITICAL THRESHOLD & DEFICIT ALERT BAR (1-CLICK PURCHASE ORDER) */}
				{(summary.hasDeficit || summary.warningCount > 0) && (
					<div
						style={{
							margin: "12px 24px 0",
							padding: "10px 16px",
							borderRadius: 12,
							background: summary.hasDeficit
								? "var(--rust-soft)"
								: "rgba(245, 158, 11, 0.12)",
							border: `1px solid ${
								summary.hasDeficit ? "var(--rust)" : "rgba(245, 158, 11, 0.5)"
							}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							flexWrap: "wrap",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							{summary.hasDeficit ? (
								<ShieldAlert
									size={20}
									style={{ color: "var(--rust)", flexShrink: 0 }}
								/>
							) : (
								<AlertTriangle
									size={20}
									style={{ color: "var(--amber, #f59e0b)", flexShrink: 0 }}
								/>
							)}
							<div>
								<div
									style={{
										fontSize: 13,
										fontWeight: 700,
										color: "var(--ink)",
									}}
								>
									{summary.hasDeficit
										? `Дефицит материалов: ${summary.criticalCount} поз. требуют пополнения!`
										: `Внимание: ${summary.warningCount} поз. достигли критического неснижаемого остатка.`}
								</div>
								<div style={{ fontSize: 12, color: "var(--muted)" }}>
									{preventNegativeStock && summary.hasDeficit
										? "Отрицательное списание заблокировано для защиты от пересортицы. Сформируйте заказ поставщику."
										: "Рекомендуется сформировать дозаказ поставщику для обеспечения бесперебойного приема."}
								</div>
							</div>
						</div>

						<button
							type="button"
							className="inventory-purchase-order-btn"
							onClick={() => setShowPoModal(true)}
						>
							<ShoppingCart size={16} />
							Сформировать заказ поставщику (1 клик)
						</button>
					</div>
				)}

				{/* SEARCH & CATEGORY TOOLBAR */}
				<div className="inventory-filter-toolbar">
					<div className="inventory-search-wrap">
						<Search size={18} className="inventory-search-icon" />
						<input
							type="text"
							className="inventory-search-input"
							placeholder="Поиск материала в списке списания..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					<div className="inventory-category-tabs">
						<button
							type="button"
							className={`inventory-category-tab ${activeCategory === "all" ? "active" : ""}`}
							onClick={() => setActiveCategory("all")}
						>
							Все ({lines.length})
						</button>
						{(Object.keys(TECH_MAP_CATEGORY_LABELS) as TechMapCategory[]).map(
							(cat) => {
								const count = lines.filter((l) => l.category === cat).length;
								if (count === 0) return null;
								return (
									<button
										key={cat}
										type="button"
										className={`inventory-category-tab ${activeCategory === cat ? "active" : ""}`}
										onClick={() => setActiveCategory(cat)}
									>
										{TECH_MAP_CATEGORY_LABELS[cat]} ({count})
									</button>
								);
							},
						)}
					</div>
				</div>

				{/* MATERIALS LIST BODY */}
				<div className="inventory-materials-body">
					{filteredLines.length === 0 ? (
						<div
							style={{
								padding: "48px 24px",
								textAlign: "center",
								color: "var(--muted)",
								fontSize: 15,
								fontWeight: 600,
							}}
						>
							Материалы не найдены. Выберите техкарту выше или добавьте позицию со
							склада.
						</div>
					) : (
						filteredLines.map((line) => {
							const stockStatus = evaluateStockStatus(
								line.stockQuantity,
								line.quantity,
								line.criticalThreshold,
								line.unit,
							);
							const lineCostKopecks = calculateLineCostKopecks(
								line.unitCostKopecks,
								line.quantity,
							);
							const catColor =
								TECH_MAP_CATEGORY_COLORS[line.category] ??
								TECH_MAP_CATEGORY_COLORS.other;

							return (
								<div
									key={line.id}
									className={`inventory-material-card ${
										stockStatus.severity === "critical"
											? "has-deficit"
											: stockStatus.severity === "warning"
												? "has-warning"
												: ""
									}`}
								>
									<div className="inventory-material-main-row">
										{/* INFO */}
										<div className="inventory-material-info">
											<div className="inventory-material-name-wrap">
												<span className="inventory-material-name">
													{line.materialName}
												</span>
												<span
													className="inventory-category-badge"
													style={{
														background: catColor.bg,
														color: catColor.text,
														border: `1px solid ${catColor.border}`,
													}}
												>
													{TECH_MAP_CATEGORY_LABELS[line.category]}
												</span>
											</div>

											<div className="inventory-material-meta">
												<span>Норма: {line.standardQuantity} {line.unit}</span>
												<span
													className={`inventory-stock-pill ${
														stockStatus.severity === "critical"
															? "stock-critical"
															: stockStatus.severity === "warning"
																? "stock-warning"
																: "stock-ok"
													}`}
												>
													{stockStatus.severity === "critical" && (
														<AlertTriangle size={14} />
													)}
													Остаток на складе: {line.stockQuantity} {line.unit}
												</span>
												{line.lotNumber && (
													<span>Партия: {line.lotNumber}</span>
												)}
												{line.expirationDate && (
													<span>Годен до: {line.expirationDate}</span>
												)}
											</div>
										</div>

										{/* STEPPER & CHIPS */}
										<div className="inventory-stepper-container">
											<div className="inventory-stepper-group">
												<button
													type="button"
													className="inventory-stepper-btn"
													onClick={() => handleStepQuantity(line.id, -1)}
													disabled={line.quantity <= 0}
													aria-label="Уменьшить количество"
												>
													−
												</button>
												<input
													type="text"
													className="inventory-stepper-input"
													value={line.quantity}
													onChange={(e) =>
														handleDirectQuantityChange(line.id, e.target.value)
													}
												/>
												<button
													type="button"
													className="inventory-stepper-btn"
													onClick={() => handleStepQuantity(line.id, 1)}
													aria-label="Увеличить количество"
												>
													+
												</button>
											</div>

											{/* Quick Chips */}
											<div className="inventory-quick-chips">
												{line.unit === "г" || line.unit === "мл" ? (
													<>
														<button
															type="button"
															className="inventory-quick-chip"
															onClick={() =>
																handleQuickIncrement(line.id, 0.1)
															}
														>
															+0.1
														</button>
														<button
															type="button"
															className="inventory-quick-chip"
															onClick={() =>
																handleQuickIncrement(line.id, 0.5)
															}
														>
															+0.5
														</button>
													</>
												) : (
													<>
														<button
															type="button"
															className="inventory-quick-chip"
															onClick={() => handleQuickIncrement(line.id, 1)}
														>
															+1
														</button>
														<button
															type="button"
															className="inventory-quick-chip"
															onClick={() => handleQuickIncrement(line.id, 2)}
														>
															+2
														</button>
													</>
												)}
												<button
													type="button"
													className="inventory-quick-chip"
													onClick={() =>
														handleQuickIncrement(line.id, "reset")
													}
													title="Вернуть стандартную норму"
												>
													Норма
												</button>
											</div>
										</div>

										{/* COST & REMOVE BOTTOM BAR */}
										<div className="inventory-material-bottom-bar">
											<div className="inventory-material-cost-wrap">
												<div className="inventory-material-cost-val">
													{(lineCostKopecks / 100).toLocaleString("ru-RU", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}{" "}
													₽
												</div>
												<div className="inventory-material-unit-price">
													{(line.unitCostKopecks / 100).toLocaleString("ru-RU", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}{" "}
													₽ / {line.unit}
												</div>
											</div>

											<button
												type="button"
												className="inventory-remove-line-btn"
												onClick={() => handleRemoveLine(line.id)}
												aria-label="Удалить позицию"
											>
												<Trash2 size={18} />
											</button>
										</div>
									</div>

									{/* ALERT BANNER IF DEFICIT OR LOW STOCK */}
									{stockStatus.severity !== "ok" && (
										<div
											className={`inventory-alert-banner ${
												stockStatus.severity === "critical"
													? "alert-critical"
													: "alert-warning"
											}`}
										>
											<AlertTriangle size={16} />
											<span>{stockStatus.message}</span>
										</div>
									)}
								</div>
							);
						})
					)}
				</div>

				{/* ADD CUSTOM MATERIAL FROM WAREHOUSE */}
				{warehouseItems.length > 0 && (
					<div className="inventory-add-custom-bar">
						<span
							style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}
						>
							Добавить материал со склада:
						</span>
						<select
							className="inventory-add-select"
							value={selectedCustomId}
							onChange={(e) => setSelectedCustomId(e.target.value)}
						>
							<option value="">-- Выберите материал из каталога склада --</option>
							{warehouseItems.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name} (остаток: {item.stockQuantity} шт.)
								</option>
							))}
						</select>
						<button
							type="button"
							className="inventory-add-btn"
							onClick={handleAddCustomMaterial}
							disabled={!selectedCustomId}
						>
							<Plus size={16} />
							Добавить
						</button>
					</div>
				)}

				{/* FOOTER & ACTIONS */}
				<footer className="inventory-deduction-footer">
					<div className="inventory-footer-summary">
						<div className="inventory-footer-metric">
							<span className="inventory-footer-metric-label">
								Всего позиций
							</span>
							<span className="inventory-footer-metric-val">
								{summary.totalLines} наименований
							</span>
						</div>

						<div className="inventory-footer-metric">
							<span className="inventory-footer-metric-label">
								Себестоимость материалов
							</span>
							<span className="inventory-footer-metric-val highlight-cost">
								{summary.totalCostFormatted}
							</span>
						</div>

						{summary.hasDeficit && (
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									padding: "6px 12px",
									borderRadius: 8,
									background: "var(--rust-soft)",
									color: "var(--rust)",
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								<AlertTriangle size={16} />
								Дефицит: {summary.criticalCount} поз.
							</div>
						)}
					</div>

					<div className="inventory-footer-actions">
						<label
							className="inventory-guard-toggle"
							title="Блокирует проведение списания при нехватке материалов на складе для предотвращения отрицательных остатков"
						>
							<input
								type="checkbox"
								checked={preventNegativeStock}
								onChange={(e) => setPreventNegativeStock(e.target.checked)}
							/>
							<span>Защита от отрицательных остатков</span>
						</label>

						<button
							type="button"
							className="inventory-cancel-btn"
							onClick={onClose}
							disabled={isDeducting}
						>
							Отмена
						</button>
						<button
							type="button"
							className="inventory-confirm-deduct-btn"
							onClick={() => {
								if (preventNegativeStock && summary.hasDeficit) {
									return;
								}
								if (onConfirmDeduction) {
									onConfirmDeduction(lines, summary);
								}
							}}
							disabled={
								isDeducting ||
								lines.length === 0 ||
								(preventNegativeStock && summary.hasDeficit)
							}
							title={
								preventNegativeStock && summary.hasDeficit
									? "Списание заблокировано: обнаружен дефицит материалов на складе. Сформируйте заказ поставщику."
									: "Провести списание выбранных материалов"
							}
						>
							<ShieldCheck size={18} />
							{isDeducting ? "Списание..." : "Списать со склада"}
						</button>
					</div>
				</footer>

				{/* 1-CLICK SUPPLIER PURCHASE ORDER SUB-MODAL */}
				{showPoModal && generatedPurchaseOrder && (
					<div
						className="inventory-po-overlay"
						onClick={(e) => e.target === e.currentTarget && setShowPoModal(false)}
					>
						<div
							className="inventory-po-dialog"
							role="dialog"
							aria-modal="true"
							aria-label="Заказ поставщику расходных материалов"
						>
							<div className="inventory-po-header">
								<div>
									<h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
										Заказ поставщику {generatedPurchaseOrder.orderNumber}
									</h3>
									<div
										style={{
											fontSize: 12,
											color: "var(--muted)",
											marginTop: 2,
										}}
									>
										Основание:{" "}
										{generatedPurchaseOrder.reason === "stock_deficit"
											? "Ликвидация дефицита материалов"
											: "Критический остаток"}{" "}
										• {generatedPurchaseOrder.orderDate}
									</div>
								</div>
								<button
									type="button"
									className="inventory-deduction-close-btn"
									onClick={() => setShowPoModal(false)}
									aria-label="Закрыть"
								>
									<X size={18} />
								</button>
							</div>

							<div className="inventory-po-body">
								<div
									style={{
										fontSize: 13,
										color: "var(--muted)",
										marginBottom: 12,
									}}
								>
									Автоматически рассчитанная спецификация к заказу для восстановления неснижаемого складского запаса:
								</div>

								<table className="inventory-po-table">
									<thead>
										<tr>
											<th>Артикул</th>
											<th>Наименование материала</th>
											<th>Ед.</th>
											<th style={{ textAlign: "right" }}>Остаток</th>
											<th style={{ textAlign: "right" }}>Дефицит</th>
											<th style={{ textAlign: "right" }}>К заказу</th>
											<th style={{ textAlign: "right" }}>Цена</th>
											<th style={{ textAlign: "right" }}>Сумма</th>
										</tr>
									</thead>
									<tbody>
										{generatedPurchaseOrder.items.map((item) => (
											<tr key={item.sku}>
												<td style={{ fontFamily: "monospace", fontSize: 11 }}>
													{item.sku}
												</td>
												<td style={{ fontWeight: 600 }}>{item.materialName}</td>
												<td>{item.unit}</td>
												<td style={{ textAlign: "right" }}>
													{item.currentStock}
												</td>
												<td
													style={{
														textAlign: "right",
														color:
															item.shortfall > 0
																? "var(--rust)"
																: "inherit",
														fontWeight: 700,
													}}
												>
													{item.shortfall > 0 ? item.shortfall : "—"}
												</td>
												<td
													style={{
														textAlign: "right",
														fontWeight: 700,
														color: "var(--teal-dark)",
													}}
												>
													{item.suggestedOrderQuantity}
												</td>
												<td style={{ textAlign: "right" }}>
													{item.unitCostFormatted}
												</td>
												<td
													style={{
														textAlign: "right",
														fontWeight: 700,
													}}
												>
													{item.totalCostFormatted}
												</td>
											</tr>
										))}
									</tbody>
								</table>

								<div
									style={{
										marginTop: 16,
										display: "flex",
										justifyContent: "flex-end",
										gap: 24,
										fontSize: 14,
									}}
								>
									<div>
										Позиций: <strong>{generatedPurchaseOrder.totalItemsCount}</strong>
									</div>
									<div>
										Итого к заказу:{" "}
										<strong
											style={{
												color: "var(--teal-dark)",
												fontSize: 16,
											}}
										>
											{generatedPurchaseOrder.totalCostFormatted}
										</strong>
									</div>
								</div>
							</div>

							<div className="inventory-po-footer">
								<div style={{ display: "flex", gap: 10 }}>
									<button
										type="button"
										className="inventory-cancel-btn"
										onClick={handleCopyPurchaseOrder}
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										{copiedPo ? <Check size={16} /> : <Copy size={16} />}
										{copiedPo ? "Скопировано!" : "Копировать текст"}
									</button>
									<button
										type="button"
										className="inventory-cancel-btn"
										onClick={handlePrintPurchaseOrder}
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										<Printer size={16} />
										Печать
									</button>
								</div>
								<button
									type="button"
									className="inventory-confirm-deduct-btn"
									onClick={() => setShowPoModal(false)}
								>
									Закрыть
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
