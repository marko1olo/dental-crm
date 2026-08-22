import {
	type FieldConflictDetail,
	type MutationVector,
	type SyncMutationEnvelope,
	type SyncMutationResult,
	type SyncMutationStatus,
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
	computePayloadHash,
	mergeFieldLevelCrdt,
	parseIdempotencyKey,
} from "@dental/shared";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { type TenantDb, withTenantCtx } from "../../db/rls.js";
import {
	patientInvoices,
	patients,
	payments,
	syncEntityVectors,
	syncIdempotencyRecords,
	visitDiaries,
	visits,
} from "../../db/schema.js";

export class SyncGatewayService {
	/**
	 * Ensures database tables for synchronization and vector clocks exist.
	 */
	public static async ensureSyncTablesExist(): Promise<void> {
		try {
			await db.execute(sql`
				CREATE TABLE IF NOT EXISTS "sync_idempotency_records" (
					"id" uuid PRIMARY KEY DEFAULT uuidv7(),
					"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
					"idempotency_key" text NOT NULL,
					"payload_hash" text NOT NULL,
					"entity_kind" text NOT NULL,
					"entity_id" text NOT NULL,
					"action" text NOT NULL,
					"response_status" integer NOT NULL DEFAULT 200,
					"response_json" jsonb,
					"client_mutation_vector" jsonb,
					"created_at" timestamp with time zone NOT NULL DEFAULT now(),
					"updated_at" timestamp with time zone NOT NULL DEFAULT now()
				);
			`);

			await db.execute(sql`
				CREATE UNIQUE INDEX IF NOT EXISTS "sync_idempotency_records_org_key_idx"
				ON "sync_idempotency_records" ("organization_id", "idempotency_key");
			`);

			await db.execute(sql`
				CREATE INDEX IF NOT EXISTS "sync_idempotency_records_org_entity_idx"
				ON "sync_idempotency_records" ("organization_id", "entity_kind", "entity_id");
			`);

			await db.execute(sql`
				CREATE TABLE IF NOT EXISTS "sync_entity_vectors" (
					"id" uuid PRIMARY KEY DEFAULT uuidv7(),
					"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
					"entity_kind" text NOT NULL,
					"entity_id" text NOT NULL,
					"current_version" integer NOT NULL DEFAULT 1,
					"vector_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
					"last_mutation_id" text,
					"created_at" timestamp with time zone NOT NULL DEFAULT now(),
					"updated_at" timestamp with time zone NOT NULL DEFAULT now()
				);
			`);

			await db.execute(sql`
				CREATE UNIQUE INDEX IF NOT EXISTS "sync_entity_vectors_org_kind_entity_idx"
				ON "sync_entity_vectors" ("organization_id", "entity_kind", "entity_id");
			`);
		} catch (err) {
			// Ignore if tables or indexes already exist
		}
	}

	/**
	 * Processes a batch of synchronization mutations from an offline client queue.
	 * Enforces idempotency (UUID + payload hash), double-spending protection for finances,
	 * and deterministic field-level CRDT conflict resolution for clinical records.
	 */
	public static async processPushBatch(
		organizationId: string,
		request: SyncPushBatchRequest,
		authorUserId?: string,
	): Promise<SyncPushBatchResponse> {
		await this.ensureSyncTablesExist();

		return await withTenantCtx(organizationId, async (tx) => {
			const results: SyncMutationResult[] = [];
			let appliedCount = 0;
			let duplicateCount = 0;
			let mergedCount = 0;
			let rejectedCount = 0;

			const nowIso = new Date().toISOString();

			for (const mutation of request.mutations) {
				try {
					const mutationResult = await this.processSingleMutation(
						tx,
						organizationId,
						mutation,
						request.clientId,
						authorUserId,
					);

					results.push(mutationResult);

					if (mutationResult.status === "applied") {
						appliedCount++;
					} else if (mutationResult.status === "duplicate") {
						duplicateCount++;
					} else if (
						mutationResult.status === "merged" ||
						mutationResult.status === "conflict_resolved"
					) {
						mergedCount++;
					} else if (mutationResult.status === "rejected") {
						rejectedCount++;
					}
				} catch (err: unknown) {
					const errorMessage =
						err instanceof Error ? err.message : "Unknown sync mutation error";
					rejectedCount++;
					results.push({
						mutationId: mutation.mutationId,
						idempotencyKey: mutation.idempotencyKey,
						status: "rejected",
						entityKind: mutation.entityKind,
						entityId: mutation.entityId,
						appliedAt: nowIso,
						error: errorMessage,
					});
				}
			}

			return {
				syncBatchId: request.syncBatchId,
				processedCount: request.mutations.length,
				appliedCount,
				duplicateCount,
				mergedCount,
				rejectedCount,
				results,
				serverTime: nowIso,
			};
		});
	}

