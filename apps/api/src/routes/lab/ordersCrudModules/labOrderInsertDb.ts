import crypto from "node:crypto";
import {
	normalizeVitaShade,
	VALID_FDI_TOOTH_NUMBERS,
	labOrderStatusSchema,
	rublesToKopecks,
	kopecksToRubles,
	kopecksToNumericString,
	splitKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import { appointments, labItems, labOrders, patients, treatmentPlans, users, visits } from "../../../db/schema.js";
import type { LabOrderStatus } from "../../../db/labQuery.js";
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
		} else {
			// Автономия врача у кресла (Мандаты 8e, 8n): если пациент ещё не заведён в клинике,
			// создаём запись пациента по ФИО на лету без блокировок и 404
			const [newPatient] = await tx
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: trimmedName,
					status: "active",
				})
				.returning({ id: patients.id });
			if (newPatient) {
				effectivePatientId = newPatient.id;
			}
		}
	}

	if (!effectivePatientId) {
		return { kind: "patient_not_found" as const };
	}

	let effectiveAppointmentId: string | null = null;
	if (data.appointmentId) {
		const [appt] = await tx
			.select({ id: appointments.id })
			.from(appointments)
			.where(
				and(
					eq(appointments.id, data.appointmentId),
					eq(appointments.organizationId, orgId),
					eq(appointments.patientId, effectivePatientId),
				),
			)
			.limit(1);
		if (appt) {
			effectiveAppointmentId = appt.id;
		}
	} else if (data.visitId) {
		const [visit] = await tx
			.select({ appointmentId: visits.appointmentId })
			.from(visits)
			.where(
				and(
					eq(visits.id, data.visitId),
					eq(visits.organizationId, orgId),
					eq(visits.patientId, effectivePatientId),
				),
			)
			.limit(1);
		if (visit?.appointmentId) {
			effectiveAppointmentId = visit.appointmentId;
		}
	}

	let effectiveTreatmentPlanId: string | null = null;
	if (data.treatmentPlanId) {
		const [plan] = await tx
			.select({ id: treatmentPlans.id })
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.id, data.treatmentPlanId),
					eq(treatmentPlans.organizationId, orgId),
					eq(treatmentPlans.patientId, effectivePatientId),
				),
			)
			.limit(1);
		if (plan) {
			effectiveTreatmentPlanId = plan.id;
		}
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
		} else {
			return { kind: "doctor_not_found" as const };
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
	const effectiveMaterial = data.material || data.materialName || data.construction || data.materialId || null;
	const effectiveNotes = data.clinicalNotes || data.doctorNotes || null;
	const effectiveStage = data.stage || data.techStage || null;
	
	const effectiveStatus = (data.status && (labOrderStatusSchema.options as readonly string[]).includes(data.status))
		? (data.status as LabOrderStatus)
		: (data.status ? mapStageToLabOrderStatus(data.status) : null) ?? (effectiveStage ? mapStageToLabOrderStatus(effectiveStage) : null) ?? "draft";

	const effectiveLabName = data.laboratoryName || data.labName || null;

	// Канонический расчет себестоимости и цен в целочисленных копейках (Мандат 8bm)
	const effectiveLabCostKopecks: number = data.labCostKopecks != null
		? Math.round(Number(data.labCostKopecks))
		: data.costKopecks != null
			? Math.round(Number(data.costKopecks))
			: data.labCostRub != null
				? rublesToKopecks(data.labCostRub)
				: data.costRub != null
					? rublesToKopecks(data.costRub)
					: 0;

	const rawPatientKopecks = data.patientPriceKopecks ?? data.priceKopecks ?? data.amountKopecks;
	const effectivePriceKopecks: number = rawPatientKopecks != null
		? Math.round(Number(rawPatientKopecks))
		: data.patientPriceRub != null
			? rublesToKopecks(data.patientPriceRub)
			: data.priceRub != null
				? rublesToKopecks(data.priceRub)
				: 0;

	// Нормализация гарантийных обязательств (Мандаты 8e, 8n):
	// При гарантии пациент ВСЕГДА платит 0 ₽.
	// При браке лаборатории (lab_defect) лаборатория переделывает бесплатно (labCostRub = 0).
	// При гарантии клиники (clinic_warranty) клиника оплачивает ЗТЛ (labCostRub сохраняется).
	const isWarranty = Boolean(data.isWarrantyRework || data.isWarranty || data.isWarrantyRemake);
	const finalPriceKopecks = isWarranty ? 0 : effectivePriceKopecks;
	const finalLabCostKopecks = isWarranty && data.warrantyLiabilityType === "lab_defect" ? 0 : effectiveLabCostKopecks;

	const finalPriceRub = kopecksToRubles(finalPriceKopecks);
	const finalLabCostRub = kopecksToRubles(finalLabCostKopecks);

	let structuredNotes = effectiveNotes || "";
	const clinicalSpecs: string[] = [];
	if (data.stumpShade) clinicalSpecs.push(`Цвет культи: ${data.stumpShade}`);
	if (data.preparationMargin) clinicalSpecs.push(`Уступ: ${data.preparationMargin}`);
	if (data.fixationType) clinicalSpecs.push(`Фиксация: ${data.fixationType}`);
	if (data.articulatorType) clinicalSpecs.push(`Артикулятор: ${data.articulatorType}`);
	if (data.hasFacebow) clinicalSpecs.push("Лицевая дуга: Да");
	if (data.hasAntagonists != null) clinicalSpecs.push(`Антагонисты: ${data.hasAntagonists ? "Да" : "Нет"}`);
	if (clinicalSpecs.length > 0) {
		const specsPrefix = `* Клинические параметры: ${clinicalSpecs.join("; ")}`;
		structuredNotes = structuredNotes ? `${specsPrefix}\n${structuredNotes}` : specsPrefix;
	}

	if (isWarranty && !structuredNotes.includes("Гарантия")) {
		const liabilityLabel = data.warrantyLiabilityType === "lab_defect"
			? "Брак лаборатории (0 ₽ ЗТЛ, 0 ₽ пациенту)"
			: "Гарантия клиники (оплата ЗТЛ клиникой, 0 ₽ пациенту)";
		structuredNotes = `* Гарантия: ${liabilityLabel}\n${structuredNotes}`;
	}

	const effectiveAttachedImage = data.attachedImageUrl || data.attachedXrayUrl || null;

	const [createdOrder] = await tx
		.insert(labOrders)
		.values({
			organizationId: orgId,
			patientId: effectivePatientId,
			treatmentPlanId: effectiveTreatmentPlanId,
			appointmentId: effectiveAppointmentId,
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
			attachedImageUrl: effectiveAttachedImage,
			priceRub: finalPriceRub,
			priceKopecks: finalPriceKopecks,
			labCostRub: finalLabCostRub,
			labCostKopecks: finalLabCostKopecks,
			isWarranty,
			status: effectiveStatus,
			stage: effectiveStage,
		})
		.returning();

	if (!createdOrder) {
		throw new Error("Не удалось создать заказ в лабораторию");
	}

	// [LAB-04]: Нормализация зубов и запись в lab_items
	if (Array.isArray(data.items) && data.items.length > 0) {
		for (const item of data.items) {
			const itemKopecks = item.priceRub != null ? rublesToKopecks(item.priceRub) : null;
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
				priceRub: itemKopecks != null ? kopecksToNumericString(itemKopecks) : null,
				priceKopecks: itemKopecks != null ? itemKopecks : null,
			});
		}
	} else if (effectiveToothFdi != null) {
		const rawStr = Array.isArray(effectiveToothFdi) ? effectiveToothFdi.join(",") : String(effectiveToothFdi);
		const parts = rawStr.split(/[\s,;-]+/).filter(Boolean);
		const rawTeeth = parts
			.map((p) => Number.parseInt(p, 10))
			.filter((num) => !Number.isNaN(num) && VALID_FDI_TOOTH_NUMBERS.has(num));
		const validTeeth = Array.from(new Set(rawTeeth));

		if (validTeeth.length > 0) {
			const splits = splitKopecks(finalPriceKopecks, validTeeth.length);

			for (let i = 0; i < validTeeth.length; i++) {
				const toothNum = validTeeth[i]!;
				const toothKopecks = splits[i] ?? 0;
				const itemPriceRub = kopecksToNumericString(toothKopecks);

				await tx.insert(labItems).values({
					organizationId: orgId,
					labOrderId: createdOrder.id,
					toothFdi: toothNum,
					restorationType: "crown_monolithic",
					material: effectiveMaterial || "zirconia_multilayer_gradient",
					shadeSystem: "VITA_CLASSICAL",
					shadeFinal: normalizedColor,
					shadeStump: data.stumpShade || null,
					priceRub: itemPriceRub,
					priceKopecks: toothKopecks,
				});
			}
		}
	}

	const enrichedOrder = {
		...createdOrder,
		orderNumber: data.orderNumber || `ЗТЛ-${createdOrder.id.slice(0, 6).toUpperCase()}`,
		stage: createdOrder.stage ?? effectiveStage,
		treatmentPlanId: createdOrder.treatmentPlanId ?? null,
		appointmentId: createdOrder.appointmentId ?? null,
		visitId: data.visitId ?? null,
		isWarranty,
		warrantyLiabilityType: data.warrantyLiabilityType ?? (isWarranty ? "clinic_warranty" : null),
		priceKopecks: finalPriceKopecks,
		amountKopecks: finalPriceKopecks,
		patientPriceKopecks: finalPriceKopecks,
		labCostKopecks: finalLabCostKopecks,
		costKopecks: finalLabCostKopecks,
	};

	return { kind: "ok" as const, order: enrichedOrder };
}
