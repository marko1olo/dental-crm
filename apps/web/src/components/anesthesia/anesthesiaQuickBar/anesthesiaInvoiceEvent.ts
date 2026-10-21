export function dispatchAnesthesiaInvoiceEvent(params: {
	servicePriceRub?: number | undefined;
	carpulesCount: number;
	drugName: string;
	techniqueId: string;
}) {
	if (typeof window === "undefined") return;
	const count = Math.ceil(params.carpulesCount);
	const priceRub = (params.servicePriceRub ?? 950) * count;
	const code804n = params.techniqueId?.includes("mandibular")
		? "A11.07.011"
		: "A11.07.010";

	window.dispatchEvent(
		new CustomEvent("dente-add-services-to-invoice", {
			detail: {
				service: {
					id: `anes-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
					title: `Анестезия местная (${params.drugName}) — ${params.carpulesCount} карп.`,
					code804n,
					priceRub,
					amountKopecks: priceRub * 100,
					quantity: count,
				},
			},
		}),
	);
}
