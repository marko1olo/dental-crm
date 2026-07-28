/**
 * ЧЕЙ ЭТО ПРИЁМ И В ЧЬЮ КАРТУ ПИШЕТ ЭКРАН.
 *
 * Экран «Приём» держит сразу ДВА разных понятия «текущий пациент», и они
 * расходятся:
 *   • пациент открытого приёма — `dashboard.activeVisit.patientId`;
 *   • выбранный пациент — `patientStore.selectedPatientId`, тот, что открыт в
 *     разделе «Пациенты». Выбор переживает уход из своего раздела, и приём его
 *     не сбрасывает; хуже того, PatientsView сам переставляет выбор на первую
 *     строку отфильтрованного списка.
 *
 * Панели приёма привязаны к разным из них, поэтому одна вкладка может писать в
 * одну карту, а показывать другую. Здесь собраны проверки, чтобы ответ на
 * вопрос «чей?» был один и тот же во всех панелях приёма и чтобы его держал
 * тест.
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
 * Куда ляжет снимок и заключение с вкладки «Рентгены и Диагностика».
 *
 * components/imaging/VisiographAnalyzer.tsx пишет разбор снимка в карту
 * `patientStore.selectedPatientId` — и снимок, и текст заключения, и найденные
 * ИИ состояния зубов. Пропсов он не принимает, пациента приёма не знает и
 * ничего о расхождении не говорит. Значит, врач, заглянувший перед приёмом в
 * карточку другого человека, кладёт снимок пациента приёма в ЧУЖУЮ карту, а
 * заметить это на экране нечем.
 *
 * Возвращаемые значения:
 *   • "visit-patient"   — выбран пациент приёма, всё в порядке;
 *   • "another-patient" — выбран ДРУГОЙ пациент: запись уйдёт в чужую карту;
 *   • "nobody"          — пациент не выбран: разбор будет, записи в карту нет;
 *   • "no-visit"        — приём не открыт, сравнивать не с кем.
 */
export type ImagingWriteTarget = "visit-patient" | "another-patient" | "nobody" | "no-visit";

export function imagingWriteTarget(
	selectedPatientId: unknown,
	visitPatientId: unknown,
): ImagingWriteTarget {
	const selected = realVisitFieldId(selectedPatientId);
	const visitPatient = realVisitFieldId(visitPatientId);
	if (!selected) return visitPatient ? "nobody" : "no-visit";
	if (!visitPatient) return "no-visit";
	return selected === visitPatient ? "visit-patient" : "another-patient";
}
