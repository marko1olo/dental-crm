import { printHtmlViaIframe } from "../printHtmlViaIframe";

export function printPrescriptionForm107Html(html: string): void {
	printHtmlViaIframe(html, "dente-prescription-print-iframe");
}

export const printPrescriptionBlankHtml = printPrescriptionForm107Html;
