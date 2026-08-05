/**
 * clinicalAuditService.ts
 * HIPAA-grade clinical audit logging service.
 * Append-only — records are NEVER updated or deleted.
 * Integrates with Fastify request context to capture IP + UserAgent automatically.
 */
import type { FastifyRequest } from "fastify";
import { db } from "./db/client.js";
import { clinicalAuditLogs } from "./db/schema.js";

export type ClinicalAuditAction =
	| "VIEW_PATIENT"
	| "VIEW_CBCT"
	| "UPDATE_TOOTH_STATE"
	| "GENERATE_PLAN_PDF"
	| "EXCLUDE_CRITICAL_ALERT"
	| "CREATE_LAB_ORDER"
	| "SIGN_VISIT"
	| "ACCESS_DENIED"
	| "CREATE_INSTALLMENT"
	| "DEPLETE_INVENTORY"
	| "GENERATE_CONSENT"
	| "VIEW_AUDIT_LOG";

export interface ClinicalAuditInput {
	organizationId: string;
	userId?: string | null;
	patientId?: string | null;
	action: ClinicalAuditAction;
	entityType: string;
	entityId: string;
	ipAddress?: string | null;
	userAgent?: string | null;
}

/**
 * Core append function.
 *
 * НЕ БРОСАЕТ — И ЭТО ОСОЗНАННЫЙ ВЫБОР, А НЕ НЕДОСМОТР. Развилка «ронять
 * операцию или писать в аварийный канал» решается здесь в пользу второго
 * ровно потому, что этот журнал фиксирует ДОСТУП (просмотр карты, чтение
 * журнала), а не изменение. Отменять при отказе записи нечего: данные уже
 * показаны, откат невозможен. Для путей, которые ИЗМЕНЯЮТ медданные, деньги
 * или документы, выбор противоположный — см. `audit.ts`, где отказ записи
 * пробрасывается и отменяет операцию.
 *
 * БЫЛО: `console.error("[ClinicalAudit] Failed to write audit log:", err)` —
 * одна строка с объектом ошибки и БЕЗ САМОГО СОБЫТИЯ. Восстановить по такому
 * логу, кто и к чьей карте обращался, невозможно: событие исчезало целиком, в
 * логе оставался только факт, что что-то не записалось. Это не аварийный
 * канал, а сообщение о том, что аварийный канал не предусмотрен.
 *
 * СТАЛО: в лог уходит полное содержимое события одной строкой с устойчивым
 * префиксом `[ClinicalAudit] ОТКАЗ ЗАПИСИ`, по которому событие можно найти и
 * внести в журнал вручную. Требование РСБ.3 (сбор, запись и хранение
 * информации о событиях безопасности) без такой строки не выполняется:
 * потерянное событие обязано оставаться восстановимым.
 */
export async function writeClinicalAuditLog(
	input: ClinicalAuditInput,
): Promise<void> {
	try {
		await db.insert(clinicalAuditLogs).values({
			organizationId: input.organizationId,
			userId: input.userId ?? null,
			patientId: input.patientId ?? null,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null,
		});
	} catch (err) {
		// Never propagate — audit failure must not crash the clinical flow,
		// но событие обязано пережить отказ в читаемом виде.
		console.error(
			`[ClinicalAudit] ОТКАЗ ЗАПИСИ журнала доступа к медданным. ` +
				`Событие подлежит ручному внесению: ${JSON.stringify({
					organizationId: input.organizationId,
					userId: input.userId ?? null,
					patientId: input.patientId ?? null,
					action: input.action,
					entityType: input.entityType,
					entityId: input.entityId,
					ipAddress: input.ipAddress ?? null,
					userAgent: input.userAgent ?? null,
					occurredAt: new Date().toISOString(),
				})}. Причина отказа:`,
			err,
		);
	}
}

/**
 * Convenience wrapper: extracts IP and UserAgent from the Fastify request automatically.
 */
export async function auditFromRequest(
	request: FastifyRequest,
	payload: Omit<ClinicalAuditInput, "ipAddress" | "userAgent">,
): Promise<void> {
	const ip =
		(request.headers["x-forwarded-for"] as string | undefined)
			?.split(",")[0]
			?.trim() ??
		request.ip ??
		null;
	const ua = (request.headers["user-agent"] as string | undefined) ?? null;

	await writeClinicalAuditLog({ ...payload, ipAddress: ip, userAgent: ua });
}

/*
 * ЗДЕСЬ СТОЯЛА `assertTenantMatch`, И ОНА УДАЛЕНА.
 *
 * Её комментарий приглашал ей пользоваться — «call this wherever you need to
 * verify that a resource's organizationId matches the session's organizationId»,
 * с указанием отвечать 403 и писать ACCESS_DENIED. Не вызывал её никто:
 * единственным вхождением имени во всём дереве было само объявление.
 *
 * ДЫРОЙ ОНА НЕ БЫЛА, и это надо сказать прямо. Она не барьер: чистое сравнение
 * двух строк, возвращающее boolean, без отказа и без записи в журнал. Изоляцию
 * клиник держат подписанный токен (`security/identity.ts`) и фильтр
 * `organization_id` в самих запросах, и это измеряет сквозной сценарий
 * `tests/security/crossTenantReconProof.ts`.
 *
 * УДАЛЕНА ЗА ФОРМУ. Форма «объявлен, снабжён инструкцией по применению и не
 * вызван» — ровно та, в которой в этом дереве стояла настоящая дыра в расписании
 * (`requireScheduleMutationAccess`, закрыто 1f4614ea2). Пока такое имя лежит в
 * файле аудита, инженер, проверяющий «сверяется ли клиника ресурса», находит его
 * поиском и получает ложное спокойствие — а вместе с ним соблазн считать, что
 * межклиничная проверка где-то уже есть. Именно так дыра в расписании и простояла:
 * охрана была видна и не работала.
 */
