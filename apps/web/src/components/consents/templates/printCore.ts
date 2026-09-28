/**
 * Надежная печать HTML-документа: через всплывающее окно window.open с прозрачным fallback в скрытый iframe
 */
export function printHtmlViaWindowOrIframe(
	html: string,
	iframeId = "dente-consent-print-iframe",
): void {
	if (typeof window === "undefined") return;

	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=900,height=1000");
	} catch {
		// popup blocked, fallback to iframe
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print failed:", printErr);
				}
			}, 300);
			return;
		} catch {
			// document write failed, proceed to iframe fallback
		}
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
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (fallbackErr) {
		console.error("All iframe print fallbacks failed, calling window.print():", fallbackErr);
		window.print();
	}
}
