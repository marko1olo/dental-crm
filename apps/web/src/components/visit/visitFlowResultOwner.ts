/**
 * Привязка остатка состояния ЭМК к конкретному пациенту и приёму.
 * Исключает утечку чужого разбора приёма и расписки сохранения между пациентами.
 */

/** Результат, для которого владелец уже записан (сравнение по ссылке). */
let ownedResult: object | null = null;
/** Пациент и приём, которым принадлежит `ownedResult`. */
let ownerKey: string | null = null;

/**
 * Ключ владельца разбора: пациент плюс приём. Приём входит в ключ потому, что
 * второй приём того же человека — это другой разбор, и рекомендации первого
 * приёма во втором показывать нельзя.
 */
export function visitFlowOwnerKey(
	patientId: unknown,
	visitId: unknown,
): string {
	const patient =
		typeof patientId === "string" && patientId.trim()
			? patientId.trim()
			: "нет-пациента";
	const visit =
		typeof visitId === "string" && visitId.trim()
			? visitId.trim()
			: "нет-приёма";
	return `${patient}|${visit}`;
}

/**
 * Запомнить, кому принадлежит показанный разбор. Повторный вызов с тем же
 * объектом владельца НЕ меняет: иначе разбор пациента А переписался бы на
 * пациента Б ровно тем действием, которое обязано его скрыть.
 */
export function rememberVisitFlowResultOwner(
	result: unknown,
	owner: string,
): void {
	if (!result || typeof result !== "object") {
		forgetVisitFlowResultOwner();
		return;
	}
	if (ownedResult !== result) {
		ownedResult = result as object;
		ownerKey = owner;
	}
}

/**
 * Разбор принадлежит другому пациенту или другому приёму — показывать его
 * нельзя. Неизвестный (ещё не привязанный) разбор чужим не считается: его
 * только что получил текущий приём, привязка появится тем же рендером.
 */
export function visitFlowResultIsForeign(
	result: unknown,
	owner: string,
): boolean {
	if (!result || typeof result !== "object") return false;
	if (ownedResult !== result) return false;
	return ownerKey !== owner;
}

/** Забыть привязку — после того, как чужой разбор убран из хранилища. */
export function forgetVisitFlowResultOwner(): void {
	ownedResult = null;
	ownerKey = null;
}

/**
 * РАСПИСКА СЕРВЕРА О СОХРАНЕНИИ ОТНОСИТСЯ К ОТКРЫТОМУ ПРИЁМУ, А НЕ К ЛЮБОМУ.
 *
 * БЫЛО: панель ЭМК печатала последнюю расписку без всякой сверки —
 * `lastVisitSaveReceipt ? visitSaveReceiptText(lastVisitSaveReceipt) : …`.
 * А `setLastVisitSaveReceipt` вызывается РОВНО В ОДНОМ месте (после удачного
 * ответа /draft/accept) и никогда с null: ни смена пациента, ни смена приёма,
 * ни закрытие приёма её не сбрасывают.
 *
 * Что видел врач: сохранил приём пациента А — под щитом появилось «Сервер
 * подтвердил сохранение 14:32, версия карты 3». Открыл приём пациента Б, где
 * запись ещё ПУСТАЯ, — и прочитал ту же строку. Пустая запись отчитывалась как
 * сохранённая, чужим временем и чужой версией карты; настоящая подсказка
 * («Запись приёма пока пустая. Продиктуйте или впишите жалобы…») до врача не
 * доходила, потому что стояла последней в той же цепочке.
 *
 * Сверять есть чем: расписка несёт visitId (visitSaveReceiptSchema в
 * packages/shared). Чужую не показываем, но и не выбрасываем — вернётся врач к
 * тому приёму, расписка снова окажется на месте.
 */
export function visitSaveReceiptBelongsToVisit(
	receipt: unknown,
	visitId: unknown,
): boolean {
	if (!receipt || typeof receipt !== "object") return false;
	const receiptVisitId = (receipt as { visitId?: unknown }).visitId;
	if (typeof receiptVisitId !== "string" || !receiptVisitId.trim())
		return false;
	if (typeof visitId !== "string" || !visitId.trim()) return false;
	return receiptVisitId.trim() === visitId.trim();
}
