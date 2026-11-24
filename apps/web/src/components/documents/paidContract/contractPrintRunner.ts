/**
 * paidContract/contractPrintRunner.ts
 * Browser print executor via clean iframe / window (Mandate 8b <= 120 lines)
 */

import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import { printHtmlViaIframe } from "../printHtmlViaIframe";

export function executePrintHtml(html: string): void {
	if (typeof window === "undefined") return;

	try {
		printHtmlViaIframe(html, "dente-contract-print-iframe");
	} catch (err) {
		clientLogger.error("[contractPrintRunner] Failed to print contract:", err);
		showToast("Не удалось отправить договор на печать", "error", 4000);
	}
}
