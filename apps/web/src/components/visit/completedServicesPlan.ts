/**
 * КАКИЕ ПОЗИЦИИ ПЛАНА ЛЕЧЕНИЯ МОЖНО ОТМЕЧАТЬ В ОТКРЫТОМ ПРИЁМЕ.
 *
 * БЫЛО: список выполненного брал позиции из контекстного
 * `activeTreatmentPlanItems`, а тот отфильтрован по `documentPatient`
 * (useAppLogic.tsx:4949), где `documentPatient = selectedPatient ?? activePatient`,
 * а `selectedPatient` — это пациент, выбранный в разделе «Пациенты»
 * (hooks/domains/usePatientLogic.ts:136-145). Выбор переживает уход из своего
 * раздела, приём его не сбрасывает.
 *
 * Врач вёл приём пациента А, в списке пациентов открытым оставался пациент Б — и
 * внутри карты приёма пациента А перечислялся план лечения ПАЦИЕНТА Б с его
 * ценами. Галочка дописывала «Выполнено: <услуга пациента Б> — 4 500,00 ₽» в
 * поле «План» приёма пациента А, откуда строка уходила в его ЭМК и в кассу.
 *
 * Правило вынесено сюда, чтобы его держал тест, а не внимательность: соблазн
 * вернуться к готовому `activeTreatmentPlanItems` останется у любого, кто будет
 * править этот экран дальше.
 */

/** Заготовка приёма из гидратации базы: нулевой UUID приёмом не считается. */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Настоящий идентификатор или ничего. Пустая строка и нулевой UUID — это «нет
 * значения»: гидратация базы кладёт в `activeVisit` заготовку с нулевым UUID,
 * когда открытых приёмов нет вовсе.
 */
export function realVisitFieldId(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed === NIL_UUID) return null;
	return trimmed;
}

/**
 * Позиции плана, которые принадлежат пациенту ОТКРЫТОГО приёма и ещё не
 * отменены. Без идентификатора пациента приёма отмечать нельзя ничего: строка
 * «Выполнено…» уходит в карту конкретного человека, и ошибиться тут нечем
 * оправдать.
 */
export function visitOwnedPlanItems(
	treatmentPlanItems: unknown,
	visitPatientId: string | null,
): any[] {
	if (!visitPatientId) return [];
	if (!Array.isArray(treatmentPlanItems)) return [];
	return treatmentPlanItems.filter(
		(item: any) => item?.patientId === visitPatientId && item?.status !== "cancelled",
	);
}
