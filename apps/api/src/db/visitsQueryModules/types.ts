import type { VisitDraftAutosave } from "@dental/shared";

/**
 * Чем кончился поиск черновика приёма. ТРИ состояния, а не два.
 *
 * ПОЧЕМУ ЭТО НЕ `VisitDraftAutosave | null`, КАК БЫЛО. Прежняя подпись отдавала
 * `null` на ДВА разных состояния базы: строки приёма нет вовсе (включая приём
 * чужой клиники) и строка есть, но приём уже не черновик. Маршрут различить их не
 * мог ничем и называл оба одним отказом — «Прием не найден».
 *
 * ЗАМЕРЕНО в своём процессе через app.inject, живая PostgreSQL, 2026-07-29
 * (свои фикстурные клиники, `dce70000-…`):
 *   GET /api/visits/<ПОДПИСАННЫЙ>/draft/autosave -> 404 «Прием не найден…»
 *   GET /api/visits/<НЕТ ТАКОГО>/draft/autosave  -> 404 «Прием не найден…»
 *   GET /api/visits/<ЧУЖОЙ КЛИНИКИ>/draft/autosave -> 404 «Прием не найден…»
 * Независимая сверка тем же прогоном: `select … from visits where id = <ПОДПИСАННЫЙ>`
 * отдаёт ровно одну строку, `status = 'signed'`, `revision = 2`, `signed_at`
 * заполнен. То есть выборка НЕ слепа — она эту строку находит; распознавание
 * состояния терялось строкой ниже, `if (visit.status !== "draft") return null`.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. На живой демо-клинике все 10 приёмов подписаны и ни
 * у одного нет черновика (проверено SQL), а `dashboard.activeVisit` — это
 * «последний черновик клиники, иначе последний приём любого статуса»
 * (db/domainStateHydration.ts, applyActiveVisit). Значит рабочий экран открывается
 * на ПОДПИСАННОМ приёме и первым же запросом получает «Прием не найден. Обновите
 * рабочий экран и выберите актуальный прием». Обновление не меняет ничего, а
 * выбирать нечего: приём на месте, он подписан. Администратор за стойкой идёт
 * искать пропавшую запись, которой ничего не угрожает.
 *
 * Различать обязан слой доступа, а не маршрут по тексту ошибки: текст сообщения —
 * не тип, и разбор строк здесь уже стоил проекту одного дефекта
 * (routes/visits.ts, sendVisitDraftMutationError).
 */
export type VisitDraftAutosaveLookup =
	/** Приём — черновик, черновик отдан (сохранённый или пустая заготовка по приёму). */
	| { readonly outcome: "draft"; readonly serverDraft: VisitDraftAutosave }
	/** Строки приёма в этой клинике нет. Единственное состояние, где «приём не найден» — правда. */
	| { readonly outcome: "visit_absent" }
	/**
	 * Приём в базе ЕСТЬ, но он больше не черновик, поэтому черновика у него нет.
	 * `status` и `signedAt` несутся наружу, чтобы отказ назвал причину фактом, а не
	 * догадкой: «подписан» и «аннулирован» — разные причины и разные действия.
	 */
	| {
			readonly outcome: "no_draft";
			readonly visitId: string;
			readonly status: "signed" | "voided";
			readonly signedAt: string | null;
	  };

/**
 * ПРИЁМ ПОДПИСАН, А ОТВЕТ СОБРАТЬ НЕ УДАЛОСЬ.
 *
 * Отдельный тип нужен из-за порядка: запись в базе уже зафиксирована. Любая
 * ошибка ПОСЛЕ этого не смеет доехать до общего разбора доменных отказов
 * (routes/visits.ts, sendVisitDraftMutationError) — тот отвечает 409 «обновите
 * прием и повторите действие», а повторить нельзя: приём больше не черновик, и
 * повтор упрётся в «этот прием уже недоступен для изменений». Врач при этом
 * считает, что его запись не сохранилась.
 *
 * Здесь несётся то, что уже стало фактом: приём и его новая ревизия. Маршрут
 * обязан назвать состояние честно.
 */
export class VisitSignedResponseIncompleteError extends Error {
	readonly acceptedVisitId: string;
	readonly newRevision: number;

	constructor(acceptedVisitId: string, newRevision: number, cause: unknown) {
		super("Прием подписан, но ответ по контракту собрать не удалось.", {
			cause,
		});
		this.name = "VisitSignedResponseIncompleteError";
		this.acceptedVisitId = acceptedVisitId;
		this.newRevision = newRevision;
	}
}

/** Приём, открытый по записи расписания. */
export type OpenedVisitForAppointment = {
	readonly id: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly appointmentId: string | null;
	readonly status: "draft" | "signed" | "voided";
	readonly createdAt: string;
	readonly updatedAt: string;
};

export type OpenVisitForAppointmentResult = {
	readonly visit: OpenedVisitForAppointment;
	/** true — приём открыт этим вызовом, false — он уже был открыт раньше. */
	readonly created: boolean;
};
