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
import {
	auditEvents,
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
		// В автономном/тестовом окружении без живого PostgreSQL не роняем аудит
		return null;
	}
}

/**
 * Записывает факт доступа к медицинской карте / диагнозу в защищенный журнал аудита (152-ФЗ).
 * SSOT: Запись сохраняется в единую таблицу audit_events (Мандат 8bf / DEF-SEC-05).
 */
export async function recordMedicalRecordAccessAudit(
	input: MedicalAccessAuditInput,
): Promise<void> {
	const auditId = randomUUID();
	const eventAction = input.action ?? "VIEW_DIAGNOSIS";
	const diagnosisText = input.diagnosis ?? "Медицинская карта (ЭМК / 043-у)";

	try {
		const UUID_SHAPE =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const validActorUuid =
			input.actorUserId && UUID_SHAPE.test(input.actorUserId) ? input.actorUserId : null;

		let validActorUserId: string | null = null;
		if (validActorUuid) {
			const [existingUser] = await db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.id, validActorUuid))
				.limit(1);
			if (existingUser) {
				validActorUserId = existingUser.id;
			}
		}

		await db.insert(auditEvents).values({
			id: auditId,
			organizationId: input.organizationId,
			actorUserId: validActorUserId,
			entityType: "patient_diagnosis",
			entityId: input.patientId ?? "unknown",
			action: eventAction,
			reason: `Доступ к медицинской тайне (152-ФЗ): диагноз «${diagnosisText}», пациент ${input.patientId ?? "не указан"}, сотрудник: ${input.actorLogin ?? input.actorUserId ?? "неизвестно"} (${input.actorRole ?? "роль не указана"})`,
		});
	} catch (error) {
		// Аварийный канал протоколирования: запись аудита не должна ронять клинический прием,
		// но отказ должен быть зафиксирован в аварийном потоке stderr
		console.error(
			`[MedicalAuditTrail] АВАРИЯ: Не удалось сохранить аудит-запись 152-ФЗ (org=${input.organizationId}, patient=${input.patientId}, actor=${input.actorUserId}):`,
			error,
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

	const userRoleHeader = request.headers["x-user-role"];
	const actorUserId = identity.userId ?? authReq.user?.id ?? null;
	const actorLogin = identity.fullName ?? authReq.user?.fullName ?? null;
	const actorRole =
		identity.role ??
		authReq.user?.role ??
		(typeof userRoleHeader === "string" ? userRoleHeader : null) ??
		null;

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
	const conditions = [
		eq(auditEvents.organizationId, organizationId),
		eq(auditEvents.entityType, "patient_diagnosis"),
	];

	if (options?.patientId) {
		conditions.push(eq(auditEvents.entityId, options.patientId));
	}
	if (options?.actorUserId) {
		conditions.push(eq(auditEvents.actorUserId, options.actorUserId));
	}

	const rows = await db
		.select()
		.from(auditEvents)
		.where(and(...conditions))
		.orderBy(desc(auditEvents.createdAt))
		.limit(limit);

	return rows.map((row) => {
		return {
			id: row.id,
			organizationId: row.organizationId,
			patientId: row.entityId,
			actorUserId: row.actorUserId,
			actorLogin: null,
			action: row.action,
			eventType: "DIAGNOSIS_ACCESS",
			diagnosis: row.reason,
			ipAddress: null,
			userAgent: null,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.toISOString()
					: String(row.createdAt),
		};
	});
}
