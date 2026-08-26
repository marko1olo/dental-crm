/**
 * @dental/api/services/clinical/ClinicalRecordLockService
 *
 * Distributed Optimistic Locking & Collaborative Editing Protection for:
 * - Outpatient Record 043/у (Медицинская карта стоматологического больного)
 * - Visit Clinical Diaries (`visit_diaries`)
 * - Multi-terminal concurrent doctor & assistant workflows
 *
 * Prevents Lost Update anomaly and uncoordinated overwrite conflicts when doctor
 * and assistant (or multiple clinic terminals) concurrently edit the same diary.
 */

import { computePayloadHash, generateFinancialCompositeIdempotencyKey } from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	visitDiaries,
	visitDiaryRevisions,
} from "../../db/schema/clinical.js";

export type VisitDiary = typeof visitDiaries.$inferSelect;

export interface ClinicalFieldDiff {
	readonly fieldName: string;
	readonly clientValue: string | null;
	readonly serverValue: string | null;
}

export class ClinicalConcurrencyConflictError extends Error {
	public readonly statusCode = 409;
	public readonly code = "CLINICAL_RECORD_VERSION_CONFLICT";
	public readonly diaryId: string;
	public readonly clientVersion: number;
	public readonly serverVersion: number;
	public readonly lastModifiedByUserId?: string | null | undefined;
	public readonly lastModifiedAt?: string | undefined;
	public readonly conflictingFields: readonly ClinicalFieldDiff[];

	constructor(params: {
		diaryId: string;
		clientVersion: number;
		serverVersion: number;
		lastModifiedByUserId?: string | null | undefined;
		lastModifiedAt?: string | undefined;
		conflictingFields: readonly ClinicalFieldDiff[];
	}) {
		const fieldList = params.conflictingFields.map((f) => f.fieldName).join(", ");
		super(
			`Конфликт версий карты 043/у (Дневник: ${params.diaryId}). Версия на клиенте: v${params.clientVersion}, версия на сервере: v${params.serverVersion}. Измененные поля: [${fieldList || "общие данные"}]. Для предотвращения потери данных обновите карту.`,
		);
		this.name = "ClinicalConcurrencyConflictError";
		this.diaryId = params.diaryId;
		this.clientVersion = params.clientVersion;
		this.serverVersion = params.serverVersion;
		this.lastModifiedByUserId = params.lastModifiedByUserId;
		this.lastModifiedAt = params.lastModifiedAt;
		this.conflictingFields = params.conflictingFields;
	}
}

export interface DiarySaveInput {
	readonly anamnesis?: string | null | undefined;
	readonly statusLocalis?: string | null | undefined;
	readonly diagnosisIcd10?: string | null | undefined;
	readonly diagnosisTooth?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly complications?: string | null | undefined;
	readonly comorbidities?: string | null | undefined;
	readonly content?: string | null | undefined;
	readonly instrumentTrayBarcode?: string | null | undefined;
}

export interface EditLeaseToken {
	readonly lockToken: string;
	readonly diaryId: string;
	readonly userId: string;
	readonly userRole: string;
	readonly userName?: string | undefined;
	readonly acquiredAt: string;
	readonly expiresAt: string;
	readonly isExpired: boolean;
}

// In-memory active editing leases (Terminal session locks)
const activeEditLeases = new Map<string, EditLeaseToken>();

export class ClinicalRecordLockService {
	/**
	 * Computes SHA-256 content hash of structured clinical diary.
	 */
	public static computeDiaryHash(fields: DiarySaveInput): string {
		return computePayloadHash({
			anamnesis: fields.anamnesis?.trim() ?? "",
			statusLocalis: fields.statusLocalis?.trim() ?? "",
			diagnosisIcd10: fields.diagnosisIcd10?.trim() ?? "",
			diagnosisTooth: fields.diagnosisTooth?.trim() ?? "",
			treatmentDescription: fields.treatmentDescription?.trim() ?? "",
			complications: fields.complications?.trim() ?? "",
			comorbidities: fields.comorbidities?.trim() ?? "",
			content: fields.content?.trim() ?? "",
			instrumentTrayBarcode: fields.instrumentTrayBarcode?.trim() ?? "",
		});
	}

