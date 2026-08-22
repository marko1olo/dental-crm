import { randomUUID } from "node:crypto";
import type { AuditEvent } from "@dental/shared";
import { db } from "./client.js";
import { auditEvents } from "./schema.js";

/**
 * Единственный писатель `audit_events`, у которого автор события есть в
 * сигнатуре И отказ записи не проглатывается. Именно на него указывают
 * `routes/clinical.ts:328-330` и комментарий на месте удалённой третьей
 * реализации в `routes/audit.ts`.
 *
 * ДОБАВЛЕН АВАРИЙНЫЙ КАНАЛ. Функция и раньше честно бросала, но в лог не писала
 * ничего, а решение об обработке оставалось за вызывающим — и вызывающие
 * теряли содержимое события: `db/aiQuery.ts:126` ловит и печатает только объект
 * ошибки. Теперь полное содержимое события уходит в лог одной строкой с
 * устойчивым префиксом `[auditQuery] ОТКАЗ ЗАПИСИ` ДО проброса, поэтому оно
 * восстановимо независимо от того, как поступит вызывающий. Требование РСБ.3
 * (сбор, запись и хранение информации о событиях безопасности) без этого не
 * выполняется: потерянное событие обязано оставаться восстановимым.
 *
 * Проброс сохранён и текст ошибки не изменён намеренно: на строку
 * "Failed to insert audit event" опирается `auditQuery.test.ts:96`.
 */
export async function recordAuditEventInDb(
	organizationId: string,
	input: {
		entityType: string;
		entityId: string;
		action: string;
		reason?: string | null | undefined;
		actorUserId?: string | null | undefined;
	},
): Promise<AuditEvent> {
	const emergencyRecord = () =>
		JSON.stringify({
			organizationId,
			actorUserId: input.actorUserId ?? null,
			entityType: input.entityType,
			entityId: input.entityId,
			action: input.action,
			reason: input.reason ?? null,
			occurredAt: new Date().toISOString(),
		});

	let event: typeof auditEvents.$inferSelect | undefined;
	try {
		[event] = await db
			.insert(auditEvents)
			.values({
				id: randomUUID(),
				organizationId,
				actorUserId: input.actorUserId ?? null,
				entityType: input.entityType,
				entityId: input.entityId,
				action: input.action,
				reason: input.reason ?? null,
			})
			.returning();
	} catch (error) {
		console.error(
			`[auditQuery] ОТКАЗ ЗАПИСИ в audit_events. Событие подлежит ручному ` +
				`внесению: ${emergencyRecord()}. Причина отказа:`,
			error,
		);
		throw error;
	}

	if (!event) {
		console.error(
			`[auditQuery] ОТКАЗ ЗАПИСИ в audit_events: вставка не вернула строку. ` +
				`Событие подлежит ручному внесению: ${emergencyRecord()}`,
		);
		throw new Error("Failed to insert audit event");
	}

	return {
		id: event.id,
		organizationId: event.organizationId,
		actorUserId: event.actorUserId,
		entityType: event.entityType,
		entityId: event.entityId,
		action: event.action,
		reason: event.reason,
		createdAt: event.createdAt.toISOString(),
	} as AuditEvent;
}
