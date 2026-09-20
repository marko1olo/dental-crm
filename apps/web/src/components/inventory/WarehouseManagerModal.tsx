/**
 * ============================================================================
 * WAREHOUSE MANAGER MODAL (МАНДАТЫ 8e, 8k, 8n)
 * Сенсорный Touch-First HUD оперативного складского учета, списания расходников
 * и пустых карпул анестетиков в 1 клик для врача и старшей медсестры.
 *
 * КЛЮЧЕВЫЕ ПРИНЦИПЫ:
 * 1. Мандат 8e п. 10: Списание пустых карпул и расходников в 1 клик без созыва комиссии из 3 человек.
 * 2. Мандат 8k: CRM != Reality Simulator. Экспресс-пресеты без кликанья каждого ватного валика.
 * 3. Мандат 8n п. 2: Мягкий овердрафт склада. Задержка оприходования накладной не блокирует операцию.
 * 4. Мандат 8d: 1-строчный тулбар (32-36px), глубина модалок строго 1 (Анти-Матрёшка), ноль эмодзи.
 * ============================================================================
 */

import {
	ArrowLeft,
	CheckCircle2,
	FileText,
	Minus,
	Package,
	Plus,
	Printer,
	Search,
	ShieldAlert,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface WarehouseWriteoffItem {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly stockQuantity: number;
	readonly writeoffQuantity: number;
	readonly unitCostRub: string;
	readonly isOverdraft: boolean;
	readonly lotNumber?: string | undefined;
	readonly expirationDate?: string | undefined;
}

export interface WarehouseManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmWriteoff?: ((items: readonly WarehouseWriteoffItem[]) => void | Promise<void>) | undefined;
	readonly initialItems?: readonly InventoryItem[] | undefined;
	readonly doctorName?: string | undefined;
	readonly nurseName?: string | undefined;
	readonly cabinetName?: string | undefined;
}

export const CANONICAL_WAREHOUSE_PRESETS = [
	{
		id: "anesthesia-17",
		name: "Стандартная анестезия 1.7 мл",
		description: "10 карпул Артикаина 1.7 мл + 10 стерильных карпульных игл 30G",
		items: [
			{ name: "Артикаин 1:100 000 карпула 1.7 мл", category: "Анестезия", unit: "карп.", qty: 10, costRub: "95.00" },
			{ name: "Игла карпульная стоматологическая 30G 0.3x21мм", category: "Анестезия", unit: "шт.", qty: 10, costRub: "12.50" },
			{ name: "Салфетка спиртовая инъекционная", category: "СИЗ", unit: "шт.", qty: 10, costRub: "4.00" },
		],
	},
	{
		id: "filling-standard",
		name: "Пломбирование зуба",
		description: "Базовый расходный комплект: СИЗ + Крафт-пакет + Композит + Адгезив + Микробраши",
		items: [
			{ name: "Перчатки нитриловые неопудренные", category: "СИЗ", unit: "пар", qty: 1, costRub: "35.00" },
			{ name: "Маска трехслойная защитная", category: "СИЗ", unit: "шт.", qty: 1, costRub: "8.00" },
			{ name: "Слюноотсос одноразовый", category: "СИЗ", unit: "шт.", qty: 1, costRub: "6.00" },
			{ name: "Крафт-пакет самоклеящийся 100х200", category: "Стерилизация", unit: "шт.", qty: 1, costRub: "14.00" },
			{ name: "Композит светоотверждаемый Estelite Sigma Quick", category: "Терапия", unit: "г", qty: 0.3, costRub: "320.00" },
			{ name: "Адгезивная система Single Bond Universal", category: "Терапия", unit: "кап.", qty: 1, costRub: "110.00" },
			{ name: "Микроаппликаторы регулярные", category: "Терапия", unit: "шт.", qty: 2, costRub: "5.50" },
		],
	},
	{
		id: "hygiene-prof",
		name: "Профгигиена",
		description: "Порошок Air-Flow + Полировочная паста + Циркулярные щетки + Роторасширитель Оптрагейт",
		items: [
			{ name: "Перчатки нитриловые неопудренные", category: "СИЗ", unit: "пар", qty: 1, costRub: "35.00" },
			{ name: "Маска защитная с экраном", category: "СИЗ", unit: "шт.", qty: 1, costRub: "22.00" },
			{ name: "Порошок для Air-Flow на основе глицина", category: "Гигиена", unit: "г", qty: 25, costRub: "18.00" },
			{ name: "Паста полировочная Cleanic с фтором", category: "Гигиена", unit: "г", qty: 2, costRub: "45.00" },
			{ name: "Щетка полировочная циркулярная", category: "Гигиена", unit: "шт.", qty: 1, costRub: "35.00" },
			{ name: "Роторасширитель OptraGate Regular", category: "Гигиена", unit: "шт.", qty: 1, costRub: "195.00" },
		],
	},
] as const;

