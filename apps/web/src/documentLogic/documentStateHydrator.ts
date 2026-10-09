import type { GeneratedDocument } from "@dental/shared";
import { documentPayloadValidators } from "../documentValidators";
import { structuredPayloadDocumentKinds } from "../workspaceUiLabels";
import type { DocumentState } from "./types";

/**
 * Чистые помощники, которых валидаторы и сборщики ждут прямо в состоянии.
 *
 * ЧТО БЫЛО. Все 55 валидаторов в documentValidators.ts достают
 * requiredDocumentField и confirmedDocumentLiteral ИЗ ОБЪЕКТА СОСТОЯНИЯ:
 * `const { paidContractNumber, ..., requiredDocumentField } = state;`. А
 * состояние — это хранилище документов (useDocumentStore), и таких функций в нём
 * нет и никогда не было: они объявлены внутри useAppLogic.
 *
 * Что видел пользователь: нажимает «Создать выбранный документ» — и не
 * происходит НИЧЕГО. В консоли «requiredDocumentField is not a function»,
 * документ не создаётся, сообщения об ошибке нет. Проверено живьём на виде
 * «Согласие» (scratch/verify-document-timestamps.mjs): число документов в базе не
 * менялось. Через структурные валидаторы проходят 31 вид документов из 71 — то
 * есть договор, акт, смета, счёт, расписка, анкета, налоговое заявление и все
 * согласия.
 *
 * ПОЧЕМУ ТАК, А НЕ ПРАВКОЙ 55 ФУНКЦИЙ. Обе функции чистые: одна возвращает текст
 * «Заполните поле», другая бросает исключение при неподтверждённом условии.
 * Держать их в состоянии не было причины. Подставляем их на входе — состояние
 * перечисляется ПОСЛЕ, поэтому если однажды их начнут передавать явно, переданное
 * победит и здесь ничего менять не придётся.
 *
 * ЧТО ЭТИМ НЕ ЛЕЧИТСЯ. Валидаторы и сборщики ждут из состояния ещё и десятки
 * вычисляемых значений вида completedActTotalRubValue — они действительно живут в
 * useAppLogic и подставить их здесь нечем. Виды документов, которым они нужны,
 * упрутся в ту же ошибку, только с другим именем. Это отдельная работа, и она
 * записана долгом.
 */
export function requiredDocumentField(
	value: string,
	label: string,
): string | null {
	return String(value ?? "").trim() ? null : `Заполните поле: ${label}.`;
}

export function confirmedDocumentLiteral(
	value: boolean,
	label: string,
): true {
	if (!value) {
		throw new Error(
			`Не подтверждено обязательное условие документа: ${label}.`,
		);
	}
	return true;
}

export function withDocumentHelpers(state: DocumentState): DocumentState {
	return { requiredDocumentField, confirmedDocumentLiteral, ...state };
}

export function validateDocumentPayloadForKind(
	kind: GeneratedDocument["kind"],
	state: DocumentState,
): string[] | string | null {
	if (!structuredPayloadDocumentKinds.has(kind)) return null;
	const validator = documentPayloadValidators[kind];
	if (validator) {
		return validator(withDocumentHelpers(state));
	}
	return null;
}

/**
 * Безопасная гидратация состояния формы документа профилями клиники, врача и пациента.
 */
export function hydrateDocumentStateWithProfiles(
	state: DocumentState,
	context: {
		clinicProfileDraft?: DocumentState["clinicProfileDraft"];
		documentPatient?: DocumentState["documentPatient"];
		activeDoctor?: DocumentState["activeDoctor"];
		dashboard?: DocumentState["dashboard"];
	},
): DocumentState {
	return {
		...state,
		clinicProfileDraft: context.clinicProfileDraft ?? state.clinicProfileDraft,
		documentPatient: context.documentPatient ?? state.documentPatient,
		activeDoctor: context.activeDoctor ?? state.activeDoctor,
		dashboard: context.dashboard ?? state.dashboard,
	};
}
