import type {
	ConsentPackageKey,
	ConsentSubstitutionContext,
	ConsentTemplateKey,
} from "./types";
import { generateConsentPackagePrintHtml } from "./packagePrintHtml";
import { generateSingleConsentTemplatePrintHtml } from "./singleTemplatePrintHtml";
import { printHtmlViaWindowOrIframe } from "./printCore";

/**
 * 1-клик печать пакета чистых бланков со строками «________»
 */
export function printBlankConsentPackage(
	packageKey: ConsentPackageKey,
	clinicDefaults?: Partial<ConsentSubstitutionContext>,
): void {
	const html = generateConsentPackagePrintHtml(packageKey, {
		isBlank: true,
		...(clinicDefaults ? { clinicDefaults } : {}),
	});
	printHtmlViaWindowOrIframe(html, "dente-package-blank-print-iframe");
}

/**
 * 1-клик печать пакета заполненных бланков А4
 */
export function printFilledConsentPackage(
	packageKey: ConsentPackageKey,
	context: ConsentSubstitutionContext,
	options: { isSigned?: boolean; watermarkText?: string } = {},
): void {
	const html = generateConsentPackagePrintHtml(packageKey, {
		isBlank: false,
		context,
		isSigned: options.isSigned,
		watermarkText: options.watermarkText,
	});
	printHtmlViaWindowOrIframe(html, "dente-package-filled-print-iframe");
}

/**
 * 1-клик печать одиночного чистого бланка ИДС со строками «________»
 */
export function printBlankConsentTemplate(
	templateKey: ConsentTemplateKey,
	clinicDefaults?: Partial<ConsentSubstitutionContext>,
): void {
	const html = generateSingleConsentTemplatePrintHtml(templateKey, {
		isBlank: true,
		clinicDefaults,
	});
	printHtmlViaWindowOrIframe(html, "dente-single-blank-print-iframe");
}

/**
 * 1-клик печать одиночного заполненного бланка ИДС А4
 */
export function printFilledConsentTemplate(
	templateKey: ConsentTemplateKey,
	context: ConsentSubstitutionContext,
	options: { isSigned?: boolean; watermarkText?: string } = {},
): void {
	const html = generateSingleConsentTemplatePrintHtml(templateKey, {
		isBlank: false,
		context,
		isSigned: options.isSigned,
		watermarkText: options.watermarkText,
	});
	printHtmlViaWindowOrIframe(html, "dente-single-filled-print-iframe");
}
