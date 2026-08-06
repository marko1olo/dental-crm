import {
	anesthesiaConsentPayloadSchema,
	anesthesiaDoseRowSchema,
} from "@dental/shared";

/**
 * Длина текста в журнале анестезии: отказ сервера был неотличим от «не заполнено».
 *
 * ЧТО ПРОИСХОДИЛО. У содержимого журнала анестезии есть жёсткие пределы длины —
 * они объявлены в схеме, которой сервер проверяет запрос
 * (anesthesiaConsentPayloadSchema и anesthesiaDoseRowSchema в
 * packages/shared/src/index.ts:3347-3368): аллергоанамнез не длиннее 240
 * символов, реакция 240, ограничения 500, метод и препарат по 160, зона 160,
 * время и доза по 40.
 *
 * Ни одно поле формы об этих пределах не знало, и сборщик содержимого
 * (documentLogic.ts:1009-1044) отправляет набранное как есть, только обрезав
 * пробелы по краям. Врач, вписавший настоящий аллергоанамнез — «на лидокаин отёк
 * лица в 2019 году, на артикаин с адреналином тахикардия, непереносимость
 * метронидазола…» — переходил за 240 символов и получал в ответ
 * «Документ не создан: выберите пациента, тип документа и заполните обязательные
 * поля формы» (documentCreateValidationMessage на сервере: схема не сошлась, и
 * сервер отвечает одной общей строкой). Пациент выбран, тип выбран, все видимые
 * поля заполнены — сообщение говорило о другой беде, а настоящую причину узнать
 * было нельзя ничем.
 *
 * ПОЧЕМУ НЕ maxLength НА ПОЛЕ. Атрибут maxLength обрезает и вставку из буфера:
 * врач вставил бы историю аллергий целиком, браузер молча оставил бы первые 240
 * символов, и документ ушёл бы на подпись с обрезанной посередине клинической
 * записью. Молча потерять медицинский текст хуже, чем отказать. Поэтому предел
 * не запрещает набор, а показывается: видно, какое поле и на сколько символов
 * длиннее, и врач сокращает его сам.
 *
 * ПРЕДЕЛЫ НЕ ПЕРЕПИСАНЫ ЧИСЛАМИ, А ВЗЯТЫ ИЗ САМОЙ СХЕМЫ. Вторая копия числа 240
 * разошлась бы с сервером при первом же изменении схемы, и форма снова начала бы
 * обещать то, чего сервер не принимает.
 *
 * ЧТО ЗДЕСЬ НЕ ИЗМЕРЕНО, ЧЕСТНО. Проверка типов подтверждает, что обёртки схемы
 * разобраны верно (`nullable().optional()` снимается двумя `unwrap`, иначе сборка
 * не прошла бы) и что `maxLength` у строкового описания существует. САМИ ЧИСЛА в
 * запущенном приложении не замерены: правка ограничена каталогом
 * components/documents, а тесты живут в src/tests, поэтому сторожа с настоящим
 * значением 240 здесь нет. Если `maxLength` вернёт null, позиция молча
 * пропускается — предупреждение не появится, но и ложного обвинения не будет:
 * поведение станет прежним, а не худшим. Сторож заявлен долгом в отчёте пакета.
 *
 * ОТДЕЛЬНО — ПРЕДЕЛ, КОТОРЫЙ НЕ ПРИНАДЛЕЖИТ НИ ОДНОМУ ПОЛЮ. В строку дозы
 * уходит склейка «препарат, вазоконстриктор» (documentLogic.ts:1021-1026), и у
 * неё свой предел 120 — меньше, чем 160 у поля препарата. То есть препарат и
 * вазоконстриктор могут каждый пройти свою проверку, а вместе не пройти. Для
 * человека это невидимая пропасть, поэтому склейка проверяется отдельной
 * позицией.
 */

/** Предел длины одного поля журнала, взятый из схемы содержимого. */
export interface AnesthesiaTextLimit {
	/** Ключ поля состояния: устойчив к переименованию подписи. */
	field: string;
	/** Подпись ровно как в форме — человек ищет её глазами. */
	label: string;
	/** Сколько символов принимает сервер. */
	limit: number;
	/** Сколько набрано сейчас. */
	length: number;
}

export interface AnesthesiaTextLimitsReview {
	/** Поля, которые сервер уже не примет, в порядке подписей формы. */
	tooLong: AnesthesiaTextLimit[];
}

export interface AnesthesiaTextLimitsInput {
	method: string;
	anesthetic: string;
	vasoconstrictor: string;
	zone: string;
	allergyStatus: string;
	restrictionNotes: string;
	doseTime: string;
	doseMl: string;
	reaction: string;
}

