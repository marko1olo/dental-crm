/**
 * soapExpressInvoiceBridge.ts — Передача услуг экспресс-протокола в счет/смету визита (Мандаты 8e, 8n).
 */
import { apply1ClickClinicalAutopilot } from "../presets/autopilotPresets";
import type { ChairsideSmartProtocolKey } from "../clinicalVisitWorkflow";

export interface ExpressBillingServiceItem {
	readonly code: string;
	readonly name: string;
	readonly nameRu?: string;
	readonly price: number;
	readonly priceRub: number;
	readonly quantity: number;
	readonly toothNumber?: number;
	readonly category?: string;
	readonly stageKind?: string;
	readonly isPrimary?: boolean;
}

export function dispatchExpressProtocolServicesToInvoice(
	presetType: ChairsideSmartProtocolKey,
	targetTooth: number,
	surfaces?: string,
): readonly ExpressBillingServiceItem[] {
	const autopilotResult = apply1ClickClinicalAutopilot(presetType, {
		toothNumber: targetTooth,
		surfaces,
	});

	const servicesToAdd: ExpressBillingServiceItem[] = [];

	if (autopilotResult.service804n) {
		servicesToAdd.push({
			code: autopilotResult.service804n.code804n,
			name: autopilotResult.service804n.title,
			nameRu: autopilotResult.service804n.title,
			price: autopilotResult.service804n.basePriceRub,
			priceRub: autopilotResult.service804n.basePriceRub,
			quantity: 1,
			toothNumber: targetTooth,
			category: autopilotResult.service804n.category || "surgery",
			stageKind: "stage_2_surgery",
			isPrimary: true,
		});
	}

	if (autopilotResult.additionalServices804n) {
		for (const addS of autopilotResult.additionalServices804n) {
			servicesToAdd.push({
				code: addS.code804n,
				name: addS.title,
				nameRu: addS.title,
				price: addS.basePriceRub,
				priceRub: addS.basePriceRub,
				quantity: 1,
				toothNumber: targetTooth,
				category: addS.category || "surgery",
				stageKind: "stage_2_surgery",
			});
		}
	}

	if (typeof window !== "undefined" && servicesToAdd.length > 0) {
		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					toothNumber: targetTooth,
					teethNumbers: [targetTooth],
					services: servicesToAdd,
				},
			}),
		);

		try {
			const winAny = window as any;
			const visitStore = winAny.__useVisitStore?.getState?.();
			if (visitStore?.applyServicesToToothState) {
				visitStore.applyServicesToToothState({
					toothNumber: targetTooth,
					toothCode: String(targetTooth),
					services: servicesToAdd.map((s) => ({
						code: s.code,
						code804n: s.code,
						title: s.name,
						price: s.priceRub,
						unitPriceRub: s.priceRub,
						toothNumber: targetTooth,
					})),
				});
			}
		} catch (err) {
			console.warn("visitStore applyServicesToToothState fallback:", err);
		}
	}

	return servicesToAdd;
}
