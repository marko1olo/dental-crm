import { countLabel } from "../../lib/russianPlural";

/**
 * Что из разбора диктовки реально можно перенести в карту приёма — и что об
 * этом сказать врачу словами.
 *
 * БЫЛО: панель предпросмотра разбора закрывалась по кнопке «Применить» всегда,
 * что бы в разборе ни лежало. Когда местный разбор не справлялся, там лежит
 * `{ isAiTask, prompt }` — ни зубов, ни полей ЭМК. Врач в перчатках диктовал
 * осмотр, жал «Применить», окно исчезало, и приём считался записанным: в карте
 * при этом не появлялось ни одной буквы. Логика «что перенесено» вынесена
 * сюда, чтобы её можно было проверить тестом, а не глазами.
 */

export type DictationToothUpdate = { code: string; state: string };

/** Отметки зубов из разбора: без кода зуба отметка бессмысленна. */
export function dictationToothUpdates(data: unknown): DictationToothUpdate[] {
	const raw = (data as { toothUpdates?: unknown } | null)?.toothUpdates;
	if (!Array.isArray(raw)) return [];
	return raw
		.filter(
			(item): item is DictationToothUpdate =>
				!!item &&
				typeof (item as DictationToothUpdate).code === "string" &&
				(item as DictationToothUpdate).code.trim().length > 0,
		)
		.map((item) => ({ code: item.code, state: item.state }));
}

/**
 * Записи для полей ЭМК. Пустая строка и строка из пробелов — это «ничего»:
 * если их считать переносом, врач получит ответ «перенесено» на пустоту.
 */
export function dictationEmkEntries(data: unknown): Array<[string, string]> {
	const raw = (data as { emkUpdates?: unknown } | null)?.emkUpdates;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
	return Object.entries(raw as Record<string, unknown>).filter(
		(entry): entry is [string, string] =>
			typeof entry[1] === "string" && entry[1].trim().length > 0,
	);
}

/** Человеческие названия полей карты: врач видит «жалобы», а не complaint. */
const emkFieldTitles: Record<string, string> = {
	complaint: "жалобы",
	anamnesis: "анамнез",
	objectiveStatus: "осмотр",
	diagnosis: "диагноз",
	treatmentPlan: "план лечения",
};

export function dictationEmkFieldTitle(key: string): string {
	return emkFieldTitles[key] ?? key;
}

/** Переносить нечего: разбор пустой либо требует ИИ. */
export const DICTATION_NOTHING_TO_APPLY_NOTE =
	"Переносить нечего: в разборе нет ни зубов, ни записей приёма. Текст диктовки никуда не пропал — он остался в поле выше. Нажмите «ИИ-Анализ» или впишите жалобы, осмотр и диагноз в поля карты руками.";

/** Поля карты недоступны — отказ, а не успех. */
export const DICTATION_WRITE_FAILED_NOTE =
	"Записать в карту приёма не удалось: поля карты сейчас недоступны. Текст диктовки остался в поле выше — обновите страницу и повторите, а если не поможет, сообщите администратору клиники.";

/**
 * Честная расписка о переносе: перечисляет поля и число зубов. Счётное слово
 * склоняется через общий countLabel — «1 зуб», «2 зуба», «5 зубов».
 */
export function dictationAppliedNote(
	writtenFieldKeys: string[],
	toothCount: number,
): string {
	const parts: string[] = [];
	if (writtenFieldKeys.length) {
		parts.push(writtenFieldKeys.map(dictationEmkFieldTitle).join(", "));
	}
	if (toothCount > 0) {
		parts.push(countLabel(toothCount, "зуб", "зуба", "зубов"));
	}
	return `Перенесено в карту приёма: ${parts.join("; ")}. Проверьте текст в полях карты.`;
}
