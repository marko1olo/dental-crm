import type { BeforeAfterCollagePayload } from './collageTypes';
import { generateBeforeAfterPrintableHtml } from './printableHtmlTemplate';

export function exportCollageAsPdf(payload: BeforeAfterCollagePayload): void {
	const html = generateBeforeAfterPrintableHtml(payload);
	const printWindow = window.open('', '_blank');
	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => printWindow.print(), 300);
	}
}
