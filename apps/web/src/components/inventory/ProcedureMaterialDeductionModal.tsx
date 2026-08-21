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
	CheckCircle2,
	Package,
	Plus,
	Search,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	ALL_PROCEDURE_TECH_MAPS,
	type DeductionLineItem,
	type DeductionSummary,
	TECH_MAP_CATEGORY_COLORS,
	TECH_MAP_CATEGORY_LABELS,
	type TechMapCategory,
	calculateDeductionSummary,
	calculateLineCostKopecks,
	createDeductionLinesFromTechMaps,
	evaluateStockStatus,
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

										{/* COST & REMOVE */}
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
								if (onConfirmDeduction) {
									onConfirmDeduction(lines, summary);
								}
							}}
							disabled={isDeducting || lines.length === 0}
						>
							<ShieldCheck size={18} />
							{isDeducting ? "Списание..." : "Списать со склада"}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
