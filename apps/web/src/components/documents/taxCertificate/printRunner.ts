export function printTaxCertificateHtml(html: string): void {
	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=920,height=1050");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
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
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn("Error writing to printWindow, trying fallback iframe", writeErr);
		}
	}

	// Fallback iframe
	try {
		const existingIframe = document.getElementById("dente-tax-cert-print-iframe");
		if (existingIframe) existingIframe.remove();

		const iframe = document.createElement("iframe");
		iframe.id = "dente-tax-cert-print-iframe";
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
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		window.print();
	}
}
