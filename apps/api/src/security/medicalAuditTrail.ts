/**
 * 152-ФЗ / 323-ФЗ: АУДИТ ДОСТУПА К МЕДИЦИНСКИМ КАРТАМ И ДИАГНОЗАМ (AUDIT TRAIL)
 *
 * ТРЕБОВАНИЯ ЗАКОНОДАТЕЛЬСТВА:
 * В соответствии с п. 15 Требований к защите ПДн при их обработке в ИСПДн (утв. ПП РФ № 1119):
 * Должна обеспечиваться непрерывная регистрация в электронном журнале фактов доступа
 * должностных лиц к специальным категориям ПДн (сведения о здоровье, диагнозы)
 * с фиксацией: кто (идентификатор, ФИО, роль), когда (метка времени), к данным какого пациента
 * и к какому конкретно диагнозу / разделу карты был осуществлен доступ.
 *
 * Журнал является юридически значимым и защищен от удаления и модификации (append-only).
 */

import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { createApiLogger, safeLogError } from "../observability/logger.js";

const logger = createApiLogger("medicalAuditTrail");
import {
	auditEvents,
	clinicalAuditLogs,
	treatmentPlans,
	users,
	visitDiaries,
} from "../db/schema.js";
import { getRequestIdentity } from "./identity.js";

export interface MedicalAccessAuditInput {
	organizationId: string;
	patientId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorLogin?: string | null | undefined;
	actorRole?: string | null | undefined;
	diagnosis?: string | null | undefined;
	action?: string | undefined;
	eventType?: string | undefined;
	ipAddress?: string | null | undefined;
	userAgent?: string | null | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface MedicalAuditRecord {
	id: string;
	organizationId: string;
	patientId: string | null;
	actorUserId: string | null;
	actorLogin: string | null;
	action: string | null;
	eventType: string | null;
	diagnosis: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
}

/**
 * Ищет активный/последний зарегистрированный диагноз пациента в базе данных.
 */
export async function getPatientActiveDiagnosisFromDb(
	organizationId: string,
	patientId: string,
): Promise<string | null> {
	try {
		// 1. Проверяем последний дневник приема (visitDiaries)
		const latestDiaries = await db
			.select({
				diagnosisIcd10: visitDiaries.diagnosisIcd10,
				diagnosisTooth: visitDiaries.diagnosisTooth,
			})
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.organizationId, organizationId),
					eq(visitDiaries.patientId, patientId),
				),
			)
			.orderBy(desc(visitDiaries.createdAt))
			.limit(1);

		const [diary] = latestDiaries;
		if (diary?.diagnosisIcd10) {
			return diary.diagnosisTooth
				? `${diary.diagnosisIcd10} (зуб ${diary.diagnosisTooth})`
				: diary.diagnosisIcd10;
		}

		// 2. Проверяем утвержденный план лечения
		const latestPlan = await db
			.select({
				title: treatmentPlans.title,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.organizationId, organizationId),
					eq(treatmentPlans.patientId, patientId),
				),
			)
			.orderBy(desc(treatmentPlans.updatedAt))
			.limit(1);

		if (latestPlan.length > 0 && latestPlan[0]?.title) {
			return latestPlan[0].title;
		}

		return null;
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), organizationId, patientId },
			"Не удалось получить активный диагноз пациента для записи аудита",
		);
		return null;
	}
}

/**
 * Записывает факт доступа к медицинской карте / диагнозу в защищенный журнал аудита (152-ФЗ).
 * Пишет согласованно в единую таблицу audit_events и в структурированный clinical_audit_logs.
 */
