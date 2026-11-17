import { printHtmlViaIframe } from "../../../documents/printHtmlViaIframe";

export function downloadHtmlFile(htmlContent: string, fileName: string): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}
	try {
		const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} catch (e) {
		console.error("Failed to download HTML file:", e);
	}
}

export function openPrintWindow(htmlContent: string): void {
	printHtmlViaIframe(htmlContent, "portal-doc-print-iframe");
}