const payloadShape = anesthesiaConsentPayloadSchema.shape;
const doseRowShape = anesthesiaDoseRowSchema.shape;

/**
 * Предел строки из схемы. `maxLength` у строкового описания Zod возвращает
 * наибольшее из объявленных `max`, а если предел не объявлен — null; в этом
 * случае поле просто не проверяется по длине, и подставлять сюда своё число
 * нельзя: это была бы выдумка вместо контракта.
 */
function limitOf(schema: { maxLength: number | null }): number | null {
	return schema.maxLength;
}

/** Пределы полей, у которых в схеме стоит `nullable().optional()`. */
const vasoconstrictorLimit = limitOf(
	payloadShape.vasoconstrictor.unwrap().unwrap(),
);
const restrictionNotesLimit = limitOf(
	payloadShape.restrictionNotes.unwrap().unwrap(),
);
const reactionLimit = limitOf(doseRowShape.reaction.unwrap().unwrap());

/**
 * Предел склейки «препарат, вазоконстриктор», которая уходит в строку дозы.
 * Ни одному полю формы он не принадлежит.
 */
export const ANESTHESIA_MEDICATION_JOIN_LIMIT = limitOf(
	doseRowShape.medication,
);

/** Разделитель склейки — дословно как в сборщике содержимого. */
const MEDICATION_JOIN_SEPARATOR = ", ";

function trimmedLength(value: string): number {
	return String(value ?? "").trim().length;
}

/** Склейка препарата и вазоконстриктора ровно так, как её собирает documentLogic. */
export function anesthesiaMedicationJoin(
	anesthetic: string,
	vasoconstrictor: string,
): string {
	return [String(anesthetic ?? "").trim(), String(vasoconstrictor ?? "").trim()]
		.filter(Boolean)
		.join(MEDICATION_JOIN_SEPARATOR);
}

export function anesthesiaTextLimitsReview(
	input: AnesthesiaTextLimitsInput,
): AnesthesiaTextLimitsReview {
	const medicationJoin = anesthesiaMedicationJoin(
		input.anesthetic,
		input.vasoconstrictor,
	);

	const candidates: Array<{
		field: string;
		label: string;
		limit: number | null;
		length: number;
	}> = [
		{
			field: "anesthesiaMethod",
			label: "Метод",
			limit: limitOf(payloadShape.method),
			length: trimmedLength(input.method),
		},
		{
			field: "anesthesiaAnesthetic",
			label: "Препарат",
			limit: limitOf(payloadShape.anesthetic),
			length: trimmedLength(input.anesthetic),
		},
		{
			field: "anesthesiaVasoconstrictor",
			label: "Вазоконстриктор",
			limit: vasoconstrictorLimit,
			length: trimmedLength(input.vasoconstrictor),
		},
		{
			field: "anesthesiaMedicationJoin",
			label: "Препарат и вазоконстриктор вместе",
			limit: ANESTHESIA_MEDICATION_JOIN_LIMIT,
			length: medicationJoin.length,
		},
		{
			field: "anesthesiaZone",
			label: "Зона",
			limit: limitOf(payloadShape.plannedZone),
			length: trimmedLength(input.zone),
		},
		{
			field: "anesthesiaAllergyStatus",
			label: "Аллергоанамнез",
			limit: limitOf(payloadShape.allergyStatus),
			length: trimmedLength(input.allergyStatus),
		},
		{
			field: "anesthesiaDoseTime",
			label: "Время",
			limit: limitOf(doseRowShape.time),
			length: trimmedLength(input.doseTime),
		},
		{
			field: "anesthesiaDoseMl",
			label: "Доза, мл",
			limit: limitOf(doseRowShape.doseMl),
			length: trimmedLength(input.doseMl),
		},
		{
			field: "anesthesiaReaction",
			label: "Реакция",
			limit: reactionLimit,
			length: trimmedLength(input.reaction),
		},
		{
			field: "anesthesiaRestrictionNotes",
			label: "Ограничения",
			limit: restrictionNotesLimit,
			length: trimmedLength(input.restrictionNotes),
		},
	];

	const tooLong: AnesthesiaTextLimit[] = [];
	for (const candidate of candidates) {
		if (candidate.limit === null) continue;
		if (candidate.length <= candidate.limit) continue;
		tooLong.push({
			field: candidate.field,
			label: candidate.label,
			limit: candidate.limit,
			length: candidate.length,
		});
	}
	return { tooLong };
}
