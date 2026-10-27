import type {
	EndoTreatmentBillingEstimateResult,
	ToothClinicalServicePayload,
} from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalConstants";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { useVisitStore } from "../../../store/visitStore";

export function applyEndoBillingAndInventoryDeductions(
	activeTooth: number,
	patientId: string | undefined,
	stageStamp: EndoStageStamp,
	billingEstimate: EndoTreatmentBillingEstimateResult,
): void {
	// 1. Автоматическое начисление услуг в visitStore (Мандаты 8b, 8e, 8n)
	try {
		const visitStore = useVisitStore.getState();
		for (const srv of billingEstimate.services804n) {
			const itemPayload: ToothClinicalServicePayload = {
				serviceId: `endo_${srv.code804n}_${activeTooth}`,
				code804n: srv.code804n,
				toothNumber: activeTooth,
				toothCode: String(activeTooth),
				name: srv.title,
				priceRub: srv.priceRub,
				priceKopecks: srv.priceKopecks,
				quantity: srv.quantity,
				category: srv.category,
			};
			visitStore.addCompletedService(itemPayload);
		}

		visitStore.applyServicesToToothState({
			toothNumber: activeTooth,
			toothCode: String(activeTooth),
			services: billingEstimate.services804n.map((s) => ({
				code804n: s.code804n,
				title: s.title,
				price: s.priceRub,
				unitPriceRub: s.priceRub,
				toothNumber: activeTooth,
				toothCode: String(activeTooth),
			})),
		});
	} catch (billErr) {
		console.warn("Auto-billing endo services skipped or outside active visit store", billErr);
	}

	// 2. Бесшовный мост в кассу и смету через событие dente-add-services-to-invoice
	if (typeof window !== "undefined" && billingEstimate.services804n.length > 0) {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: activeTooth,
						teethNumbers: [activeTooth],
						services: billingEstimate.services804n.map((s) => ({
							code: s.code804n,
							code804n: s.code804n,
							name: s.title,
							nameRu: s.title,
							price: s.priceRub,
							priceRub: s.priceRub,
							quantity: s.quantity || 1,
							toothNumber: activeTooth,
							category: "Эндодонтия",
						})),
					},
				}),
			);
		} catch (eventErr) {
			console.warn("dente-add-services-to-invoice dispatch error:", eventErr);
		}
	}

	// 3. Автоматическое списание расходников через мягкий овердрафт (Мандаты 8e, 8n)
	try {
		for (const mat of billingEstimate.materials) {
			fetch("/api/inventory/soft-overdraft-deduct", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					itemId: mat.itemId,
					itemName: mat.itemName,
					quantity: mat.quantity,
					reason: `Эндодонтический протокол зуба #${activeTooth} (${mat.notes || "Списание расходных материалов"})`,
				}),
			}).catch(() => {});
		}
	} catch { /* soft */ }

	// 4. Автоматическое уведомление шины событий склада
	try {
		window.dispatchEvent(
			new CustomEvent("dente-deduct-inventory-materials", {
				detail: { toothNumber: activeTooth, patientId, stage: stageStamp, materials: billingEstimate.materials },
			}),
		);
	} catch { /* safe */ }
}
