/**
 * useProcedureDeductionLogic.ts — Кастомный хук координации состояния модального окна
 * списания расходных материалов, техкарт процедур, расчета себестоимости и мягкого овердрафта.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	calculateDeductionSummary,
	createDeductionLinesFromTechMaps,
	createQuickCustomLineItem,
	createSupplierPurchaseOrderFromLines,
	formatSupplierPurchaseOrderTextRu,
	type SupplierPurchaseOrderView,
	type TechMapCategory,
} from "../inventoryMath.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import {
	DEFAULT_CLASS_B_WASTE_ACT,
	type ClassBWasteActData,
	type DeductionLineItem,
	type ProcedureMaterialDeductionModalProps,
} from "./procedureDeductionTypes.js";

const DEFAULT_INITIAL_TECH_MAP_CODES: readonly string[] = ["SANPIN_PPE"];
const EMPTY_WAREHOUSE_ITEMS: readonly InventoryItem[] = [];

export function useProcedureDeductionLogic(props: ProcedureMaterialDeductionModalProps) {
	const {
		isOpen,
		initialTechMapCodes = DEFAULT_INITIAL_TECH_MAP_CODES,
		warehouseItems = EMPTY_WAREHOUSE_ITEMS,
		isDeducting = false,
		onConfirmDeduction,
	} = props;

	// Выбранные шаблоны техкарт
	const [selectedMapCodes, setSelectedMapCodes] = useState<string[]>(() => [
		...initialTechMapCodes,
	]);

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

	// Актирование медотходов Класса Б по СанПиН 2.1.3684-21
	const [wasteAct, setWasteAct] = useState<ClassBWasteActData>(DEFAULT_CLASS_B_WASTE_ACT);

	// Модальное окно 1-кликового формирования заказа поставщику
	const [showPoModal, setShowPoModal] = useState(false);
	const [copiedPo, setCopiedPo] = useState(false);
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);

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
			setWasteAct(DEFAULT_CLASS_B_WASTE_ACT);
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

	// Выбор конкретной партии FEFO для строки
	const handleSelectBatch = (lineId: string, lotNumber: string, expDate?: string) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id !== lineId) return line;
				return {
					...line,
					lotNumber,
					expirationDate: expDate ?? line.expirationDate,
				};
			}),
		);
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

	// Подтверждение списания с защитой от двойного клика (Idempotency Guard)
	const handleConfirm = () => {
		if (isDeducting) return;

		if (lines.length === 0) {
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
				onConfirmDeduction(lines, summary, wasteAct.enabled ? wasteAct : undefined);
			}
		} finally {
			setTimeout(() => {
				inFlightRef.current = false;
			}, 600);
		}
	};

	return {
		selectedMapCodes,
		lines,
		setLines,
		searchQuery,
		setSearchQuery,
		activeCategory,
		setActiveCategory,
		selectedCustomId,
		setSelectedCustomId,
		highlightSelect,
		setHighlightSelect,
		customMaterialName,
		setCustomMaterialName,
		highlightCustomInput,
		setHighlightCustomInput,
		preventNegativeStock,
		setPreventNegativeStock,
		wasteAct,
		setWasteAct,
		showPoModal,
		setShowPoModal,
		copiedPo,
		summary,
		generatedPurchaseOrder,
		filteredLines,
		handleApplyPackage,
		handleToggleTechMap,
		handleStepQuantity,
		handleResetToStandard,
		handleDirectQuantityChange,
		handleRemoveLine,
		handleSelectBatch,
		handleAddCustomMaterial,
		handleAddQuickCustomMaterial,
		handleCopyPurchaseOrder,
		handlePrintPurchaseOrder,
		handleConfirm,
	};
}
