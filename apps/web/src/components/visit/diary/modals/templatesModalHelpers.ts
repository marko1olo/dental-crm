export function buildProtocolTreatmentText(res: any): string {
	const treatmentParts: string[] = [];
	if (res.procedureProtocol?.trim()) {
		treatmentParts.push(res.procedureProtocol.trim());
	}
	if (res.anesthesiaDetails?.trim()) {
		treatmentParts.push(`Анестезия: ${res.anesthesiaDetails.trim()}`);
	}
	if (res.appliedMaterials?.trim()) {
		treatmentParts.push(`Материалы: ${res.appliedMaterials.trim()}`);
	}
	if (res.homeCareRecommendations?.trim()) {
		treatmentParts.push(`Рекомендации: ${res.homeCareRecommendations.trim()}`);
	}
	if (res.order804nServices && res.order804nServices.length > 0) {
		const svcLines = res.order804nServices.map((s: any) => {
			const qty = s.defaultQuantity && s.defaultQuantity > 1 ? ` (x${s.defaultQuantity})` : "";
			const price =
				typeof s.priceKopecks === "number" && s.priceKopecks > 0
					? ` — ${(s.priceKopecks / 100).toLocaleString("ru-RU")} ₽`
					: "";
			return `• ${s.code} ${s.nameRu}${qty}${price}`;
		});
		treatmentParts.push(`Оказанные услуги:\n${svcLines.join("\n")}`);
	}
	return treatmentParts.join("\n\n");
}

export function dispatchProtocolServices(
	services: readonly any[],
	targetTooth: string | number | undefined,
	source: string,
) {
	if (typeof window === "undefined" || !services || services.length === 0) return;

	const billableItems = services.map((s: any, idx: number) => {
		const priceRub =
			typeof s.priceKopecks === "number" && s.priceKopecks > 0 ? s.priceKopecks / 100 : 0;
		const qty = s.defaultQuantity && s.defaultQuantity > 1 ? s.defaultQuantity : 1;
		const tooth = targetTooth;
		return {
			id: `protocol-${s.code}-${Date.now()}-${idx}`,
			code: s.code,
			code804n: s.code,
			title: s.nameRu,
			name: s.nameRu,
			quantity: qty,
			priceRub,
			unitPriceRub: priceRub,
			priceKopecks: s.priceKopecks ?? Math.round(priceRub * 100),
			toothNumber: tooth ? Number(tooth) || tooth : undefined,
			toothCode: tooth ? String(tooth) : undefined,
		};
	});

	window.dispatchEvent(
		new CustomEvent("dente-add-services-to-invoice", {
			detail: {
				services: billableItems,
				toothNumber: targetTooth ? Number(targetTooth) || targetTooth : undefined,
				toothCode: targetTooth ? String(targetTooth) : undefined,
				replaceExisting: true,
				source,
			},
		}),
	);
}
