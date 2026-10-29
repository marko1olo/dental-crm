/**
 * apps/web/src/components/odontogram/print/triggerOdontogramPrint.ts
 *
 * Unified Odontogram A4 Print Pipeline Dispatcher.
 * Bridges browser print dialog with Electron/Tauri native desktop listeners.
 */

export function triggerOdontogramPrint(customPrintHandler?: (() => void) | undefined): void {
	if (typeof customPrintHandler === "function") {
		customPrintHandler();
		return;
	}

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente:desktop-print-request", {
				detail: { target: "odontogram" },
			}),
		);
		window.print();
	}
}
