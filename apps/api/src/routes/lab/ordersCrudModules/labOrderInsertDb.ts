import crypto from "node:crypto";
import { normalizeVitaShade, VALID_FDI_TOOTH_NUMBERS } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import { labItems, labOrders, patients, users } from "../../../db/schema.js";
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
): Promise<
	| { kind: "patient_not_found"; order?: never }
	| { kind: "doctor_not_found"; order?: never }
	| { kind: "ok"; order: typeof labOrders.$inferSelect & Record<string, unknown> }
> {
	let effectivePatientId: string | null = null;
	if (data.patientId) {
		const [patient] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, data.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);
		if (patient) {
			effectivePatientId = patient.id;
		}
	}

	// Если patientId не указан или не найден, ищем по ФИО в текущей клинике
	if (!effectivePatientId && data.patientName && data.patientName.trim()) {
		const trimmedName = data.patientName.trim();
		const [existingPatient] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.fullName, trimmedName),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);
		if (existingPatient) {
			effectivePatientId = existingPatient.id;
		}
	}

	// Автономия врача (Мандаты 8e, 8n): если наряд создается соло-врачом без предварительно
	// заведенного пациента, регистрируем карточку пациента в базе без блокировок и 404!
	if (!effectivePatientId) {
		const rawName = data.patientName?.trim() || "Ортопедический пациент";
		const [newPatient] = await tx
			.insert(patients)
			.values({
				organizationId: orgId,
				fullName: rawName,
				notes: "Автоматически создан при оформлении заказ-наряда ЗТЛ",
			})
			.returning({ id: patients.id });
		if (newPatient) {
			effectivePatientId = newPatient.id;
		}
	}

	if (!effectivePatientId) {
		return { kind: "patient_not_found" as const };
	}

	let doctorName: string | null = null;
	let effectiveDoctorId: string | null = null;
	if (data.doctorId) {
		const [doctor] = await tx
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(
				and(eq(users.id, data.doctorId), eq(users.organizationId, orgId)),
			)
			.limit(1);
		if (doctor) {
			effectiveDoctorId = doctor.id;
			doctorName = doctor.fullName;
		}
	}

	const secureToken = crypto.randomUUID();

	const rawColor = data.colorVita || data.shadeCode || null;
	const normalizedColor = rawColor ? normalizeVitaShade(rawColor) : "A2";
	const parsedDueDate = data.dueDate
		? new Date(data.dueDate)
		: data.expectedLabDate
			? new Date(data.expectedLabDate)
			: calculateBusinessDaysDueDate(new Date(), 5);

	const effectiveToothFdi = data.toothFdi || data.teethFdi || null;
	const effectiveMaterial = data.material || data.materialName || data.construction || null;
	const effectiveNotes = data.clinicalNotes || data.doctorNotes || null;
	const effectiveStatus = (data.status ? mapStageToLabOrderStatus(data.status) : null) ?? "draft";

	const effectiveLabName = data.laboratoryName || data.labName || null;
	const effectiveLabCost = data.labCostRub != null
		? data.labCostRub
		: data.costRub != null
			? data.costRub
			: data.labCostKopecks != null
				? Math.round(Number(data.labCostKopecks)) / 100
				: data.costKopecks != null
					? Math.round(Number(data.costKopecks)) / 100
					: 0;

	const effectivePriceRub = data.priceRub != null
		? data.priceRub
		: data.amountKopecks != null
			? Math.round(Number(data.amountKopecks)) / 100
			: data.priceKopecks != null
				? Math.round(Number(data.priceKopecks)) / 100
				: 0;

	let structuredNotes = effectiveNotes || "";
	if (data.visitId && !structuredNotes.includes("Визит:")) {
		structuredNotes = `* Визит: ${data.visitId}\n${structuredNotes}`;
	}

	const [createdOrder] = await tx
		.insert(labOrders)
		.values({
			organizationId: orgId,
			patientId: effectivePatientId,
			treatmentPlanId: data.treatmentPlanId ?? null,
			appointmentId: data.appointmentId ?? null,
			doctorId: effectiveDoctorId,
			doctorName: doctorName || data.doctorName || null,
			laboratoryName: effectiveLabName,
			secureToken,
			toothFdi: Array.isArray(effectiveToothFdi)
				? effectiveToothFdi.join(",")
				: effectiveToothFdi != null
					? String(effectiveToothFdi)
					: null,
			material: effectiveMaterial,
			colorVita: normalizedColor,
			dueDate: parsedDueDate,
			clinicalNotes: structuredNotes.trim() || null,
			priceRub: effectivePriceRub,
			labCostRub: effectiveLabCost,
			isWarranty: Boolean(data.isWarrantyRework),
			status: effectiveStatus,
		})
		.returning();

	if (!createdOrder) {
		throw new Error("Не удалось создать заказ в лабораторию");
	}

	// [LAB-04]: Нормализация зубов и запись в lab_items
	if (Array.isArray(data.items) && data.items.length > 0) {
		for (const item of data.items) {
			await tx.insert(labItems).values({
				organizationId: orgId,
				labOrderId: createdOrder.id,
				toothFdi: item.toothFdi,
				restorationType: item.restorationType,
				material: item.material,
				shadeSystem: item.shadeSystem,
				shadeFinal: item.shadeFinal,
				shadeStump: item.shadeStump ?? null,
				shadeGingiva: item.shadeGingiva ?? null,
				translucencyLevel: item.translucencyLevel,
				cementGapMicrons: item.cementGapMicrons,
				extraMarginGapMicrons: item.extraMarginGapMicrons,
				minimalThicknessMm: item.minimalThicknessMm,
				implantSystem: item.implantSystem ?? null,
				implantPlatformDiameterMm: item.implantPlatformDiameterMm ?? null,
				tiBaseHeightMm: item.tiBaseHeightMm ?? null,
				priceRub: item.priceRub ? String(item.priceRub) : null,
			});
		}
	} else if (effectiveToothFdi != null) {
		const rawStr = Array.isArray(effectiveToothFdi) ? effectiveToothFdi.join(",") : String(effectiveToothFdi);
		const parts = rawStr.split(/[\s,;-]+/).filter(Boolean);
		const validTeeth = parts
			.map((p) => Number.parseInt(p, 10))
			.filter((num) => !Number.isNaN(num) && VALID_FDI_TOOTH_NUMBERS.has(num));

		if (validTeeth.length > 0) {
			const pricePerTooth = effectivePriceRub / validTeeth.length;
			for (const toothNum of validTeeth) {
				await tx.insert(labItems).values({
					organizationId: orgId,
					labOrderId: createdOrder.id,
					toothFdi: toothNum,
					restorationType: "crown_monolithic",
					material: effectiveMaterial || "zirconia_multilayer_gradient",
					shadeSystem: "VITA_CLASSICAL",
					shadeFinal: normalizedColor,
					priceRub: String(pricePerTooth.toFixed(2)),
				});
			}
		}
	}

	const enrichedOrder = {
		...createdOrder,
		treatmentPlanId: data.treatmentPlanId ?? null,
		appointmentId: data.appointmentId ?? null,
		visitId: data.visitId ?? null,
		priceKopecks: Math.round(Number(createdOrder.priceRub ?? 0) * 100),
		amountKopecks: Math.round(Number(createdOrder.priceRub ?? 0) * 100),
		labCostKopecks: Math.round(Number(createdOrder.labCostRub ?? 0) * 100),
		costKopecks: Math.round(Number(createdOrder.labCostRub ?? 0) * 100),
	};

	return { kind: "ok" as const, order: enrichedOrder };
}
