import {
	Activity, Layers, Package, ShieldCheck, Sparkles, Syringe, Target,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { sliceDomList } from "../../../utils/domVirtualizationHelper.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export type InventoryCategoryFilter =
	| "all" | "anesthesia" | "therapy" | "composite" | "disposables" | "surgery" | "endo";

export const INVENTORY_CATEGORIES = [
	{ id: "all" as const, label: "Все", icon: Package },
	{ id: "anesthesia" as const, label: "Анестезия", icon: Syringe },
	{ id: "therapy" as const, label: "Терапия", icon: Sparkles },
	{ id: "composite" as const, label: "Композиты", icon: Layers },
	{ id: "disposables" as const, label: "Расходники", icon: ShieldCheck },
	{ id: "surgery" as const, label: "Хирургия", icon: Activity },
	{ id: "endo" as const, label: "Эндодонтия", icon: Target },
];

export function useInventoryViewCategories(filteredItems: readonly InventoryItem[] | undefined, searchQuery: string, activeSubTab: string) {
	const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryFilter>("all");
	const [displayLimit, setDisplayLimit] = useState(40);

	useEffect(() => { setDisplayLimit(40); }, [searchQuery, activeSubTab, selectedCategory]);

	const categoryFilteredItems = useMemo(() => {
		const list = filteredItems ?? [];
		if (selectedCategory === "all") return list;
		return list.filter((item) => {
			const n = (item.name || "").toLowerCase();
			const c = (item.category || "").toLowerCase();
			if (selectedCategory === "anesthesia") return c.includes("анестез") || n.includes("анестез") || n.includes("карпул") || n.includes("артикаин") || n.includes("ультракаин") || n.includes("септанест") || n.includes("лидокаин");
			if (selectedCategory === "therapy") return c.includes("терапи") || n.includes("пломб") || n.includes("бонд") || n.includes("адгезив") || n.includes("трави");
			if (selectedCategory === "composite") return c.includes("композит") || n.includes("композит") || n.includes("filtek") || n.includes("gradia") || n.includes("estelite");
			if (selectedCategory === "disposables") return c.includes("расход") || n.includes("расход") || n.includes("перчатк") || n.includes("маск") || n.includes("слюноотсос") || n.includes("валик");
			if (selectedCategory === "surgery") return c.includes("хирург") || n.includes("хирург") || n.includes("имплант") || n.includes("мембран") || n.includes("шовн") || n.includes("кост");
			if (selectedCategory === "endo") return c.includes("эндо") || n.includes("эндо") || n.includes("гуттаперч") || n.includes("файл") || n.includes("силлер");
			return true;
		});
	}, [filteredItems, selectedCategory]);

	const inventorySlice = useMemo(() => sliceDomList(categoryFilteredItems ?? [], displayLimit, 0), [categoryFilteredItems, displayLimit]);

	return {
		selectedCategory, setSelectedCategory, displayLimit, setDisplayLimit,
		categoryFilteredItems, inventorySlice,
	};
}