	/**
	 * Saves visit diary with strict optimistic concurrency check (`expectedVersion`).
	 * If server version is ahead of client version, throws `ClinicalConcurrencyConflictError` (409).
	 */
	public static async saveDiaryOptimistic(params: {
		organizationId: string;
		diaryId: string;
		userId: string;
		userRole: string;
		expectedVersion: number;
		fields: DiarySaveInput;
		lockToken?: string | undefined;
	}): Promise<{
		readonly success: boolean;
		readonly diary: typeof visitDiaries.$inferSelect;
		readonly previousVersion: number;
		readonly newVersion: number;
	}> {
		return await db.transaction(async (tx) => {
			// 1. Fetch current database record with row lock
			const [currentDiary] = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.id, params.diaryId),
						eq(visitDiaries.organizationId, params.organizationId),
					),
				)
				.for("update");

			if (!currentDiary) {
				throw new Error(`Клинический дневник с id '${params.diaryId}' не найден в базе данных.`);
			}

			if (currentDiary.isLocked) {
				throw new Error(
					`Клинический дневник с id '${params.diaryId}' уже подписан и заблокирован (043/у lock). Изменение черновика запрещено. Используйте протокол ревизий (/revise).`,
				);
			}

			// 2. Check optimistic concurrency version
			if (currentDiary.version !== params.expectedVersion) {
				// Compute field diffs between current DB state and client inputs
				const diffs: ClinicalFieldDiff[] = [];
				const fieldKeys: (keyof DiarySaveInput)[] = [
					"anamnesis",
					"statusLocalis",
					"diagnosisIcd10",
					"diagnosisTooth",
					"treatmentDescription",
					"complications",
					"comorbidities",
					"content",
					"instrumentTrayBarcode",
				];

				for (const key of fieldKeys) {
					const serverVal = (currentDiary[key as keyof typeof currentDiary] as string | null) ?? null;
					const clientVal = params.fields[key] ?? null;
					if (serverVal !== clientVal) {
						diffs.push({
							fieldName: key,
							clientValue: clientVal,
							serverValue: serverVal,
						});
					}
				}

				throw new ClinicalConcurrencyConflictError({
					diaryId: params.diaryId,
					clientVersion: params.expectedVersion,
					serverVersion: currentDiary.version,
					lastModifiedByUserId: currentDiary.authorId ?? currentDiary.draftAuthorId,
					lastModifiedAt: currentDiary.updatedAt?.toISOString(),
					conflictingFields: diffs,
				});
			}

			// 3. Increment version and compute new diary hash
			const nextVersion = currentDiary.version + 1;
			const newHash = this.computeDiaryHash(params.fields);

			// 4. Save historical snapshot in visit_diary_revisions
			await tx.insert(visitDiaryRevisions).values({
				organizationId: params.organizationId,
				diaryId: params.diaryId,
				revisedContent: params.fields.content || currentDiary.content,
				previousAnamnesis: currentDiary.anamnesis,
				previousStatusLocalis: currentDiary.statusLocalis,
				previousDiagnosisIcd10: currentDiary.diagnosisIcd10,
				previousTreatmentDescription: currentDiary.treatmentDescription,
			});