const DEFAULT_WAREHOUSE_ITEMS: readonly InventoryItem[] = [
	{
		id: "wh-art-01",
		name: "Артикаин 1:100 000 карпула 1.7 мл",
		stockQuantity: 140,
		criticalThreshold: 30,
		unitCostRub: "95.00",
		updatedAt: "2026-09-01",
		unit: "карп.",
		sku: "AN-ART-17",
		lotNumber: "410224",
		expirationDate: "2028-12-31",
	},
	{
		id: "wh-scand-01",
		name: "Мепивакаин (Скандонест 3%) карпула 1.7 мл",
		stockQuantity: 0, // Имитация нулевого остатка для мягкого овердрафта
		criticalThreshold: 15,
		unitCostRub: "115.00",
		updatedAt: "2026-09-01",
		unit: "карп.",
		sku: "AN-MEP-17",
		lotNumber: "120823",
		expirationDate: "2027-08-31",
	},
	{
		id: "wh-needles-01",
		name: "Игла карпульная стоматологическая 30G 0.3x21мм",
		stockQuantity: 350,
		criticalThreshold: 50,
		unitCostRub: "12.50",
		updatedAt: "2026-09-01",
		unit: "шт.",
		sku: "ND-30G-21",
	},
	{
		id: "wh-gloves-01",
		name: "Перчатки нитриловые неопудренные (размер M)",
		stockQuantity: 12, // Ниже порога
		criticalThreshold: 25,
		unitCostRub: "35.00",
		updatedAt: "2026-09-01",
		unit: "пар",
		sku: "PPE-GLV-M",
	},
	{
		id: "wh-kraft-01",
		name: "Крафт-пакет самоклеящийся 100х200 (СанПиН 3.3686-21)",
		stockQuantity: 420,
		criticalThreshold: 60,
		unitCostRub: "14.00",
		updatedAt: "2026-09-01",
		unit: "шт.",
		sku: "STER-KP-100",
	},
	{
		id: "wh-comp-01",
		name: "Композит светоотверждаемый Estelite Sigma Quick А2",
		stockQuantity: 4,
		criticalThreshold: 2,
		unitCostRub: "3200.00",
		updatedAt: "2026-09-01",
		unit: "шприц",
		sku: "COMP-EST-A2",
	},
	{
		id: "wh-adhes-01",
		name: "Адгезивная система Single Bond Universal 5 мл",
		stockQuantity: 0, // Овердрафт
		criticalThreshold: 1,
		unitCostRub: "4800.00",
		updatedAt: "2026-09-01",
		unit: "фл.",
		sku: "ADH-SBU-5",
	},
];

