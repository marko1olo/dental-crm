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
	const enrichedSoap: SoapSectionsVoiceNote = { ...soapNotes };

	if (!enrichedSoap.assessment && teethUpdates.length > 0) {
		enrichedSoap.assessment = teethUpdates
			.map((t) => `Зуб ${t.toothNumber}: ${t.icd10Title} [${t.icd10Code}]`)
			.join("; ");
	}

	if (!enrichedSoap.plan && (procedures804n.length > 0 || anesthesia)) {
		const planParts: string[] = [];
		if (anesthesia) {
			planParts.push(`Анестезия: ${anesthesia.displayName}`);
		}
		for (const p of procedures804n) {
			planParts.push(p.name);
		}
		enrichedSoap.plan = planParts.join(", ");
	}

	return enrichedSoap;
}
