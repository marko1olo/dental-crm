/**
 * ProcedureMaterialDeductionModal.tsx — Интерактивное модальное окно списания расходников
 * по технологическим картам и нормам Минздрава РФ с контролем складских остатков.
 *
 * ФУНКЦИОНАЛ:
 * 1. Автоматический выбор и комбинирование технологических карт (СИЗ, Анестезия, Кариес, Эндодонтия, Гигиена, Хирургия).
 * 2. Сенсорные регуляторы со степпером [-] / [+] и кнопкой сброса в [Норма].
 * 3. Расчет себестоимости с точностью до копейки без погрешностей double.
 * 4. Предупреждения о дефиците и падении остатка ниже критического порога (Soft Warning без блокировки списания).
 * 5. Поиск и добавление любых дополнительных материалов из номенклатуры склада.
 */

import {
	AlertTriangle,
	Package,
	Search,
	ShieldAlert,
	ShieldCheck,
	ShoppingCart,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import {
	type DeductionLineItem,
	type DeductionSummary,
	type SupplierPurchaseOrderView,
	TECH_MAP_CATEGORY_LABELS,
	type TechMapCategory,
	calculateDeductionSummary,
	createDeductionLinesFromTechMaps,
	createQuickCustomLineItem,
	createSupplierPurchaseOrderFromLines,
	formatSupplierPurchaseOrderTextRu,
} from "./inventoryMath.js";
import { ProcedureMaterialAddCustomBar } from "./ProcedureMaterialAddCustomBar.js";
import { ProcedureMaterialPackagesBar } from "./ProcedureMaterialPackagesBar.js";
import { ProcedureMaterialPoModal } from "./ProcedureMaterialPoModal.js";
import { ProcedureMaterialTable } from "./ProcedureMaterialTable.js";
import type { InventoryItem } from "./useInventoryLogic.js";
import "./inventoryDeduction.css";

export const STANDARD_CONSUMABLE_PRESET_NAME =
	"Стандартный расходный набор (перчатки, маска, слюноотсос, ватные валики, карпула)";

export function createStandardConsumablePresetItem(
	warehouseItems: readonly InventoryItem[] = [],
): DeductionLineItem {
	return {
		...createQuickCustomLineItem(STANDARD_CONSUMABLE_PRESET_NAME, {
			unit: "компл.",
			quantity: 1,
			warehouseItems,
			unitCostRub: "150.00",
		}),
		category: "ppe",
		mandatory: true,
	};
}

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
		[...initialTechMapCodes],
	);

	// Строки списания
	const [lines, setLines] = useState<DeductionLineItem[]>(() =>
		createDeductionLinesFromTechMaps(
			initialTechMapCodes,
			warehouseItems,
			initialTechMapCodes.length > 0,
		),
	);

	// Фильтры и поиск
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<TechMapCategory | "all">("all");

	// Выбор кастомного материала со склада
	const [selectedCustomId, setSelectedCustomId] = useState("");
	const [highlightSelect, setHighlightSelect] = useState(false);

	// Быстрый ввод названия расходника (Solo Doctor Resilience, Mandate 8e, 8n)
	const [customMaterialName, setCustomMaterialName] = useState("");
	const [highlightCustomInput, setHighlightCustomInput] = useState(false);

	// Защита от отрицательных остатков (Default: true)
	const [preventNegativeStock, setPreventNegativeStock] = useState(true);

	// Модальное окно 1-кликового формирования заказа поставщику
	const [showPoModal, setShowPoModal] = useState(false);
	const [copiedPo, setCopiedPo] = useState(false);
	const inFlightRef = React.useRef(false);
	const lastClickTimeRef = React.useRef(0);

	// Синхронизация при открытии
	useEffect(() => {
		if (isOpen) {
			setSelectedMapCodes([...initialTechMapCodes]);
			setLines(
				createDeductionLinesFromTechMaps(
					initialTechMapCodes,
					warehouseItems,
					initialTechMapCodes.length > 0,
				),
			);
			setSearchQuery("");
			setActiveCategory("all");
			setCustomMaterialName("");
			setSelectedCustomId("");
			setHighlightSelect(false);
			setHighlightCustomInput(false);
		}
	}, [isOpen, initialTechMapCodes, warehouseItems]);

	// Активация клинического пакета в 1 клик (Мандат 8e / 8k / 8n)
	const handleApplyPackage = (packageCodes: readonly string[]) => {
		setSelectedMapCodes([...packageCodes]);

		const generated = createDeductionLinesFromTechMaps(
			packageCodes,
			warehouseItems,
			true,
		);

		setLines((oldLines) => {
			const oldQtyMap = new Map<string, number>();
			for (const o of oldLines) {
				oldQtyMap.set(o.materialName.toLowerCase().trim(), o.quantity);
			}
			const updated = generated.map((g) => {
				const oldQty = oldQtyMap.get(g.materialName.toLowerCase().trim());
				return oldQty !== undefined ? { ...g, quantity: oldQty } : g;
			});

			// Сохраняем кастомные строки, добавленные вручную (Solo Doctor Resilience)
			const manualLines = oldLines.filter((l) => l.source === "manual");
			for (const m of manualLines) {
				if (
					!updated.some(
						(u) =>
							u.id === m.id ||
							u.materialName.toLowerCase().trim() ===
								m.materialName.toLowerCase().trim(),
					)
				) {
					updated.push(m);
				}
			}

			return updated;
		});
	};

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
				const updated = generated.map((g) => {
					const oldQty = oldQtyMap.get(g.materialName.toLowerCase().trim());
					return oldQty !== undefined ? { ...g, quantity: oldQty } : g;
				});

				// Сохраняем кастомные строки, добавленные вручную
				const manualLines = oldLines.filter((l) => l.source === "manual");
				for (const m of manualLines) {
					if (
						!updated.some(
							(u) =>
								u.id === m.id ||
								u.materialName.toLowerCase().trim() ===
									m.materialName.toLowerCase().trim(),
						)
					) {
						updated.push(m);
					}
				}

				return updated;
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

	// Сброс количества в нормативное значение по технологической карте
	const handleResetToStandard = (lineId: string) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id !== lineId) return line;
				return { ...line, quantity: line.standardQuantity };
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
		if (isDeducting) return;
		if (!selectedCustomId) {
			setHighlightSelect(true);
			setTimeout(() => setHighlightSelect(false), 2000);
			showToast("Выберите материал из каталога склада для добавления", "warning");
			return;
		}
		const item = warehouseItems.find((w) => w.id === selectedCustomId);
		if (!item) {
			showToast("Выбранный материал не найден в каталоге склада", "warning");
			return;
		}

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
		setHighlightSelect(false);
	};

	// Быстрое добавление произвольного расходника без привязки к каталогу склада (Solo Doctor Resilience)
	const handleAddQuickCustomMaterial = () => {
		if (isDeducting) return;
		const trimmed = customMaterialName.trim();
		if (!trimmed) {
			setHighlightCustomInput(true);
			setTimeout(() => setHighlightCustomInput(false), 2000);
			showToast("Введите название расходного материала для добавления", "warning");
			return;
		}

		const normName = trimmed.toLowerCase();
		const existing = lines.find(
			(l) => l.materialName.toLowerCase().trim() === normName,
		);

		if (existing) {
			setLines((prev) =>
				prev.map((l) =>
					l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l,
				),
			);
		} else {
			const newLine = createQuickCustomLineItem(trimmed, {
				warehouseItems,
			});
			setLines((prev) => [...prev, newLine]);
		}
		setCustomMaterialName("");
		setHighlightCustomInput(false);
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

	// Anti-Matryoshka (Mandate 8d Sin 6): Render PO sequentially at modal depth strictly 1
	if (showPoModal && generatedPurchaseOrder) {
		return (
			<ProcedureMaterialPoModal
				generatedPurchaseOrder={generatedPurchaseOrder}
				onClose={() => setShowPoModal(false)}
				onCopy={handleCopyPurchaseOrder}
				onPrint={handlePrintPurchaseOrder}
				copiedPo={copiedPo}
			/>
		);
	}

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
						<div className="min-w-0">
							<h2 className="inventory-deduction-title truncate">
								Списание материалов по техкартам
							</h2>
							<p className="inventory-deduction-subtitle truncate">
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

				{/* 1-CLICK CLINICAL PACKAGES BAR & TECH MAP SELECTOR BAR */}
				<ProcedureMaterialPackagesBar
					selectedMapCodes={selectedMapCodes}
					onApplyPackage={handleApplyPackage}
					onToggleTechMap={handleToggleTechMap}
				/>

				{/* CRITICAL THRESHOLD & DEFICIT ALERT BAR (RESPONSIVE 390px LAYOUT) */}
				{(summary.hasDeficit || summary.warningCount > 0) && (
					<div
						className={`inventory-alert-summary-bar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 p-2 sm:p-1.5 ${summary.hasDeficit ? "has-deficit" : "has-warning"}`}
					>
						<div className="flex items-center gap-2 text-xs text-[var(--ink)] font-semibold min-w-0">
							{summary.hasDeficit ? (
								<ShieldAlert
									size={15}
									className="text-[var(--rust,#dc2626)] shrink-0"
								/>
							) : (
								<AlertTriangle
									size={15}
									className="text-[var(--amber,#f59e0b)] shrink-0"
								/>
							)}
							<span className="text-xs font-bold leading-tight">
								{summary.hasDeficit
									? `Внимание: остаток отрицательный, требуется оприходование накладной (дефицит: ${summary.criticalCount} поз.). Задержка оприходования накладной не блокирует операцию!`
									: `Внимание: ${summary.warningCount} поз. достигли критического неснижаемого остатка.`}
							</span>
						</div>

						<button
							type="button"
							className="inventory-purchase-order-btn shrink-0"
							style={{
								minHeight: "26px",
								height: "26px",
								padding: "0 10px",
								fontSize: "11px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
							}}
							onClick={() => setShowPoModal(true)}
						>
							<ShoppingCart size={13} />
							<span>Сформировать заказ поставщику</span>
						</button>
					</div>
				)}

				{/* SEARCH & CATEGORY TOOLBAR */}
				<div className="inventory-filter-toolbar">
					<div className="inventory-search-wrap">
						<Search size={16} className="inventory-search-icon" />
						<input
							type="text"
							className="inventory-search-input"
							placeholder="Поиск материала..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						{searchQuery && (
							<button
								type="button"
								className="inventory-search-clear"
								onClick={() => setSearchQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={14} />
							</button>
						)}
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

				{/* MATERIALS LIST TABLE */}
				<div className="inventory-materials-body">
					<ProcedureMaterialTable
						filteredLines={filteredLines}
						warehouseItems={warehouseItems}
						onAddStandardPreset={() => {
							const preset = createStandardConsumablePresetItem(warehouseItems);
							setLines([preset]);
							showToast(
								"Добавлен стандартный клинический расходный набор (Клинический регламент)",
								"info",
							);
						}}
						onStepQuantity={handleStepQuantity}
						onDirectQuantityChange={handleDirectQuantityChange}
						onResetToStandard={handleResetToStandard}
						onRemoveLine={handleRemoveLine}
					/>
				</div>

				{/* ADD CUSTOM MATERIAL: WAREHOUSE CATALOG & QUICK ADD (SOLO DOCTOR RESILIENCE) */}
				<ProcedureMaterialAddCustomBar
					warehouseItems={warehouseItems}
					selectedCustomId={selectedCustomId}
					onSelectCustomId={(val) => {
						setSelectedCustomId(val);
						if (val) setHighlightSelect(false);
					}}
					highlightSelect={highlightSelect}
					onAddCustomMaterial={handleAddCustomMaterial}
					isDeducting={isDeducting}
					customMaterialName={customMaterialName}
					onChangeCustomMaterialName={(val) => {
						setCustomMaterialName(val);
						if (val.trim()) setHighlightCustomInput(false);
					}}
					highlightCustomInput={highlightCustomInput}
					onAddQuickCustomMaterial={handleAddQuickCustomMaterial}
				/>

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
								className="inventory-deficit-badge"
								data-testid="inventory-deficit-badge"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									padding: "6px 12px",
									borderRadius: 8,
									background: "rgba(217, 119, 6, 0.12)",
									color: "var(--warn-fg, #b45309)",
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
							title="Автоматически формирует заявку поставщику при выявлении дефицита материалов"
							style={{ minHeight: "34px", display: "inline-flex", alignItems: "center" }}
						>
							<input
								type="checkbox"
								checked={preventNegativeStock}
								onChange={(e) => setPreventNegativeStock(e.target.checked)}
							/>
							<span>Автозаказ поставщику при дефиците</span>
						</label>

						<button
							type="button"
							className="inventory-cancel-btn"
							onClick={onClose}
							disabled={isDeducting}
							style={{ minHeight: "34px" }}
							data-testid="inventory-cancel-btn"
						>
							Отмена
						</button>
						<button
							type="button"
							className={`inventory-confirm-deduct-btn ${summary.hasDeficit ? "has-deficit-warning" : ""}`}
							data-testid="confirm-deduction-btn"
							data-testid-alt="btn-confirm-dispense"
							onClick={() => {
								if (isDeducting) return;

								if (lines.length === 0) {
									const standardPreset = createStandardConsumablePresetItem(warehouseItems);
									setLines([standardPreset]);
									showToast(
										"Добавлен стандартный клинический расходный набор (Клинический регламент)",
										"info",
									);
									return;
								}

								const now = Date.now();
								if (inFlightRef.current || now - lastClickTimeRef.current < 600) {
									return;
								}
								inFlightRef.current = true;
								lastClickTimeRef.current = now;
								try {
									if (onConfirmDeduction) {
										onConfirmDeduction(lines, summary);
									}
								} finally {
									setTimeout(() => {
										inFlightRef.current = false;
									}, 600);
								}
							}}
							disabled={isDeducting}
							style={{ minHeight: "36px" }}
							title={
								summary.hasDeficit
									? `Остаток 0, списание с дефицитом: задержка оприходования накладной не блокирует операцию, спасение зуба или закрытие приёма врача: дефицит ${summary.criticalCount} поз.`
									: "Провести списание выбранных материалов"
							}
						>
							{summary.hasDeficit ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
							{isDeducting
								? "Списание..."
								: summary.hasDeficit
									? `Списать (мягкий овердрафт: ${summary.criticalCount} поз.)`
									: "Списать со склада"}
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
