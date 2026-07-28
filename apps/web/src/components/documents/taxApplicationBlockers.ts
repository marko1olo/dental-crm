import type {
	TaxDeductionApplicationForm as TaxDeductionApplicationFormKind,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { isDateInputValue } from "../../AppHelpers";

/**
 * Что мешает создать заявление на налоговую справку — весь перечень сразу.
 *
 * ЧТО ВИДЕЛ АДМИНИСТРАТОР. Вид «Заявление на налоговую справку»: десять полей и
 * одна галочка в свёрнутом блоке, и ни одной пометки, что из них обязательно.
 * Проверка (validateTaxDeductionApplication в documentValidators.ts:635) — это
 * цепочка `??`, она отдаёт одну позицию за нажатие «Создать выбранный документ»:
 * сначала «Заполните поле: налоговое заявление, заявитель», потом про ИНН, потом
 * «Укажите дату рождения заявителя…», потом про документ заявителя, потом про
 * полномочия представителя, потом про контакт, и напоследок про отметку о дубле.
 * До первого нажатия на экране ничего не помечено.
 *
 * ТРИ ЛОВУШКИ, КОТОРЫЕ НЕ УГАДАТЬ ПО ВИДУ ЭКРАНА.
 *
 *  • ИНН обязателен НЕ ВСЕГДА. Для старой справки (2021-2023) он обязателен и
 *    должен быть из 10 или 12 цифр. Для КНД 1151156 его можно не заполнять
 *    вовсе, но если заполнен — ровно 12 цифр. Значит, один и тот же 10-значный
 *    ИНН годится для одной формы и запрещён для другой, а переключение списка
 *    «Форма» молча делает уже введённое неверным.
 *
 *  • «Полномочия представителя» становятся ОБЯЗАТЕЛЬНЫМИ, как только родство не
 *    «сам пациент». В подписи пустого поля при этом стояло «если заявитель не
 *    сам пациент» — то есть поле читалось как необязательное ровно в том случае,
 *    когда без него документа не будет.
 *
 *  • «Кому сообщить о готовности» обязательно, а подписи-подсказки у поля не было
 *    вовсе.
 *
 * ЧТО ЗДЕСЬ. Тот же разбор, целиком и до нажатия, в порядке проверки. Про ИНН
 * позиция одна, а не три: человеку нужно одно действие, а не перечисление веток
 * правила.
 *
 * ЧТО СЮДА НЕ ВОШЛО И ПОЧЕМУ. Дата заявления: проверка требует её календарный
 * вид, но пустую её подставляет withDocumentCreationTimestamps в момент создания
 * (documentLogic.ts:69), а непустую браузер держит в правильном виде сам — поле
 * объявлено как datetime-local. Требовать её от человека значит просить вписать
 * то, что программа знает сама.
 *
 * ПОЧЕМУ КОПИЯ ПРАВИЛА, А НЕ ВЫЗОВ ВАЛИДАТОРА. Валидатор физически не умеет
 * отдать больше одной позиции (`a ?? b ?? c` останавливается на первой непустой)
 * и требует весь DocumentState, которого у формы нет. Разбор календарного вида
 * даты НЕ копируется: берётся та же isDateInputValue, которой пользуется сам
 * валидатор.
 *
 * НЕЗАКРЫТЫЙ ДОЛГ, ЧЕСТНО. Сторожа расхождения с валидатором здесь нет: правка
 * ограничена каталогом components/documents, а тесты живут в src/tests. Такой
 * сторож нужен, он заявлен долгом в отчёте пакета.
 */

/** Одно невыполненное условие заявления. */
export interface TaxApplicationBlocker {
	/** Ключ поля состояния: устойчив к переименованию подписи. */
	field: string;
	/** Подпись ровно как в форме — человек ищет её глазами. */
	label: string;
	/** Что именно сделать. Тупиковых подсказок быть не должно. */
	hint: string;
}

export interface TaxApplicationBlockersReview {
	/** Сколько условий проверяет заявление (без автоподставляемой даты). */
	requiredCount: number;
	/** Невыполненные, в том же порядке, в каком о них ругается проверка. */
	blockers: TaxApplicationBlocker[];
}

export interface TaxApplicationBlockersInput {
	taxpayerFullName: string;
	taxpayerInn: string;
	taxpayerBirthDate: string;
	taxpayerIdentityDocument: string;
	relationship: TaxDeductionApplicationRelationship;
	form: TaxDeductionApplicationFormKind;
	authorityDocument: string;
	contact: string;
	duplicateWarningAccepted: boolean;
}

function digitsOf(value: string): string {
	return String(value ?? "").replace(/[^\d]/g, "");
}

/**
 * Одна подсказка про ИНН на все три ветки правила: пусто при старой справке,
 * неверная длина, и 10 цифр при КНД 1151156.
 */
function innHint(input: TaxApplicationBlockersInput): string | null {
	const digits = digitsOf(input.taxpayerInn);
	const isLegacy = input.form === "legacy_2021_2023";

	if (digits.length === 0) {
		return isLegacy
			? "для старой справки за 2021-2023 годы ИНН обязателен: 12 цифр у человека или 10 у организации"
			: null;
	}
	if (input.form === "knd_1151156" && digits.length !== 12) {
		return `в ИНН ${digits.length} цифр, а справка КНД 1151156 принимает ровно 12 цифр ИНН человека. Если ИНН нет — очистите поле, тогда заявителя опознают по документу`;
	}
	if (digits.length !== 10 && digits.length !== 12) {
		return `в ИНН ${digits.length} цифр, а нужно 12 у человека или 10 у организации — проверьте номер`;
	}
	return null;
}

export function taxApplicationBlockersReview(
	input: TaxApplicationBlockersInput,
): TaxApplicationBlockersReview {
	const inn = innHint(input);

	const checks: Array<TaxApplicationBlocker & { ok: boolean }> = [
		{
			field: "taxApplicationTaxpayerFullName",
			label: "Заявитель / налогоплательщик",
			hint: "впишите ФИО того, кто получит вычет — оно попадёт в справку",
			ok: String(input.taxpayerFullName ?? "").trim() !== "",
		},
		{
			field: "taxApplicationTaxpayerInn",
			label: "ИНН",
			hint: inn ?? "",
			ok: inn === null,
		},
		{
			field: "taxApplicationTaxpayerBirthDate",
			label: "Дата рождения",
			hint: "выберите дату рождения заявителя в календаре",
			ok: isDateInputValue(String(input.taxpayerBirthDate ?? "")),
		},
		{
			field: "taxApplicationTaxpayerIdentityDocument",
			label: "Документ заявителя",
			hint: "паспорт: серия, номер, кем и когда выдан",
			ok: String(input.taxpayerIdentityDocument ?? "").trim() !== "",
		},
		{
			field: "taxApplicationAuthorityDocument",
			label: "Полномочия представителя",
			hint: "родство не «сам пациент», поэтому нужен документ о полномочиях: доверенность, свидетельство о рождении или о браке",
			ok:
				input.relationship === "self" ||
				String(input.authorityDocument ?? "").trim() !== "",
		},
		{
			field: "taxApplicationContact",
			label: "Кому сообщить о готовности",
			hint: "телефон или другой способ связи: по нему сообщат, что справка готова",
			ok: String(input.contact ?? "").trim() !== "",
		},
		{
			field: "taxApplicationDuplicateWarningAccepted",
			label: "Проверка повторной справки",
			hint: "поставьте отметку: перед выдачей администратор проверит, что справки по тем же расходам ещё не было",
			ok: input.duplicateWarningAccepted,
		},
	];

	return {
		requiredCount: checks.length,
		blockers: checks
			.filter((check) => !check.ok)
			.map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
