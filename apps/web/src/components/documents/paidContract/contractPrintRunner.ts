/**
 * paidContract/contractPrintRunner.ts
 * Browser print executor via clean iframe / window (Mandate 8b <= 120 lines)
 */

export function executePrintHtml(html: string): void {
	if (typeof window === "undefined") return;

	try {
		let printedViaWindow = false;
		const printWindow = window.open("", "_blank");
		if (printWindow && !printWindow.closed) {
			try {
				printWindow.document.write(html);
				printWindow.document.close();
				printWindow.focus();
				printedViaWindow = true;
				printWindow.print();
			} catch {
				printedViaWindow = false;
			}
		}

		if (!printedViaWindow) {
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "0";
			document.body.appendChild(iframe);
			iframe.contentDocument?.write(html);
			iframe.contentDocument?.close();
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1000);
		}
	} catch (err) {
		console.error("Failed to print contract:", err);
	}
}
