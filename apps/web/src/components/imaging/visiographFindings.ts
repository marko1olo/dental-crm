/**
 * visiographFindings.ts — что из разбора снимка попадает в зубную формулу.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Это решение о содержимом карты пациента: какие находки
 * ИИ становятся диагнозом в формуле, а какие врач ставит руками. Внутри
 * компонента его нельзя было проверить прогоном — только глазами на экране, где
 * для одного разбора нужен платный вызов внешней модели. Ошибка здесь не видна
 * ни в типах, ни на экране: формула просто окажется не той.
 *
 * ЧТО БЫЛО СЛОМАНО ДО ЭТОГО РАЗБОРА. Находки писались в
 * store/patientStore.odontogramState через setToothStatus, а этот стор читал
 * РОВНО ОДИН файл во всём apps/web/src — несмонтированный
 * components/Odontogram.tsx. Живая формула на карточке пациента
 * (components/odontogram/OdontogramModule.tsx) берёт состояния зубов С СЕРВЕРА.
 * Экран при этом печатал врачу «Внесено в зубную формулу: N зубов из M»: врачу
 * сообщали о записи в карту, которой не было, и после перезагрузки страницы
 * находки исчезали вместе со стором. Вдобавок прежний маппинг вёл в значение
 * `Filling`, которого в перечислении сервера нет вовсе (там `Filled`).
 */

import { isValidFdiToothNumber } from "@dental/shared";
import type { ToothState } from "../odontogram/ToothChart";

/**
 * Статусы ИИ, у которых есть точное соответствие в живой формуле.
 *
 * Словарь статусов задан промптом на сервере — apps/api/src/ai/visiographPrompt.ts,
 * раздел «ЭКСПОРТ ДАННЫХ ДЛЯ ЗУБНОЙ ФОРМУЛЫ». Соответствие есть только у двух из
 * пяти:
 *   "treatment" («требует лечения кариеса, пульпита, периодонтита или замены
 *      пломбы») → Caries. Именно это состояние ставит зуб в очередь плана
 *      лечения (OdontogramModule → pendingPlanSuggestions), то есть ровно то,
 *      зачем врач разбирает снимок. Точный диагноз врач подтверждает по тексту
 *      заключения рядом и правит отметку на схеме одним нажатием;
 *   "missing" («зуб отсутствует») → Missing. Совпадение точное.
 */
export const AI_TO_TOOTH_STATE: Record<string, ToothState> = {
	treatment: "Caries",
	missing: "Missing",
};

/**
 * Статусы, которые помощник назвал ПОНЯТНО, но состояния под них в формуле нет.
 * В карту они не пишутся, потому что любая запись была бы выдумкой о пациенте:
 *   "planned" — «запланировано вмешательство». Состояния «вмешательство
 *      запланировано» в формуле нет: единственное плановое, Planned_Implant,
 *      означает конкретно имплантат;
 *   "watch" — «требует наблюдения». Это не диагноз. Пометить кариесом значит
 *      записать пациенту болезнь, которой врач не подтвердил;
 *   "done" — «ранее вылечен». Не сказано ЧЕМ: пломбой, коронкой, каналами.
 *      Формула требует выбрать одно, и любой выбор был бы домыслом.
 * Врачу они называются отдельно от непонятых — слова нужны разные, потому что
 * действие разное: здесь находка ясна и её надо отметить руками.
 */
export const AI_STATES_WITHOUT_FORMULA_STATE: Record<string, string> = {
	planned: "запланировано вмешательство",
	watch: "требует наблюдения",
	done: "ранее вылечен",
};

/** Одна находка: код зуба как его назвал ИИ и разобранный номер FDI. */
export interface VisiographFinding {
	readonly code: string;
	readonly toothNumber: number;
}

export interface VisiographFindingPlan {
	/**
	 * Группы «одно состояние — список зубов». Маршрут формулы принимает ОДНО
	 * состояние на запрос (`{ toothNumbers, state }`), поэтому группировка здесь:
	 * один запрос на группу вместо запроса на зуб — это и меньше нагрузки, и одна
	 * запись в истории зуба на группу, как при работе врача групповым выбором.
	 */
	readonly groups: ReadonlyArray<{ readonly state: ToothState; readonly teeth: readonly VisiographFinding[] }>;
	/** Непонятое состояние или номер зуба вне FDI — врач смотрит место сам. */
	readonly unreadableCodes: readonly string[];
	/** Состояние понятно, места в формуле нет — врач ставит отметку руками. */
	readonly noFormulaStateCodes: readonly string[];
}

/**
 * Разбор ответа модели в план записи.
 *
 * Номер зуба проверяется общим правилом FDI (@dental/shared), а не своим
 * списком: «зуб 99» и «зуб 0» — это мусор, и проверять его надо тем же кодом,
 * что смета и одонтограмма. Раньше здесь стоял `parseInt(code, 10)` с проверкой
 * только на NaN, и `parseInt("12abc")` = 12 проходил как номер зуба.
 *
 * Неузнанное состояние НЕ превращается в «кариес». Раньше стояло
 * `AI_TO_ODONTOGRAM[state] ?? 'Caries'`, то есть опечатка модели, новое слово или
 * пустая строка становились диагнозом в карте пациента — а по нему потом строится
 * план лечения и смета.
 */
export function planVisiographFindings(
	toothStates: Record<string, string> | null | undefined,
): VisiographFindingPlan {
	const unreadableCodes: string[] = [];
	const noFormulaStateCodes: string[] = [];
	const byState = new Map<ToothState, VisiographFinding[]>();

	for (const [code, state] of Object.entries(toothStates ?? {})) {
		const toothNumber = Number(code.trim());
		const validTooth = isValidFdiToothNumber(toothNumber);
		const mapped = validTooth ? AI_TO_TOOTH_STATE[state] : undefined;
		if (!mapped) {
			if (validTooth && AI_STATES_WITHOUT_FORMULA_STATE[state]) noFormulaStateCodes.push(code);
			else unreadableCodes.push(code);
			continue;
		}
		const group = byState.get(mapped) ?? [];
		group.push({ code, toothNumber });
		byState.set(mapped, group);
	}

	return {
		groups: [...byState].map(([state, teeth]) => ({ state, teeth })),
		unreadableCodes,
		noFormulaStateCodes,
	};
}
