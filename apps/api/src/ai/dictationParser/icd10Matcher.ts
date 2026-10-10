import type { ToothUpdate } from "./types.js";
import {
	matchDentalDiagnosis,
	type ClinicalToothState,
} from "../dentalSpeechGrammar.js";

export const STATE_MAPPING: Record<string, ToothUpdate["state"]> = {
	кариес: "treatment",
	пульпит: "treatment",
	периодонтит: "treatment",
	эндодонтия: "treatment",
	лечить: "treatment",
	лечение: "treatment",
	пломба: "treatment",
	отсутствует: "missing",
	удален: "missing",
	удалили: "missing",
	удалить: "missing",
	нет: "missing",
	экстракция: "missing",
	"план на имплант": "planned",
	имплантация: "planned",
	"план имплантации": "planned",
	наблюдать: "watch",
	осмотр: "watch",
	наблюдение: "watch",
	рентген: "watch",
	кт: "watch",
	вылечен: "done",
	здоров: "done",
	санирован: "done",
	коронка: "prosthetics",
	коронку: "prosthetics",
	винир: "prosthetics",
	мост: "prosthetics",
	имплант: "implant",
	имплантат: "implant",
	имплантан: "implant",
	налет: "calculus",
	камень: "calculus",
	"зубной камень": "calculus",
	чистка: "calculus",
	профгигиена: "calculus",
};

export interface MatchedClauseDiagnosis {
	foundState: ToothUpdate["state"] | null;
	clinicalState?: ClinicalToothState | undefined;
	diagCode?: string | undefined;
	diagTitle?: string | undefined;
}

export function matchClauseStateAndDiagnosis(
	clause: string,
	globalDiag: ReturnType<typeof matchDentalDiagnosis> | null,
): MatchedClauseDiagnosis {
	const clauseDiag = matchDentalDiagnosis(clause);

	let foundState: ToothUpdate["state"] | null = null;
	let clinicalState: ClinicalToothState | undefined;
	let diagCode: string | undefined;
	let diagTitle: string | undefined;

	if (clauseDiag) {
		foundState = clauseDiag.toothState;
		clinicalState = clauseDiag.clinicalState;
		diagCode = clauseDiag.code;
		diagTitle = clauseDiag.title;
	} else {
		for (const [keyword, state] of Object.entries(STATE_MAPPING)) {
			const regex = new RegExp(`(^|[^а-яё])${keyword}([^а-яё]|$)`, "i");
			if (regex.test(clause)) {
				foundState = state;
				break;
			}
		}
	}

	if (!foundState && globalDiag) {
		foundState = globalDiag.toothState;
		clinicalState = globalDiag.clinicalState;
		diagCode = globalDiag.code;
		diagTitle = globalDiag.title;
	}

	return {
		foundState,
		clinicalState,
		diagCode,
		diagTitle,
	};
}
