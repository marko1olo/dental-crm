/**
 * useOwnerPriceList.ts
 *
 * Хук состояния и синхронизации прейскуранта с БД для владельца клиники.
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import { useMemo, useState } from "react";
import { formatKopecksToRublesDisplay, parseRublesToKopecks } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { useOptionalAppLogicContext } from "../../../../contexts/AppLogicContext";
import { syncPricelistItemsToCatalog } from "../../catalogSyncHelper";
import type { PriceListStats, ServiceWithMargin } from "./priceListTypes";
import { mergeAndCalculatePriceList } from "./priceListCatalogMerger";

export function useOwnerPriceList() {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic context access
	const appLogic = useOptionalAppLogicContext() as any;
	const liveCatalog = useMemo(
		() => (Array.isArray(appLogic?.dashboard?.serviceCatalog) ? appLogic.dashboard.serviceCatalog : []),
		[appLogic?.dashboard?.serviceCatalog],
	);

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [marginFilter, setMarginFilter] = useState<"all" | "high" | "low">("all");
	const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
	const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
	const [tempPriceInput, setTempPriceInput] = useState<string>("");

	const catalogItems: ServiceWithMargin[] = useMemo(
		() => mergeAndCalculatePriceList(liveCatalog, priceOverrides),
		[liveCatalog, priceOverrides],
	);

	const filteredCatalog = useMemo(() => {
		return catalogItems.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
			if (marginFilter === "high" && item.marginPct < 70) return false;
			if (marginFilter === "low" && item.marginPct >= 50) return false;
			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;
			const code = (item.statutoryCode || item.code804n || "").toLowerCase();
			const statTitle = (item.statutoryTitle || item.statutoryTitle804n || "").toLowerCase();
			return (
				code.includes(q) ||
				item.commercialTitle.toLowerCase().includes(q) ||
				statTitle.includes(q) ||
				(item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
			);
		});
	}, [catalogItems, selectedCategory, marginFilter, searchQuery]);

	const stats: PriceListStats = useMemo(() => {
		const totalServices = catalogItems.length;
		const totalValueKopecks = catalogItems.reduce((acc, i) => acc + i.effectivePriceKopecks, 0);
		const avgMarginPct = totalServices > 0
			? Math.round((catalogItems.reduce((acc, i) => acc + i.marginPct, 0) / totalServices) * 10) / 10
			: 0;
		return {
			totalServices,
			totalValueKopecks,
			avgMarginPct,
			highMarginCount: catalogItems.filter((i) => i.marginPct >= 70).length,
			lowMarginCount: catalogItems.filter((i) => i.marginPct < 50).length,
		};
	}, [catalogItems]);

	const persistServicePriceToDatabase = (serviceId: string, nextKopecks: number) => {
		const target = catalogItems.find((item) => item.id === serviceId);
		if (!target || (!appLogic?.createServiceCatalogItem && !appLogic?.updateServiceCatalogItem)) return;
		const nextRub = Math.round(nextKopecks) / 100;
		void syncPricelistItemsToCatalog({
			items: [{ ...target, basePriceRub: nextRub, basePriceKopecks: nextKopecks }],
			existingServices: liveCatalog,
			createServiceCatalogItem: appLogic.createServiceCatalogItem,
			updateServiceCatalogItem: appLogic.updateServiceCatalogItem,
		});
	};

	const handleStartEdit = (serviceId: string, currentKopecks: number) => {
		setEditingServiceId(serviceId);
		setTempPriceInput((currentKopecks / 100).toFixed(0));
	};

	const handleSavePrice = (serviceId: string) => {
		const kopecks = parseRublesToKopecks(tempPriceInput);
		if (kopecks <= 0) {
			showToast("Цена услуги должна быть больше 0 руб", "error");
			return;
		}
		setPriceOverrides((prev) => ({ ...prev, [serviceId]: kopecks }));
		setEditingServiceId(null);
		persistServicePriceToDatabase(serviceId, kopecks);
		showToast(`Цена обновлена: ${formatKopecksToRublesDisplay(kopecks)}`, "success");
	};

	const handleResetOverrides = () => {
		setPriceOverrides({});
		showToast("Цены сброшены к базовому прейскуранту услуг", "info");
	};

	const handleCopyCode = (code: string) => {
		navigator.clipboard.writeText(code);
		showToast(`Код услуги «${code}» скопирован`, "success");
	};

	return {
		searchQuery, setSearchQuery,
		selectedCategory, setSelectedCategory,
		marginFilter, setMarginFilter,
		priceOverrides, editingServiceId,
		tempPriceInput, setTempPriceInput,
		filteredCatalog, stats,
		handleStartEdit, handleSavePrice,
		handleResetOverrides, handleCopyCode,
	};
}