			// 5. Update visit_diaries table atomically
			const [updatedDiary] = await tx
				.update(visitDiaries)
				.set({
					anamnesis: params.fields.anamnesis !== undefined ? params.fields.anamnesis : currentDiary.anamnesis,
					statusLocalis: params.fields.statusLocalis !== undefined ? params.fields.statusLocalis : currentDiary.statusLocalis,
					diagnosisIcd10: params.fields.diagnosisIcd10 !== undefined ? params.fields.diagnosisIcd10 : currentDiary.diagnosisIcd10,
					diagnosisTooth: params.fields.diagnosisTooth !== undefined ? params.fields.diagnosisTooth : currentDiary.diagnosisTooth,
					treatmentDescription: params.fields.treatmentDescription !== undefined ? params.fields.treatmentDescription : currentDiary.treatmentDescription,
					complications: params.fields.complications !== undefined ? params.fields.complications : currentDiary.complications,
					comorbidities: params.fields.comorbidities !== undefined ? params.fields.comorbidities : currentDiary.comorbidities,
					content: params.fields.content !== undefined ? (params.fields.content || "") : currentDiary.content,
					instrumentTrayBarcode: params.fields.instrumentTrayBarcode !== undefined ? params.fields.instrumentTrayBarcode : currentDiary.instrumentTrayBarcode,
					diaryHash: newHash,
					version: nextVersion,
					authorId: params.userId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visitDiaries.id, params.diaryId),
						eq(visitDiaries.organizationId, params.organizationId),
						eq(visitDiaries.version, params.expectedVersion),
					),
				)
				.returning();

			if (!updatedDiary) {
				throw new Error("Не удалось обновить запись дневника (race condition при записи).");
			}

			return {
				success: true,
				diary: updatedDiary,
				previousVersion: currentDiary.version,
				newVersion: nextVersion,
			};
		});
	}

	/**
	 * Acquires a collaborative editing lease / lock token for an active terminal session.
	 */
	public static acquireEditLock(params: {
		organizationId: string;
		diaryId: string;
		userId: string;
		userRole: string;
		userName?: string | undefined;
		ttlSeconds?: number | undefined;
	}): {
		readonly success: boolean;
		readonly lease: EditLeaseToken;
		readonly isAlreadyLockedByOther: boolean;
		readonly currentHolder?: EditLeaseToken | undefined;
	} {
		const key = `${params.organizationId}:${params.diaryId}`;
		const existing = activeEditLeases.get(key);
		const now = Date.now();
		const ttl = (params.ttlSeconds ?? 60) * 1000;

		if (existing && new Date(existing.expiresAt).getTime() > now) {
			if (existing.userId !== params.userId) {
				return {
					success: false,
					lease: existing,
					isAlreadyLockedByOther: true,
					currentHolder: existing,
				};
			}
		}

		const token = `lease-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const lease: EditLeaseToken = {
			lockToken: token,
			diaryId: params.diaryId,
			userId: params.userId,
			userRole: params.userRole,
			userName: params.userName,
			acquiredAt: new Date(now).toISOString(),
			expiresAt: new Date(now + ttl).toISOString(),
			isExpired: false,
		};

		activeEditLeases.set(key, lease);

		return {
			success: true,
			lease,
			isAlreadyLockedByOther: false,
		};
	}

	/**
	 * Renews the heartbeat on an existing edit lease.
	 */
	public static renewHeartbeat(params: {
		organizationId: string;
		diaryId: string;
		lockToken: string;
		ttlSeconds?: number | undefined;
	}): boolean {
		const key = `${params.organizationId}:${params.diaryId}`;
		const existing = activeEditLeases.get(key);
		if (!existing || existing.lockToken !== params.lockToken) {
			return false;
		}

		const now = Date.now();
		const ttl = (params.ttlSeconds ?? 60) * 1000;
		const renewed: EditLeaseToken = {
			...existing,
			expiresAt: new Date(now + ttl).toISOString(),
			isExpired: false,
		};

		activeEditLeases.set(key, renewed);
		return true;
	}

	/**
	 * Releases an edit lease upon saving or leaving the page.
	 */
	public static releaseEditLock(params: {
		organizationId: string;
		diaryId: string;
		lockToken: string;
	}): boolean {
		const key = `${params.organizationId}:${params.diaryId}`;
		const existing = activeEditLeases.get(key);
		if (existing && existing.lockToken === params.lockToken) {
			activeEditLeases.delete(key);
			return true;
		}
		return false;
	}

	/**
	 * Inspects the current lock status of a diary.
	 */
	public static getLockStatus(
		organizationId: string,
		diaryId: string,
	): EditLeaseToken | null {
		const key = `${organizationId}:${diaryId}`;
		const existing = activeEditLeases.get(key);
		if (!existing) return null;

		const isExpired = new Date(existing.expiresAt).getTime() <= Date.now();
		if (isExpired) {
			activeEditLeases.delete(key);
			return null;
		}

		return existing;
	}
}
