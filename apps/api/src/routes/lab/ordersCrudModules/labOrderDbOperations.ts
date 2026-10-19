import crypto from "node:crypto";
import { normalizeVitaShade } from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	type LabOrderStatus,
} from "../../../db/labQuery.js";
import type { TenantDb } from "../../../db/rls.js";
import {
	labOrders,
	patients,
	users,
} from "../../../db/schema.js";
import {
	calculateBusinessDaysDueDate,
	mapStageToLabOrderStatus,
} from "../types.js";
import type {
	CreateLabOrderInput,
	UpdateLabOrderInput,
} from "./labOrderValidationSchemas.js";

/**
 * Layer 2: Database persistence operations for dental lab orders.
 * Each function receives `tx: TenantDb` (DatabaseTransaction) as its first parameter.
 */

/**
 * DB query helper: Select lab orders with joined patient and doctor details.
 */
export async function selectLabOrdersQuery(
	tx: TenantDb,
	orgId: string,
	patientId?: string,
) {
	return tx
		.select({
			id: labOrders.id,
			patientId: labOrders.patientId,
			patientName: patients.fullName,
			doctorId: labOrders.doctorId,
			doctorName: sql<string | null>`coalesce(${users.fullName}, ${labOrders.doctorName})`,
			secureToken: labOrders.secureToken,
			toothFdi: labOrders.toothFdi,
			material: labOrders.material,
			colorVita: labOrders.colorVita,
			status: labOrders.status,
			dueDate: labOrders.dueDate,
			clinicalNotes: labOrders.clinicalNotes,
			labComments: labOrders.labComments,
			attachedImageUrl: labOrders.attachedImageUrl,
			priceRub: labOrders.priceRub,
			paidFromCashOperationId: labOrders.paidFromCashOperationId,
			isLockedInstalled: labOrders.isLockedInstalled,
			installedAt: labOrders.installedAt,
			sentAt: labOrders.sentAt,
			completedAt: labOrders.completedAt,
			cancelledAt: labOrders.cancelledAt,
			createdAt: labOrders.createdAt,
			updatedAt: labOrders.updatedAt,
		})
		.from(labOrders)
		.innerJoin(patients, eq(patients.id, labOrders.patientId))
		.leftJoin(users, eq(users.id, labOrders.doctorId))
		.where(
			and(
				eq(labOrders.organizationId, orgId),
				patientId ? eq(labOrders.patientId, patientId) : undefined,
			),
		)
		.orderBy(desc(labOrders.createdAt));
}

/**
 * DB query helper: Seeds deterministic demo lab orders if empty for demo organization.
 */
export async function seedDemoLabOrdersIfEmpty(tx: TenantDb, orgId: string) {
	const orgPatients = await tx
		.select()
		.from(patients)
		.where(eq(patients.organizationId, orgId))
		.limit(4);
	const orgUsers = await tx
		.select()
		.from(users)
		.where(eq(users.organizationId, orgId))
		.limit(1);

	if (orgPatients.length > 0) {
		const now = new Date();
		const doc0 = orgUsers[0];
		const p0 = orgPatients[0]!;
		const p1 = orgPatients[1] ?? p0;
		const p2 = orgPatients[2] ?? p0;
		const p3 = orgPatients[3] ?? p0;

		await tx.insert(labOrders).values([
			{
				organizationId: orgId,
				patientId: p0.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-101`,
				toothFdi: "16",
				material: "Керамика IPS e.max Press (Ivoclar)",
				colorVita: "A2",
				status: "received",
				dueDate: new Date(now.getTime() + 2 * 86400_000),
				priceRub: 28000,
				clinicalNotes:
					"Цельнокерамическая коронка e.MAX на зуб 16. Работа доставлена из ЗТЛ в клинику, готова к примерке и фиксации.",
				sentAt: new Date(now.getTime() - 4 * 86400_000),
			},
			{
				organizationId: orgId,
				patientId: p1.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-102`,
				toothFdi: "21",
				material: "Диоксид циркония ZrO2 Katana ML",
				colorVita: "A1",
				status: "in_progress",
				dueDate: new Date(now.getTime() + 4 * 86400_000),
				priceRub: 32000,
				clinicalNotes:
					"Анатомическая коронка ZrO2 на зуб 21. Этап CAD/CAM фрезеровки и синтеризации.",
				sentAt: new Date(now.getTime() - 2 * 86400_000),
			},
			{
				organizationId: orgId,
				patientId: p2.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-103`,
				toothFdi: "46",
				material: "Диоксид циркония Prettau Anterior",
				colorVita: "A3",
				status: "sent",
				dueDate: new Date(now.getTime() + 5 * 86400_000),
				priceRub: 24000,
				clinicalNotes:
					"Цифровой слепок STL отправлен в лабораторию. Моделировка анатомического каркаса.",
				sentAt: new Date(now.getTime() - 86400_000),
			},
			{
				organizationId: orgId,
				patientId: p3.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-104`,
				toothFdi: "36",
				material: "Металлокерамика Co-Cr Noritake",
				colorVita: "A2",
				status: "completed",
				isLockedInstalled: true,
				installedAt: new Date(now.getTime() - 86400_000),
				completedAt: new Date(now.getTime() - 86400_000),
				dueDate: new Date(now.getTime() - 2 * 86400_000),
				priceRub: 18500,
				clinicalNotes:
					"Коронка 36 сдана и зафиксирована в полости рта пациента.",
				sentAt: new Date(now.getTime() - 6 * 86400_000),
			},
		]);
	}
}

