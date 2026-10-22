import {
	generateMinorConsentPrintHtml,
	printHtmlViaWindowOrIframe,
} from "../../../consents/consentTemplates.js";
import { showToast } from "../../../GlobalToast";

export function printCompletedMinorConsent(params: {
	repName: string;
	repRel: string;
	repDoc: string;
	repPhone: string;
	childName: string;
	childBirth: string;
	childDoc: string;
	repBasis: string;
	doctorName: string;
	interventionScope: string;
	diagnosisOrIndication: string;
	risks: string;
	alternatives: string;
	date: string;
}) {
	const html = generateMinorConsentPrintHtml({
		representativeName: params.repName,
		representativeRelation: params.repRel,
		representativeDocument: params.repDoc,
		representativePhone: params.repPhone,
		childName: params.childName,
		childBirthDate: params.childBirth,
		childDocument: params.childDoc,
		representativeBasis: params.repBasis,
		doctorName: params.doctorName,
		interventionScope: params.interventionScope,
		diagnosisOrIndication: params.diagnosisOrIndication,
		risks: params.risks,
		alternatives: params.alternatives,
		date: params.date,
		isBlank: false,
	});
	printHtmlViaWindowOrIframe(html);
	showToast("Бланк согласия законного представителя отправлен на печать (А4)", "info", 3000);
}

export function printBlankMinorConsent() {
	const html = generateMinorConsentPrintHtml({
		isBlank: true,
		date: "«___» _________ 20___ г.",
	});
	printHtmlViaWindowOrIframe(html);
	showToast("Чистый бланк согласия представителя со строками «________» отправлен на печать", "info", 3000);
}
