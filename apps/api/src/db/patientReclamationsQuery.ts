/**
 * Рекламации и осложнения по одной карте пациента.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ. Экран карточки пациента полностью готов и честен:
 * apps/web/src/components/patients/PatientReclamationsWidget.tsx разводит
 * загрузку, отказ чтения и пустоту, не приписывает чужой черновик другому
 * человеку и не выдаёт отказ записи за успех. Сервера под ним не было: живая
 * проверка сети (scratch/probe-failed-requests.mjs) видела на карточке
 * 404 GET /api/patients/:id/reclamations. Врач нажимал «Зафиксировать в карту» и
 * не имел ни одного способа сохранить претензию пациента.
 *
 * ГРАНИЦЫ. Все четыре функции принимают orgId и фильтруют по нему в SQL, а не
 * после выборки: рекламация — врачебная тайна и основание для денежного спора,
 * и утечка её в другую клинику недопустима. Ошибки базы НЕ гасятся: пустой
 * список вместо отказа читается врачом как «осложнений не было», а это худшая
 * ложь из возможных на этом экране.
 */
import { and, desc, eq } from "drizzle-orm";
import { withTenantReadCtx, withTenantWriteCtx, type TenantDb } from "./rls.js";
import * as schema from "./schema.js";

/** Ровно те два состояния, которыми пользуется экран. */
export type ReclamationStatus = "under_review" | "resolved";

export type PatientReclamation = {
	id: string;
	patientId: string;
	doctorId: string | null;
	toothNumber: number | null;
	warrantyCertificateId: string | null;
	defectType: string | null;
	complicationDetails: string;
	proposedAction: string | null;
	status: ReclamationStatus;
	resolvedAt: string | null;
	createdAt: string;
};

/**
 * Приведение строки базы к тому виду, который читает экран.
 *
 * Даты отдаём строкой ISO: экран делает `new Date(rec.createdAt)`, и объект Date
 * после JSON.stringify всё равно станет строкой — но тогда тип ответа зависел бы
 * от способа сериализации, а не от контракта.
 */
function toReclamation(
	row: typeof schema.patientReclamations.$inferSelect,
): PatientReclamation {
	return {
		id: row.id,
		patientId: row.patientId,
		doctorId: row.doctorId ?? null,
		toothNumber: row.toothNumber ?? null,
		warrantyCertificateId: row.warrantyCertificateId ?? null,
		defectType: row.defectType ?? null,
		complicationDetails: row.complicationDetails,
		proposedAction: row.proposedAction ?? null,
		// База ограничена CHECK-ом на два значения, но приведение всё равно делаем
		// явным: если ограничение однажды снимут, третье значение станет видно здесь,
		// а не превратится в вечно невидимую строку на экране.
		status: row.status === "resolved" ? "resolved" : "under_review",
		resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
	};
}

/** Журнал по карте, свежие сверху — именно в этом порядке его читает врач. */
export async function getPatientReclamationsFromDb(
	orgId: string,
	patientId: string,
	tx?: TenantDb,
): Promise<PatientReclamation[]> {
	const run = async (executor: TenantDb) => {
		const rows = await executor
			.select()
			.from(schema.patientReclamations)
			.where(
				and(
					eq(schema.patientReclamations.organizationId, orgId),
					eq(schema.patientReclamations.patientId, patientId),
				),
			)
			.orderBy(desc(schema.patientReclamations.createdAt));
		return rows.map(toReclamation);
	};
	return tx ? run(tx) : withTenantReadCtx(orgId, run);
}

