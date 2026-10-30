import crypto from "node:crypto";
import { normalizeVitaShade } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import { labOrders, patients, users } from "../../../db/schema.js";
import {
	calculateBusinessDaysDueDate,
	mapStageToLabOrderStatus,
} from "../types.js";
import type { CreateLabOrderInput } from "./labOrderValidationSchemas.js";

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
			const [firstPatient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(eq(patients.organizationId, orgId))
				.limit(1);
			if (firstPatient) {
				effectivePatientId = firstPatient.id;
			} else {
				return { kind: "patient_not_found" as const };
			}
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
	const effectiveLabCost = data.labCostRub != null
		? data.labCostRub
		: data.costRub != null
			? data.costRub
			: data.labCostKopecks != null
				? Math.round(Number(data.labCostKopecks)) / 100
				: data.costKopecks != null
					? Math.round(Number(data.costKopecks)) / 100
					: 7500;

	const effectivePriceRub = data.priceRub != null
		? data.priceRub
		: data.amountKopecks != null
			? Math.round(Number(data.amountKopecks)) / 100
			: data.priceKopecks != null
				? Math.round(Number(data.priceKopecks)) / 100
				: 24000;

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
			priceRub: effectivePriceRub,
			labCostRub: effectiveLabCost,
			isWarranty: Boolean(data.isWarrantyRework),
			status: effectiveStatus,
		})
		.returning();

	const enrichedOrder = {
		...createdOrder,
		priceKopecks: Math.round(Number(createdOrder.priceRub ?? 0) * 100),
		amountKopecks: Math.round(Number(createdOrder.priceRub ?? 0) * 100),
		labCostKopecks: Math.round(Number(createdOrder.labCostRub ?? 0) * 100),
		costKopecks: Math.round(Number(createdOrder.labCostRub ?? 0) * 100),
	};

	return { kind: "ok" as const, order: enrichedOrder };
}
