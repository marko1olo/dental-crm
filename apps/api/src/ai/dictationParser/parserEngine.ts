import type { ParserContext } from "../dictationParser.js";
import {
	extractToothSurfaces,
	matchDentalDiagnosis,
	extractDentalAnesthesia,
	extractDentalProcedures,
	synthesizeSoapRecord,
} from "../dentalSpeechGrammar.js";
import type { EmkUpdates, SmartAction, ToothUpdate } from "./types.js";
import {
	extractTime,
	extractDate,
	extractPatientName,
	extractCost,
	extractEmkSections,
} from "./clinicalFieldsExtractor.js";
import { expandToothRanges } from "./fdiToothGrammar.js";
import { matchClauseStateAndDiagnosis } from "./icd10Matcher.js";

export function parseDictationLocally(
	transcript: string,
	context: ParserContext,
): SmartAction | null {
	const text = transcript.toLowerCase().trim();

	if (context === "schedule" || text.includes("пациент")) {
		if (text.match(/(отмени|удали).*(запись|прием)|отмени/)) {
			const pName = extractPatientName(
				text,
				"отмени|удали(?:ть)?\\s*(?:запись|прием)?",
			);
			if (!pName) return null; // Force LLM fallback if we can't extract the name confidently
			return { action: "cancel_schedule", payload: { patientName: pName } };
		}
		if (text.match(/(перенеси|перенести)/)) {
			const dateInfo = extractDate(text);
			const timeStr = extractTime(text);
			const pName = extractPatientName(text, "перенеси|перенести");
			if (pName && (dateInfo || timeStr)) {
				return {
					action: "reschedule",
					payload: {
						patientName: pName,
						dayOffset: dateInfo?.relativeDays,
						targetWeekday: dateInfo?.targetWeekday,
						exactDate: dateInfo?.dayString,
						time: timeStr,
					},
				};
			}
			return null; // Fallback to LLM
		}
		if (
			text.match(/(запиши|записать|создай запись|запись на|запись для|запись|новый пациент)/)
		) {
			const dateInfo = extractDate(text);
			const timeStr = extractTime(text);
			const doctorMatch = text.match(
				/(?:к|ко)\s+(терапевту|хирургу|ортопеду|ортодонту|гигиенисту|[а-яё]+ву|[а-яё]+ой)/,
			);
			const phoneMatch = text.match(
				/(?:\+7|8)[\s-]*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/,
			);

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let action: any = "schedule";
			if (text.includes("новый пациент")) action = "create_patient";

			const pName = extractPatientName(
				text,
				"запиши|записать|создай запись(?: для)?|запись для|запись на|запись|новый пациент",
			);
			if (!pName) return null; // Without a patient name, scheduling is impossible locally. Fallback to LLM.

			return {
				action: action,
				payload: {
					patientName: pName,
					phone: phoneMatch ? phoneMatch[0].replace(/[\s-()]/g, "") : undefined,
					dayOffset: dateInfo?.relativeDays,
					targetWeekday: dateInfo?.targetWeekday,
					exactDate: dateInfo?.dayString,
					time: timeStr,
					doctorOrSpecialty: doctorMatch ? doctorMatch[1] : null,
				},
			};
		}
	}

	const openCardMatch = text.match(
		/(?:открой карточку|карточка|открой)\s+(.*)/i,
	);
	if (openCardMatch && ((openCardMatch[1] as string)?.length ?? 0) > 3) {
		return {
			action: "open_card",
			payload: { patientName: (openCardMatch[1] as string)?.trim() },
		};
	}

	const implantMatch = text.match(
		/(?:поставь|добавь)?\s*имплант(?:ат)?\s*(\d+[.,]?\d*)\s*(?:на|x|х)\s*(\d+[.,]?\d*)/i,
	);
	if (implantMatch && !text.includes("зуб")) {
		return {
			action: "add_implant",
			payload: {
				diameter: parseFloat(
					(implantMatch[1] as string)?.replace(",", ".") || "0",
				),
				length: parseFloat(
					(implantMatch[2] as string)?.replace(",", ".") || "0",
				),
			},
		};
	}

	if (context === "visit") {
		const teethCodes = expandToothRanges(text);
		const clauses = text.split(/[.,;!?]/).filter(Boolean);
		const toothUpdates: ToothUpdate[] = [];
		const emkUpdates: EmkUpdates = {};
		let hasValidMatch = false;

		const cost = extractCost(text);
		if (cost) emkUpdates.costRub = cost;

		const anesthesia = extractDentalAnesthesia(text);
		const procedures = extractDentalProcedures(
			text,
			teethCodes.length > 0 ? Number(teethCodes[0]) : undefined,
		);
		const globalSurfaces = extractToothSurfaces(text);
		const globalDiag = matchDentalDiagnosis(text);

		extractEmkSections(text, emkUpdates);
		const hasStructuredEmk = !!(
			emkUpdates.complaint ||
			emkUpdates.objectiveStatus ||
			emkUpdates.diagnosis ||
			emkUpdates.treatmentPlan
		);

		if (teethCodes.length > 0) {
			for (const clause of clauses) {
				const localTeeth = expandToothRanges(clause);
				const clauseSurfaces = extractToothSurfaces(clause);

				const { foundState, clinicalState, diagCode, diagTitle } =
					matchClauseStateAndDiagnosis(clause, globalDiag);

				if (foundState) {
					const targetTeeth = localTeeth.length > 0 ? localTeeth : teethCodes;
					const effectiveSurfaces =
						clauseSurfaces.length > 0
							? clauseSurfaces
							: globalSurfaces.length > 0
								? globalSurfaces
								: undefined;

					targetTeeth.forEach((code) => {
						if (
							!toothUpdates.some(
								(tu) => tu.code === code && tu.state === foundState,
							)
						) {
							toothUpdates.push({
								code,
								state: foundState!,
								surfaces: effectiveSurfaces,
								clinicalState,
								diagnosisCode: diagCode,
								diagnosisTitle: diagTitle,
							});
						}
					});
					hasValidMatch = true;
				}
			}
		}

		if (anesthesia) {
			emkUpdates.anesthesia = anesthesia;
			hasValidMatch = true;
		}

		if (procedures.length > 0) {
			emkUpdates.procedures = procedures;
			hasValidMatch = true;
		}

		if (globalDiag && !emkUpdates.diagnosis) {
			emkUpdates.diagnosis = `${globalDiag.code} ${globalDiag.title}`;
			emkUpdates.diagnosisIcd10 = globalDiag.code;
			hasValidMatch = true;
		}

		// If we don't have structured EMK from doctor's section headers, synthesize a clean SOAP 043/u record
		if (!hasStructuredEmk && (teethCodes.length > 0 || globalDiag || anesthesia || procedures.length > 0)) {
			const synth = synthesizeSoapRecord(
				text,
				teethCodes.map(Number),
				globalSurfaces,
				globalDiag,
				anesthesia,
				procedures,
			);
			if (!emkUpdates.complaint && synth.complaint) emkUpdates.complaint = synth.complaint;
			if (!emkUpdates.anamnesis && synth.anamnesis) emkUpdates.anamnesis = synth.anamnesis;
			if (!emkUpdates.objectiveStatus && synth.objectiveStatus) emkUpdates.objectiveStatus = synth.objectiveStatus;
			if (!emkUpdates.diagnosis && synth.diagnosis) emkUpdates.diagnosis = synth.diagnosis;
			if (!emkUpdates.diagnosisIcd10 && synth.diagnosisIcd10) emkUpdates.diagnosisIcd10 = synth.diagnosisIcd10;
			if (!emkUpdates.treatmentPlan && synth.treatmentPlan) emkUpdates.treatmentPlan = synth.treatmentPlan;
			if (!emkUpdates.recommendations && synth.recommendations) emkUpdates.recommendations = synth.recommendations;
		}

		// If we couldn't match a specific tooth or emk section, try a broader fallback
		if (!hasValidMatch && text.length > 10 && !hasStructuredEmk) {
			if (text.includes("жалоб")) emkUpdates.complaint = text;
			else if (text.includes("анамнез")) emkUpdates.anamnesis = text;
			else if (text.includes("диагноз")) emkUpdates.diagnosis = text;
			else return null; // If it's a completely generic string, let the LLM sort it out
			hasValidMatch = true;
		}

		if (hasValidMatch || cost || hasStructuredEmk) {
			if (emkUpdates.complaint && !hasStructuredEmk)
				emkUpdates.complaint =
					emkUpdates.complaint.charAt(0).toUpperCase() +
					emkUpdates.complaint.slice(1);
			return {
				action: "update_tooth",
				payload: {
					toothUpdates,
					emkUpdates,
					anesthesia: anesthesia || undefined,
					procedures: procedures.length > 0 ? procedures : undefined,
				},
				toothUpdates,
				emkUpdates,
				anesthesia: anesthesia || undefined,
				procedures: procedures.length > 0 ? procedures : undefined,
			};
		}
		return null;
	}

	if (context === "patient") {
		const phoneMatch = text.match(
			/(?:\+7|8)[\s-]*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/,
		);
		const nameMatch = text.match(/([А-ЯЁ][а-яё]+(?: [А-ЯЁ][а-яё]+){1,2})/);
		if (phoneMatch || nameMatch) {
			return {
				action: "create_patient",
				payload: {
					fullName: nameMatch ? (nameMatch[1] as string) : null,
					phone: phoneMatch ? phoneMatch[0].replace(/[\s-()]/g, "") : null,
					notes: text,
				},
			};
		}
		return null;
	}

	return null;
}
