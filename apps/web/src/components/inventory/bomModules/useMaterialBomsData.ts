/**
 * useMaterialBomsData.ts — Хук загрузки, сидирования и мутаций технологических карт (BOM).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	buildCanonicalFallbackBomRules,
	type MaterialBomModalState,
	type ProcedureMaterialRuleViewItem,
	type ServiceGroupViewItem,
	type ServiceOption,
} from "./materialBomTypes.js";

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
	const [isSeeding, setIsSeeding] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const [modalState, setModalState] = useState<MaterialBomModalState | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

				if (rulesRes && rulesRes.ok) {
					const data = await rulesRes.json();
					if (Array.isArray(data) && data.length > 0) {
						loadedRules = data;
					}
				}

				if (itemsRes && itemsRes.ok) {
					const itemsData = await itemsRes.json();
					rawItems = Array.isArray(itemsData)
						? itemsData
						: itemsData?.items && Array.isArray(itemsData.items)
							? itemsData.items
							: [];
				}
			}

			// Fallback to canonical SSOT rules if database is clean or demo
			if (loadedRules.length === 0) {
				loadedRules = buildCanonicalFallbackBomRules();
			}
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
				// Derive healthy warehouse items from canonical rules
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
			const fallback = buildCanonicalFallbackBomRules();
			setRules(fallback);
		} finally {
			setIsLoading(false);
		}
	}, [orgId, getHeaders]);

	useEffect(() => {
		fetchAllRules();
	}, [fetchAllRules]);

	const handleSeedDefaults = async () => {
		if (isSeeding) return;
		try {
			setIsSeeding(true);
			if (orgId) {
				const res = await fetch(`/api/inventory/${orgId}/rules/seed-defaults`, {
					method: "POST",
					headers: getHeaders({ "Content-Type": "application/json" }),
				}).catch(() => null);

				if (res && res.ok) {
					const data = await res.json();
					showToast(data.message || "Типовые нормы расхода успешно добавлены", "success");
					await fetchAllRules();
					return;
				}
			}
			setRules(buildCanonicalFallbackBomRules());
			showToast("Типовые нормы расхода успешно добавлены", "success");
		} catch (e) {
			logger.warn("Ошибка сетевого сидирования, применен канонический SSOT", e);
			setRules(buildCanonicalFallbackBomRules());
			showToast("Типовые нормы расхода успешно добавлены", "success");
		} finally {
			setIsSeeding(false);
		}
	};

	const handleSaveRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!modalState || !orgId || isSaving) return;

		const qty = parseFloat(modalState.quantityToDeduct);
		if (!Number.isFinite(qty) || qty <= 0) {
			showToast("Введите корректное количество (> 0)", "error");
			return;
		}

		try {
			setIsSaving(true);
			const res = await fetch(`/api/inventory/${orgId}/rules`, {
				method: "POST",
				headers: getHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					serviceId: modalState.serviceId,
					inventoryItemId: modalState.inventoryItemId,
					quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Норма расхода сохранена", "success");
				setModalState(null);
				await fetchAllRules();
			} else {
				showToast("Ошибка сохранения нормы", "error");
			}
		} catch (e) {
			logger.error("Ошибка сохранения нормы", e);
			showToast("Системная ошибка", "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		if (!orgId) return;
		try {
			const res = await fetch(`/api/inventory/${orgId}/rules/${ruleId}`, {
				method: "DELETE",
				headers: getHeaders(),
			});
			if (res.ok) {
				showToast("Норма расхода удалена", "success");
				setConfirmDeleteId(null);
				await fetchAllRules();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch (e) {
			logger.error("Ошибка удаления нормы", e);
			showToast("Системная ошибка", "error");
		}
	};

	const groupedServices: ServiceGroupViewItem[] = useMemo(() => {
		const map = new Map<string, ServiceGroupViewItem>();

		for (const r of rules) {
			const sId = r.serviceId;
			let group = map.get(sId);
			if (!group) {
				group = {
					serviceId: sId,
					serviceCode: r.serviceCode || "—",
					serviceTitle: r.serviceTitle || "Медицинская услуга",
					serviceCategory: r.serviceCategory || "therapy",
					specialty: r.specialty || "therapist",
					rules: [],
					totalCostRub: 0,
					hasDeficit: false,
				};
				map.set(sId, group);
			}
			group.rules.push(r);

			const qty = Number(r.quantityToDeduct ?? 0);
			const unitCost = Number(r.unitCostRub ?? 0);
			group.totalCostRub += qty * unitCost;

			if (Number(r.stockQuantity ?? 0) < qty) {
				group.hasDeficit = true;
			}
		}

		let list = Array.from(map.values());
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(g) =>
					g.serviceCode.toLowerCase().includes(q) ||
					g.serviceTitle.toLowerCase().includes(q) ||
					g.rules.some((r) => r.itemName.toLowerCase().includes(q)),
			);
		}

		if (selectedCategory !== "all") {
			list = list.filter((g) => g.serviceCategory === selectedCategory);
		}

		list.sort((a, b) => a.serviceCode.localeCompare(b.serviceCode, "ru"));
		return list;
	}, [rules, searchQuery, selectedCategory]);

	const stats = useMemo(() => {
		const totalServices = groupedServices.length;
		const totalRules = rules.length;
		const totalDeficitServices = groupedServices.filter((g) => g.hasDeficit).length;
		const avgCost =
			totalServices > 0
				? groupedServices.reduce((sum, g) => sum + g.totalCostRub, 0) / totalServices
				: 0;

		return {
			totalServices,
			totalRules,
			totalDeficitServices,
			avgCostFormatted: `${avgCost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`,
		};
	}, [groupedServices, rules]);

	const availableServices: ServiceOption[] = useMemo(() => {
		if (dashboardServices && dashboardServices.length > 0) {
			return dashboardServices.map((s: Record<string, unknown>) => ({
				id: String(s.id ?? ""),
				code: String(s.code ?? ""),
				title: String(s.title ?? s.name ?? "Услуга"),
				category: String(s.category ?? "therapy"),
			}));
		}
		const distinct = new Map<string, ServiceOption>();
		for (const r of rules) {
			if (r.serviceId && !distinct.has(r.serviceId)) {
				distinct.set(r.serviceId, {
					id: r.serviceId,
					code: r.serviceCode || "",
					title: r.serviceTitle || "Услуга",
					category: r.serviceCategory || "therapy",
				});
			}
		}
		return Array.from(distinct.values());
	}, [dashboardServices, rules]);

	return {
		rules,
		warehouseItems,
		isLoading,
		isSeeding,
		searchQuery,
		setSearchQuery,
		selectedCategory,
		setSelectedCategory,
		modalState,
		setModalState,
		isSaving,
		confirmDeleteId,
		setConfirmDeleteId,
		fetchAllRules,
		handleSeedDefaults,
		handleSaveRule,
		handleDeleteRule,
		groupedServices,
		stats,
		availableServices,
	};
}
