/**
 * DENTE Dental CRM — Statutory Minzdrav Order 804n Service Catalog & Pricelist Manager Modal
 *
 * Provides complete statutory Russian dental catalog management:
 * - Order 804n nomenclature tree with A16.07/B01.065/A06.07 codes.
 * - Price Tier Matrix (Standard, VIP, DMS, Promo, Night/Weekend).
 * - Inline price editing and batch markups (+5%, +10%, rounding).
 * - Unit margin & lab/material cost profitability indicators.
 * - RFC 4180 CSV Import/Export with UTF-8 BOM.
 * - Official Printable A4 Clinic Pricelist (ст. 149 НК РФ, НДС 0%).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	Check,
	CheckCircle2,
	Download,
	Layers,
	Plus,
	Printer,
	ShieldCheck,
	Upload,
	X,
} from 'lucide-react';
import { sliceDomList } from '../../../utils/domVirtualizationHelper';
import { getOptimizedTiming } from '../../../utils/lowSpecHddOptimizer';
import {
	applyBatchPriceMarkup,
	formatRubles,
	generatePrintablePricelistHtml,
	rublesToKopecks,
	searchPricelistItems,
	sortPricelistItems,
	type PriceRoundingMode,
	type PricelistSortDirection,
	type PricelistSortField,
} from './servicePricelistEngine';
import {
	PRICE_TIER_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type PriceTierKind,
	type ServicePricelistItem,
} from './servicePricelistPresets';
import { PricelistCategorySidebar } from './PricelistCategorySidebar';
import { PricelistServiceFormModal } from './PricelistServiceFormModal';
import {
	PricelistImportExportModal,
	downloadPricelistCsv,
} from './PricelistImportExportModal';
import { PricelistFiltersAndBatchBar } from './PricelistFiltersAndBatchBar';
import { PricelistDataTable } from './PricelistDataTable';

export interface ServicePricelistManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialItems?: readonly ServicePricelistItem[];
	readonly onSaveCatalog?: (items: readonly ServicePricelistItem[]) => void;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicLicense?: string;
	readonly chiefDoctorName?: string;
	readonly adminSecret?: string;
}

export const ServicePricelistManagerModal: React.FC<ServicePricelistManagerModalProps> = ({
	isOpen,
	onClose,
	initialItems = STATUTORY_ORDER_804N_PRESETS,
	onSaveCatalog,
	clinicName = 'Стоматологическая клиника «DENTE»',
	clinicAddress = 'г. Москва, ул. Медицинская, д. 12',
	clinicPhone = '',
	clinicLicense = 'ЛО-77-01-012345 от 12.04.2021',
	chiefDoctorName = 'Петров А. В.',
	adminSecret,
}) => {
	const [items, setItems] = useState<readonly ServicePricelistItem[]>(initialItems);
	const [selectedCategory, setSelectedCategory] = useState<Order804nCategory | 'all'>('all');
	const [selectedSpecialty, setSelectedSpecialty] = useState<DoctorSpecialty | 'all'>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

	// Адаптивный дебаунс поиска номенклатуры под медленные CPU и HDD (Mandate 8c, 8n)
	useEffect(() => {
		if (!searchTerm) {
			setDebouncedSearchTerm('');
			return;
		}
		const timing = getOptimizedTiming();
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, timing.searchDebounceMs);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	const [activeTier, setActiveTier] = useState<PriceTierKind>('standard');
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

	// Синхронизация с внешним источником истины каталога клиники (Мандат 8s)
	useEffect(() => {
		if (isOpen && initialItems && initialItems.length > 0) {
			setItems(initialItems);
		}
	}, [isOpen, initialItems]);

	// Subcomponent Modals State
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ServicePricelistItem | null>(null);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isBatchBarOpen, setIsBatchBarOpen] = useState(false);

	// Sorting State
	const [sortField, setSortField] = useState<PricelistSortField>('code');
	const [sortDirection, setSortDirection] = useState<PricelistSortDirection>('asc');

	// Inline Price Quick Edit State
	const [editingPriceCellId, setEditingPriceCellId] = useState<string | null>(null);
	const [editingPriceBuffer, setEditingPriceBuffer] = useState<string>('');

	// Batch Markup State
	const [batchRounding] = useState<PriceRoundingMode>('round_100');

	// Notification Toast
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		};
	}, []);

	const showToast = (msg: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		setToastMessage(msg);
		toastTimerRef.current = setTimeout(() => {
			toastTimerRef.current = null;
			setToastMessage(null);
		}, 3000);
	};

	const openAddModal = () => {
		setEditingItem(null);
		setIsEditModalOpen(true);
	};

	const openEditModal = (item: ServicePricelistItem) => {
		setEditingItem(item);
		setIsEditModalOpen(true);
	};

	const handleSaveItem = (savedItem: ServicePricelistItem) => {
		if (editingItem) {
			setItems((prev) =>
				prev.map((it) => (it.id === savedItem.id ? savedItem : it)),
			);
			showToast(`Услуга «${savedItem.commercialTitle}» обновлена`);
		} else {
			setItems((prev) => [savedItem, ...prev]);
			showToast(`Услуга «${savedItem.commercialTitle}» добавлена в прейскурант`);
		}
		setIsEditModalOpen(false);
	};

	const handleDuplicateItem = (item: ServicePricelistItem) => {
		const dup: ServicePricelistItem = {
			...item,
			id: `srv-dup-${Date.now()}`,
			commercialTitle: `${item.commercialTitle} (копия)`,
		};
		setItems((prev) => [dup, ...prev]);
		showToast(`Создан дубликат: ${dup.commercialTitle}`);
	};

	const handleSetZeroWarrantyPrice = (itemId: string) => {
		setItems((prev) =>
			prev.map((it) => {
				if (it.id !== itemId) return it;
				return {
					...it,
					basePriceRub: 0,
					basePriceKopecks: 0,
					tierPrices: { ...(it.tierPrices || {}), [activeTier]: 0 },
				};
			}),
		);
		showToast('Установлена гарантийная цена (0 ₽)');
	};

	const handleDeleteItem = (itemId: string) => {
		setItems((prev) => prev.filter((it) => it.id !== itemId));
		showToast('Услуга удалена из прейскуранта');
	};

	// Filtered & Sorted Catalog (Mandate 8c)
	const filteredItems = useMemo(() => {
		const searchResults = searchPricelistItems(items, {
			searchTerm: debouncedSearchTerm,
			category: selectedCategory,
			specialty: selectedSpecialty,
			includeArchived: false,
		});
		return sortPricelistItems(searchResults, sortField, sortDirection, activeTier);
	}, [items, debouncedSearchTerm, selectedCategory, selectedSpecialty, sortField, sortDirection, activeTier]);

	const handleToggleSort = (field: PricelistSortField) => {
		if (sortField === field) {
			setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	// Inline Price Change Handler
	const handleInlinePriceChange = (itemId: string, newPriceRub: number) => {
		if (Number.isNaN(newPriceRub) || newPriceRub < 0) return;
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== itemId) return item;
				if (activeTier === 'standard') {
					return {
						...item,
						basePriceRub: newPriceRub,
						basePriceKopecks: rublesToKopecks(newPriceRub),
					};
				}
				return {
					...item,
					tierPrices: {
						...(item.tierPrices || {}),
						[activeTier]: newPriceRub,
					},
				};
			}),
		);
	};

	// Commit inline text input on blur or Enter
	const handleCommitInlinePrice = (itemId: string, rawInput: string) => {
		const cleanDigits = rawInput.replace(/\s+/g, '').replace(/[^\d]/g, '');
		const parsed = parseInt(cleanDigits, 10);
		if (!Number.isNaN(parsed) && parsed >= 0) {
			handleInlinePriceChange(itemId, parsed);
			showToast(`Цена обновлена: ${formatRubles(parsed)}`);
		}
		setEditingPriceCellId(null);
	};

	// DOM Virtualization & Chunking (Mandate 8c, 8n - Wave 252 Low-Spec Protection)
	const [displayLimit, setDisplayLimit] = useState(40);

	// Сброс лимита видимости при смене фильтров, сортировки и поиска
	useEffect(() => {
		setDisplayLimit(40);
	}, [debouncedSearchTerm, selectedCategory, selectedSpecialty, activeTier, sortField, sortDirection]);

	// Виртуализация списка услуг порциями по 40 элементов (снижение DOM узлов с 7500+ до ~300)
	const pricelistSlice = useMemo(() => {
		return sliceDomList(filteredItems, displayLimit, 0);
	}, [filteredItems, displayLimit]);

	// Category Item Counts
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: items.length };
		for (const item of items) {
			counts[item.category] = (counts[item.category] || 0) + 1;
		}
		return counts;
	}, [items]);

	if (!isOpen) return null;

	// Групповая индексация цен
	const handleApplyBatchMarkup = (percent: number, rounding: PriceRoundingMode) => {
		const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
		const updated = applyBatchPriceMarkup(items, {
			percentChange: percent,
			roundMode: rounding,
			categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
			specialtyFilter: selectedSpecialty === 'all' ? undefined : selectedSpecialty,
			targetItemIds: targetIds,
			applyToTiers: [activeTier],
		});
		setItems(updated);
		showToast(`Успешно применена наценка ${percent > 0 ? `+${percent}%` : `${percent}%`} (${PRICE_TIER_LABELS[activeTier]})`);
	};

	// Групповое округление цен
	const handleApplyBatchRounding = (rounding: PriceRoundingMode) => {
		const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
		const updated = applyBatchPriceMarkup(items, {
			percentChange: 0,
			roundMode: rounding,
			categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
			targetItemIds: targetIds,
			applyToTiers: [activeTier],
		});
		setItems(updated);
		showToast(`Цены успешно округлены (${rounding})`);
	};

	// Экспорт прейскуранта в CSV
	const handleExportCsv = () => {
		downloadPricelistCsv(items);
		showToast('Прейскурант успешно экспортирован в CSV (Excel UTF-8 BOM)');
	};

	// Печать прейскуранта А4
	const handlePrintPricelist = () => {
		const printHtml = generatePrintablePricelistHtml(
			{
				clinicName,
				clinicAddress,
				clinicPhone,
				clinicLicense,
				chiefDoctorName,
				effectiveDateRu: new Date().toLocaleDateString('ru-RU'),
			},
			items,
			activeTier,
		);

		const printWindow = window.open('', '_blank', 'width=900,height=1000');
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// Печать официального стенда («Уголок потребителя», Закон РФ № 2300-1, ст. 149 НК РФ)
	const handlePrintConsumerStand = () => {
		const printHtml = generatePrintablePricelistHtml(
			{
				clinicName,
				clinicAddress,
				clinicPhone,
				clinicLicense,
				chiefDoctorName,
				effectiveDateRu: new Date().toLocaleDateString('ru-RU'),
				isConsumerCornerStand: true,
			},
			items,
			'standard',
		);

		const printWindow = window.open('', '_blank', 'width=900,height=1000');
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// Save & Apply
	const handleSaveAndClose = () => {
		if (onSaveCatalog) {
			onSaveCatalog(items);
		}
		showToast('Каталог услуг и прейскурант успешно сохранены');
		onClose();
	};

	const modalContent = (
		<div className="pricelist-modal-overlay" role="dialog" aria-modal="true">
			<div className="pricelist-modal-container service-pricelist-modal">
				{/* Header */}
				<header className="pricelist-modal-header">
					<div className="pricelist-header-left">
						<div className="pricelist-header-icon">
							<Layers size={24} />
						</div>
						<div>
							<div className="pricelist-header-title" title="Прейскурант и Каталог медицинских услуг">
								Прейскурант услуг
							</div>
							<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								{items.length} позиций · Классификатор Минздрава РФ · НДС 0%
							</div>
						</div>
						<div className="pricelist-statutory-badge" title="Официальный каталог медицинских услуг">
							<ShieldCheck size={14} />
							<span>Каталог</span>
						</div>
					</div>

					<div className="pricelist-header-actions">
						<button
							type="button"
							className="pricelist-btn pricelist-btn-primary"
							onClick={openAddModal}
							title="Добавить новую услугу в прейскурант"
							style={{ minHeight: '32px', height: '32px', gap: '5px' }}
						>
							<Plus size={16} />
							<span>Добавить услугу</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={handlePrintPricelist}
							title="Печать официального прейскуранта клиники (A4)"
						>
							<Printer size={16} />
							<span>Печать A4</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={handlePrintConsumerStand}
							title="Печать официального прейскуранта для информационного стенда «Уголок потребителя» (Без НДС - медицинские услуги)"
						>
							<ShieldCheck size={16} />
							<span>Уголок потребителя</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={handleExportCsv}
							title="Экспорт в CSV (Excel UTF-8 BOM)"
						>
							<Download size={16} />
							<span>Экспорт CSV</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={() => setIsImportModalOpen(true)}
							title="Импорт прейскуранта из CSV / Excel / Текста"
						>
							<Upload size={16} />
							<span>Импорт</span>
						</button>

						<button
							type="button"
							className="pricelist-btn pricelist-btn-ok"
							onClick={handleSaveAndClose}
						>
							<Check size={16} />
							<span>Сохранить</span>
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

				{/* 1-Row Clinical Toolbar & Collapsible Batch Markup */}
				<PricelistFiltersAndBatchBar
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					selectedCategory={selectedCategory}
					onCategoryChange={setSelectedCategory}
					selectedSpecialty={selectedSpecialty}
					onSpecialtyChange={setSelectedSpecialty}
					activeTier={activeTier}
					onTierChange={setActiveTier}
					isBatchBarOpen={isBatchBarOpen}
					onToggleBatchBar={() => setIsBatchBarOpen((prev) => !prev)}
					batchRounding={batchRounding}
					onApplyBatchMarkup={handleApplyBatchMarkup}
					onApplyBatchRounding={handleApplyBatchRounding}
				/>

				{/* Toast Message */}
				{toastMessage && (
					<div
						style={{
							position: 'absolute',
							top: '5rem',
							right: '2rem',
							zIndex: 10001,
							background: 'var(--ink, #0f172a)',
							color: 'var(--paper, #ffffff)',
							padding: '0.625rem 1.25rem',
							borderRadius: '8px',
							boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							fontSize: '0.875rem',
						}}
					>
						<CheckCircle2 size={16} style={{ color: 'var(--ok-fg, #10b981)' }} />
						<span>{toastMessage}</span>
					</div>
				)}

				{/* Main Split Layout */}
				<div className="pricelist-main-layout">
					{/* Category Sidebar */}
					<PricelistCategorySidebar
						selectedCategory={selectedCategory}
						onSelectCategory={setSelectedCategory}
						categoryCounts={categoryCounts}
					/>

					{/* Data Table */}
					<PricelistDataTable
						filteredCount={filteredItems.length}
						visibleItems={pricelistSlice.visibleItems}
						hasMore={pricelistSlice.hasMore}
						remainingCount={pricelistSlice.remainingCount}
						onShowMore={() => setDisplayLimit((prev) => prev + 40)}
						selectedItemIds={selectedItemIds}
						onToggleSelectAll={(checked) => {
							if (checked) {
								setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
							} else {
								setSelectedItemIds(new Set());
							}
						}}
						onToggleSelectItem={(id, checked) => {
							const next = new Set(selectedItemIds);
							if (checked) next.add(id);
							else next.delete(id);
							setSelectedItemIds(next);
						}}
						sortField={sortField}
						onToggleSort={handleToggleSort}
						activeTier={activeTier}
						editingPriceCellId={editingPriceCellId}
						editingPriceBuffer={editingPriceBuffer}
						onStartEditPrice={(id, currentPrice) => {
							setEditingPriceCellId(id);
							setEditingPriceBuffer(String(currentPrice));
						}}
						onPriceBufferChange={(val) => setEditingPriceBuffer(val)}
						onCommitPrice={handleCommitInlinePrice}
						onCancelEditPrice={() => setEditingPriceCellId(null)}
						onSetZeroWarrantyPrice={handleSetZeroWarrantyPrice}
						onEditItem={openEditModal}
						onDuplicateItem={handleDuplicateItem}
						onDeleteItem={handleDeleteItem}
					/>
				</div>

				{/* Footer Bar */}
				<footer className="pricelist-footer-bar">
					<div className="pricelist-footer-legal">
						<ShieldCheck size={16} className="pricelist-legal-icon" />
						<span>{STATUTORY_VAT_EXEMPTION_NOTE} · Официальный справочник услуг</span>
					</div>

					<div>
						Отображено {pricelistSlice.visibleItems.length} из {filteredItems.length} позиций
						{filteredItems.length !== items.length && ` (всего в каталоге: ${items.length})`}
						{selectedItemIds.size > 0 && ` · Выбрано ${selectedItemIds.size}`}
					</div>
				</footer>
			</div>

			{/* Subcomponent: Multi-Format Import Modal (Smart Text, CSV with 804n Mapping Diff View) */}
			<PricelistImportExportModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				items={items}
				onApplyImported={(mergedItems, message) => {
					setItems(mergedItems);
					showToast(message);
				}}
				adminSecret={adminSecret}
			/>

			{/* Subcomponent: Add / Edit Service Modal */}
			<PricelistServiceFormModal
				isOpen={isEditModalOpen}
				editingItem={editingItem}
				onClose={() => setIsEditModalOpen(false)}
				onSave={handleSaveItem}
			/>
		</div>
	);

	return typeof document !== 'undefined'
		? createPortal(modalContent, document.body)
		: modalContent;
};
