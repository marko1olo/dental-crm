import { useCallback, useEffect, useState } from "react";
import {
	isPlainRecord,
	readApiErrorMessage,
	unwrapApiEnvelope,
} from "../../../lib/apiResponseHandler.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	buildCanonicalFallbackBomRules,
	buildCanonicalFallbackWarehouseItems,
	type ProcedureMaterialRuleViewItem,
} from "./materialBomTypes.js";
import { useMaterialBomsComputations } from "./useMaterialBomsComputations.js";
import { useMaterialBomsMutations } from "./useMaterialBomsMutations.js";

function isBomRuleItem(value: unknown): value is ProcedureMaterialRuleViewItem {
	return (
		isPlainRecord(value) &&
		typeof value.id === "string" &&
		typeof value.serviceId === "string" &&
		typeof value.inventoryItemId === "string"
	);
}

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
	const [loadError, setLoadError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const fetchAllRules = useCallback(async () => {
		try {
			setIsLoading(true);
			setLoadError(null);
			let loadedRules: ProcedureMaterialRuleViewItem[] = [];
			let rawItems: Record<string, unknown>[] = [];
			const isDemo = isDemoShowcaseMode();

			if (orgId) {
				const [rulesRes, itemsRes] = await Promise.all([
					fetch(`/api/inventory/${orgId}/rules`, { headers: getHeaders() }),
					fetch(`/api/inventory/${orgId}`, { headers: getHeaders() }),
				]);

				if (!rulesRes.ok) {
					const msg = await readApiErrorMessage(
						rulesRes,
						"Не удалось загрузить техкарты материалов",
					);
					throw new Error(msg);
				}
				if (!itemsRes.ok) {
					const msg = await readApiErrorMessage(
						itemsRes,
						"Не удалось загрузить остатки склада",
					);
					throw new Error(msg);
				}

				const rawRulesJson: unknown = await rulesRes.json();
				const unwrappedRules = unwrapApiEnvelope(rawRulesJson);
				if (Array.isArray(unwrappedRules)) {
					loadedRules = unwrappedRules.filter(isBomRuleItem);
				}

				const rawItemsJson: unknown = await itemsRes.json();
				const unwrappedItems = unwrapApiEnvelope(rawItemsJson);
				const itemsCandidate = Array.isArray(unwrappedItems)
					? unwrappedItems
					: isPlainRecord(unwrappedItems) && Array.isArray(unwrappedItems.items)
						? unwrappedItems.items
						: [];
				rawItems = itemsCandidate.filter(isPlainRecord);
			}

			if (loadedRules.length === 0 && isDemo) {
				loadedRules = buildCanonicalFallbackBomRules();
			}
			setRules(loadedRules);

			if (rawItems.length > 0) {
				setWarehouseItems(
					rawItems.map((r) => ({
						id: String(r.id ?? ""),
						name: String(r.name ?? ""),
						stockQuantity: Number(r.stockQuantity ?? r.currentQty ?? 0),
						criticalThreshold: Number(r.criticalThreshold ?? 0),
						unitCostRub: String(r.unitCostRub ?? "0"),
						updatedAt: String(r.updatedAt ?? ""),
						unit: String(r.unit ?? "шт."),
					})),
				);
			} else if (isDemo) {
				setWarehouseItems(buildCanonicalFallbackWarehouseItems());
			} else {
				setWarehouseItems([]);
			}
		} catch (e: unknown) {
			const msg =
				e instanceof Error ? e.message : "Ошибка загрузки техкарт материалов";
			clientLogger.warn("[useMaterialBomsData] Ошибка загрузки техкарт материалов", e, {
				module: "Inventory",
			});
			setLoadError(msg);
			if (isDemoShowcaseMode()) {
				setRules(buildCanonicalFallbackBomRules());
			} else {
				showToast(msg, "error");
			}
		} finally {
			setIsLoading(false);
		}
	}, [orgId, getHeaders]);

	useEffect(() => {
		void fetchAllRules();
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
		loadError,
		searchQuery,
		setSearchQuery,
		selectedCategory,
		setSelectedCategory,
		fetchAllRules,
		...mutations,
		...computations,
	};
}