export function WarehouseManagerModal({
	isOpen,
	onClose,
	onConfirmWriteoff,
	initialItems,
	doctorName = "Д-р Кузнецов А.В.",
	nurseName = "Иванова Е.В. (старшая медсестра)",
	cabinetName = "Кабинет №1 (Терапия/Хирургия)",
}: WarehouseManagerModalProps) {
	const rawItems = initialItems && initialItems.length > 0 ? initialItems : DEFAULT_WAREHOUSE_ITEMS;

	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [writeoffQuantities, setWriteoffQuantities] = useState<Record<string, number>>({});
	const [activeView, setActiveView] = useState<"inventory" | "act_preview">("inventory");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Категоризация
	const itemsWithCategory = useMemo(() => {
		return rawItems.map((item) => {
			let cat = "Расходные";
			const lower = item.name.toLowerCase();
			if (lower.includes("артикаин") || lower.includes("мепивакаин") || lower.includes("скандонест") || lower.includes("игла")) {
				cat = "Анестезия";
			} else if (lower.includes("перчатки") || lower.includes("маска") || lower.includes("слюноотсос") || lower.includes("салфетка")) {
				cat = "СИЗ";
			} else if (lower.includes("композит") || lower.includes("адгезив") || lower.includes("микроаппликатор")) {
				cat = "Терапия";
			} else if (lower.includes("крафт") || lower.includes("индикатор")) {
				cat = "Стерилизация";
			} else if (lower.includes("порошок") || lower.includes("паста") || lower.includes("оптрагейт") || lower.includes("щетка")) {
				cat = "Гигиена";
			}
			return {
				...item,
				category: cat,
				unit: item.unit || item.unitOfMeasure || "шт.",
			};
		});
	}, [rawItems]);

	// Фильтрованный список
	const filteredItems = useMemo(() => {
		return itemsWithCategory.filter((item) => {
			const matchesSearch =
				item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
			return matchesSearch && matchesCategory;
		});
	}, [itemsWithCategory, searchQuery, categoryFilter]);

	// DOM Virtualization & Chunking (Mandates 8c, 8n)
	const [displayLimit, setDisplayLimit] = useState(40);

	useEffect(() => {
		setDisplayLimit(40);
	}, [searchQuery, categoryFilter]);

	const itemsSlice = useMemo(() => {
		return sliceDomList(filteredItems, displayLimit, 0);
	}, [filteredItems, displayLimit]);

	// Выбранные к списанию строки
	const activeWriteoffLines = useMemo((): WarehouseWriteoffItem[] => {
		const lines: WarehouseWriteoffItem[] = [];
		for (const item of itemsWithCategory) {
			const qty = writeoffQuantities[item.id] || 0;
			if (qty > 0) {
				const stock = item.stockQuantity;
				lines.push({
					id: item.id,
					name: item.name,
					category: item.category,
					unit: item.unit,
					stockQuantity: stock,
					writeoffQuantity: qty,
					unitCostRub: item.unitCostRub,
					isOverdraft: stock <= 0 || qty > stock,
					lotNumber: item.lotNumber,
					expirationDate: item.expirationDate,
				});
			}
		}
		return lines;
	}, [itemsWithCategory, writeoffQuantities]);

	// Проверка наличия овердрафта среди списания
	const hasActiveOverdraft = useMemo(() => {
		return activeWriteoffLines.some((l) => l.isOverdraft);
	}, [activeWriteoffLines]);

	// Итоговая сумма к списанию
	const totalWriteoffCostRub = useMemo(() => {
		return activeWriteoffLines.reduce((acc, line) => {
			const cost = Number.parseFloat(line.unitCostRub) || 0;
			return acc + cost * line.writeoffQuantity;
		}, 0);
	}, [activeWriteoffLines]);

	// 1-кликовые пресеты
	const handleApplyPreset = useCallback((presetId: string) => {
		const preset = CANONICAL_WAREHOUSE_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;

		setWriteoffQuantities((prev) => {
			const next = { ...prev };
			for (const pItem of preset.items) {
				// Поиск соответствующего складского товара
				const matched = itemsWithCategory.find((i) =>
					i.name.toLowerCase().includes(pItem.name.toLowerCase().slice(0, 15))
				);
				if (matched) {
					next[matched.id] = (next[matched.id] || 0) + pItem.qty;
				}
			}
			return next;
		});

		showToast(`Пресет «${preset.name}» применен в 1 клик`, "info");
	}, [itemsWithCategory]);

	// Изменение количества в степпере
	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setWriteoffQuantities((prev) => {
			const current = prev[itemId] || 0;
			const nextVal = Math.max(0, Number((current + delta).toFixed(2)));
			if (nextVal === 0) {
				const copy = { ...prev };
				delete copy[itemId];
				return copy;
			}
			return { ...prev, [itemId]: nextVal };
		});
	}, []);

	// Очистить списание
	const handleClearAll = useCallback(() => {
		setWriteoffQuantities({});
		showToast("Очередь списания очищена", "info");
	}, []);

	// Подтверждение списания
	const handleConfirm = async () => {
		if (activeWriteoffLines.length === 0) {
			showToast("Выберите хотя бы один материал для списания", "warning");
			return;
		}

		setIsSubmitting(true);
		try {
			if (onConfirmWriteoff) {
				await onConfirmWriteoff(activeWriteoffLines);
			}
			showToast(
				hasActiveOverdraft
					? `Списано позиций: ${activeWriteoffLines.length} (зафиксирован мягкий овердрафт без остановки приема)`
					: `Успешно списано позиций: ${activeWriteoffLines.length}`,
				"success"
			);
			onClose();
		} catch {
			showToast("Ошибка при фиксации списания", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
			data-testid="warehouse-manager-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Складской учет и списание расходных материалов"
		>
			<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#e2e8f0)] rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
				{/* HEADER */}
				<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
							<Package size={20} />
						</div>
						<div className="min-w-0">
							<h2 className="text-base font-bold leading-tight truncate">
								{activeView === "inventory" ? "Складской учет и списание расходников" : "Акт списания материалов (Единолично)"}
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] truncate">
								{cabinetName} • {nurseName} • {doctorName}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{activeView === "act_preview" ? (
							<button
								type="button"
								className="h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] flex items-center gap-1.5 transition-colors"
								onClick={() => setActiveView("inventory")}
								data-testid="back-to-inventory-btn"
							>
								<ArrowLeft size={14} />
								К списку склада
							</button>
						) : (
							<button
								type="button"
								className="h-9 px-3 text-xs font-semibold rounded-lg border border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center gap-1.5 transition-colors"
								onClick={() => setActiveView("act_preview")}
								data-testid="switch-to-act-btn"
								title="Оформить акт списания единолично"
							>
								<FileText size={14} />
								Акт списания ({activeWriteoffLines.length})
							</button>
						)}
						<button
							type="button"
							className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
							onClick={onClose}
							aria-label="Закрыть окно склада"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 1-ROW TOOLBAR (Mandates 8c, 8d: 32-36px compact desktop toolbar) */}
				{activeView === "inventory" && (
					<div className="min-h-[36px] h-auto py-1 px-5 bg-[var(--paper,#ffffff)] border-b border-[var(--border,#e2e8f0)] flex flex-wrap items-center gap-2 text-xs shrink-0">
						{/* Поиск */}
						<div className="relative flex-1 min-w-[180px] max-w-xs">
							<Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#94a3b8)]" />
							<input
								type="text"
								className="w-full h-8 min-h-[32px] pl-8 pr-2.5 text-xs rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
								placeholder="Поиск по названию или SKU..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								data-testid="warehouse-search-input"
							/>
						</div>

						{/* Категория */}
						<select
							className="h-8 min-h-[32px] px-2.5 text-xs rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
							aria-label="Фильтр по категориям"
						>
							<option value="all">Все категории</option>
							<option value="Анестезия">Анестезия</option>
							<option value="СИЗ">СИЗ</option>
							<option value="Терапия">Терапия</option>
							<option value="Стерилизация">Стерилизация</option>
							<option value="Гигиена">Гигиена</option>
						</select>

						<div className="h-4 w-px bg-[var(--border,#cbd5e1)] mx-1" />

						{/* 1-кликовые пресеты */}
						<span className="text-[var(--muted,#64748b)] font-semibold flex items-center gap-1 shrink-0">
							<Zap size={13} className="text-amber-500" />
							Пресеты:
						</span>

						<button
							type="button"
							className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
							onClick={() => handleApplyPreset("anesthesia-17")}
							data-testid="preset-anesthesia-btn"
							title="10 карпул Артикаина 1.7 мл + 10 карпульных игл 30G"
						>
							Стандартная анестезия 1.7 мл
						</button>

						<button
							type="button"
							className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
							onClick={() => handleApplyPreset("filling-standard")}
							data-testid="preset-filling-btn"
							title="СИЗ + Крафт + Композит + Адгезив + Микробраши"
						>
							Пломбирование зуба
						</button>

						<button
							type="button"
							className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
							onClick={() => handleApplyPreset("hygiene-prof")}
							data-testid="preset-hygiene-btn"
							title="Air-Flow + Паста + Щетки + Оптрагейт"
						>
							Профгигиена
						</button>

						{activeWriteoffLines.length > 0 && (
							<button
								type="button"
								className="h-8 min-h-[32px] px-2 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto flex items-center gap-1 shrink-0"
								onClick={handleClearAll}
								title="Очистить выбранные"
							>
								<Trash2 size={13} />
								Очистить ({activeWriteoffLines.length})
							</button>
						)}
					</div>
				)}

				{/* SOFT OVERDRAFT BANNER (МАНДАТ 8e п. 10, МАНДАТ 8n п. 2) */}
				{hasActiveOverdraft && (
					<div
						className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0"
						data-testid="soft-overdraft-banner"
					>
						<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<div className="flex-1 leading-snug min-w-0">
							<strong>Внимание: остаток отрицательный, требуется оприходование накладной.</strong> Задержка оприходования накладной не блокирует операцию, спасение зуба или закрытие приёма врача (мягкий овердрафт).
						</div>
					</div>
				)}

				{/* BODY */}
				<div className="flex-1 overflow-y-auto p-5">
					{activeView === "inventory" ? (
						<div className="border border-[var(--border,#e2e8f0)] rounded-lg overflow-hidden">
							<table className="w-full text-left text-xs border-collapse">
								<thead className="bg-[var(--paper-strong,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--border,#e2e8f0)] font-semibold">
									<tr>
										<th className="py-2.5 px-3">Материал / Артикул</th>
										<th className="py-2.5 px-3">Категория</th>
										<th className="py-2.5 px-3 text-right">Остаток</th>
										<th className="py-2.5 px-3 text-center">Списание</th>
										<th className="py-2.5 px-3 text-right">Цена</th>
										<th className="py-2.5 px-3 text-right">Сумма</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--border,#f1f5f9)]">
									{itemsSlice.visibleItems.map((item) => {
										const writeQty = writeoffQuantities[item.id] || 0;
										const isZeroStock = item.stockQuantity <= 0;
										const isLowStock = !isZeroStock && item.stockQuantity <= item.criticalThreshold;
										const isOverdrafted = isZeroStock || writeQty > item.stockQuantity;

										return (
											<tr
												key={item.id}
												className="hover:bg-[var(--paper-strong,#f8fafc)] transition-colors"
												style={{
													contain: "content",
													contentVisibility: "auto",
													containIntrinsicSize: "1px 48px",
												}}
											>
												<td className="py-2.5 px-3 min-w-0 max-w-xs">
													<div className="font-semibold truncate" title={item.name}>{item.name}</div>
													<div className="text-[11px] text-[var(--muted,#94a3b8)] font-mono truncate">
														{item.sku ? `SKU: ${item.sku}` : ""}
														{item.lotNumber ? ` • Серия: ${item.lotNumber}` : ""}
													</div>
												</td>
												<td className="py-2.5 px-3">
													<span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
														{item.category}
													</span>
												</td>
												<td className="py-2.5 px-3 text-right whitespace-nowrap">
													<span
														className={`font-semibold ${
															isZeroStock
																? "text-amber-600 dark:text-amber-400"
																: isLowStock
																? "text-orange-600 dark:text-orange-400"
																: "text-emerald-700 dark:text-emerald-400"
														}`}
													>
														{item.stockQuantity} {item.unit}
													</span>
													{isOverdrafted && (
														<span
															className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate max-w-[160px]"
															title="Внимание: остаток отрицательный, требуется оприходование накладной"
														>
															{isZeroStock ? "Остаток 0 (Овердрафт)" : "Внимание: дефицит (Овердрафт)"}
														</span>
													)}
												</td>
												<td className="py-2.5 px-3 text-center whitespace-nowrap">
													<div className="inline-flex items-center gap-1.5">
														<button
															type="button"
															className="w-8 h-8 rounded-lg border border-[var(--border,#cbd5e1)] flex items-center justify-center hover:bg-[var(--paper-strong,#f1f5f9)] active:scale-95 transition-transform cursor-pointer"
															onClick={() => handleStepQuantity(item.id, -1)}
															aria-label={`Уменьшить количество ${item.name}`}
														>
															<Minus size={14} />
														</button>
														<span className="w-10 text-center font-mono font-bold text-sm">
															{writeQty}
														</span>
														<button
															type="button"
															className="w-8 h-8 rounded-lg border border-[var(--border,#cbd5e1)] flex items-center justify-center hover:bg-[var(--paper-strong,#f1f5f9)] active:scale-95 transition-transform cursor-pointer"
															onClick={() => handleStepQuantity(item.id, 1)}
															aria-label={`Увеличить количество ${item.name}`}
														>
															<Plus size={14} />
														</button>
														{writeQty === 0 && (
															<button
																type="button"
																className="h-8 px-3 ml-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors inline-flex items-center justify-center cursor-pointer"
																onClick={() => handleStepQuantity(item.id, 1)}
															>
																Списать 1
															</button>
														)}
													</div>
												</td>
												<td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-[11px]">
													{Number.parseFloat(item.unitCostRub || "0").toFixed(2)} ₽
												</td>
												<td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-semibold">
													{(Number.parseFloat(item.unitCostRub || "0") * writeQty).toFixed(2)} ₽
												</td>
											</tr>
										);
									})}
									{itemsSlice.hasMore && (
										<tr>
											<td colSpan={6} className="py-3 text-center bg-[var(--paper-strong,#f8fafc)]">
												<button
													type="button"
													className="h-8 px-4 text-xs font-semibold rounded-lg bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
													onClick={() => setDisplayLimit((prev) => prev + 40)}
													data-testid="btn-warehouse-show-more"
												>
													Показать ещё 40 материалов (осталось {itemsSlice.remainingCount})
												</button>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					) : (
						/* SINGLE SIGNER ACT PREVIEW (СПИСАНИЕ ОТВЕТСТВЕННЫМ ЛИЦОМ) */
						<div className="bg-[var(--paper,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-lg p-6 max-w-3xl mx-auto text-xs space-y-4 font-sans">
							<div className="flex items-center justify-between border-b border-[var(--border,#cbd5e1)] dark:border-slate-700 pb-3">
								<div className="space-y-1">
									<h3 className="text-sm font-bold uppercase tracking-wide">
										АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ
									</h3>
									<p className="text-[11px] text-[var(--muted,#64748b)]">
										Утверждено ответственным лицом (СанПиН 3.3686-21 • Приказ Минздрава 804н)
									</p>
								</div>
								<button
									type="button"
									onClick={() => window.print()}
									className="h-11 px-4 text-xs font-bold rounded-lg border border-[var(--teal,#0d9488)] text-[var(--teal-dark,#0f766e)] bg-[var(--teal-soft,#ccfbf1)] hover:bg-[var(--teal)] hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer shadow-2xs"
									style={{ minHeight: "44px" }}
									title="Распечатать бумажный акт списания"
								>
									<Printer size={16} />
									Распечатать акт
								</button>
							</div>

							<div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
								<div>
									<span className="text-[var(--muted,#64748b)]">Подразделение:</span>{" "}
									<span className="font-semibold">{cabinetName}</span>
								</div>
								<div>
									<span className="text-[var(--muted,#64748b)]">Дата списания:</span>{" "}
									<span className="font-semibold">{new Date().toLocaleDateString("ru-RU")}</span>
								</div>
								<div>
									<span className="text-[var(--muted,#64748b)]">Ответственное лицо (единолично):</span>{" "}
									<span className="font-semibold">{nurseName}</span>
								</div>
								<div>
									<span className="text-[var(--muted,#64748b)]">Принимающий врач:</span>{" "}
									<span className="font-semibold">{doctorName}</span>
								</div>
							</div>

							<div className="border border-[var(--border,#e2e8f0)] rounded overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b border-slate-200 dark:border-slate-700">
										<tr>
											<th className="py-2 px-2.5">№</th>
											<th className="py-2 px-2.5">Наименование материала</th>
											<th className="py-2 px-2.5">Ед.</th>
											<th className="py-2 px-2.5 text-right">Кол-во</th>
											<th className="py-2 px-2.5 text-right">Цена, ₽</th>
											<th className="py-2 px-2.5 text-right">Сумма, ₽</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
										{activeWriteoffLines.map((line, idx) => (
											<tr key={line.id}>
												<td className="py-1.5 px-2.5 text-[var(--muted,#64748b)]">{idx + 1}</td>
												<td className="py-1.5 px-2.5">
													<div className="font-medium">{line.name}</div>
													{line.isOverdraft && (
														<span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
															[Мягкий овердрафт]
														</span>
													)}
												</td>
												<td className="py-1.5 px-2.5">{line.unit}</td>
												<td className="py-1.5 px-2.5 text-right font-mono font-semibold">
													{line.writeoffQuantity}
												</td>
												<td className="py-1.5 px-2.5 text-right font-mono">
													{Number.parseFloat(line.unitCostRub).toFixed(2)}
												</td>
												<td className="py-1.5 px-2.5 text-right font-mono font-bold">
													{(Number.parseFloat(line.unitCostRub) * line.writeoffQuantity).toFixed(2)}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
										<tr>
											<td colSpan={5} className="py-2 px-2.5 text-right">
												ИТОГО К СПИСАНИЮ:
											</td>
											<td className="py-2 px-2.5 text-right font-mono text-sm text-teal-700 dark:text-teal-400">
												{totalWriteoffCostRub.toFixed(2)} ₽
											</td>
										</tr>
									</tfoot>
								</table>
							</div>

							<div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
								<div>
									Подпись ответственного лица: ____________________ / {nurseName}
								</div>
								<div className="text-right">
									Основание: Фактический расход (Приказ Минздрава 804н, СанПиН 3.3686-21)
								</div>
							</div>
						</div>
					)}
				</div>

				{/* FOOTER */}
				<footer className="px-5 py-3.5 border-t border-[var(--border,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] flex items-center justify-between gap-3 shrink-0">
					<div className="text-xs">
						<span className="text-[var(--muted,#64748b)]">Выбрано к списанию:</span>{" "}
						<strong className="text-[var(--ink,#0f172a)]">{activeWriteoffLines.length} поз.</strong>{" "}
						• Сумма: <strong className="text-teal-700 dark:text-teal-400 font-mono text-sm">{totalWriteoffCostRub.toFixed(2)} ₽</strong>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="h-9 px-4 text-xs font-semibold rounded-lg border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
							onClick={onClose}
						>
							Отмена
						</button>

						<button
							type="button"
							className="h-9 px-5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
							onClick={handleConfirm}
							disabled={isSubmitting}
							data-testid="confirm-writeoff-btn"
						>
							<CheckCircle2 size={16} />
							{isSubmitting ? "Списание..." : "Подтвердить списание"}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
}

export default WarehouseManagerModal;