export async function recordMedicalRecordAccessAudit(
	input: MedicalAccessAuditInput,
): Promise<void> {
	const auditId = randomUUID();
	const eventAction = input.action ?? "VIEW_DIAGNOSIS";
	const diagnosisText = input.diagnosis ?? "Медицинская карта пациента";
	const eventType = input.eventType ?? "DIAGNOSIS_ACCESS";

	try {
		const UUID_SHAPE =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const validActorUuid =
			input.actorUserId && UUID_SHAPE.test(input.actorUserId) ? input.actorUserId : null;
		const validPatientUuid =
			input.patientId && UUID_SHAPE.test(input.patientId) ? input.patientId : null;

		let validActorUserId: string | null = null;
		let resolvedActorLogin: string | null = input.actorLogin ?? null;
		if (validActorUuid) {
			const [existingUser] = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(
					and(
						eq(users.id, validActorUuid),
						eq(users.organizationId, input.organizationId),
					),
				)
				.limit(1);
			if (existingUser) {
				validActorUserId = existingUser.id;
				if (!resolvedActorLogin) {
					resolvedActorLogin = existingUser.fullName ?? null;
				}
			}
		}

		await db.transaction(async (tx) => {
			await tx.insert(auditEvents).values({
				id: auditId,
				organizationId: input.organizationId,
				actorUserId: validActorUserId,
				entityType: "patient_diagnosis",
				entityId: input.patientId ?? "unknown",
				action: eventAction,
				reason: `Доступ к медицинской тайне (152-ФЗ): диагноз «${diagnosisText}», пациент ${input.patientId ?? "не указан"}, сотрудник: ${resolvedActorLogin ?? input.actorUserId ?? "неизвестно"} (${input.actorRole ?? "роль не указана"})`,
			});

			await tx.insert(clinicalAuditLogs).values({
				id: auditId,
				organizationId: input.organizationId,
				patientId: validPatientUuid,
				actorUserId: validActorUserId,
				userId: validActorUserId,
				actorLogin: resolvedActorLogin,
				eventType,
				action: eventAction,
				resourceType: "patient_diagnosis",
				entityType: "patient_diagnosis",
				entityId: input.patientId ?? "unknown",
				ipAddress: input.ipAddress ?? null,
				userAgent: input.userAgent ?? null,
				meta: {
					diagnosis: diagnosisText,
					actorRole: input.actorRole ?? null,
					...(input.metadata ?? {}),
				},
			});
		});
	} catch (error) {
		// Аварийный канал протоколирования: запись аудита не должна ронять клинический прием,
		// но отказ должен быть зафиксирован с полным содержимым события
		logger.error(
			{
				err: safeLogError(error),
				emergencyRecord: {
					auditId,
					organizationId: input.organizationId,
					patientId: input.patientId ?? null,
					actorUserId: input.actorUserId ?? null,
					action: eventAction,
					diagnosis: diagnosisText,
					ipAddress: input.ipAddress ?? null,
					userAgent: input.userAgent ?? null,
				},
			},
			"[medicalAuditTrail] ОТКАЗ ЗАПИСИ 152-ФЗ: событие аудита подлежит восстановлению",
		);
	}
}

interface AuthenticatedAuditRequest extends FastifyRequest {
	user?: FastifyRequest["user"] & {
		fullName?: string | null;
	};
}

/**
 * Извлекает контекст сотрудника из входящего HTTP-запроса Fastify и регистрирует аудит доступа.
 */
