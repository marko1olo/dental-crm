import { useEffect, useState } from "react";
import type {
	PricelistSortDirection,
	PricelistSortField,
} from "./servicePricelistEngine";
import {
	CANONICAL_SERVICE_PRESETS,
	type DoctorSpecialty,
	type PriceTierKind,
	type ServiceCategory,
	type ServicePricelistItem,
} from "./servicePricelistPresets";
import { usePricelistFilterAndSlice } from "./usePricelistFilterAndSlice";
import { usePricelistPriceInteractions } from "./usePricelistPriceInteractions";
import { usePricelistToast } from "./usePricelistToast";

export function useServicePricelistManager(
	initialItems: readonly ServicePricelistItem[] = CANONICAL_SERVICE_PRESETS,
	onSaveCatalog?: (items: readonly ServicePricelistItem[]) => void,
	isOpen = false,
) {
	const [items, setItems] =
		useState<readonly ServicePricelistItem[]>(initialItems);
	const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "all">("all");
	const [selectedSpecialty, setSelectedSpecialty] = useState<DoctorSpecialty | "all">("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [activeTier, setActiveTier] = useState<PriceTierKind>("standard");
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ServicePricelistItem | null>(null);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isBatchBarOpen, setIsBatchBarOpen] = useState(false);
	const [sortField, setSortField] = useState<PricelistSortField>("code");
	const [sortDirection, setSortDirection] = useState<PricelistSortDirection>("asc");
	const { toastMessage, showToast } = usePricelistToast();

	useEffect(() => {
		if (isOpen && initialItems && initialItems.length > 0)
			setItems(initialItems);
	}, [isOpen, initialItems]);

	const updateAndPersist = (next: readonly ServicePricelistItem[]) => {
		setItems(next);
		if (typeof onSaveCatalog === "function") onSaveCatalog(next);
	};

	const filterSlice = usePricelistFilterAndSlice(
		items,
		selectedCategory,
		selectedSpecialty,
		searchTerm,
		activeTier,
		sortField,
		sortDirection,
	);

	const priceActions = usePricelistPriceInteractions(
		items,
		activeTier,
		selectedItemIds,
		selectedCategory,
		selectedSpecialty,
		updateAndPersist,
		setItems,
		showToast,
	);

	const handleToggleSort = (f: PricelistSortField) => {
		if (sortField === f)
			setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
		else {
			setSortField(f);
			setSortDirection("asc");
		}
	};

	return {
		items,
		setItems,
		selectedCategory,
		setSelectedCategory,
		selectedSpecialty,
		setSelectedSpecialty,
		searchTerm,
		setSearchTerm,
		activeTier,
		setActiveTier,
		selectedItemIds,
		setSelectedItemIds,
		isEditModalOpen,
		setIsEditModalOpen,
		editingItem,
		setEditingItem,
		isImportModalOpen,
		setIsImportModalOpen,
		isBatchBarOpen,
		setIsBatchBarOpen,
		sortField,
		toastMessage,
		showToast,
		updateAndPersist,
		filterSlice,
		handleToggleSort,
		...priceActions,
	};
}
