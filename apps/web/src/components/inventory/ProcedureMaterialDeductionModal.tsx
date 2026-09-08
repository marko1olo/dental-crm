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
	Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import {
	ALL_PROCEDURE_TECH_MAPS,
	CLINICAL_PROCEDURE_PACKAGES,
	type ClinicalTechMapPackage,
	type DeductionLineItem,
	type DeductionSummary,
	type SupplierPurchaseOrderView,
	TECH_MAP_CATEGORY_COLORS,
	TECH_MAP_CATEGORY_LABELS,
	type TechMapCategory,
	calculateDeductionSummary,
	calculateLineCostKopecks,
	createDeductionLinesFromTechMaps,
	createQuickCustomLineItem,
	createSupplierPurchaseOrderFromLines,
	declineUnitRu,
	evaluateStockStatus,
	formatQuantityWithUnitRu,
	formatSupplierPurchaseOrderTextRu,
	formatUnitPriceUnitRu,
} from "./inventoryMath";
import type { InventoryItem } from "./useInventoryLogic";
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
		const poContent = (
			<div
				className="inventory-deduction-backdrop"
				onClick={(e) => e.target === e.currentTarget && setShowPoModal(false)}
			>
				<div
					className="inventory-deduction-modal inventory-po-dialog"
					style={{ maxWidth: "880px" }}
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
									minHeight: "44px",
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
									minHeight: "44px",
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
							style={{ minHeight: "44px" }}
						>
							← Вернуться к списанию
						</button>
					</div>
				</div>
			</div>
		);

		return typeof document !== "undefined"
			? createPortal(poContent, document.body)
			: poContent;
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

				{/* 1-CLICK CLINICAL PACKAGES BAR (MANDATE 8e / 8k / 8n) */}
				<div className="inventory-clinical-packages-bar" data-testid="clinical-packages-bar">
					<div className="inventory-clinical-packages-header">
						<span className="inventory-clinical-packages-label">
							<Zap size={14} className="shrink-0" />
							Клинические пакеты (1 клик):
						</span>
						<span className="inventory-clinical-packages-hint">
							СИЗ + Крафт + анестезия + протокол лечения (1 клик)
						</span>
					</div>
					<div className="inventory-packages-chips">
						{/* Экспресс-пресеты медсестры и врача (Мандат 8e п. 10, Мандат 8k, Мандат 8n) */}
						<button
							type="button"
							className={`inventory-package-btn ${
								selectedMapCodes.includes("A16.07.004") && !selectedMapCodes.includes("A16.07.002.001") && !selectedMapCodes.includes("A16.07.051")
									? "active"
									: ""
							}`}
							data-testid="preset-btn-anesthesia"
							data-testid-alt="btn-dispense-standard-anesthesia-kit"
							onClick={() => handleApplyPackage(["SANPIN_PPE", "A16.07.004"])}
							title="Стандартный набор: анестезия 1.7 мл + карпульная игла + валики (Мандат 8e п. 10, 8k)"
						>
							<Zap size={14} className="shrink-0 text-amber-500" />
							<span>Стандартный набор: анестезия 1.7 мл + карпульная игла + валики</span>
						</button>

						<button
							type="button"
							className={`inventory-package-btn ${
								selectedMapCodes.includes("A16.07.002.001") ? "active" : ""
							}`}
							data-testid="preset-btn-caries"
							onClick={() =>
								handleApplyPackage([
									"SANPIN_PPE",
									"SANPIN_KRAFT",
									"A16.07.004",
									"A16.07.002.001",
								])
							}
							title="Терапевтический набор (пломбирование зуба): СИЗ + Крафт + Анестезия + Композит/Адгезив"
						>
							<Package size={14} className="shrink-0" />
							<span>Терапевтический набор / Пломбирование зуба</span>
						</button>

						<button
							type="button"
							className={`inventory-package-btn ${
								selectedMapCodes.includes("A16.07.051") ? "active" : ""
							}`}
							data-testid="preset-btn-hygiene"
							onClick={() =>
								handleApplyPackage(["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.051"])
							}
							title="Профгигиена: СИЗ + Крафт + Air-Flow + Паста + Оптрагейт"
						>
							<Package size={14} className="shrink-0" />
							<span>Профгигиена</span>
						</button>

						{CLINICAL_PROCEDURE_PACKAGES.map((pkg) => {
							const isPackageActive = pkg.codes.every((c) =>
								selectedMapCodes.includes(c),
							);
							return (
								<button
									key={pkg.id}
									type="button"
									className={`inventory-package-btn ${isPackageActive ? "active" : ""}`}
									data-testid={`package-btn-${pkg.id}`}
									onClick={() => handleApplyPackage(pkg.codes)}
									title={`${pkg.title}: ${pkg.description}`}
								>
									{isPackageActive ? (
										<CheckCircle2 size={15} className="shrink-0" />
									) : (
										<Package size={14} className="shrink-0 opacity-70" />
									)}
									<span>{pkg.title}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* TECH MAP SELECTOR BAR */}
				<div className="inventory-tech-maps-bar">
					<div className="inventory-tech-maps-label">
						Технологические карты процедур:
					</div>
					<div className="inventory-tech-maps-chips" style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", scrollbarWidth: "none", gap: "8px", paddingBottom: "4px" }}>
						{ALL_PROCEDURE_TECH_MAPS.map((tm) => {
							const isActive = selectedMapCodes.includes(tm.code);
							return (
								<button
									key={tm.id}
									type="button"
									className={`inventory-tech-map-chip ${isActive ? "active" : ""}`}
									style={{ flexShrink: 0, whiteSpace: "nowrap", minWidth: "max-content" }}
									onClick={() => handleToggleTechMap(tm.code)}
								>
									{isActive && <CheckCircle2 size={16} />}
									{tm.title}
								</button>
							);
						})}
					</div>
				</div>

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
									? `Дефицит материалов: ${summary.criticalCount} поз. (Мягкий овердрафт: остаток 0, списано в овердрафт — задержка оприходования накладной не блокирует операцию, спасение зуба или закрытие приёма врача)`
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
							<span>Сформировать заказ поставщику (1 клик)</span>
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
							<div>
								Материалы не найдены. Выберите техкарту выше или добавьте позицию со
								склада.
							</div>
							<button
								type="button"
								className="inventory-add-btn"
								onClick={() => {
									const preset = createStandardConsumablePresetItem(warehouseItems);
									setLines([preset]);
									showToast(
										"Добавлен стандартный клинический расходный набор (Мандат 8e / 8n)",
										"info",
									);
								}}
								style={{
									marginTop: 16,
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									minHeight: "44px",
									padding: "0 16px",
									fontSize: 13,
									fontWeight: 700,
								}}
								data-testid="auto-populate-standard-preset-btn"
							>
								<Plus size={16} />
								Добавить стандартный расходный набор в 1 клик
							</button>
						</div>
					) : (
						<div className="inventory-table-container">
							<table className="inventory-dense-table">
								<thead>
									<tr>
										<th>Материал / Категория</th>
										<th>Норма</th>
										<th>Остаток склада</th>
										<th style={{ textAlign: "center" }}>Списание (кол-во)</th>
										<th style={{ textAlign: "right" }}>Себестоимость</th>
										<th style={{ width: "32px" }}></th>
									</tr>
								</thead>
								<tbody>
									{filteredLines.map((line) => {
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
											<tr
												key={line.id}
												className={`inventory-table-row ${
													stockStatus.severity === "critical"
														? "has-deficit"
														: stockStatus.severity === "warning"
															? "has-warning"
															: ""
												}`}
												style={{ height: "38px" }}
											>
												{/* Name & Category */}
												<td className="inventory-td-name">
													<div className="inventory-name-cell" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
														<span
															className="inventory-material-name truncate max-w-[220px]"
															style={{
																fontSize: "12px",
																fontWeight: 700,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
															title={line.materialName}
														>
															{line.materialName}
														</span>
														<span
															className="inventory-category-badge"
															style={{
																padding: "1px 5px",
																fontSize: "9px",
																fontWeight: 700,
																background: catColor.bg,
																color: catColor.text,
																border: `1px solid ${catColor.border}`,
																flexShrink: 0,
																whiteSpace: "nowrap",
															}}
														>
															{TECH_MAP_CATEGORY_LABELS[line.category]}
														</span>
														{line.lotNumber && (
															<span className="inventory-lot-tag" style={{ fontSize: "10px", color: "var(--muted)", flexShrink: 0 }}>
																п. {line.lotNumber}
															</span>
														)}
														{line.expirationDate && (
															<span className="inventory-exp-tag" style={{ fontSize: "10px", color: "var(--muted)", flexShrink: 0 }}>
																до {line.expirationDate}
															</span>
														)}
													</div>
												</td>

												{/* Standard Norm */}
												<td className="inventory-td-norm" style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
													{formatQuantityWithUnitRu(line.standardQuantity, line.unit)}
												</td>

												{/* Stock Status */}
												<td className="inventory-td-stock" style={{ whiteSpace: "nowrap" }}>
													{stockStatus.severity === "critical" ? (
														<span className="inventory-deficit-badge" style={{ fontSize: "10px", padding: "1px 5px" }}>
															<AlertTriangle size={11} />
															Дефицит {formatQuantityWithUnitRu(stockStatus.deficit, line.unit)} (склад: {formatQuantityWithUnitRu(line.stockQuantity, line.unit)})
														</span>
													) : stockStatus.severity === "warning" ? (
														<span className="inventory-stock-pill stock-warning" style={{ fontSize: "10px", padding: "1px 5px" }}>
															<AlertTriangle size={11} />
															Остаток: {formatQuantityWithUnitRu(line.stockQuantity, line.unit)}
														</span>
													) : (
														<span className="inventory-stock-pill stock-ok" style={{ fontSize: "10px", padding: "1px 5px" }}>
															Остаток: {formatQuantityWithUnitRu(line.stockQuantity, line.unit)}
														</span>
													)}
												</td>

												{/* Stepper / Input */}
												<td className="inventory-td-stepper" style={{ whiteSpace: "nowrap" }}>
													<div className="inventory-compact-stepper-wrap" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
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
														<button
															type="button"
															className="inventory-quick-chip"
															style={{ height: "26px", padding: "0 6px", fontSize: "10px" }}
															onClick={() => handleResetToStandard(line.id)}
															title="Вернуть стандартную норму"
														>
															Норма
														</button>
													</div>
												</td>

												{/* Cost */}
												<td className="inventory-td-cost" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
													<div className="inventory-cost-cell" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0" }}>
														<span className="inventory-cost-val" style={{ fontSize: "12px", fontWeight: 700 }}>
															{(lineCostKopecks / 100).toLocaleString("ru-RU", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}{" "}
															₽
														</span>
														<span className="inventory-unit-price" style={{ fontSize: "9px" }}>
															{(line.unitCostKopecks / 100).toLocaleString("ru-RU", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}{" "}
															₽ / {formatUnitPriceUnitRu(line.unit)}
														</span>
													</div>
												</td>

												{/* Delete Action */}
												<td className="inventory-td-action" style={{ textAlign: "center" }}>
													<button
														type="button"
														className="inventory-remove-line-btn"
														style={{ width: "26px", height: "26px" }}
														onClick={() => handleRemoveLine(line.id)}
														aria-label="Удалить позицию"
													>
														<Trash2 size={13} />
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* ADD CUSTOM MATERIAL: WAREHOUSE CATALOG & QUICK ADD (SOLO DOCTOR RESILIENCE) */}
				<div className="inventory-add-custom-bar" data-testid="inventory-add-custom-bar">
					<div className="inventory-add-custom-inputs">
						<span
							style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}
						>
							Добавить расходник:
						</span>

						{warehouseItems.length > 0 && (
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 300px", minWidth: "220px" }}>
								<select
									className="inventory-add-select"
									value={selectedCustomId}
									onChange={(e) => {
										setSelectedCustomId(e.target.value);
										if (e.target.value) setHighlightSelect(false);
									}}
									aria-label="Выбрать материал из каталога склада"
									data-testid="warehouse-select-custom"
									style={{
										minHeight: "44px",
										borderColor: highlightSelect ? "var(--warn-fg, #b45309)" : undefined,
										boxShadow: highlightSelect ? "0 0 0 2px rgba(217, 119, 6, 0.25)" : undefined,
									}}
								>
									<option value="">-- Выберите из каталога склада --</option>
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
									disabled={isDeducting}
									data-testid="warehouse-add-custom-btn"
									title="Добавить выбранный из каталога материал"
									style={{ minHeight: "44px" }}
								>
									<Plus size={16} />
									Добавить со склада
								</button>
								<span style={{ fontSize: 12, color: "var(--muted)", padding: "0 4px", whiteSpace: "nowrap" }}>или</span>
							</div>
						)}

						{/* Quick text input for Solo Doctor & Empty Catalog Resilience */}
						<div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 260px", minWidth: "220px" }}>
							<input
								type="text"
								className="inventory-quick-custom-input"
								placeholder="Или введите название расходника..."
								aria-label="Или введите название расходника"
								data-testid="quick-custom-material-input"
								value={customMaterialName}
								onChange={(e) => {
									setCustomMaterialName(e.target.value);
									if (e.target.value.trim()) setHighlightCustomInput(false);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddQuickCustomMaterial();
									}
								}}
								style={{
									flex: 1,
									minHeight: "44px",
									borderColor: highlightCustomInput ? "var(--warn-fg, #b45309)" : undefined,
									boxShadow: highlightCustomInput ? "0 0 0 2px rgba(217, 119, 6, 0.25)" : undefined,
								}}
							/>
							<button
								type="button"
								className="inventory-add-btn"
								onClick={handleAddQuickCustomMaterial}
								disabled={isDeducting}
								data-testid="quick-custom-material-add-btn"
								title="Добавить расходник без каталога склада"
								style={{ minHeight: "44px" }}
							>
								<Plus size={16} />
								Добавить
							</button>
						</div>
					</div>
				</div>

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
							style={{ minHeight: "44px", display: "inline-flex", alignItems: "center" }}
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
							style={{ minHeight: "44px" }}
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
										"Добавлен стандартный клинический расходный набор (Мандат 8e / 8n)",
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
							style={{ minHeight: "44px" }}
							title={
								summary.hasDeficit
									? `Остаток 0, списано в овердрафт: задержка оприходования накладной не блокирует операцию, спасение зуба или закрытие приёма врача (Мандат 8e п. 10, Мандат 8k, Мандат 8n п. 2): дефицит ${summary.criticalCount} поз.`
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
