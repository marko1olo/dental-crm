import { useMemo } from "react";
import type {
	ProcedureMaterialRuleViewItem,
	ServiceGroupViewItem,
	ServiceOption,
} from "./materialBomTypes.js";

export interface UseMaterialBomsComputationsParams {
	rules: ProcedureMaterialRuleViewItem[];
	searchQuery: string;
	selectedCategory: string;
	dashboardServices?: readonly Record<string, unknown>[] | undefined;
}

export function useMaterialBomsComputations({
	rules,
	searchQuery,
	selectedCategory,
	dashboardServices,
}: UseMaterialBomsComputationsParams) {
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

	return { groupedServices, stats, availableServices };
}
