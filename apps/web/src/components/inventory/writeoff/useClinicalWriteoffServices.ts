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
			const activeVisitServices = (useAppStore.getState() as any)?.dashboard?.activeVisit?.completedServices;
			if (Array.isArray(activeVisitServices) && activeVisitServices.length > 0) {
				return activeVisitServices.map((s: any) => ({
					serviceCode: s.serviceCode || s.code || "A16.07.002.001",
					toothNumber: s.toothNumber ? Number(s.toothNumber) : undefined,
					serviceTitle: s.serviceTitle || s.title || s.name || "Клиническая процедура",
					quantityMultiplier: s.quantityMultiplier ?? s.quantity ?? 1,
				}));
			}
		} catch {}
		return [];
	}, [initialServices, isDemo]);
}