/**
 * DB query helper: Create lab order in database.
 */
export async function insertLabOrderInDb(
	tx: TenantDb,
	orgId: string,
	data: CreateLabOrderInput,
) {
	let effectivePatientId = data.patientId;
	if (!effectivePatientId) {
		const [firstPatient] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.organizationId, orgId))
			.limit(1);
		if (!firstPatient) {
			return { kind: "patient_not_found" as const };
		}
		effectivePatientId = firstPatient.id;
	} else {
		const [patient] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, effectivePatientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return { kind: "patient_not_found" as const };
		}
	}

	let doctorName: string | null = null;
	if (data.doctorId) {
		const [doctor] = await tx
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(
				and(eq(users.id, data.doctorId), eq(users.organizationId, orgId)),
			)
			.limit(1);
		if (!doctor) {
			return { kind: "doctor_not_found" as const };
		}
		doctorName = doctor.fullName;
	}

	const secureToken = crypto.randomUUID();

	const rawColor = data.colorVita || data.shadeCode || null;
	const normalizedColor = rawColor ? normalizeVitaShade(rawColor) : "A2";
	const parsedDueDate = data.dueDate
		? new Date(data.dueDate)
		: data.expectedLabDate
			? new Date(data.expectedLabDate)
			: calculateBusinessDaysDueDate(new Date(), 5);

	const effectiveToothFdi = data.toothFdi || data.teethFdi || "16";
	const effectiveMaterial = data.material || data.materialName || data.construction || "Диоксид циркония Multi-Layer";
	const effectiveNotes = data.clinicalNotes || data.doctorNotes || null;
	const effectiveStatus = (data.status ? mapStageToLabOrderStatus(data.status) : null) ?? "draft";

	const effectiveLabName = data.laboratoryName || data.labName || "Основная лаборатория";
	const effectiveLabCost = data.labCostRub != null ? data.labCostRub : (data.costRub != null ? data.costRub : 7500);

	const [createdOrder] = await tx
		.insert(labOrders)
		.values({
			organizationId: orgId,
			patientId: effectivePatientId,
			doctorId: data.doctorId || null,
			doctorName: doctorName || data.doctorName || "Врач-ортопед",
			secureToken,
			toothFdi: effectiveToothFdi,
			material: effectiveMaterial,
			colorVita: normalizedColor,
			dueDate: parsedDueDate,
			clinicalNotes: effectiveNotes ? (effectiveNotes.includes("Лаборатория:") ? effectiveNotes : `* Лаборатория: ${effectiveLabName}\n${effectiveNotes}`) : `* Лаборатория: ${effectiveLabName}`,
			priceRub: data.priceRub != null ? data.priceRub : 24000,
			labCostRub: effectiveLabCost,
			isWarranty: Boolean(data.isWarrantyRework),
			status: effectiveStatus,
		})
		.returning();

	return { kind: "ok" as const, order: createdOrder };
}

/**
 * DB query helper: Update lab order in database with state transition checks.
 */
