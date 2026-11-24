import { clientLogger } from "../../../services/logging/clientLogger";

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
		clientLogger.warn("dente-add-services-to-invoice dispatch error", err, { module: "completedServicesEngine" });
	}
}

export function formatToothBadgeMsg(selectedTooth: string | null): string {
	if (!selectedTooth) return "";
	return selectedTooth.includes(",")
		? ` (зубы ${selectedTooth})`
		: ` (зуб ${selectedTooth})`;
}
