/**
 * printHtmlViaIframe.ts
 *
 * Fast zero-latency printing helper strictly via hidden iframe (Mandate 8e).
 * Eliminates popup-blocker issues caused by window.open.
 */

export function printHtmlViaIframe(html: string, iframeId = "dente-print-iframe"): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	try {
		const existingIframe = document.getElementById(iframeId);
		if (existingIframe) {
			existingIframe.remove();
		}

		const iframe = document.createElement("iframe");
		iframe.id = iframeId;
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		iframe.style.zIndex = "-999";
		iframe.setAttribute("aria-hidden", "true");
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (!doc) {
			console.error("[printHtmlViaIframe] Unable to access iframe document");
			window.print();
			return;
		}

		doc.open();
		doc.write(html);
		doc.close();

		const triggerPrint = (): void => {
			try {
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
			} catch (err) {
				console.error("[printHtmlViaIframe] Direct print trigger failed:", err);
				window.print();
			}
		};

		// Ensure styles/assets in doc are loaded
		if (iframe.contentWindow) {
			iframe.contentWindow.onload = (): void => {
				setTimeout(triggerPrint, 50);
			};
		}
		// Fallback timeout in case onload does not fire for document.write
		setTimeout(triggerPrint, 250);
	} catch (err) {
		console.error("[printHtmlViaIframe] Failed to create or write to iframe:", err);
		window.print();
	}
}
