/**
 * prescriptionIframePrinter.ts — Pure helper to print HTML via detached invisible iframe
 */

export function printHtmlViaDetachedIframe(printHtml: string): void {
	if (typeof document === "undefined") return;
	try {
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const frameDoc =
			printFrame.contentWindow?.document || printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				try {
					printFrame.contentWindow?.focus();
					printFrame.contentWindow?.print();
				} catch (printErr) {
					console.warn(
						"[PrescriptionPrint] non-blocking print notice:",
						printErr,
					);
				} finally {
					setTimeout(() => {
						try {
							if (document.body.contains(printFrame)) {
								document.body.removeChild(printFrame);
							}
						} catch {}
					}, 1000);
				}
			}, 250);
		}
	} catch (frameErr) {
		console.warn("[PrescriptionPrint] iframe setup notice:", frameErr);
	}
}
