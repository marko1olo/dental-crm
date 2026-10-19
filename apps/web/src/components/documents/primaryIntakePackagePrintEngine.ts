/**
 * primaryIntakePackagePrintEngine.ts
 *
 * Канонический масштабируемый движок пакетной печати первичного приёма DENTE CRM.
 * Формирует единый полиграфический комплект документов (А4):
 * 1. Договор на оказание платных медицинских услуг (ПП РФ № 736)
 * 2. Информированное добровольное согласие на осмотр и диагностику (ИДС)
 * 3. Согласие на обработку персональных данных (152-ФЗ)
 * 4. Анкета первичного пациента о состоянии здоровья (соматический статус)
 *
 * Принципы Мандата 8e и First Principles:
 * - Формирование и печать комплекта в 1 клик.
 * - При отсутствии паспортных данных или реквизитов выводятся аккуратные линии «___________» для ручного заполнения.
 * - Никаких блокировок (disabled), исключений или зависаний.
 */

import { PRIMARY_INTAKE_PACKAGE_CSS } from "./primaryIntakePackage/css";
import { buildIntakeRequisitesContext } from "./primaryIntakePackage/helpers";
import { renderContractSheet } from "./primaryIntakePackage/contractSheet";
import { renderConsentSheet } from "./primaryIntakePackage/consentSheet";
import { renderPersonalDataSheet } from "./primaryIntakePackage/personalDataSheet";
import { renderQuestionnaireSheet } from "./primaryIntakePackage/questionnaireSheet";
import type { PrimaryIntakePackagePrintOptions, IntakeRequisitesContext } from "./primaryIntakePackage/types";

export * from "./primaryIntakePackage/types";
export { PRIMARY_INTAKE_PACKAGE_CSS } from "./primaryIntakePackage/css";
export { buildIntakeRequisitesContext } from "./primaryIntakePackage/helpers";
export { renderContractSheet } from "./primaryIntakePackage/contractSheet";
export { renderConsentSheet } from "./primaryIntakePackage/consentSheet";
export { renderPersonalDataSheet } from "./primaryIntakePackage/personalDataSheet";
export { renderQuestionnaireSheet } from "./primaryIntakePackage/questionnaireSheet";

/**
 * Генерирует монолитный HTML-документ первичного пакета для печати на принтере
 */
export function generatePrimaryIntakePackageHtml(
	options: PrimaryIntakePackagePrintOptions,
): string {
	const ctx: IntakeRequisitesContext = buildIntakeRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Первичный пакет документов — ${ctx.ptName || "Пациент"}</title>
  <style>${PRIMARY_INTAKE_PACKAGE_CSS}</style>
</head>
<body>
${renderContractSheet(ctx)}
${renderConsentSheet(ctx)}
${renderPersonalDataSheet(ctx)}
${renderQuestionnaireSheet(ctx, options)}
</body>
</html>`;
}

/**
 * Отправляет первичный пакет документов на печать в 1 клик без промежуточных окон
 */
export function printPrimaryIntakePackage(
	options: PrimaryIntakePackagePrintOptions,
): void {
	const html = generatePrimaryIntakePackageHtml(options);

	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=920,height=1050");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn("Error writing to printWindow, trying fallback iframe", writeErr);
		}
	}

	try {
		const existingIframe = document.getElementById("dente-primary-intake-print-iframe");
		if (existingIframe) existingIframe.remove();

		const iframe = document.createElement("iframe");
		iframe.id = "dente-primary-intake-print-iframe";
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		window.print();
	}
}
