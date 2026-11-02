/**
 * apps/web/src/components/catalog/ServicePriceListStudioModal.tsx
 *
 * Каноническая студия каталога услуг и прейскуранта DENTE CRM (SSOT).
 * Мандаты: 8b/8zi (Sweet Spot 350-430 строк), 8e (автономия врача, 0 disabled кнопок),
 * 8x (живой русский язык без канцелярита и приказов), 8am (ровно 1 Primary CTA), Apple HIG.
 */

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Edit2, Layers, Package, Plus, Printer, Search, Sparkles, X } from "lucide-react";
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
	loadCanonicalPricelist,
	parseRublesToKopecks,
	saveCanonicalPricelist,
} from "./pricelistCatalogData";
import { PricelistItemDrawer } from "./PricelistItemDrawer";

export interface ServicePriceListStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialItems?: readonly any[] | undefined;
	readonly onSaveCatalog?: ((items: readonly any[]) => void) | undefined;
	readonly onApplyBundleToVisit?: ((bundle: PricelistClinicalBundle) => void) | undefined;
	readonly onAddServiceToInvoice?: ((item: PricelistStudioItem) => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly adminSecret?: string | undefined;
}

export const ServicePriceListStudioModal: React.FC<ServicePriceListStudioModalProps> = ({
	isOpen,
	onClose,
	initialItems,
	onSaveCatalog,
	onApplyBundleToVisit,
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
				category: (item.category as PricelistCategoryKey) || "therapy",
				priceKopecks: item.priceKopecks || (item.priceRub ? item.priceRub * 100 : item.basePriceRub ? item.basePriceRub * 100 : 350000),
				costKopecks: item.costKopecks || (item.materialCostRub ? item.materialCostRub * 100 : 50000),
				durationMin: item.durationMin || item.estimatedDurationMin || 30,
				isActive: item.isActive !== false,
				tags: item.tags || [], isBundle: item.isBundle || false,
			}));
		}
		return loadCanonicalPricelist();
	});

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

	const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = (text: string) => {
		if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
		setToastText(text);
		toastTimeoutRef.current = setTimeout(() => setToastText(null), 2500);
	};

	const filteredItems = useMemo(() => filterPricelist(items, selectedCategory, searchQuery), [items, selectedCategory, searchQuery]);
	const stats = useMemo(() => calculatePricelistStats(items), [items]);

	const commitItemsUpdate = (newItems: readonly PricelistStudioItem[]) => {
		setItems(newItems);
		saveCanonicalPricelist(newItems);
		if (onSaveCatalog) onSaveCatalog(newItems);
	};

	const handleOpenCreate = () => {
		setEditingItem(null);
		setFormCode(`ПОЗ-${items.length + 1}`);
		setFormTitle("");
		setFormCategory(selectedCategory === "all" ? "therapy" : selectedCategory);
		setFormPriceRub("3500"); setFormCostRub("500"); setFormDuration("30");
		setIsDrawerOpen(true);
	};

	const handleOpenEdit = (item: PricelistStudioItem) => {
		setEditingItem(item);
		setFormCode(item.code);
		setFormTitle(item.title);
		setFormCategory(item.category);
		setFormPriceRub(String(Math.floor(item.priceKopecks / 100)));
		setFormCostRub(String(Math.floor(item.costKopecks / 100)));
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
			const updated = items.map((i) =>
				i.id === editingItem.id
					? { ...i, code: formCode.trim() || i.code, serviceCode: formCode.trim() || i.serviceCode, title: finalTitle, category: formCategory, priceKopecks: priceKop, costKopecks: costKop, durationMin: durMin }
					: i,
			);
			commitItemsUpdate(updated);
			showToast(`Услуга «${finalTitle}» сохранена`);
		} else {
			const newItem: PricelistStudioItem = {
				id: `srv-${Date.now()}`,
				code: formCode.trim() || `УСЛ-${items.length + 1}`,
				serviceCode: formCode.trim() || `УСЛ-${items.length + 1}`,
				title: finalTitle, category: formCategory,
				priceKopecks: priceKop, costKopecks: costKop, durationMin: durMin, isActive: true,
			};
			commitItemsUpdate([newItem, ...items]);
			showToast(`Услуга «${finalTitle}» добавлена`);
		}
		setIsDrawerOpen(false);
	};

	const handleInlinePriceSave = (itemId: string) => {
		const parsedKopecks = parseRublesToKopecks(inlinePriceInput);
		const updated = items.map((i) => (i.id === itemId ? { ...i, priceKopecks: parsedKopecks } : i));
		commitItemsUpdate(updated);
		setEditingPriceId(null);
		showToast("Цена обновлена");
	};

	const handleToggleActive = (itemId: string) => {
		const updated = items.map((i) => (i.id === itemId ? { ...i, isActive: !i.isActive } : i));
		commitItemsUpdate(updated);
		showToast("Статус услуги изменен");
	};

	const handleApplyQuickBundle = (bundle: PricelistClinicalBundle) => {
		const existing = items.find((i) => i.title === bundle.title);
		if (existing) {
			showToast(`Пакет «${bundle.shortTitle}» уже в прейскуранте`);
			if (onApplyBundleToVisit) onApplyBundleToVisit(bundle);
			return;
		}

		const newBundleItem: PricelistStudioItem = {
			id: `bundle-${Date.now()}`,
			code: `ПАКЕТ-${items.length + 1}`,
			serviceCode: `ПАКЕТ-${items.length + 1}`,
			title: bundle.title, category: bundle.category,
			priceKopecks: bundle.priceKopecks, costKopecks: Math.round(bundle.priceKopecks * 0.25),
			durationMin: 60, isActive: true, isBundle: true,
			tags: ["пакет", "комплекс", "под ключ", ...bundle.items],
		};

		commitItemsUpdate([newBundleItem, ...items]);
		showToast(`Клинический комплекс «${bundle.shortTitle}» добавлен в прейскурант`);
		if (onApplyBundleToVisit) onApplyBundleToVisit(bundle);
	};

	const handleExportCsv = () => {
		const csvRows = [
			"Код;Категория;Наименование процедуры;Цена (руб);Себестоимость (руб);Длительность (мин);Активна",
			...items.map((i) => [i.code, i.category, `"${i.title.replace(/"/g, '""')}"`, Math.floor(i.priceKopecks / 100), Math.floor(i.costKopecks / 100), i.durationMin, i.isActive ? "Да" : "Нет"].join(";")),
		];
		const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `Прейскурант_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		showToast("Экспортировано в CSV");
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="pricelist-studio-overlay" role="dialog" aria-modal="true" data-testid="service-pricelist-studio-modal">
			<div className="pricelist-studio-modal">
				<div className="pricelist-drag-handle sm:hidden" />
				<header className="pricelist-studio-header">
					<div className="pricelist-header-brand">
						<div className="pricelist-header-icon-box"><Layers size={22} /></div>
						<div>
							<h2 className="pricelist-header-title">Прейскурант услуг клиники</h2>
							<div className="pricelist-header-subtitle">
								{clinicName} · {stats.activeItems} активных позиций · Средняя маржа {stats.avgMarginPercent}%
							</div>
						</div>
					</div>
					<div className="pricelist-header-actions">
						<button type="button" className="pricelist-btn" onClick={() => window.print()} title="Печать прейскуранта">
							<Printer size={16} /><span className="hidden sm:inline">Печать A4</span>
						</button>
						<button type="button" className="pricelist-btn" onClick={handleExportCsv} title="Экспорт в CSV">
							<Download size={16} /><span className="hidden sm:inline">Экспорт</span>
						</button>
						<button type="button" className="pricelist-btn pricelist-btn-primary" onClick={handleOpenCreate}>
							<Plus size={16} /><span>+ Добавить услугу</span>
						</button>
						<button type="button" className="pricelist-btn pricelist-btn-icon" onClick={onClose} aria-label="Закрыть">
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
								<span className="pricelist-quick-bundle-price">{formatKopecksToRubles(bundle.priceKopecks)}</span>
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
							<button type="button" className="pricelist-search-clear" onClick={() => setSearchQuery("")} aria-label="Очистить поиск">
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
					<button type="button" className={`pricelist-chip-btn ${selectedCategory === "all" ? "active" : ""}`} onClick={() => setSelectedCategory("all")}>
						Все ({items.length})
					</button>
					{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
						<button key={cat.key} type="button" className={`pricelist-chip-btn ${selectedCategory === cat.key ? "active" : ""}`} onClick={() => setSelectedCategory(cat.key)}>
							{cat.shortTitle} ({items.filter((i) => i.category === cat.key).length})
						</button>
					))}
				</div>

				{/* Рабочая область */}
				<div className="pricelist-studio-body">
					<aside className="pricelist-categories-sidebar">
						<button type="button" className={`pricelist-category-item ${selectedCategory === "all" ? "active" : ""}`} onClick={() => setSelectedCategory("all")}>
							<span>Все категории</span><span className="pricelist-category-count">{items.length}</span>
						</button>
						{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
							<button key={cat.key} type="button" className={`pricelist-category-item ${selectedCategory === cat.key ? "active" : ""}`} onClick={() => setSelectedCategory(cat.key)}>
								<span>{cat.title}</span><span className="pricelist-category-count">{items.filter((i) => i.category === cat.key).length}</span>
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
									return (
										<tr key={item.id} className="pricelist-table-row" style={{ opacity: item.isActive ? 1 : 0.55 }}>
											<td><span className="pricelist-item-code-badge">{item.code}</span></td>
											<td>
												<div className="pricelist-item-title flex items-center gap-1.5">
													{item.isBundle && <Package size={14} className="text-[var(--teal)] shrink-0" />}
													<span>{item.title}</span>
												</div>
											</td>
											<td><span className="text-xs text-[var(--muted)]">{CANONICAL_CLINICAL_CATEGORIES.find((c) => c.key === item.category)?.shortTitle || item.category}</span></td>
											<td style={{ textAlign: "right" }} className="text-xs text-[var(--muted)]">{item.durationMin} мин</td>
											<td style={{ textAlign: "right" }}>
												{isEditingPrice ? (
													<input
														type="text" autoFocus className="pricelist-price-input"
														value={inlinePriceInput} onChange={(e) => setInlinePriceInput(e.target.value)}
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
															setInlinePriceInput(String(Math.floor(item.priceKopecks / 100)));
														}}
														title="Нажмите для мгновенного изменения цены"
													>
														<span>{formatKopecksToRubles(item.priceKopecks)}</span>
														<Edit2 size={12} className="text-[var(--muted)]" />
													</div>
												)}
											</td>
											<td style={{ textAlign: "right" }}>
												<span className="text-xs font-semibold" style={{ color: margin >= 70 ? "var(--teal)" : "inherit" }}>{margin}%</span>
											</td>
											<td style={{ textAlign: "center" }}>
												<div className="flex items-center justify-center gap-1">
													<button type="button" className="pricelist-btn pricelist-btn-icon" style={{ width: "32px", height: "32px" }} onClick={() => handleOpenEdit(item)} title="Редактировать">
														<Edit2 size={14} />
													</button>
													<button type="button" className="pricelist-btn pricelist-btn-icon" style={{ width: "32px", height: "32px", color: item.isActive ? "var(--teal)" : "var(--muted)" }} onClick={() => handleToggleActive(item.id)} title={item.isActive ? "Выключить" : "Включить"}>
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
							{filteredItems.map((item) => (
								<div key={item.id} className="pricelist-mobile-card" style={{ opacity: item.isActive ? 1 : 0.6 }}>
									<div className="flex items-start justify-between gap-2">
										<div>
											<div className="flex items-center gap-1 mb-1">
												<span className="pricelist-item-code-badge">{item.code}</span>
												{item.isBundle && <span className="text-[11px] font-semibold text-[var(--teal)]">Комплекс</span>}
											</div>
											<h4 className="font-semibold text-sm text-[var(--ink)]">{item.title}</h4>
										</div>
										<button type="button" className="pricelist-price-cell text-base font-bold text-[var(--teal)]" onClick={() => handleOpenEdit(item)}>
											{formatKopecksToRubles(item.priceKopecks)}
										</button>
									</div>
									<div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs text-[var(--muted)]">
										<span>{CANONICAL_CLINICAL_CATEGORIES.find((c) => c.key === item.category)?.shortTitle} · {item.durationMin} мин</span>
										<button type="button" className="pricelist-btn text-xs py-1 px-2.5 h-auto" onClick={() => handleOpenEdit(item)}>
											Изменить
										</button>
									</div>
								</div>
							))}
						</div>
					</main>
				</div>

				{/* Плавающая нижняя панель на мобильном (Thumb Zone) */}
				<div className="pricelist-floating-bottom-bar sm:hidden">
					<div className="pricelist-toolbar-stats text-xs text-[var(--muted)]">{filteredItems.length} позиций</div>
					<button type="button" className="pricelist-btn pricelist-btn-primary" style={{ flex: 1, maxWidth: "220px", height: "46px" }} onClick={handleOpenCreate}>
						<Plus size={18} /><span>+ Добавить услугу</span>
					</button>
				</div>

				{toastText && (
					<div style={{ position: "absolute", bottom: "1rem", left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#f8fafc", padding: "0.5rem 1rem", borderRadius: "9999px", fontSize: "0.8125rem", fontWeight: 500, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)", zIndex: 100 }}>
						✓ {toastText}
					</div>
				)}
			</div>

			<PricelistItemDrawer
				isOpen={isDrawerOpen} editingItem={editingItem}
				formCode={formCode} formTitle={formTitle} formCategory={formCategory}
				formPriceRub={formPriceRub} formCostRub={formCostRub} formDuration={formDuration}
				onCodeChange={setFormCode} onTitleChange={setFormTitle} onCategoryChange={setFormCategory}
				onPriceChange={setFormPriceRub} onCostChange={setFormCostRub} onDurationChange={setFormDuration}
				onClose={() => setIsDrawerOpen(false)} onSubmit={handleSaveForm}
			/>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export const PricelistStudioModal = ServicePriceListStudioModal;
export default ServicePriceListStudioModal;
