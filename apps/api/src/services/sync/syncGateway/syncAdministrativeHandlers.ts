import crypto from "node:crypto";
import {
	type FieldConflictDetail,
	type MutationVector,
	type SyncMutationEnvelope,
	type SyncMutationStatus,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	appointments,
	patientInvoices,
	patients,
	payments,
	syncEntityVectors,
} from "../../../db/schema.js";
import {
	performFieldLevelCrdtMerge,
	resolveAppointmentStatusConflict,
} from "./syncConflictResolver.js";
import { SyncQueueManager } from "./syncQueueManager.js";
import {
	type EntityMutationHandlerResult,
	ensureEntityRecord,
	toEntityRecord,
} from "./types.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(val: unknown): val is string {
	return typeof val === "string" && UUID_REGEX.test(val);
}

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
				entity: ensureEntityRecord(existingPayment),
			};
		}

		let amountKopecks: bigint | null = null;
		if (payload.amountKopecks !== undefined && payload.amountKopecks !== null) {
			try {
				amountKopecks = BigInt(String(payload.amountKopecks));
			} catch {
				amountKopecks = null;
			}
		}

		let amountRub: number;
		if (amountKopecks !== null) {
			amountRub =
				payload.amountRub !== undefined && payload.amountRub !== null
					? Number(payload.amountRub)
					: kopecksToRubles(amountKopecks);
		} else {
			amountRub = Number(payload.amountRub ?? 0);
			amountKopecks = BigInt(rublesToKopecks(amountRub));
		}

		if (!isValidUuid(payload.patientId)) {
			throw new Error(
				`Invalid or missing patientId UUID for payment mutation: ${String(payload.patientId)}`,
			);
		}
		const patientId = String(payload.patientId);
		const visitId = isValidUuid(payload.visitId) ? String(payload.visitId) : null;
		const documentId = isValidUuid(payload.documentId) ? String(payload.documentId) : null;
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
		const fiscalReceipt = payload.fiscalReceipt ?? null;

		const paymentId = isValidUuid(mutation.entityId)
			? mutation.entityId
			: crypto.randomUUID();

		const [createdPayment] = await tx
			.insert(payments)
			.values({
				id: paymentId,
				organizationId,
				patientId,
				visitId,
				documentId,
				clientMutationId,
				amountRub,
				amountKopecks,
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
			entity: ensureEntityRecord(createdPayment),
		};
	}

	/**
	 * Invoice Mutation Handler with exact kopeck precision and idempotent upsert.
	 */
	public static async handleInvoiceMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
	): Promise<{ status: SyncMutationStatus; entity: Record<string, unknown> }> {
		const payload = mutation.payload;
		if (!isValidUuid(payload.patientId)) {
			throw new Error(
				`Invalid or missing patientId UUID for invoice mutation: ${String(payload.patientId)}`,
			);
		}

		let totalPriceKopecks: bigint | null = null;
		if (payload.totalPriceKopecks !== undefined && payload.totalPriceKopecks !== null) {
			try {
				totalPriceKopecks = BigInt(String(payload.totalPriceKopecks));
			} catch {
				totalPriceKopecks = null;
			}
		} else if (payload.amountKopecks !== undefined && payload.amountKopecks !== null) {
			try {
				totalPriceKopecks = BigInt(String(payload.amountKopecks));
			} catch {
				totalPriceKopecks = null;
			}
		}

		let totalAmountRub: number;
		if (totalPriceKopecks !== null) {
			totalAmountRub =
				payload.totalAmountRub !== undefined && payload.totalAmountRub !== null
					? Number(payload.totalAmountRub)
					: kopecksToRubles(totalPriceKopecks);
		} else {
			totalAmountRub = Number(payload.totalAmountRub ?? payload.totalRub ?? 0);
			totalPriceKopecks = BigInt(rublesToKopecks(totalAmountRub));
		}

		const patientId = String(payload.patientId);
		const treatmentPlanId = isValidUuid(payload.treatmentPlanId)
			? String(payload.treatmentPlanId)
			: null;
		const visitId = isValidUuid(payload.visitId) ? String(payload.visitId) : null;
		const status = typeof payload.status === "string" ? payload.status : "draft";

		const invoiceId = isValidUuid(mutation.entityId)
			? mutation.entityId
			: crypto.randomUUID();

		const existingInvoice = isValidUuid(mutation.entityId)
			? (
					await tx
						.select()
						.from(patientInvoices)
						.where(
							and(
								eq(patientInvoices.organizationId, organizationId),
								eq(patientInvoices.id, mutation.entityId),
							),
						)
						.limit(1)
				)[0]
			: undefined;

		if (existingInvoice) {
			const [updated] = await tx
				.update(patientInvoices)
				.set({
					totalPriceKopecks,
					totalAmountRub,
					totalRub: String(totalAmountRub),
					status: status ?? existingInvoice.status,
					isSynced: true,
				})
				.where(
					and(
						eq(patientInvoices.organizationId, organizationId),
						eq(patientInvoices.id, mutation.entityId),
					),
				)
				.returning();

			return {
				status: "applied",
				entity: ensureEntityRecord(updated),
			};
		}

		const [createdInvoice] = await tx
			.insert(patientInvoices)
			.values({
				id: invoiceId,
				organizationId,
				patientId,
				treatmentPlanId,
				visitId,
				totalAmountRub,
				totalPriceKopecks,
				totalRub: String(totalAmountRub),
				status,
				isSynced: true,
			})
			.returning();

		return {
			status: "applied",
			entity: ensureEntityRecord(createdInvoice),
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
		const serverPatient = isValidUuid(mutation.entityId)
			? (
					await tx
						.select()
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								eq(patients.id, mutation.entityId),
							),
						)
						.limit(1)
				)[0]
			: undefined;

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
			serverEntity: toEntityRecord(serverPatient),
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
			const patientId = isValidUuid(mutation.entityId)
				? mutation.entityId
				: crypto.randomUUID();
			const [inserted] = await tx
				.insert(patients)
				.values({
					id: patientId,
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
					administrativeProfile: newPatientPayload.administrativeProfile ?? null,
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
				entity: ensureEntityRecord(inserted),
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
			entity: ensureEntityRecord(updated || merged),
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
		const serverAppointment = isValidUuid(mutation.entityId)
			? (
					await tx
						.select()
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, organizationId),
								eq(appointments.id, mutation.entityId),
							),
						)
						.limit(1)
				)[0]
			: undefined;

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
			serverEntity: toEntityRecord(serverAppointment),
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

			const appointmentId = isValidUuid(mutation.entityId)
				? mutation.entityId
				: crypto.randomUUID();

			const [inserted] = await tx
				.insert(appointments)
				.values({
					id: appointmentId,
					organizationId,
					patientId: isValidUuid(p.patientId) ? String(p.patientId) : null,
					doctorUserId: isValidUuid(p.doctorUserId) ? String(p.doctorUserId) : null,
					assistantUserId: isValidUuid(p.assistantUserId) ? String(p.assistantUserId) : null,
					chairId: isValidUuid(p.chairId) ? String(p.chairId) : null,
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
				entity: ensureEntityRecord(inserted),
			};
		}

		const merged = mergeResult.mergedEntity;
		const updateData: Record<string, unknown> = {};
		if ("patientId" in merged)
			updateData.patientId = isValidUuid(merged.patientId) ? String(merged.patientId) : null;
		if ("doctorUserId" in merged)
			updateData.doctorUserId = isValidUuid(merged.doctorUserId)
				? String(merged.doctorUserId)
				: null;
		if ("chairId" in merged)
			updateData.chairId = isValidUuid(merged.chairId) ? String(merged.chairId) : null;
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
			entity: ensureEntityRecord(updated || merged),
		};
	}
}