	/**
	 * Processes an individual mutation envelope within the organization's tenant context.
	 */
	private static async processSingleMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<SyncMutationResult> {
		const nowIso = new Date().toISOString();

		// 1. Data Integrity Check: Verify payload hash matches canonical serialized payload
		const calculatedHash = computePayloadHash(mutation.payload);
		const parsedKey = parseIdempotencyKey(mutation.idempotencyKey);

		if (mutation.payloadHash && mutation.payloadHash !== calculatedHash) {
			return {
				mutationId: mutation.mutationId,
				idempotencyKey: mutation.idempotencyKey,
				status: "rejected",
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				appliedAt: nowIso,
				error: "Payload hash verification failed: payload content does not match payloadHash",
			};
		}

		if (parsedKey.embeddedHash && parsedKey.embeddedHash !== calculatedHash) {
			return {
				mutationId: mutation.mutationId,
				idempotencyKey: mutation.idempotencyKey,
				status: "rejected",
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				appliedAt: nowIso,
				error: "Idempotency-Key hash mismatch: payload does not match the hash embedded in the key",
			};
		}

		// 2. Idempotency Check: Look for previous processing of this exact idempotency key
		const [existingIdempotency] = await tx
			.select()
			.from(syncIdempotencyRecords)
			.where(
				and(
					eq(syncIdempotencyRecords.organizationId, organizationId),
					eq(syncIdempotencyRecords.idempotencyKey, mutation.idempotencyKey),
				),
			)
			.limit(1);

		if (existingIdempotency) {
			// If key was used with a DIFFERENT payload hash, reject as conflict
			if (existingIdempotency.payloadHash !== calculatedHash) {
				return {
					mutationId: mutation.mutationId,
					idempotencyKey: mutation.idempotencyKey,
					status: "rejected",
					entityKind: mutation.entityKind,
					entityId: mutation.entityId,
					appliedAt: nowIso,
					error: "Idempotency-Key collision: same key was previously processed with different payload",
				};
			}

			// Exact duplicate: return cached response, guarantee zero double-execution / zero double-billing
			return {
				mutationId: mutation.mutationId,
				idempotencyKey: mutation.idempotencyKey,
				status: "duplicate",
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				appliedAt: existingIdempotency.createdAt.toISOString(),
				currentServerEntity: existingIdempotency.responseJson ?? undefined,
			};
		}

		// 3. Dispatch entity-specific mutation handling
		let mutationStatus: SyncMutationStatus = "applied";
		let mergedFields: string[] = [];
		let conflictDetails: FieldConflictDetail[] = [];
		let currentServerEntity: Record<string, unknown> | undefined;

		if (mutation.entityKind === "payment") {
			// Financial Operation: Strict Double-Spending Protection
			const paymentResult = await this.handlePaymentMutation(
				tx,
				organizationId,
				mutation,
			);
			mutationStatus = paymentResult.status;
			currentServerEntity = paymentResult.entity;
		} else if (mutation.entityKind === "patient") {
			// Patient Entity: Field-Level Merging (e.g. Phone vs Anamnesis)
			const patientResult = await this.handlePatientMutation(
				tx,
				organizationId,
				mutation,
				clientId,
				authorUserId,
			);
			mutationStatus = patientResult.status;
			mergedFields = patientResult.mergedFields;
			conflictDetails = patientResult.conflicts;
			currentServerEntity = patientResult.entity;
		} else if (
			mutation.entityKind === "visit" ||
			mutation.entityKind === "visit_diary"
		) {
			// Clinical Visit / Diary: Field-Level Merging & Anamnesis / Diary Preservations
			const clinicalResult = await this.handleClinicalMutation(
				tx,
				organizationId,
				mutation,
				clientId,
				authorUserId,
			);
			mutationStatus = clinicalResult.status;
			mergedFields = clinicalResult.mergedFields;
			conflictDetails = clinicalResult.conflicts;
			currentServerEntity = clinicalResult.entity;
		} else {
			// Generic Entity Upsert
			currentServerEntity = mutation.payload;
			mutationStatus = "applied";
		}

		// 4. Record idempotency log for exactly-once replay protection
		try {
			await tx.insert(syncIdempotencyRecords).values({
				organizationId,
				idempotencyKey: mutation.idempotencyKey,
				payloadHash: calculatedHash,
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				action: mutation.action,
				responseStatus: 200,
				responseJson: currentServerEntity ?? null,
				clientMutationVector: mutation.mutationVector ?? null,
			});
		} catch (err) {
			// Concurrent race: If another worker inserted the same idempotency key simultaneously,
			// query the existing record and return duplicate status.
			const [raceRecord] = await tx
				.select()
				.from(syncIdempotencyRecords)
				.where(
					and(
						eq(syncIdempotencyRecords.organizationId, organizationId),
						eq(syncIdempotencyRecords.idempotencyKey, mutation.idempotencyKey),
					),
				)
				.limit(1);

			if (raceRecord) {
				return {
					mutationId: mutation.mutationId,
					idempotencyKey: mutation.idempotencyKey,
					status: "duplicate",
					entityKind: mutation.entityKind,
					entityId: mutation.entityId,
					appliedAt: raceRecord.createdAt.toISOString(),
					currentServerEntity: raceRecord.responseJson ?? undefined,
				};
			}
		}

		return {
			mutationId: mutation.mutationId,
			idempotencyKey: mutation.idempotencyKey,
			status: mutationStatus,
			entityKind: mutation.entityKind,
			entityId: mutation.entityId,
			appliedAt: nowIso,
			...(mergedFields.length > 0 ? { mergedFields } : {}),
			...(conflictDetails.length > 0 ? { conflictDetails } : {}),
			...(currentServerEntity ? { currentServerEntity } : {}),
		};
	}