export async function updateLabOrderInDb(
	tx: TenantDb,
	orgId: string,
	id: string,
	updateData: UpdateLabOrderInput,
) {
	const [currentOrder] = await tx
		.select()
		.from(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.limit(1);

	if (!currentOrder) {
		return { kind: "not_found" as const };
	}

	let targetStatus: LabOrderStatus | undefined = undefined;
	if (updateData.status) {
		targetStatus = mapStageToLabOrderStatus(updateData.status) ?? (updateData.status as LabOrderStatus);
	}
	if (!targetStatus && updateData.stage) {
		const mapped = mapStageToLabOrderStatus(updateData.stage);
		if (mapped) targetStatus = mapped;
	}

	if (targetStatus && targetStatus !== currentOrder.status) {
		const currentStatus = currentOrder.status as LabOrderStatus;
		const allowed = LAB_ORDER_CLINIC_TRANSITIONS[currentStatus];

		const isPermittedShortcut =
			(currentStatus === "in_progress" &&
				["received", "refitting", "completed", "shipped", "cancelled"].includes(targetStatus)) ||
			(currentStatus === "received" &&
				["completed", "refitting", "in_progress", "cancelled"].includes(targetStatus)) ||
			(currentStatus === "refitting" &&
				["in_progress", "received", "completed", "cancelled"].includes(targetStatus)) ||
			(currentStatus === "sent" &&
				["in_progress", "shipped", "received", "cancelled"].includes(targetStatus)) ||
			(currentStatus === "completed" &&
				["refitting"].includes(targetStatus)) ||
			targetStatus === "cancelled";

		if ((!allowed || !allowed.includes(targetStatus)) && !isPermittedShortcut) {
			return {
				kind: "invalid_transition" as const,
				currentStatus,
				targetStatus,
			};
		}
	}

	const now = new Date();
	const auditFields: Partial<{
		sentAt: Date;
		completedAt: Date;
		cancelledAt: Date;
	}> = {};

	if (targetStatus === "sent" && !currentOrder.sentAt) {
		auditFields.sentAt = now;
	} else if (targetStatus === "completed" && !currentOrder.completedAt) {
		auditFields.completedAt = now;
	} else if (targetStatus === "cancelled" && !currentOrder.cancelledAt) {
		auditFields.cancelledAt = now;
	}

	const rawColor = updateData.colorVita || updateData.shadeCode;
	const normalizedColor = rawColor ? normalizeVitaShade(rawColor) : undefined;
	const parsedDueDate = updateData.dueDate
		? new Date(updateData.dueDate)
		: updateData.expectedLabDate
			? new Date(updateData.expectedLabDate)
			: updateData.dueDate === null
				? null
				: undefined;

	const effectiveMaterial = updateData.material ?? updateData.materialName ?? updateData.construction;
	const effectiveNotes = updateData.clinicalNotes ?? updateData.doctorNotes;
	const effectiveTooth = updateData.toothFdi ?? updateData.teethFdi;

	const updatePayload: Record<string, unknown> = {
		...auditFields,
		updatedAt: now,
	};

	if (updateData.doctorId !== undefined) updatePayload.doctorId = updateData.doctorId;
	if (effectiveTooth !== undefined) updatePayload.toothFdi = effectiveTooth;
	if (effectiveMaterial !== undefined) updatePayload.material = effectiveMaterial;
	if (normalizedColor !== undefined) updatePayload.colorVita = normalizedColor;
	if (parsedDueDate !== undefined) updatePayload.dueDate = parsedDueDate;
	if (effectiveNotes !== undefined) updatePayload.clinicalNotes = effectiveNotes;
	if (updateData.priceRub !== undefined) updatePayload.priceRub = updateData.priceRub;
	if (targetStatus !== undefined) updatePayload.status = targetStatus;
	if (updateData.labComments !== undefined) updatePayload.labComments = updateData.labComments;
	if (updateData.attachedImageUrl !== undefined) updatePayload.attachedImageUrl = updateData.attachedImageUrl;

	const [updated] = await tx
		.update(labOrders)
		.set(updatePayload)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.returning();

	return { kind: "ok" as const, updated };
}

/**
 * DB query helper: Delete lab order in database (only drafts or cancelled).
 */
export async function deleteLabOrderInDb(tx: TenantDb, orgId: string, id: string) {
	const [existing] = await tx
		.select()
		.from(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.limit(1);

	if (!existing) {
		return { kind: "not_found" as const };
	}

	if (existing.status !== "draft" && existing.status !== "cancelled") {
		return { kind: "cannot_delete" as const, status: existing.status };
	}

	const [deleted] = await tx
		.delete(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.returning();

	return { kind: "ok" as const, deleted };
}
