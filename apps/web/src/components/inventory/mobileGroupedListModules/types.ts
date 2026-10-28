import { Layers, Package, ShieldCheck, Sparkles, Syringe, Target } from "lucide-react";
import type React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export type MobileInventoryCategoryType =
	| "all"
	| "anesthesia"
	| "filling"
	| "endo"
	| "impression"
	| "ppe";

export interface MobileInventoryCategory {
	readonly id: MobileInventoryCategoryType;
	readonly label: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const MOBILE_INVENTORY_CATEGORIES: readonly MobileInventoryCategory[] = [
	{ id: "all", label: "Все", icon: Package },
	{ id: "anesthesia", label: "Анестезия", icon: Syringe },
	{ id: "filling", label: "Пломбировочные", icon: Sparkles },
	{ id: "endo", label: "Эндодонтия", icon: Target },
	{ id: "impression", label: "Слепочные", icon: Layers },
	{ id: "ppe", label: "СИЗ", icon: ShieldCheck },
];

export function matchesCategory(item: InventoryItem, category: MobileInventoryCategoryType): boolean {
	if (category === "all") return true;
	const name = (item.name || "").toLowerCase();
	const cat = (item.category || "").toLowerCase();

	if (category === "anesthesia") {
		return cat.includes("анестез") || name.includes("анестез") || name.includes("карпул") ||
			name.includes("артикаин") || name.includes("ультракаин") || name.includes("септанест") ||
			name.includes("скандонест") || name.includes("убистезин") || name.includes("лидокаин") || name.includes("мепивакаин");
	}
	if (category === "filling") {
		return cat.includes("пломб") || cat.includes("композит") || cat.includes("терапи") || cat.includes("адгезив") ||
			name.includes("композит") || name.includes("пломб") || name.includes("бонд") || name.includes("адгезив") ||
			name.includes("filtek") || name.includes("gradia") || name.includes("estelite") || name.includes("харизма") ||
			name.includes("спектрум") || name.includes("трави") || name.includes("паста");
	}
	if (category === "endo") {
		return cat.includes("эндо") || name.includes("эндо") || name.includes("гуттаперч") || name.includes("файл") ||
			name.includes("силлер") || name.includes("девавит") || name.includes("бумажн") || name.includes("protaper") || name.includes("эндометазон");
	}
	if (category === "impression") {
		return cat.includes("слепоч") || cat.includes("оттиск") || name.includes("слепоч") || name.includes("оттиск") ||
			name.includes("альгинат") || name.includes("силикон") || name.includes("speedex") || name.includes("спидекс") ||
			name.includes("zeta") || name.includes("а-силикон") || name.includes("с-силикон");
	}
	if (category === "ppe") {
		return cat.includes("сиз") || cat.includes("расход") || name.includes("сиз") || name.includes("перчатк") ||
			name.includes("маск") || name.includes("нагрудник") || name.includes("шапочк") || name.includes("бахил") ||
			name.includes("дезинфек") || name.includes("слюноотсос") || name.includes("валик") || name.includes("простын");
	}
	return true;
}

export function getItemCategoryType(item: InventoryItem): MobileInventoryCategoryType {
	if (matchesCategory(item, "anesthesia")) return "anesthesia";
	if (matchesCategory(item, "filling")) return "filling";
	if (matchesCategory(item, "endo")) return "endo";
	if (matchesCategory(item, "impression")) return "impression";
	if (matchesCategory(item, "ppe")) return "ppe";
	return "all";
}

export interface MobileInventoryGroupedListProps {
	readonly items: readonly InventoryItem[];
	readonly organizationId: string;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly onClearSearch: () => void;
	readonly selectedCategory: MobileInventoryCategoryType;
	readonly onSelectCategory: (category: MobileInventoryCategoryType) => void;
	readonly onQuickDeduct?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, quantity?: number, lotNumber?: string, expDate?: string) => void | Promise<void>) | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
	readonly onOpenInboundInvoice?: (() => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenShiftDeduction?: (() => void) | undefined;
	readonly onQuickWriteoffCarpules?: (() => void | Promise<any>) | undefined;
	readonly isWritingOffCarpules?: boolean | undefined;
	readonly onRefresh?: (() => void) | undefined;
	readonly onOpenMdlpScanning?: (() => void) | undefined;
	readonly money?: ((amountRub: any) => string) | undefined;
	readonly getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
}
