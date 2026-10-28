import { useMemo } from "react";
import type { CompletedClinicalService } from "./clinicalWriteoffEngine.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { useAppStore } from "../../../store/appStore.js";

export const DEFAULT_CLINICAL_SERVICES: readonly CompletedClinicalService[] = [
	{ serviceCode: "A16.07.002.001", toothNumber: 26, serviceTitle: "Пломбирование зуба светоотверждаемым композитом", quantityMultiplier: 1 },
	{ serviceCode: "A16.07.004", toothNumber: 26, serviceTitle: "Местная анестезия инфильтрационная", quantityMultiplier: 1 },
];

export function useClinicalWriteoffServices(initialServices?: readonly CompletedClinicalService[]) {
	const isDemo = isDemoShowcaseMode();
	return useMemo((): readonly CompletedClinicalService[] => {
		if (initialServices && initialServices.length > 0) return initialServices;
		if (isDemo) return DEFAULT_CLINICAL_SERVICES;
		try {
			const state = useAppStore.getState() as unknown as Record<string, unknown>;
			const dashboard = state?.dashboard as Record<string, unknown> | undefined;
			const activeVisit = dashboard?.activeVisit as Record<string, unknown> | undefined;
			const activeVisitServices = activeVisit?.completedServices;
			if (Array.isArray(activeVisitServices) && activeVisitServices.length > 0) {
				return activeVisitServices.map((raw) => {
					const s = raw as Record<string, unknown>;
					return {
						serviceCode: String(s.serviceCode || s.code || "A16.07.002.001"),
						toothNumber: s.toothNumber ? Number(s.toothNumber) : undefined,
						serviceTitle: String(s.serviceTitle || s.title || s.name || "Клиническая процедура"),
						quantityMultiplier: typeof s.quantityMultiplier === "number" ? s.quantityMultiplier : typeof s.quantity === "number" ? s.quantity : 1,
					};
				});
			}
		} catch {}
		return [];
	}, [initialServices, isDemo]);
}
