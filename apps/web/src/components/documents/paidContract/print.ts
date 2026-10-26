/**
 * print.ts
 *
 * Генерация печатных форм (HTML / Текст) договора на оказание платных медицинских услуг (ПП РФ № 736).
 * Mandate 8b: strictly <= 120 lines facade.
 */

import type { PaidContractData } from "./types";
import { generatePaidContractHtml } from "./contractHtmlGenerator";
import { executePrintHtml } from "./contractPrintRunner";

export { generatePaidContractText } from "./contractTextGenerator";
export { generatePaidContractHtml } from "./contractHtmlGenerator";

/**
 * Автономная печать оформленного договора на оказание платных медицинских услуг (ПП РФ № 736).
 * Не зависит от внешних бэкендов, не падает с 403-ошибками, поддерживает обход блокировщиков всплывающих окон.
 */
export function printPaidContract736(contract: PaidContractData): void {
	const html = generatePaidContractHtml(contract);
	executePrintHtml(html);
}
