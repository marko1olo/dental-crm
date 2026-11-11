/**
 * speechSoapEnricher.ts — Формирование разделов SOAP и текстовой сводки визита
 */

import type {
	AnesthesiaVoiceItem,
	Procedure804nVoiceItem,
	SoapSectionsVoiceNote,
	ToothUpdateVoiceItem,
} from "../types";

export function enrichSoapWithProcedures(
	soapNotes: SoapSectionsVoiceNote,
	teethUpdates: ToothUpdateVoiceItem[],
	procedures804n: Procedure804nVoiceItem[],
	anesthesia: AnesthesiaVoiceItem | null,
): SoapSectionsVoiceNote {
	let assessment = soapNotes.assessment;
	if (!assessment && teethUpdates.length > 0) {
		assessment = teethUpdates
			.map((t) => `Зуб ${t.toothNumber}: ${t.icd10Title} [${t.icd10Code}]`)
			.join("; ");
	}

	let plan = soapNotes.plan;
	if (!plan && (procedures804n.length > 0 || anesthesia)) {
		const planParts: string[] = [];
		if (anesthesia) {
			planParts.push(`Анестезия: ${anesthesia.displayName}`);
		}
		for (const p of procedures804n) {
			planParts.push(p.name);
		}
		plan = planParts.join(", ");
	}

	return {
		...soapNotes,
		...(assessment !== undefined ? { assessment } : {}),
		...(plan !== undefined ? { plan } : {}),
	};
}
