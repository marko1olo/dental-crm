import { create } from "zustand";
import { createBillingInvoiceSlice } from "./billingInvoiceSlice.js";
import { createDiaryProtocolSlice } from "./diaryProtocolSlice.js";
import { createOdontogramSlice } from "./odontogramSlice.js";
import type { VisitStore } from "./types.js";

export const useVisitStore = create<VisitStore>((set) => ({
	...createOdontogramSlice(set),
	...createDiaryProtocolSlice(set),
	...createBillingInvoiceSlice(set),
}));

if (typeof window !== "undefined") {
	(window as any).__useVisitStore = useVisitStore;

	// Сквозная реактивность одонтограммы: автоматическое обновление статуса зуба при начислении услуг
	window.addEventListener("dente-add-services-to-invoice", ((event: Event) => {
		try {
			const detail = (event as CustomEvent)?.detail;
			if (detail) {
				useVisitStore.getState().applyServicesToToothState(detail);
			}
		} catch (err) {
			console.warn("Failed to apply services to tooth state from event:", err);
		}
	}) as EventListener);
}
