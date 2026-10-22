export function printHtmlInNewWindow(htmlContent: string) {
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(htmlContent);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 250);
	}
}

export function downloadHtmlFile(htmlContent: string, fileName: string) {
	const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
