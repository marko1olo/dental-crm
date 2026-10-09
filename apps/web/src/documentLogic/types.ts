// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export type DocumentState = Record<string, any>;

export type TimestampShape = "dateTime" | "date" | "isoDate" | "dateTimeLocal";

/**
 * Поля отметки времени в документах и вид, в котором их ждёт разметка.
 *
 * ЧТО БЫЛО. Все они вычислялись в хранилище ОДИН РАЗ при загрузке модуля
 * выражением вида `(() => new Date().toLocaleString("ru-RU"))()`. Значение
 * равнялось моменту открытия страницы и больше никогда не обновлялось: ни один
 * код не звал соответствующие сеттеры вне обработчиков ввода. Администратор
 * открывал вкладку утром, вечером создавал договор — «Подписано», «Дата
 * подтверждения согласия», «Дата и время выдачи расписки» несли утренний час.
 * Отличить подставленное от введённого человеком нельзя: поле выглядит
 * заполненным. Для документа, который подписывают, это подделка отметки времени.
 *
 * ЧТО СТАЛО. В хранилище поля пусты, а настоящее время подставляется здесь — в
 * момент создания документа. Это и есть честное значение: отметка равна тому
 * моменту, когда документ действительно составлен. Врач по-прежнему может
 * вписать своё время руками, и тогда оно не трогается.
 *
 * Три вида записи, потому что разметка ждёт разные: дата с временем для отметок
 * подписи и выдачи, только дата для номерных документов, «ГГГГ-ММ-ДД» для полей
 * ввода типа date.
 */
export const DOCUMENT_TIMESTAMP_FIELDS: Array<
	[field: string, shape: TimestampShape]
> = [
	["informedConsentConfirmedAt", "dateTime"],
	["procedureConsentConfirmedAt", "dateTime"],
	["paidContractSignedAt", "dateTime"],
	["paymentReceiptDate", "dateTime"],
	["warrantyIssuedAt", "dateTime"],
	["treatmentEstimateSignedAt", "dateTime"],
	["treatmentPlanPlannedAt", "dateTime"],
	["treatmentAcceptanceAcceptedAt", "dateTime"],
	["postVisitPerformedAt", "dateTime"],
	["minorConsentSignedAt", "dateTime"],
	["recordExtractIssuedAt", "dateTime"],
	["paidContractDate", "date"],
	["paymentInvoiceDate", "date"],
	["installmentScheduleDate", "date"],
	["completedActDate", "date"],
	["treatmentEstimateDate", "date"],
	["personalDataConsentGivenAt", "dateTime"],
	["refusalConfirmedAt", "dateTime"],
	["copyRequestRequestedAt", "dateTime"],
	["attendanceIssuedAt", "dateTime"],
	["releaseDeliveredAt", "dateTime"],
	["recordExtractPeriodStart", "isoDate"],
	["recordExtractPeriodEnd", "isoDate"],
	/*
	 * Поле ввода типа datetime-local ждёт «ГГГГ-ММ-ДДTчч:мм», а не русскую запись.
	 * Подставить сюда «28.07.2026, 14:30» значит показать пустое поле: браузер
	 * молча отбрасывает значение, которое не разбирает.
	 */
	["taxApplicationRequestedAt", "dateTimeLocal"],
];
