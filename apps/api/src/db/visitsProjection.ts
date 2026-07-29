/**
 * visitsProjection.ts — строка таблицы `visits` в приём контракта. ОДНА проекция.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Отображение писалось в двух местах: наполнение доменного
 * состояния (db/domainStateHydration.ts) и слой доступа, который подписывает приём
 * (db/visitsQuery.ts). Пока их две, они расходятся молча — в этом дереве так уже
 * было с прайсом: одна проекция подрезала цену, другая нет, и услуга получала на
 * экране одну цену, а в договоре другую (см. комментарий про
 * projectServiceCatalogRows в domainStateHydration.ts).
 *
 * Здесь нет ни чтения базы, ни проверки контракта: проверять — дело вызывающего
 * (`visitSchema`), а падать на одной кривой строке весь рабочий день клиники не
 * должен.
 */

import type { Visit } from "@dental/shared";
import type * as schema from "./schema.js";

type VisitRow = typeof schema.visits.$inferSelect;

/**
 * Отметка времени приёма. Пустого значения тут быть не может — оба столбца
 * объявлены NOT NULL DEFAULT now(), — но контракт требует строку, а не `null`,
 * поэтому непригодная дата сводится к «сейчас», а не роняет приём.
 */
function visitTimestamp(value: Date | string | null | undefined): string {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
	}
	if (typeof value === "string" && value.trim()) {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}
	return new Date().toISOString();
}

/** Строка `visits` -> приём контракта. Поля, которых в контракте нет, отбрасываются. */
export function projectVisitRow(row: VisitRow): Visit {
	return {
		id: row.id,
		organizationId: row.organizationId,
		patientId: row.patientId,
		appointmentId: row.appointmentId ?? null,
		status: row.status,
		revision: row.revision,
		complaint: row.complaint ?? null,
		anamnesis: row.anamnesis ?? null,
		objectiveStatus: row.objectiveStatus ?? null,
		diagnosis: row.diagnosis ?? null,
		treatmentPlan: row.treatmentPlan ?? null,
		doctorSummary: row.doctorSummary ?? null,
		createdAt: visitTimestamp(row.createdAt),
		updatedAt: visitTimestamp(row.updatedAt),
	};
}