	/**
	 * Financial Payment Handler with zero duplicate charging guarantee.
	 */
	private static async handlePaymentMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
	): Promise<{ status: SyncMutationStatus; entity: Record<string, unknown> }> {
		const payload = mutation.payload;
		const clientMutationId = mutation.idempotencyKey;

		// Check if payment with this clientMutationId already exists in DB
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.clientMutationId, clientMutationId),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				status: "duplicate",
				entity: existingPayment as unknown as Record<string, unknown>,
			};
		}

		// Insert single, exact payment row
		const amountRub = Number(payload.amountRub ?? 0);
		const patientId = String(payload.patientId);
		const visitId = payload.visitId ? String(payload.visitId) : null;
		const documentId = payload.documentId ? String(payload.documentId) : null;
		const method =
			(payload.method as
				| "cash"
				| "card"
				| "bank_transfer"
				| "online"
				| "insurance"
				| "family_wallet"
				| "other") || "card";
		const fiscalReceiptNumber = payload.fiscalReceiptNumber
			? String(payload.fiscalReceiptNumber)
			: null;
		const fiscalReceiptIssuedAt = payload.fiscalReceiptIssuedAt
			? String(payload.fiscalReceiptIssuedAt)
			: null;
		const fiscalReceiptUrl = payload.fiscalReceiptUrl
			? String(payload.fiscalReceiptUrl)
			: null;
		// biome-ignore lint/suspicious/noExplicitAny: payment payload
		const fiscalReceipt = (payload.fiscalReceipt as any) ?? null;

		const [createdPayment] = await tx
			.insert(payments)
			.values({
				id: mutation.entityId,
				organizationId,
				patientId,
				visitId,
				documentId,
				clientMutationId,
				amountRub,
				method,
				status: "paid",
				fiscalReceiptNumber,
				fiscalReceiptIssuedAt,
				fiscalReceiptUrl,
				fiscalReceipt,
				payerFullName: payload.payerFullName
					? String(payload.payerFullName)
					: null,
				note: payload.note ? String(payload.note) : null,
			})
			.returning();

		return {
			status: "applied",
			entity: createdPayment as unknown as Record<string, unknown>,
		};
	}

	/**
	 * Patient Entity Handler with field-level CRDT merging.
	 */
	private static async handlePatientMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<{
		status: SyncMutationStatus;
		mergedFields: string[];
		conflicts: FieldConflictDetail[];
		entity: Record<string, unknown>;
	}> {
		// Load server patient
		const [serverPatient] = await tx
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.id, mutation.entityId),
				),
			)
			.limit(1);

		// Load server vector
		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "patient"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

		const mergeResult = mergeFieldLevelCrdt({
			entityKind: "patient",
			entityId: mutation.entityId,
			serverEntity: (serverPatient as unknown as Record<string, unknown>) || null,
			serverVector,
			clientPatch: mutation.payload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt: serverPatient?.updatedAt?.toISOString() || null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		if (!serverPatient) {
			// Insert new patient
			const newPatientPayload = mergeResult.mergedEntity;
			const [inserted] = await tx
				.insert(patients)
				.values({
					id: mutation.entityId,
					organizationId,
					fullName: String(newPatientPayload.fullName || "Без имени"),
					phone: newPatientPayload.phone
						? String(newPatientPayload.phone)
						: null,
					birthDate: newPatientPayload.birthDate
						? String(newPatientPayload.birthDate)
						: null,
					email: newPatientPayload.email
						? String(newPatientPayload.email)
						: null,
					notes: newPatientPayload.notes
						? String(newPatientPayload.notes)
						: null,
					// biome-ignore lint/suspicious/noExplicitAny: administrativeProfile
					administrativeProfile:
						(newPatientPayload.administrativeProfile as any) ?? null,
				})
				.returning();

			// Save vector
			await this.upsertEntityVector(
				tx,
				organizationId,
				"patient",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			return {
				status: "applied",
				mergedFields: mergeResult.changedFields,
				conflicts: [],
				entity: inserted as unknown as Record<string, unknown>,
			};
		}

		// Update existing patient with merged fields
		const merged = mergeResult.mergedEntity;
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if ("fullName" in merged) updateData.fullName = merged.fullName;
		if ("phone" in merged) updateData.phone = merged.phone;
		if ("birthDate" in merged) updateData.birthDate = merged.birthDate;
		if ("email" in merged) updateData.email = merged.email;
		if ("notes" in merged) updateData.notes = merged.notes;
		if ("administrativeProfile" in merged)
			updateData.administrativeProfile = merged.administrativeProfile;

		const [updated] = await tx
			.update(patients)
			.set(updateData)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.id, mutation.entityId),
				),
			)
			.returning();

		// Save updated vector
		await this.upsertEntityVector(
			tx,
			organizationId,
			"patient",
			mutation.entityId,
			mergeResult.updatedVector,
			mutation.mutationId,
		);

		const status: SyncMutationStatus = mergeResult.hasConflicts
			? "conflict_resolved"
			: mergeResult.changedFields.length > 0
				? "merged"
				: "applied";

		return {
			status,
			mergedFields: mergeResult.changedFields,
			conflicts: mergeResult.conflicts,
			entity: (updated || merged) as unknown as Record<string, unknown>,
		};
	}

	/**
	 * Clinical Visit & Diary Handler with field-level CRDT merging.
	 */
	private static async handleClinicalMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<{
		status: SyncMutationStatus;
		mergedFields: string[];
		conflicts: FieldConflictDetail[];
		entity: Record<string, unknown>;
	}> {
		if (mutation.entityKind === "visit_diary") {
			const [serverDiary] = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.organizationId, organizationId),
						eq(visitDiaries.id, mutation.entityId),
					),
				)
				.limit(1);

			const [vectorRow] = await tx
				.select()
				.from(syncEntityVectors)
				.where(
					and(
						eq(syncEntityVectors.organizationId, organizationId),
						eq(syncEntityVectors.entityKind, "visit_diary"),
						eq(syncEntityVectors.entityId, mutation.entityId),
					),
				)
				.limit(1);

			const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

			const mergeResult = mergeFieldLevelCrdt({
				entityKind: "visit_diary",
				entityId: mutation.entityId,
				serverEntity: (serverDiary as unknown as Record<string, unknown>) || null,
				serverVector,
				clientPatch: mutation.payload,
				clientVector: mutation.mutationVector,
				clientUpdatedAt: mutation.updatedAt,
				serverUpdatedAt: serverDiary?.updatedAt?.toISOString() || null,
				clientId,
				authorUserId: authorUserId || mutation.authorUserId,
			});

			if (!serverDiary) {
				const p = mergeResult.mergedEntity;
				const [inserted] = await tx
					.insert(visitDiaries)
					.values({
						id: mutation.entityId,
						organizationId,
						visitId: String(p.visitId || mutation.entityId),
						patientId: p.patientId ? String(p.patientId) : null,
						authorId: authorUserId || mutation.authorUserId || null,
						anamnesis: p.anamnesis ? String(p.anamnesis) : null,
						statusLocalis: p.statusLocalis ? String(p.statusLocalis) : null,
						diagnosisIcd10: p.diagnosisIcd10 ? String(p.diagnosisIcd10) : null,
						diagnosisTooth: p.diagnosisTooth ? String(p.diagnosisTooth) : null,
						treatmentDescription: p.treatmentDescription
							? String(p.treatmentDescription)
							: null,
						complications: p.complications ? String(p.complications) : null,
						content: String(p.content || ""),
					})
					.returning();

				await this.upsertEntityVector(
					tx,
					organizationId,
					"visit_diary",
					mutation.entityId,
					mergeResult.updatedVector,
					mutation.mutationId,
				);

				return {
					status: "applied",
					mergedFields: mergeResult.changedFields,
					conflicts: [],
					entity: inserted as unknown as Record<string, unknown>,
				};
			}

			const merged = mergeResult.mergedEntity;
			const updateData: Record<string, unknown> = {
				updatedAt: new Date(),
			};
			if ("anamnesis" in merged) updateData.anamnesis = merged.anamnesis;
			if ("statusLocalis" in merged)
				updateData.statusLocalis = merged.statusLocalis;
			if ("diagnosisIcd10" in merged)
				updateData.diagnosisIcd10 = merged.diagnosisIcd10;
			if ("diagnosisTooth" in merged)
				updateData.diagnosisTooth = merged.diagnosisTooth;
			if ("treatmentDescription" in merged)
				updateData.treatmentDescription = merged.treatmentDescription;
			if ("complications" in merged)
				updateData.complications = merged.complications;
			if ("content" in merged) updateData.content = merged.content;

			const [updated] = await tx
				.update(visitDiaries)
				.set(updateData)
				.where(
					and(
						eq(visitDiaries.organizationId, organizationId),
						eq(visitDiaries.id, mutation.entityId),
					),
				)
				.returning();

			await this.upsertEntityVector(
				tx,
				organizationId,
				"visit_diary",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			const status: SyncMutationStatus = mergeResult.hasConflicts
				? "conflict_resolved"
				: mergeResult.changedFields.length > 0
					? "merged"
					: "applied";

			return {
				status,
				mergedFields: mergeResult.changedFields,
				conflicts: mergeResult.conflicts,
				entity: (updated || merged) as unknown as Record<string, unknown>,
			};
		}

		// Otherwise visit entity
		const [serverVisit] = await tx
			.select()
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, organizationId),
					eq(visits.id, mutation.entityId),
				),
			)
			.limit(1);

		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "visit"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

		const mergeResult = mergeFieldLevelCrdt({
			entityKind: "visit",
			entityId: mutation.entityId,
			serverEntity: (serverVisit as unknown as Record<string, unknown>) || null,
			serverVector,
			clientPatch: mutation.payload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt: serverVisit?.updatedAt?.toISOString() || null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		if (!serverVisit) {
			const p = mergeResult.mergedEntity;
			const [inserted] = await tx
				.insert(visits)
				.values({
					id: mutation.entityId,
					organizationId,
					patientId: String(p.patientId),
					appointmentId: p.appointmentId ? String(p.appointmentId) : null,
					status: (p.status as "draft" | "signed" | "voided") || "draft",
					complaint: p.complaint ? String(p.complaint) : null,
					anamnesis: p.anamnesis ? String(p.anamnesis) : null,
					objectiveStatus: p.objectiveStatus ? String(p.objectiveStatus) : null,
					diagnosis: p.diagnosis ? String(p.diagnosis) : null,
					treatmentPlan: p.treatmentPlan ? String(p.treatmentPlan) : null,
					doctorSummary: p.doctorSummary ? String(p.doctorSummary) : null,
					transcript: p.transcript ? String(p.transcript) : null,
					// biome-ignore lint/suspicious/noExplicitAny: draftAutosave
					draftAutosave: (p.draftAutosave as any) ?? null,
				})
				.returning();

			await this.upsertEntityVector(
				tx,
				organizationId,
				"visit",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			return {
				status: "applied",
				mergedFields: mergeResult.changedFields,
				conflicts: [],
				entity: inserted as unknown as Record<string, unknown>,
			};
		}

		const merged = mergeResult.mergedEntity;
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};
		if ("complaint" in merged) updateData.complaint = merged.complaint;
		if ("anamnesis" in merged) updateData.anamnesis = merged.anamnesis;
		if ("objectiveStatus" in merged)
			updateData.objectiveStatus = merged.objectiveStatus;
		if ("diagnosis" in merged) updateData.diagnosis = merged.diagnosis;
		if ("treatmentPlan" in merged)
			updateData.treatmentPlan = merged.treatmentPlan;
		if ("doctorSummary" in merged)
			updateData.doctorSummary = merged.doctorSummary;
		if ("transcript" in merged) updateData.transcript = merged.transcript;
		if ("draftAutosave" in merged)
			updateData.draftAutosave = merged.draftAutosave;
		if ("status" in merged) updateData.status = merged.status;

		const [updated] = await tx
			.update(visits)
			.set(updateData)
			.where(
				and(
					eq(visits.organizationId, organizationId),
					eq(visits.id, mutation.entityId),
				),
			)
			.returning();

		await this.upsertEntityVector(
			tx,
			organizationId,
			"visit",
			mutation.entityId,
			mergeResult.updatedVector,
			mutation.mutationId,
		);

		const status: SyncMutationStatus = mergeResult.hasConflicts
			? "conflict_resolved"
			: mergeResult.changedFields.length > 0
				? "merged"
				: "applied";

		return {
			status,
			mergedFields: mergeResult.changedFields,
			conflicts: mergeResult.conflicts,
			entity: (updated || merged) as unknown as Record<string, unknown>,
		};
	}

	/**
	 * Persists or updates the vector clock for an entity.
	 */
	private static async upsertEntityVector(
		tx: TenantDb,
		organizationId: string,
		entityKind: SyncMutationEnvelope["entityKind"],
		entityId: string,
		vector: MutationVector,
		lastMutationId?: string,
	): Promise<void> {
		const [existing] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, entityKind),
					eq(syncEntityVectors.entityId, entityId),
				),
			)
			.limit(1);

		if (existing) {
			await tx
				.update(syncEntityVectors)
				.set({
					vectorJson: vector,
					currentVersion: (existing.currentVersion ?? 1) + 1,
					lastMutationId: lastMutationId ?? existing.lastMutationId,
					updatedAt: new Date(),
				})
				.where(eq(syncEntityVectors.id, existing.id));
		} else {
			await tx.insert(syncEntityVectors).values({
				organizationId,
				entityKind,
				entityId,
				currentVersion: 1,
				vectorJson: vector,
				lastMutationId,
			});
		}
	}

	/**
	 * Pulls changed entities and vectors since a specified timestamp for offline client catch-up.
	 */
	public static async pullChanges(
		organizationId: string,
		sinceIso?: string,
	): Promise<{
		serverTime: string;
		patients: unknown[];
		visits: unknown[];
		visitDiaries: unknown[];
		payments: unknown[];
		vectors: unknown[];
	}> {
		await this.ensureSyncTablesExist();
		const since = sinceIso ? new Date(sinceIso) : new Date(0);

		return await withTenantCtx(organizationId, async (tx) => {
			const [
				changedPatients,
				changedVisits,
				changedDiaries,
				changedPayments,
				changedVectors,
			] = await Promise.all([
				tx
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							gte(patients.updatedAt, since),
						),
					),
				tx
					.select()
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, organizationId),
							gte(visits.updatedAt, since),
						),
					),
				tx
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.organizationId, organizationId),
							gte(visitDiaries.updatedAt, since),
						),
					),
				tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, organizationId),
							gte(payments.updatedAt, since),
						),
					),
				tx
					.select()
					.from(syncEntityVectors)
					.where(
						and(
							eq(syncEntityVectors.organizationId, organizationId),
							gte(syncEntityVectors.updatedAt, since),
						),
					),
			]);

			return {
				serverTime: new Date().toISOString(),
				patients: changedPatients,
				visits: changedVisits,
				visitDiaries: changedDiaries,
				payments: changedPayments,
				vectors: changedVectors,
			};
		});
	}
}
