import { useCallback, useEffect, useState } from "react";
import { logger } from "../../../utils/logger.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	buildCanonicalFallbackBomRules,
	type ProcedureMaterialRuleViewItem,
} from "./materialBomTypes.js";
import { useMaterialBomsComputations } from "./useMaterialBomsComputations.js";
import { useMaterialBomsMutations } from "./useMaterialBomsMutations.js";

export interface UseMaterialBomsDataParams {
	readonly orgId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly dashboardServices?: readonly Record<string, unknown>[] | undefined;
}

export function useMaterialBomsData({
	orgId,
	getHeaders,
	dashboardServices,
}: UseMaterialBomsDataParams) {
	const [rules, setRules] = useState<ProcedureMaterialRuleViewItem[]>([]);
	const [warehouseItems, setWarehouseItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const fetchAllRules = useCallback(async () => {
		try {
			setIsLoading(true);
			let loadedRules: ProcedureMaterialRuleViewItem[] = [];
			let rawItems: Record<string, unknown>[] = [];

			if (orgId) {
				const [rulesRes, itemsRes] = await Promise.all([
					fetch(`/api/inventory/${orgId}/rules`, { headers: getHeaders() }).catch(() => null),
					fetch(`/api/inventory/${orgId}`, { headers: getHeaders() }).catch(() => null),
				]);

				if (rulesRes?.ok) {
					const data = await rulesRes.json();
					if (Array.isArray(data) && data.length > 0) loadedRules = data;
				}

				if (itemsRes?.ok) {
					const itemsData = await itemsRes.json();
					rawItems = Array.isArray(itemsData) ? itemsData : itemsData?.items && Array.isArray(itemsData.items) ? itemsData.items : [];
				}
			}

			if (loadedRules.length === 0) loadedRules = buildCanonicalFallbackBomRules();
			setRules(loadedRules);

			if (rawItems.length > 0) {
				setWarehouseItems(
					rawItems.map((r: Record<string, unknown>) => ({
						id: String(r.id ?? ""),
						name: String(r.name ?? ""),
						stockQuantity: Number(r.stockQuantity ?? r.currentQty ?? 0),
						criticalThreshold: Number(r.criticalThreshold ?? 0),
						unitCostRub: String(r.unitCostRub ?? "0"),
						updatedAt: String(r.updatedAt ?? ""),
						unit: String(r.unit ?? "шт."),
					})),
				);
			} else {
				const itemMap = new Map<string, InventoryItem>();
				for (const r of loadedRules) {
					if (!itemMap.has(r.inventoryItemId)) {
						itemMap.set(r.inventoryItemId, {
							id: r.inventoryItemId,
							name: r.itemName,
							stockQuantity: Number(r.stockQuantity) || 25,
							criticalThreshold: Number(r.criticalThreshold) || 5,
							unitCostRub: String(r.unitCostRub || "150"),
							updatedAt: new Date().toISOString(),
							unit: r.unit || "шт.",
						});
					}
				}
				setWarehouseItems(Array.from(itemMap.values()));
			}
		} catch (e) {
			logger.warn("Использование локального SSOT каталога техкарт", e);
			setRules(buildCanonicalFallbackBomRules());
		} finally {
			setIsLoading(false);
		}
	}, [orgId, getHeaders]);

	useEffect(() => {
		fetchAllRules();
	}, [fetchAllRules]);

	const mutations = useMaterialBomsMutations({
		orgId, getHeaders, setRules, fetchAllRules,
	});

	const computations = useMaterialBomsComputations({
		rules, searchQuery, selectedCategory, dashboardServices,
	});

	return {
		rules,
		warehouseItems,
		isLoading,
		searchQuery,
		setSearchQuery,
		selectedCategory,
		setSelectedCategory,
		fetchAllRules,
		...mutations,
		...computations,
	};
}
