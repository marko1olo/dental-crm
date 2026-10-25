/**
 * surgeryInvoiceDispatcher.ts — Диспатч хирургических услуг в счет/смету визита (Мандаты 8e, 8n).
 */

import type { SurgicalService804n, SurgicalOperationNorm } from "../surgeryNormsCatalog";

export function getSurgicalServices804n(
	norm: SurgicalOperationNorm,
	toothFdi?: number,
): readonly SurgicalService804n[] {
	const effectiveTooth = toothFdi ?? norm.defaultToothFdi;
	if (norm.order804nServices && norm.order804nServices.length > 0) {
		return norm.order804nServices.map((s) => ({
			...s,
			toothNumber: effectiveTooth,
		}));
	}

	if (norm.code804n) {
		return [
			{
				code: norm.code804n,
				nameRu: norm.service804nTitle || norm.title,
				name: norm.service804nTitle || norm.title,
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

export function dispatchSurgicalServicesToInvoice(params: {
	norm?: SurgicalOperationNorm | undefined;
	toothFdi?: number | undefined;
	customServices?: readonly SurgicalService804n[] | undefined;
	onAddToInvoice?: ((services: readonly SurgicalService804n[]) => void) | undefined;
}): readonly SurgicalService804n[] {
	const effectiveTooth = params.toothFdi ?? params.norm?.defaultToothFdi;
	const services =
		params.customServices && params.customServices.length > 0
			? params.customServices.map((s) => ({ ...s, toothNumber: s.toothNumber ?? effectiveTooth }))
			: params.norm
				? getSurgicalServices804n(params.norm, effectiveTooth)
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
