import { printHtmlViaIframe } from "../printHtmlViaIframe";
import { generateSurgicalOperationProtocolHtml } from "./renderProtocol";
import type { SurgicalOperationProtocolPrintOptions } from "./types";

export function printSurgicalOperationProtocol(
	options: SurgicalOperationProtocolPrintOptions,
): void {
	const html = generateSurgicalOperationProtocolHtml(options);
	printHtmlViaIframe(html, "dente-surgical-protocol-print-iframe");
}
