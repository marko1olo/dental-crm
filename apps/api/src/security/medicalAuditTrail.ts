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
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../db/client.js";
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
	patientId: string;
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
 */
export async function recordMedicalRecordAccessAudit(
	input: MedicalAccessAuditInput,
): Promise<void> {
	const auditId = randomUUID();
	const eventAction = input.action ?? "VIEW_DIAGNOSIS";
	const eventType = input.eventType ?? "DIAGNOSIS_ACCESS";
	const diagnosisText = input.diagnosis ?? "Медицинская карта (ЭМК / 043-у)";

	try {
		// 1. Пишем в клинический журнал аудита (clinical_audit_logs) с RLS-контекстом
		await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT set_config('app.current_organization_id', ${input.organizationId}, true), set_config('app.current_tenant', ${input.organizationId}, true)`,
			);

			await tx.insert(clinicalAuditLogs).values({
				id: auditId,
				organizationId: input.organizationId,
				patientId: input.patientId,
				actorUserId: input.actorUserId ?? null,
				userId: input.actorUserId ?? null,
				actorLogin: input.actorLogin ?? null,
				eventType: eventType,
				action: eventAction,
				resourceType: "patient",
				entityType: "patient_diagnosis",
				resourceId: input.patientId,
				entityId: input.patientId,
				ipAddress: input.ipAddress ?? null,
				userAgent: input.userAgent ?? null,
				meta: {
					diagnosis: input.diagnosis ?? null,
					actorRole: input.actorRole ?? null,
					accessedAt: new Date().toISOString(),
					...(input.metadata ?? {}),
				},
			});
			// Проверяем существование пользователя в таблице users для соблюдения FK audit_events_actor_user_id_users_id_fk
			let validActorUserId: string | null = null;
			if (input.actorUserId) {
				const [existingUser] = await tx
					.select({ id: users.id })
					.from(users)
					.where(eq(users.id, input.actorUserId))
					.limit(1);
				if (existingUser) {
					validActorUserId = existingUser.id;
				}
			}

			// 2. Дублируем в журнал системных событий (audit_events) для отображения в стандартном интерфейсе аудита
			await tx.insert(auditEvents).values({
				id: randomUUID(),
				organizationId: input.organizationId,
				actorUserId: validActorUserId,
				entityType: "patient_diagnosis",
				entityId: input.patientId,
				action: eventAction,
				reason: `Доступ к медицинской тайне (152-ФЗ): диагноз «${diagnosisText}», пациент ${input.patientId}, сотрудник: ${input.actorLogin ?? input.actorUserId ?? "неизвестно"} (${input.actorRole ?? "роль не указана"})`,
			});
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

/**
 * Извлекает контекст сотрудника из входящего HTTP-запроса Fastify и регистрирует аудит доступа.
 */
export async function auditMedicalAccessFromRequest(
	request: FastifyRequest,
	options: {
		organizationId: string;
		patientId: string;
		diagnosis?: string | null;
		action?: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	const identity = getRequestIdentity(request);
	const reqAny = request as unknown as {
		user?: {
			id?: string | null;
			fullName?: string | null;
			role?: string | null;
		};
		headers: Record<string, string | string[] | undefined>;
		ip?: string;
	};

	const ipAddress =
		(typeof reqAny.headers["x-forwarded-for"] === "string"
			? reqAny.headers["x-forwarded-for"].split(",")[0]?.trim()
			: null) ??
		reqAny.ip ??
		null;

	const userAgent =
		typeof reqAny.headers["user-agent"] === "string"
			? reqAny.headers["user-agent"]
			: null;

	const actorUserId = identity.userId ?? reqAny.user?.id ?? null;
	const actorLogin = identity.fullName ?? reqAny.user?.fullName ?? null;
	const actorRole =
		identity.role ??
		reqAny.user?.role ??
		(typeof reqAny.headers["x-user-role"] === "string"
			? reqAny.headers["x-user-role"]
			: null) ??
		null;

	// Если диагноз не передан явно, ищем активный диагноз пациента в базе
	let diagnosis = options.diagnosis ?? null;
	if (!diagnosis) {
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
 * Получает историю доступа к медицинским картам и диагнозам для целей проверки комплаенса 152-ФЗ.
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
	const conditions = [eq(clinicalAuditLogs.organizationId, organizationId)];

	if (options?.patientId) {
		conditions.push(eq(clinicalAuditLogs.patientId, options.patientId));
	}
	if (options?.actorUserId) {
		conditions.push(eq(clinicalAuditLogs.actorUserId, options.actorUserId));
	}

	const rows = await db
		.select()
		.from(clinicalAuditLogs)
		.where(and(...conditions))
		.orderBy(desc(clinicalAuditLogs.createdAt))
		.limit(limit);

	return rows.map((row) => {
		const meta = (row.meta as Record<string, unknown> | null) ?? {};
		const diagnosis = typeof meta.diagnosis === "string" ? meta.diagnosis : null;
		return {
			id: row.id,
			organizationId: row.organizationId,
			patientId: row.patientId,
			actorUserId: row.actorUserId,
			actorLogin: row.actorLogin,
			action: row.action,
			eventType: row.eventType,
			diagnosis,
			ipAddress: row.ipAddress,
			userAgent: row.userAgent,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.toISOString()
					: String(row.createdAt),
		};
	});
}
