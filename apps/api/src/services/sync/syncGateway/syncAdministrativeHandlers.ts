import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEnvelope,
	SyncMutationStatus,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	appointments,
	patients,
	payments,
	syncEntityVectors,
} from "../../../db/schema.js";
import {
	performFieldLevelCrdtMerge,
	resolveAppointmentStatusConflict,
} from "./syncConflictResolver.js";
import { SyncQueueManager } from "./syncQueueManager.js";
import type { EntityMutationHandlerResult } from "./types.js";

/**
 * Administrative mutation handlers (Financial Payments, Patient records, Appointments).
 */
export class SyncAdministrativeHandlers {
	/**
	 * Financial Payment Handler with zero duplicate charging guarantee.
	 */
	public static async handlePaymentMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
	): Promise<{ status: SyncMutationStatus; entity: Record<string, unknown> }> {
		const payload = mutation.payload;
		const clientMutationId = mutation.idempotencyKey;

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
		// biome-ignore lint/suspicious/noExplicitAny: fiscalReceipt payload
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
	public static async handlePatientMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
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

		const mergeResult = performFieldLevelCrdtMerge({
			entityKind: "patient",
			entityId: mutation.entityId,
			serverEntity: (serverPatient as unknown as Record<string, unknown>) || null,
			serverVector,
			clientPatch: mutation.payload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt:
				serverPatient?.updatedAt?.toISOString() ||
				vectorRow?.updatedAt?.toISOString() ||
				null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		if (!serverPatient) {
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

			await SyncQueueManager.upsertEntityVector(
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

		await SyncQueueManager.upsertEntityVector(
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
	 * Appointment Entity Handler with field-level CRDT merging & scheduling conflict guards.
	 */
	public static async handleAppointmentMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		const [serverAppointment] = await tx
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.id, mutation.entityId),
				),
			)
			.limit(1);

		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "appointment"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

		const incomingStatus = mutation.payload.status
			? String(mutation.payload.status)
			: undefined;
		const existingStatus = serverAppointment?.status
			? String(serverAppointment.status)
			: undefined;

		const statusResolution = resolveAppointmentStatusConflict({
			incomingStatus,
			existingStatus,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt: vectorRow?.updatedAt?.toISOString() || null,
		});

		const effectivePayload = {
			...mutation.payload,
			...(incomingStatus && incomingStatus !== statusResolution.effectiveStatus
				? { status: statusResolution.effectiveStatus }
				: {}),
		};

		const mergeResult = performFieldLevelCrdtMerge({
			entityKind: "appointment",
			entityId: mutation.entityId,
			serverEntity:
				(serverAppointment as unknown as Record<string, unknown>) || null,
			serverVector,
			clientPatch: effectivePayload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt: vectorRow?.updatedAt?.toISOString() || null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		if (statusResolution.conflictDetail) {
			mergeResult.conflicts.push(statusResolution.conflictDetail);
			mergeResult.hasConflicts = true;
		}

		if (!serverAppointment) {
			const p = mergeResult.mergedEntity;
			const startsAt = p.startsAt ? new Date(String(p.startsAt)) : new Date();
			const endsAt = p.endsAt
				? new Date(String(p.endsAt))
				: new Date(startsAt.getTime() + 30 * 60000);

			const validStatuses = new Set([
				"planned",
				"confirmed",
				"arrived",
				"in_treatment",
				"completed",
				"cancelled",
				"no_show",
			]);
			const rawStatus = String(p.status || "planned");
			const appointmentState = (
				validStatuses.has(rawStatus) ? rawStatus : "planned"
			) as
				| "planned"
				| "confirmed"
				| "arrived"
				| "in_treatment"
				| "completed"
				| "cancelled"
				| "no_show";

			const [inserted] = await tx
				.insert(appointments)
				.values({
					id: mutation.entityId,
					organizationId,
					patientId: p.patientId ? String(p.patientId) : null,
					doctorUserId: p.doctorUserId ? String(p.doctorUserId) : null,
					assistantUserId: p.assistantUserId ? String(p.assistantUserId) : null,
					chairId: p.chairId ? String(p.chairId) : null,
					status: appointmentState,
					startsAt,
					endsAt,
					reason: p.reason ? String(p.reason) : null,
					comment: p.comment ? String(p.comment) : null,
				})
				.returning();

			await SyncQueueManager.upsertEntityVector(
				tx,
				organizationId,
				"appointment",
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
		const updateData: Record<string, unknown> = {};
		if ("patientId" in merged)
			updateData.patientId = merged.patientId ? String(merged.patientId) : null;
		if ("doctorUserId" in merged)
			updateData.doctorUserId = merged.doctorUserId
				? String(merged.doctorUserId)
				: null;
		if ("chairId" in merged)
			updateData.chairId = merged.chairId ? String(merged.chairId) : null;
		if ("status" in merged && merged.status) {
			const rawStat = String(merged.status);
			updateData.status = (
				[
					"planned",
					"confirmed",
					"arrived",
					"in_treatment",
					"completed",
					"cancelled",
					"no_show",
				].includes(rawStat)
					? rawStat
					: "planned"
			) as "planned";
		}
		if ("startsAt" in merged && merged.startsAt)
			updateData.startsAt = new Date(String(merged.startsAt));
		if ("endsAt" in merged && merged.endsAt)
			updateData.endsAt = new Date(String(merged.endsAt));
		if ("reason" in merged)
			updateData.reason = merged.reason ? String(merged.reason) : null;
		if ("comment" in merged)
			updateData.comment = merged.comment ? String(merged.comment) : null;

		const [updated] = await tx
			.update(appointments)
			.set(updateData)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.id, mutation.entityId),
				),
			)
			.returning();

		await SyncQueueManager.upsertEntityVector(
			tx,
			organizationId,
			"appointment",
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
}
