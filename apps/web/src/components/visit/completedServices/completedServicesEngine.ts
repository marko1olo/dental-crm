export function dispatchAddServicesToInvoice(payload: unknown): void {
	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: payload,
				}),
			);
		}
	} catch (err) {
		console.warn("dente-add-services-to-invoice dispatch error:", err);
	}
}

export function formatToothBadgeMsg(selectedTooth: string | null): string {
	if (!selectedTooth) return "";
	return selectedTooth.includes(",")
		? ` (зубы ${selectedTooth})`
		: ` (зуб ${selectedTooth})`;
}
