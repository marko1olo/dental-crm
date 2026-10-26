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
	if (typeof window === "undefined") return;
	try {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(htmlContent);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	} catch (e) {
		console.error("Failed to open print window:", e);
	}
}
