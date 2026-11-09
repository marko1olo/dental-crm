/**
 * apps/web/src/components/catalog/PricelistStudioModal.tsx
 *
 * Каноническая студия каталога услуг и прейскуранта DENTE CRM (SSOT).
 * Мандаты: 8b/8zi (Sweet Spot ~400 строк), 8e (автономия врача, 0 disabled кнопок),
 * 8x (живой русский язык без канцелярита и приказов 804н), 8am (ровно 1 Primary CTA), Apple HIG.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	Download,
	Edit2,
	Layers,
	Package,
	Plus,
	Printer,
	Search,
	Sparkles,
	Upload,
	X,
} from "lucide-react";
import "./pricelistStudio.css";
import {
	CANONICAL_CLINICAL_BUNDLES,
	CANONICAL_CLINICAL_CATEGORIES,
	type PricelistCategoryKey,
	type PricelistClinicalBundle,
	type PricelistStudioItem,
	calculateMarginPercent,
	calculatePricelistStats,
	filterPricelist,
	formatKopecksToRubles,
	getCategoryDisplayLabel,
	getMatchedTag,
	kopecksToRublesExact,
	loadCanonicalPricelist,
	normalizeCategoryFromBackend,
	parseRublesToKopecks,
	saveCanonicalPricelist,
	fetchPricelistFromBackend,
	syncServiceItemToBackend,
	batchSyncPricelistToBackend,
} from "./pricelistCatalogData";
import { PricelistItemDrawer } from "./PricelistItemDrawer";

export interface PricelistStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialItems?: readonly any[] | undefined;
	readonly onSaveCatalog?: ((items: readonly any[]) => void) | undefined;
	readonly onApplyBundleToVisit?: ((bundle: PricelistClinicalBundle) => void) | undefined;
	readonly onAddServiceToInvoice?: ((item: PricelistStudioItem) => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly adminSecret?: string | undefined;
}

export type ServicePriceListStudioModalProps = PricelistStudioModalProps;
export type ServicePricelistManagerModalProps = PricelistStudioModalProps;

const HighlightMatch: React.FC<{ readonly text: string; readonly query: string }> = ({
	text,
	query,
}) => {
	const trimmed = query.trim();
	if (!trimmed) return <>{text}</>;
	const escaped = trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
	const regex = new RegExp(`(${escaped})`, "gi");
	const parts = text.split(regex);
	return (
		<>
			{parts.map((part, i) =>
				part.toLowerCase() === trimmed.toLowerCase() ? (
					<mark key={i} className="pricelist-match-highlight">
						{part}
					</mark>
				) : (
					part
				),
			)}
		</>
	);
};

export const PricelistStudioModal: React.FC<PricelistStudioModalProps> = ({
	isOpen,
	onClose,
	initialItems,
	onSaveCatalog,
	onApplyBundleToVisit,
	onAddServiceToInvoice,
	clinicName = "Стоматологическая клиника «DENTE»",
}) => {
	const [items, setItems] = useState<readonly PricelistStudioItem[]>(() => {
		if (initialItems && initialItems.length > 0) {
			return initialItems.map((item, idx) => ({
				id: item.id || `srv-${idx}`,
				code: item.code || item.serviceCode || item.regulatoryCode || `ПОЗ-${idx + 1}`,
				serviceCode: item.serviceCode || item.code || `ПОЗ-${idx + 1}`,
				regulatoryCode: item.regulatoryCode || item.code,
				title: item.title || item.commercialTitle || "Стоматологическая услуга",
				category: normalizeCategoryFromBackend(item.category),
				priceKopecks:
					typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)
						? Math.round(item.priceKopecks)
						: typeof item.priceRub === "number" && Number.isFinite(item.priceRub)
							? Math.round(item.priceRub * 100)
							: typeof item.basePriceRub === "number" && Number.isFinite(item.basePriceRub)
								? Math.round(item.basePriceRub * 100)
								: 350000,
				costKopecks:
					typeof item.costKopecks === "number" && Number.isFinite(item.costKopecks)
						? Math.round(item.costKopecks)
						: typeof item.materialCostRub === "number" && Number.isFinite(item.materialCostRub)
							? Math.round(item.materialCostRub * 100)
							: typeof item.materialsCostRub === "number" && Number.isFinite(item.materialsCostRub)
								? Math.round(item.materialsCostRub * 100)
								: typeof item.costRub === "number" && Number.isFinite(item.costRub)
									? Math.round(item.costRub * 100)
									: 50000,
				durationMin: item.durationMin || item.estimatedDurationMin || 30,
				isActive: (item as any).active !== false && item.isActive !== false,
				tags: item.tags || [],
				isBundle: item.isBundle || false,
			}));
		}
		return loadCanonicalPricelist();
	});

	useEffect(() => {
		if (isOpen && (!initialItems || initialItems.length === 0)) {
			fetchPricelistFromBackend().then((backendItems) => {
				if (backendItems && backendItems.length > 0) {
					setItems(backendItems);
				}
			}).catch((err) => {
				console.warn("[PricelistStudioModal] Failed to fetch pricelist from backend:", err);
			});
		}
	}, [isOpen, initialItems]);

	const [selectedCategory, setSelectedCategory] = useState<PricelistCategoryKey | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [toastText, setToastText] = useState<string | null>(null);
	const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
	const [inlinePriceInput, setInlinePriceInput] = useState("");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<PricelistStudioItem | null>(null);
	const [formCode, setFormCode] = useState("");
	const [formTitle, setFormTitle] = useState("");
	const [formCategory, setFormCategory] = useState<PricelistCategoryKey>("therapy");
	const [formPriceRub, setFormPriceRub] = useState("3500");
	const [formCostRub, setFormCostRub] = useState("500");
	const [formDuration, setFormDuration] = useState("30");

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = (text: string) => {
		if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
		setToastText(text);
		toastTimeoutRef.current = setTimeout(() => setToastText(null), 2500);
	};

	const filteredItems = useMemo(
		() => filterPricelist(items, selectedCategory, searchQuery),
		[items, selectedCategory, searchQuery],
	);
	const stats = useMemo(() => calculatePricelistStats(items), [items]);

	const commitItemsUpdate = (newItems: readonly PricelistStudioItem[], itemToSync?: PricelistStudioItem) => {
		setItems(newItems);
		saveCanonicalPricelist(newItems);
		if (itemToSync) {
			syncServiceItemToBackend(itemToSync).catch((err) => {
				console.warn("[PricelistStudioModal] Failed to sync item to backend:", err);
			});
		}
		if (onSaveCatalog) onSaveCatalog(newItems);
	};

	const handleOpenCreate = () => {
		setEditingItem(null);
		setFormCode(`ПОЗ-${items.length + 1}`);
		setFormTitle("");
		setFormCategory(selectedCategory === "all" ? "therapy" : selectedCategory);
		setFormPriceRub("3500");
		setFormCostRub("500");
		setFormDuration("30");
		setIsDrawerOpen(true);
	};

	const handleOpenEdit = (item: PricelistStudioItem) => {
		setEditingItem(item);
		setFormCode(item.code);
		setFormTitle(item.title);
		setFormCategory(item.category);
		setFormPriceRub(kopecksToRublesExact(item.priceKopecks));
		setFormCostRub(kopecksToRublesExact(item.costKopecks));
		setFormDuration(String(item.durationMin));
		setIsDrawerOpen(true);
	};

	const handleSaveForm = (e: React.FormEvent) => {
		e.preventDefault();
		const finalTitle = formTitle.trim() || "Стоматологическая услуга";
		const priceKop = parseRublesToKopecks(formPriceRub);
		const costKop = parseRublesToKopecks(formCostRub);
		const durMin = parseInt(formDuration, 10) || 30;

		if (editingItem) {
			const updatedItem: PricelistStudioItem = {
				...editingItem,
				code: formCode.trim() || editingItem.code,
				serviceCode: formCode.trim() || editingItem.serviceCode,
				title: finalTitle,
				category: formCategory,
				priceKopecks: priceKop,
				costKopecks: costKop,
				durationMin: durMin,
			};
			const updated = items.map((i) => (i.id === editingItem.id ? updatedItem : i));
			commitItemsUpdate(updated, updatedItem);
			showToast(`Услуга «${finalTitle}» сохранена`);
		} else {
			const newItem: PricelistStudioItem = {
				id: `srv-${Date.now()}`,
				code: formCode.trim() || `УСЛ-${items.length + 1}`,
				serviceCode: formCode.trim() || `УСЛ-${items.length + 1}`,
				title: finalTitle,
				category: formCategory,
				priceKopecks: priceKop,
				costKopecks: costKop,
				durationMin: durMin,
				isActive: true,
			};
			commitItemsUpdate([newItem, ...items], newItem);
			showToast(`Услуга «${finalTitle}» добавлена`);
		}
		setIsDrawerOpen(false);
	};

	const handleInlinePriceSave = (itemId: string) => {
		const parsedKopecks = parseRublesToKopecks(inlinePriceInput);
		let updatedItem: PricelistStudioItem | undefined;
		const updated = items.map((i) => {
			if (i.id === itemId) {
				updatedItem = { ...i, priceKopecks: parsedKopecks };
				return updatedItem;
			}
			return i;
		});
		commitItemsUpdate(updated, updatedItem);
		setEditingPriceId(null);
		showToast("Цена обновлена");
	};

	const handleToggleActive = (itemId: string) => {
		let updatedItem: PricelistStudioItem | undefined;
		const updated = items.map((i) => {
			if (i.id === itemId) {
				updatedItem = { ...i, isActive: !i.isActive };
				return updatedItem;
			}
			return i;
		});
		commitItemsUpdate(updated, updatedItem);
		showToast("Статус услуги изменен");
	};

	const handleApplyQuickBundle = (bundle: PricelistClinicalBundle) => {
		const existing = items.find((i) => i.title === bundle.title);
		if (existing) {
			showToast(`Пакет «${bundle.shortTitle}» уже в прейскуранте`);
			if (onApplyBundleToVisit) onApplyBundleToVisit(bundle);
			if (onAddServiceToInvoice) onAddServiceToInvoice(existing);
			return;
		}

		const newBundleItem: PricelistStudioItem = {
			id: `bundle-${Date.now()}`,
			code: `ПАКЕТ-${items.length + 1}`,
			serviceCode: `ПАКЕТ-${items.length + 1}`,
			title: bundle.title,
			category: bundle.category,
			priceKopecks: bundle.priceKopecks,
			costKopecks: Math.round(bundle.priceKopecks * 0.25),
			durationMin: 60,
			isActive: true,
			isBundle: true,
			tags: ["пакет", "комплекс", "под ключ", ...bundle.items],
		};

		commitItemsUpdate([newBundleItem, ...items], newBundleItem);
		showToast(`Клинический комплекс «${bundle.shortTitle}» добавлен в прейскурант`);
		if (onApplyBundleToVisit) onApplyBundleToVisit(bundle);
		if (onAddServiceToInvoice) onAddServiceToInvoice(newBundleItem);
	};

	const handleExportCsv = () => {
		const csvRows = [
			"Код;Категория;Наименование процедуры;Цена (руб);Себестоимость (руб);Длительность (мин);Активна",
			...items.map((i) =>
				[
					i.code,
					i.category,
					`"${i.title.replace(/"/g, '""')}"`,
					kopecksToRublesExact(i.priceKopecks),
					kopecksToRublesExact(i.costKopecks),
					i.durationMin,
					i.isActive ? "Да" : "Нет",
				].join(";"),
			),
		];
		const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `Прейскурант_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		showToast("Экспортировано в CSV");
	};

	const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = String(event.target?.result ?? "");
			if (!text.trim()) return;

			const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
			if (lines.length <= 1) return;

			const importedItems: PricelistStudioItem[] = [];
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i]!;
				const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^"|"$/g, ""));
				if (parts.length >= 3) {
					const code = parts[0] || `ИМП-${i}`;
					const title = parts[2] && isNaN(Number(parts[2])) ? parts[2] : parts[1] || `Услуга ${i}`;
					const rawPrice = parts.find((p) => /^\d+([.,]\d+)?$/.test(p)) ?? "3000";
					const priceKopecks = parseRublesToKopecks(rawPrice);
					importedItems.push({
						id: `imp-${Date.now()}-${i}`,
						code,
						serviceCode: code,
						title,
						category: "therapy",
						priceKopecks: priceKopecks >= 0 ? priceKopecks : 350000,
						costKopecks: Math.round(priceKopecks * 0.2),
						durationMin: 30,
						isActive: true,
					});
				}
			}

			if (importedItems.length > 0) {
				const merged = [...importedItems, ...items];
				commitItemsUpdate(merged);
				batchSyncPricelistToBackend(importedItems).catch((err) => {
					console.warn("[PricelistStudioModal] Failed to batch sync imported items:", err);
				});
				showToast(`Импортировано ${importedItems.length} позиций из CSV`);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="pricelist-studio-overlay"
			role="dialog"
			aria-modal="true"
			data-testid="service-pricelist-studio-modal"
		>
			<div className="pricelist-studio-modal">
				<div className="pricelist-drag-handle sm:hidden" />
				<header className="pricelist-studio-header">
					<div className="pricelist-header-brand">
						<div className="pricelist-header-icon-box">
							<Layers size={22} />
						</div>
						<div>
							<h2 className="pricelist-header-title">Прейскурант услуг клиники</h2>
							<div className="pricelist-header-subtitle">
								<span className="hidden sm:inline">{clinicName} · </span>
								{stats.activeItems} активных позиций
								<span className="hidden sm:inline"> · Средняя маржа {stats.avgMarginPercent}%</span>
							</div>
						</div>
					</div>
					<div className="pricelist-header-actions">
						<input
							type="file"
							ref={fileInputRef}
							accept=".csv,.txt"
							style={{ display: "none" }}
							onChange={handleImportFileChange}
						/>
						<button
							type="button"
							className="pricelist-btn"
							onClick={() => fileInputRef.current?.click()}
							title="Импорт из CSV"
						>
							<Upload size={16} />
							<span className="hidden sm:inline">Импорт</span>
						</button>
						<button
							type="button"
							className="pricelist-btn"
							onClick={() => window.print()}
							title="Печать прейскуранта"
						>
							<Printer size={16} />
							<span className="hidden sm:inline">Печать A4</span>
						</button>
						<button
							type="button"
							className="pricelist-btn"
							onClick={handleExportCsv}
							title="Экспорт в CSV"
						>
							<Download size={16} />
							<span className="hidden sm:inline">Экспорт</span>
						</button>
						<button
							type="button"
							className="pricelist-btn pricelist-btn-primary"
							onClick={handleOpenCreate}
						>
							<Plus size={16} />
							<span>Добавить услугу</span>
						</button>
						<button
							type="button"
							className="pricelist-btn pricelist-btn-icon"
							onClick={onClose}
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Лента быстрых клинических комплексов в 1 клик (Мандаты 8e, 8n) */}
				<div className="pricelist-quick-bundles-strip">
					<div className="pricelist-quick-bundles-title">
						<Sparkles size={14} className="text-[var(--teal)]" />
						<span>Пакеты «Под ключ» в 1 клик:</span>
					</div>
					<div className="pricelist-quick-bundles-scroll">
						{CANONICAL_CLINICAL_BUNDLES.map((bundle) => (
							<button
								key={bundle.id}
								type="button"
								className="pricelist-quick-bundle-chip"
								onClick={() => handleApplyQuickBundle(bundle)}
								title={`${bundle.description} · Нажмите для добавления`}
							>
								<Package size={13} className="text-[var(--teal)]" />
								<span className="font-medium">{bundle.shortTitle}</span>
								<span className="pricelist-quick-bundle-price">
									{formatKopecksToRubles(bundle.priceKopecks)}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Тулбар поиска */}
				<div className="pricelist-studio-toolbar">
					<div className="pricelist-search-wrapper">
						<Search size={16} className="pricelist-search-icon" />
						<input
							type="text"
							className="pricelist-search-input"
							placeholder="Поиск по названию, коду или процедуре..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						{searchQuery && (
							<button
								type="button"
								className="pricelist-search-clear"
								onClick={() => setSearchQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={14} />
							</button>
						)}
					</div>
					<div className="pricelist-toolbar-stats text-xs text-[var(--muted)]">
						Найдено: <strong>{filteredItems.length}</strong> из {items.length}
					</div>
				</div>

				{/* Мобильная лента категорий */}
				<div className="pricelist-mobile-chips-bar">
					<button
						type="button"
						className={`pricelist-chip-btn ${selectedCategory === "all" ? "active" : ""}`}
						onClick={() => setSelectedCategory("all")}
					>
						Все ({items.length})
					</button>
					{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
						<button
							key={cat.key}
							type="button"
							className={`pricelist-chip-btn ${selectedCategory === cat.key ? "active" : ""}`}
							onClick={() => setSelectedCategory(cat.key)}
						>
							{cat.shortTitle} ({items.filter((i) => i.category === cat.key).length})
						</button>
					))}
				</div>

				{/* Рабочая область: Сайдбар + Таблица */}
				<div className="pricelist-studio-body">
					<aside className="pricelist-categories-sidebar">
						<button
							type="button"
							className={`pricelist-category-item ${selectedCategory === "all" ? "active" : ""}`}
							onClick={() => setSelectedCategory("all")}
						>
							<span>Все категории</span>
							<span className="pricelist-category-count">{items.length}</span>
						</button>
						{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
							<button
								key={cat.key}
								type="button"
								className={`pricelist-category-item ${selectedCategory === cat.key ? "active" : ""}`}
								onClick={() => setSelectedCategory(cat.key)}
							>
								<span>{cat.title}</span>
								<span className="pricelist-category-count">
									{items.filter((i) => i.category === cat.key).length}
								</span>
							</button>
						))}
					</aside>

					<main className="pricelist-items-container">
						<table className="pricelist-table-view">
							<thead>
								<tr>
									<th style={{ width: "95px" }}>Код</th>
									<th>Наименование процедуры</th>
									<th style={{ width: "130px" }}>Категория</th>
									<th style={{ width: "90px", textAlign: "right" }}>Время</th>
									<th style={{ width: "140px", textAlign: "right" }}>Цена</th>
									<th style={{ width: "90px", textAlign: "right" }}>Маржа</th>
									<th style={{ width: "110px", textAlign: "center" }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((item) => {
									const isEditingPrice = editingPriceId === item.id;
									const margin = calculateMarginPercent(item.priceKopecks, item.costKopecks);
									const matchedTag = searchQuery.trim() ? getMatchedTag(item, searchQuery) : null;
									return (
										<tr
											key={item.id}
											className="pricelist-table-row"
											style={{ opacity: item.isActive ? 1 : 0.55 }}
										>
											<td>
												<span className="pricelist-item-code-badge" title="Код позиции в каталоге клиники">
													<HighlightMatch text={item.code} query={searchQuery} />
												</span>
											</td>
											<td>
												<div className="pricelist-item-title flex items-center gap-1.5 flex-wrap">
													{item.isBundle && (
														<Package size={14} className="text-[var(--teal)] shrink-0" />
													)}
													<span>
														<HighlightMatch text={item.title} query={searchQuery} />
													</span>
													{matchedTag && (
														<span className="pricelist-tag-match-chip" title={`Найдено по тегу / синониму: ${matchedTag}`}>
															#{matchedTag}
														</span>
													)}
												</div>
											</td>
											<td>
												<span className="text-xs text-[var(--muted)]">
													{getCategoryDisplayLabel(item.category)}
												</span>
											</td>
											<td style={{ textAlign: "right" }} className="text-xs text-[var(--muted)]">
												{item.durationMin} мин
											</td>
											<td style={{ textAlign: "right" }}>
												{isEditingPrice ? (
													<input
														type="text"
														autoFocus
														className="pricelist-price-input"
														value={inlinePriceInput}
														onChange={(e) => setInlinePriceInput(e.target.value)}
														onBlur={() => handleInlinePriceSave(item.id)}
														onKeyDown={(e) => {
															if (e.key === "Enter") handleInlinePriceSave(item.id);
															if (e.key === "Escape") setEditingPriceId(null);
														}}
													/>
												) : (
													<div
														className="pricelist-price-cell"
														onClick={() => {
															setEditingPriceId(item.id);
															setInlinePriceInput(kopecksToRublesExact(item.priceKopecks));
														}}
														title="Нажмите для мгновенного изменения цены"
													>
														<span>{formatKopecksToRubles(item.priceKopecks)}</span>
														<Edit2 size={12} className="text-[var(--muted)]" />
													</div>
												)}
											</td>
											<td style={{ textAlign: "right" }}>
												<span
													className="text-xs font-semibold"
													style={{ color: margin >= 70 ? "var(--teal)" : "inherit" }}
												>
													{margin}%
												</span>
											</td>
											<td style={{ textAlign: "center" }}>
												<div className="flex items-center justify-center gap-1">
													<button
														type="button"
														className="pricelist-btn pricelist-btn-icon"
														style={{ width: "32px", height: "32px" }}
														onClick={() => handleOpenEdit(item)}
														title="Редактировать услугу"
													>
														<Edit2 size={14} />
													</button>
													<button
														type="button"
														className="pricelist-btn pricelist-btn-icon"
														style={{
															width: "32px",
															height: "32px",
															color: item.isActive ? "var(--teal)" : "var(--muted)",
														}}
														onClick={() => handleToggleActive(item.id)}
														title={item.isActive ? "Выключить" : "Включить"}
													>
														<Check size={14} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>

						{/* Мобильный список карточек (Apple HIG) */}
						<div className="pricelist-mobile-card-list">
							{filteredItems.map((item) => {
								const matchedTag = searchQuery.trim() ? getMatchedTag(item, searchQuery) : null;
								return (
								<div
									key={item.id}
									className="pricelist-mobile-card"
									style={{ opacity: item.isActive ? 1 : 0.6 }}
								>
									<div className="flex items-start justify-between gap-3 w-full">
										<div className="min-w-0 flex-1 pr-1">
											<div className="flex items-center gap-1.5 mb-1 flex-wrap">
												<span className="pricelist-item-code-badge font-mono shrink-0">
													<HighlightMatch text={item.code} query={searchQuery} />
												</span>
												{item.isBundle && (
													<span className="text-[11px] font-semibold text-[var(--teal)] bg-[var(--teal)]/10 px-1.5 py-0.5 rounded-md shrink-0">Комплекс</span>
												)}
												{matchedTag && (
													<span className="pricelist-tag-match-chip font-mono">
														#{matchedTag}
													</span>
												)}
											</div>
											<h4 className="font-semibold text-sm text-[var(--ink)] leading-snug break-words">
												<HighlightMatch text={item.title} query={searchQuery} />
											</h4>
										</div>
										<button
											type="button"
											className="pricelist-price-cell text-base font-bold text-[var(--teal)] font-mono tabular-nums shrink-0 min-h-[44px] h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] cursor-pointer whitespace-nowrap"
											onClick={() => handleOpenEdit(item)}
											title="Нажмите для редактирования"
										>
											{formatKopecksToRubles(item.priceKopecks)}
										</button>
									</div>
									<div className="flex items-center justify-between pt-2.5 border-t border-[var(--line)] text-xs text-[var(--muted)]">
										<span className="truncate pr-2">
											{getCategoryDisplayLabel(item.category)} · {item.durationMin} мин
										</span>
										<div className="flex items-center gap-1.5 shrink-0">
											<button
												type="button"
												className="pricelist-btn text-xs px-3.5 min-h-[44px] h-11 rounded-xl font-medium inline-flex items-center justify-center cursor-pointer"
												onClick={() => handleOpenEdit(item)}
											>
												<Edit2 size={13} className="mr-1 inline" />
												<span>Изменить</span>
											</button>
											<button
												type="button"
												className="pricelist-btn pricelist-btn-icon min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl cursor-pointer"
												style={{
													color: item.isActive ? "var(--teal)" : "var(--muted)",
												}}
												onClick={() => handleToggleActive(item.id)}
												title={item.isActive ? "Выключить услугу" : "Включить услугу"}
												aria-label={item.isActive ? "Выключить услугу" : "Включить услугу"}
											>
												<Check size={16} />
											</button>
										</div>
									</div>
								</div>
								);
							})}
						</div>
					</main>
				</div>

				{/* Плавающая нижняя панель на мобильном (Thumb Zone, Мандат Apple HIG) */}
				<div className="pricelist-floating-bottom-bar sm:hidden">
					<button
						type="button"
						className="pricelist-btn pricelist-btn-primary"
						style={{ width: "100%", height: "48px", minHeight: "48px", fontSize: "0.9375rem" }}
						onClick={handleOpenCreate}
					>
						<Plus size={18} />
						<span>Добавить услугу</span>
					</button>
				</div>

				{toastText && (
					<div
						style={{
							position: "absolute",
							bottom: "1rem",
							left: "50%",
							transform: "translateX(-50%)",
							background: "#0f172a",
							color: "#f8fafc",
							padding: "0.5rem 1rem",
							borderRadius: "9999px",
							fontSize: "0.8125rem",
							fontWeight: 500,
							boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
							zIndex: 100,
						}}
					>
						✓ {toastText}
					</div>
				)}
			</div>

			<PricelistItemDrawer
				isOpen={isDrawerOpen}
				editingItem={editingItem}
				formCode={formCode}
				formTitle={formTitle}
				formCategory={formCategory}
				formPriceRub={formPriceRub}
				formCostRub={formCostRub}
				formDuration={formDuration}
				onCodeChange={setFormCode}
				onTitleChange={setFormTitle}
				onCategoryChange={setFormCategory}
				onPriceChange={setFormPriceRub}
				onCostChange={setFormCostRub}
				onDurationChange={setFormDuration}
				onClose={() => setIsDrawerOpen(false)}
				onSubmit={handleSaveForm}
			/>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export const ServicePriceListStudioModal = PricelistStudioModal;
export const ServicePricelistManagerModal = PricelistStudioModal;

export default PricelistStudioModal;
