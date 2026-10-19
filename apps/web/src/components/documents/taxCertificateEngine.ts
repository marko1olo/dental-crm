/**
 * taxCertificateEngine.ts
 *
 * Канонический масштабируемый движок справок для налогового вычета (13% НДФЛ) DENTE.
 * Реализует:
 * 1. Агрегацию чеков и оплат из кассы за выбранный налоговый период (год).
 * 2. Автоматическое разделение сумм по Коду 01 (обычное лечение) и Коду 02 (дорогостоящее лечение).
 * 3. Расчёт ориентировочной суммы возврата 13% НДФЛ с учётом лимитов.
 * 4. Формирование официального печатного бланка по стандарту ФНС (КНД 1151156) с QR-кодом и штрихкодом.
 * 5. Формирование чистого бланка справки («___________») для ручного заполнения.
 */

import { generateTaxCertificateKnd1151156Html } from "./taxCertificate/htmlGenerator";
import { printTaxCertificateHtml } from "./taxCertificate/printRunner";
import type { TaxCertificateDocumentData } from "./taxCertificate/types";

export * from "./taxCertificate/types";
export * from "./taxCertificate/aggregation";
export * from "./taxCertificate/css";
export * from "./taxCertificate/renderSections";
export * from "./taxCertificate/htmlGenerator";
export * from "./taxCertificate/printRunner";

/**
 * Генерирует HTML справки для налогового вычета в ФНС (КНД 1151156)
 */
export function generateTaxCertificateHtml(
	data: TaxCertificateDocumentData,
): string {
	return generateTaxCertificateKnd1151156Html(data);
}

/**
 * Отправляет справку для налогового вычета на печать в 1 клик
 */
export function printTaxCertificate(
	data: TaxCertificateDocumentData,
): void {
	const html = generateTaxCertificateKnd1151156Html(data);
	printTaxCertificateHtml(html);
}
