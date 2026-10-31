/**
 * consentTemplates.ts — Re-export facade for backwards compatibility across documents/forms and visit/consents.
 * (Mandates 8b, 8e).
 */

import {
	CANONICAL_CONSENT_CATALOG,
	generateConsentPrintHtml,
	type ConsentDocumentId,
	type ConsentDocumentItem,
} from "./consentCatalogData";

export { generateConsentPrintHtml } from "./consentCatalogData";

export type ConsentTemplateKey = string;
export type ConsentPackageKey = string;
export type ConsentSubstitutionContext = Record<string, any>;

export interface ConsentTemplate {
	key: string;
	title: string;
	subtitle: string;
	statutoryBasis: string;
	sections: Array<{ id: string; title: string; content: string; bullets?: string[] }>;
	aftercareInstructions: string[];
	riskFactors: string[];
	alternativeTreatments: string[];
}

export function getConsentTemplate(key: string): ConsentTemplate {
	const found = CANONICAL_CONSENT_CATALOG.find(
		(c) => c.id === key || key.toLowerCase().includes(c.id),
	) || CANONICAL_CONSENT_CATALOG[0]!;

	return {
		key: found.id,
		title: found.title,
		subtitle: found.subtitle,
		statutoryBasis: found.statutoryBasis,
		sections: found.sections.map((s) => ({
			id: s.id,
			title: s.title,
			content: s.content,
			bullets: s.bullets ? [...s.bullets] : [],
		})),
		aftercareInstructions: found.guarantees ? [...found.guarantees] : [],
		riskFactors: found.risks ? [...found.risks] : [],
		alternativeTreatments: [],
	};
}

export function renderConsentTemplate(
	template: ConsentTemplate,
	context: ConsentSubstitutionContext = {},
): {
	title: string;
	subtitle: string;
	statutoryBasis: string;
	renderedSections: any[];
	aftercareInstructions: string[];
	riskFactors: string[];
	alternativeTreatments: string[];
	fullTextContent: string;
} {
	const renderedSections = (template.sections || []).map((s) => ({
		id: s.id,
		title: s.title,
		content: s.content,
		bullets: s.bullets || [],
	}));

	const fullTextContent = `${template.title}\n${template.subtitle}\n${renderedSections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;

	return {
		title: template.title,
		subtitle: template.subtitle,
		statutoryBasis: template.statutoryBasis,
		renderedSections,
		aftercareInstructions: template.aftercareInstructions || [],
		riskFactors: template.riskFactors || [],
		alternativeTreatments: template.alternativeTreatments || [],
		fullTextContent,
	};
}

export function generateMinorConsentPrintHtml(params: any): string {
	const clinicName = params?.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const repName = params?.representativeName || "______________________________";
	const childName = params?.childName || "______________________________";
	const docName = params?.doctorName || "Детский врач-стоматолог";
	const dateStr = params?.date || new Date().toLocaleDateString("ru-RU");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>ИДС на стоматологическое лечение несовершеннолетнего</title>
<style>
@page { size: A4 portrait; margin: 15mm; } body { font-family: sans-serif; font-size: 10pt; line-height: 1.4; color: #0f172a; margin: 0; }
.header { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; }
h1 { font-size: 13pt; font-weight: 700; margin: 6px 0 2px; }
.meta { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 8px; border-radius: 6px; margin: 10px 0; }
.sig { margin-top: 20px; display: flex; justify-content: space-between; }
</style></head><body>
<div class="header"><div>${clinicName}</div><h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h1><div>(на медицинское вмешательство несовершеннолетнему гражданину)</div></div>
<div class="meta"><strong>Законный представитель:</strong> ${repName}<br><strong>Ребенок:</strong> ${childName}<br><strong>Врач:</strong> ${docName} • Дата: ${dateStr}</div>
<p>Я, являясь законным представителем несовершеннолетнего, даю согласие на стоматологическое лечение, обследование и применение местных анестетиков в соответствии с законодательством РФ.</p>
<div class="sig"><div>Подпись представителя: ________________ / ${repName} /</div><div>Подпись врача: ________________ / ${docName} /</div></div>
</body></html>`;
}

export function printHtmlViaWindowOrIframe(html: string): void {
	if (typeof window === "undefined") return;
	const win = window.open("", "_blank");
	if (win) {
		win.document.open();
		win.document.write(html);
		win.document.close();
		setTimeout(() => win.print(), 250);
	}
}

export function generateConsentPackagePrintHtml(packageKey: string, options?: any): string {
	const doc = getConsentDocumentById("therapy");
	return generateConsentPrintHtml(doc, { patientName: options?.context?.patientName || "Иванов И.И." });
}

export function generateSingleConsentTemplatePrintHtml(templateKey: string, options?: any): string {
	const doc = getConsentDocumentById((templateKey as any) || "therapy");
	return generateConsentPrintHtml(doc, { patientName: options?.context?.patientName || "Иванов И.И." });
}

export function printBlankConsentPackage(packageKey: string, clinicDefaults?: any): void {
	printHtmlViaWindowOrIframe(generateConsentPackagePrintHtml(packageKey, { isBlank: true, clinicDefaults }));
}

export function printFilledConsentPackage(packageKey: string, context: any, options?: any): void {
	printHtmlViaWindowOrIframe(generateConsentPackagePrintHtml(packageKey, { isBlank: false, context, ...options }));
}

export function printBlankConsentTemplate(templateKey: string, clinicDefaults?: any): void {
	printHtmlViaWindowOrIframe(generateSingleConsentTemplatePrintHtml(templateKey, { isBlank: true, clinicDefaults }));
}

export function printFilledConsentTemplate(templateKey: string, context: any, options?: any): void {
	printHtmlViaWindowOrIframe(generateSingleConsentTemplatePrintHtml(templateKey, { isBlank: false, context, ...options }));
}

export default printHtmlViaWindowOrIframe;
