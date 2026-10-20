import { useEffect, useRef, useState } from 'react';
import { formatRubles, type PricelistSortDirection, type PricelistSortField, type PriceRoundingMode } from './servicePricelistEngine';
import {
	batchPriceMarkup, commitInlinePrice, setZeroWarrantyPrice,
} from './pricelistManagerPriceActions';
import {
	type DoctorSpecialty, type Order804nCategory, PRICE_TIER_LABELS,
	type PriceTierKind, type ServicePricelistItem, STATUTORY_ORDER_804N_PRESETS,
} from './servicePricelistPresets';
import { usePricelistFilterAndSlice } from './usePricelistFilterAndSlice';

export function useServicePricelistManager(
	initialItems: readonly ServicePricelistItem[] = STATUTORY_ORDER_804N_PRESETS,
	onSaveCatalog?: (items: readonly ServicePricelistItem[]) => void,
	isOpen = false,
) {
	const [items, setItems] = useState<readonly ServicePricelistItem[]>(initialItems);
	const [selectedCategory, setSelectedCategory] = useState<Order804nCategory | 'all'>('all');
	const [selectedSpecialty, setSelectedSpecialty] = useState<DoctorSpecialty | 'all'>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [activeTier, setActiveTier] = useState<PriceTierKind>('standard');
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ServicePricelistItem | null>(null);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isBatchBarOpen, setIsBatchBarOpen] = useState(false);
	const [sortField, setSortField] = useState<PricelistSortField>('code');
	const [sortDirection, setSortDirection] = useState<PricelistSortDirection>('asc');
	const [editingPriceCellId, setEditingPriceCellId] = useState<string | null>(null);
	const [editingPriceBuffer, setEditingPriceBuffer] = useState<string>('');
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (isOpen && initialItems && initialItems.length > 0) setItems(initialItems);
	}, [isOpen, initialItems]);

	const showToast = (msg: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		setToastMessage(msg);
		toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
	};

	const updateAndPersist = (next: readonly ServicePricelistItem[]) => {
		setItems(next);
		if (typeof onSaveCatalog === 'function') onSaveCatalog(next);
	};

	const filterSlice = usePricelistFilterAndSlice(
		items, selectedCategory, selectedSpecialty, searchTerm, activeTier, sortField, sortDirection,
	);

	const handleCommitInlinePrice = (itemId: string, raw: string) => {
		const res = commitInlinePrice(items, itemId, raw, activeTier);
		if (res) {
			updateAndPersist(res.updatedItems);
			showToast(`Цена обновлена: ${formatRubles(res.parsed)}`);
		}
		setEditingPriceCellId(null);
	};

	const handleSetZeroWarrantyPrice = (itemId: string) => {
		updateAndPersist(setZeroWarrantyPrice(items, itemId));
		showToast('Установлена гарантийная цена (0 ₽)');
	};

	const handleApplyBatchMarkup = (percent: number, rounding: PriceRoundingMode) => {
		const updated = batchPriceMarkup(items, percent, rounding, selectedItemIds, selectedCategory, selectedSpecialty, activeTier);
		setItems(updated);
		showToast(`Применена наценка ${percent > 0 ? `+${percent}%` : `${percent}%`} (${PRICE_TIER_LABELS[activeTier]})`);
	};

	const handleToggleSort = (f: PricelistSortField) => {
		if (sortField === f) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
		else { setSortField(f); setSortDirection('asc'); }
	};

	return {
		items, setItems, selectedCategory, setSelectedCategory, selectedSpecialty, setSelectedSpecialty,
		searchTerm, setSearchTerm, activeTier, setActiveTier, selectedItemIds, setSelectedItemIds,
		isEditModalOpen, setIsEditModalOpen, editingItem, setEditingItem, isImportModalOpen, setIsImportModalOpen,
		isBatchBarOpen, setIsBatchBarOpen, sortField, editingPriceCellId, setEditingPriceCellId,
		editingPriceBuffer, setEditingPriceBuffer, toastMessage, showToast, updateAndPersist, filterSlice,
		handleCommitInlinePrice, handleSetZeroWarrantyPrice, handleApplyBatchMarkup, handleToggleSort,
	};
}