export async function createPatientReclamationInDb(
	orgId: string,
	patientId: string,
	input: {
		complicationDetails: string;
		proposedAction: string | null;
		doctorId: string | null;
		toothNumber?: number | null | undefined;
		warrantyCertificateId?: string | null | undefined;
		defectType?: string | null | undefined;
	},
	tx?: TenantDb,
): Promise<PatientReclamation> {
	const run = async (executor: TenantDb) => {
		// Ownership assert: patient must belong to caller org (route also checks; helper is shared).
		const [ownedPatient] = await executor
			.select({ id: schema.patients.id })
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, orgId),
					eq(schema.patients.id, patientId),
				),
			)
			.limit(1);
		if (!ownedPatient) {
			throw new Error(
				"patient_reclamations: patient does not belong to organization",
			);
		}
		if (input.doctorId) {
			const [ownedDoctor] = await executor
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(
					and(
						eq(schema.users.organizationId, orgId),
						eq(schema.users.id, input.doctorId),
					),
				)
				.limit(1);
			if (!ownedDoctor) {
				throw new Error(
					"patient_reclamations: doctor does not belong to organization",
				);
			}
		}
		const [row] = await executor
			.insert(schema.patientReclamations)
			.values({
				organizationId: orgId,
				patientId,
				doctorId: input.doctorId,
				toothNumber: input.toothNumber ?? null,
				warrantyCertificateId: input.warrantyCertificateId ?? null,
				defectType: input.defectType ?? null,
				complicationDetails: input.complicationDetails,
				proposedAction: input.proposedAction,
				status: "under_review",
			})
			.returning();
		/*
		 * Пустой ответ на вставку означает, что запись не создана. Приводить его к типу
		 * через `!` нельзя: маршрут ответил бы 201 и экран очистил бы форму, потеряв
		 * набранный врачом текст жалобы. Пусть лучше отказ дойдёт до человека.
		 */
		if (!row) {
			throw new Error(
				"patient_reclamations: вставка не вернула созданную строку",
			);
		}
		return toReclamation(row);
	};
	return tx ? run(tx) : withTenantWriteCtx(orgId, run);
}

/**
 * Смена состояния инцидента.
 *
 * Возвращает null, если строки с таким id в ЭТОЙ клинике нет — маршрут обязан
 * ответить 404, а не «успешно». Экран красит строку оптимистично до ответа
 * сервера и возвращает прежнее значение только по отказу; тихий успех оставил бы
 * на экране состояние, которого в базе нет.
 *
 * resolved_at ставится и снимается вместе со статусом: дата урегулирования,
 * оставшаяся у возвращённого в работу инцидента, — это готовый повод для спора
 * о сроках гарантии.
 */
export async function setPatientReclamationStatusInDb(
	orgId: string,
	patientId: string,
	reclamationId: string,
	status: ReclamationStatus,
	tx?: TenantDb,
): Promise<PatientReclamation | null> {
	const run = async (executor: TenantDb) => {
		const [row] = await executor
			.update(schema.patientReclamations)
			.set({
				status,
				resolvedAt: status === "resolved" ? new Date() : null,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(schema.patientReclamations.organizationId, orgId),
					eq(schema.patientReclamations.patientId, patientId),
					eq(schema.patientReclamations.id, reclamationId),
				),
			)
			.returning();
		return row ? toReclamation(row) : null;
	};
	return tx ? run(tx) : withTenantWriteCtx(orgId, run);
}

/**
 * Безвозвратное удаление записи об инциденте.
 *
 * false означает «такой записи в этой клинике нет». Экран спрашивает
 * подтверждение словами «нельзя отменить» и по успеху убирает строку из списка,
 * поэтому ответ «удалено» на самом деле ничего не удаливший привёл бы к тому,
 * что инцидент вернулся бы при следующем открытии карты.
 */
export async function deletePatientReclamationFromDb(
	orgId: string,
	patientId: string,
	reclamationId: string,
	tx?: TenantDb,
): Promise<boolean> {
	const run = async (executor: TenantDb) => {
		const rows = await executor
			.delete(schema.patientReclamations)
			.where(
				and(
					eq(schema.patientReclamations.organizationId, orgId),
					eq(schema.patientReclamations.patientId, patientId),
					eq(schema.patientReclamations.id, reclamationId),
				),
			)
			.returning({ id: schema.patientReclamations.id });
		return rows.length > 0;
	};
	return tx ? run(tx) : withTenantWriteCtx(orgId, run);
}