export async function auditMedicalAccessFromRequest(
	request: FastifyRequest,
	options: {
		organizationId: string;
		patientId?: string | null | undefined;
		diagnosis?: string | null;
		action?: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	const identity = getRequestIdentity(request);
	const authReq = request as AuthenticatedAuditRequest;

	const forwardedFor = request.headers["x-forwarded-for"];
	const ipAddress =
		(typeof forwardedFor === "string"
			? forwardedFor.split(",")[0]?.trim()
			: null) ??
		request.ip ??
		null;

	const userAgentHeader = request.headers["user-agent"];
	const userAgent =
		typeof userAgentHeader === "string" ? userAgentHeader : null;

	const actorUserId = identity.userId ?? authReq.user?.id ?? null;
	const actorLogin = identity.fullName ?? authReq.user?.fullName ?? null;
	const actorRole = identity.role ?? authReq.user?.role ?? null;

	// Если диагноз не передан явно, ищем активный диагноз пациента в базе
	let diagnosis = options.diagnosis ?? null;
	if (!diagnosis && options.patientId) {
		diagnosis = await getPatientActiveDiagnosisFromDb(
			options.organizationId,
			options.patientId,
		);
	}

	await recordMedicalRecordAccessAudit({
		organizationId: options.organizationId,
		patientId: options.patientId,
		actorUserId,
		actorLogin,
		actorRole,
		diagnosis,
		action: options.action ?? "VIEW_DIAGNOSIS",
		ipAddress,
		userAgent,
		metadata: options.metadata,
	});
}

/**
 * Получает историю доступа к медицинским картам и диагнозам из единого журнала audit_events (152-ФЗ / Мандат 8bf).
 */
export async function getMedicalAccessAuditTrailFromDb(
	organizationId: string,
	options?: {
		patientId?: string | undefined;
		actorUserId?: string | undefined;
		limit?: number | undefined;
	},
): Promise<MedicalAuditRecord[]> {
	const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
	const clinicalConditions = [
		eq(clinicalAuditLogs.organizationId, organizationId),
		eq(clinicalAuditLogs.entityType, "patient_diagnosis"),
	];
	if (options?.patientId) {
		clinicalConditions.push(eq(clinicalAuditLogs.entityId, options.patientId));
	}
	if (options?.actorUserId) {
		clinicalConditions.push(eq(clinicalAuditLogs.actorUserId, options.actorUserId));
	}

	const clinicalRows = await db
		.select()
		.from(clinicalAuditLogs)
		.where(and(...clinicalConditions))
		.orderBy(desc(clinicalAuditLogs.createdAt))
		.limit(limit);

	const eventConditions = [
		eq(auditEvents.organizationId, organizationId),
		eq(auditEvents.entityType, "patient_diagnosis"),
	];
	if (options?.patientId) {
		eventConditions.push(eq(auditEvents.entityId, options.patientId));
	}
	if (options?.actorUserId) {
		eventConditions.push(eq(auditEvents.actorUserId, options.actorUserId));
	}

	const eventRows = await db
		.select()
		.from(auditEvents)
		.where(and(...eventConditions))
		.orderBy(desc(auditEvents.createdAt))
		.limit(limit);

	const mergedById = new Map<string, MedicalAuditRecord>();

	for (const row of clinicalRows) {
		const metaObj =
			row.meta && typeof row.meta === "object"
				? (row.meta as Record<string, unknown>)
				: null;
		const diagFromMeta =
			typeof metaObj?.diagnosis === "string" ? metaObj.diagnosis : null;
		mergedById.set(row.id, {
			id: row.id,
			organizationId: row.organizationId,
			patientId: row.patientId ?? row.entityId,
			actorUserId: row.actorUserId,
			actorLogin: row.actorLogin,
			action: row.action,
			eventType: row.eventType,
			diagnosis: diagFromMeta,
			ipAddress: row.ipAddress,
			userAgent: row.userAgent,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.toISOString()
					: String(row.createdAt),
		});
	}

	for (const row of eventRows) {
		if (mergedById.has(row.id)) continue;
		const match = row.reason?.match(/диагноз «([^»]+)»/);
		mergedById.set(row.id, {
			id: row.id,
			organizationId: row.organizationId,
			patientId: row.entityId,
			actorUserId: row.actorUserId,
			actorLogin: null,
			action: row.action,
			eventType: "DIAGNOSIS_ACCESS",
			diagnosis: match ? (match[1] ?? row.reason) : row.reason,
			ipAddress: null,
			userAgent: null,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.toISOString()
					: String(row.createdAt),
		});
	}

	return Array.from(mergedById.values())
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.slice(0, limit);
}
