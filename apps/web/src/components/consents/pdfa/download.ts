export function downloadConsentPdfA(filename: string, pdfBytes: Uint8Array): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
