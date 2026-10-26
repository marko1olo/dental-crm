/**
 * surgeryInvoiceDispatcher.ts — Диспатч хирургических услуг в счет/смету визита (Мандаты 8e, 8n).
 */

import type { SurgicalServiceItem, SurgicalOperationNorm } from "../surgeryNormsCatalog";

export function getSurgicalCatalogServices(
	norm: SurgicalOperationNorm,
	toothFdi?: number,
): readonly SurgicalServiceItem[] {
	const effectiveTooth = toothFdi ?? norm.defaultToothFdi;
	const catalog = norm.catalogServices || norm.order804nServices;
	if (catalog && catalog.length > 0) {
		return catalog.map((s) => ({
			...s,
			toothNumber: effectiveTooth,
		}));
	}

	const code = norm.serviceCode || norm.code804n;
	const title = norm.serviceTitle || norm.service804nTitle || norm.title;
	if (code) {
		return [
			{
				code,
				nameRu: title,
				name: title,
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				toothNumber: effectiveTooth,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
		];
	}

	return [];
}

export const getSurgicalServices804n = getSurgicalCatalogServices;

export function dispatchSurgicalServicesToInvoice(params: {
	norm?: SurgicalOperationNorm | undefined;
	toothFdi?: number | undefined;
	customServices?: readonly SurgicalServiceItem[] | undefined;
	onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}): readonly SurgicalServiceItem[] {
	const effectiveTooth = params.toothFdi ?? params.norm?.defaultToothFdi;
	const services =
		params.customServices && params.customServices.length > 0
			? params.customServices.map((s) => ({ ...s, toothNumber: s.toothNumber ?? effectiveTooth }))
			: params.norm
				? getSurgicalCatalogServices(params.norm, effectiveTooth)
				: [];

	if (params.onAddToInvoice) {
		try {
			params.onAddToInvoice(services);
		} catch (err) {
			console.warn("onAddToInvoice callback error:", err);
		}
	}

	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: effectiveTooth,
						teethNumbers: effectiveTooth ? [effectiveTooth] : [],
						services,
					},
				}),
			);

			const winAny = window as any;
			const visitStore = winAny.__useVisitStore?.getState?.();
			if (visitStore?.applyServicesToToothState) {
				visitStore.applyServicesToToothState({
					toothNumber: effectiveTooth,
					toothCode: effectiveTooth ? String(effectiveTooth) : undefined,
					services: services.map((s) => ({
						code: s.code,
						code804n: s.code,
						title: s.nameRu || s.name,
						price: s.priceRub,
						unitPriceRub: s.priceRub,
						toothNumber: effectiveTooth,
					})),
				});
			}
		}
	} catch (err) {
		console.warn("dente-add-services-to-invoice dispatch error:", err);
	}

	return services;
}
