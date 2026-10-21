import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	calculateBusinessDaysDueDate,
	expressLabOrderSchema,
} from "../types.js";
import { resolveExpressConstructionProfile } from "./expressOrderConstructionDefaults.js";
import { insertExpressLabOrder } from "./expressOrderDbOperations.js";

export async function handleCreateExpressOrder(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;

	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в доступе к созданию наряда ЗТЛ (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
		});
	}

	const parsed = expressLabOrderSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры экспресс-заказа ЗТЛ.",
			details: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const teethFdiStr = Array.isArray(data.teethFdi) ? data.teethFdi.join(", ") : data.teethFdi;
	const profile = resolveExpressConstructionProfile(data.construction, data.isOneClickPreset);
	const calculatedDueDate = data.dueDate
		? new Date(data.dueDate)
		: calculateBusinessDaysDueDate(new Date(), profile.turnaroundDays);

	const result = await insertExpressLabOrder({
		orgId,
		patientId: data.patientId,
		doctorId: data.doctorId ?? null,
		teethFdiStr,
		materialName: profile.materialName,
		colorVita: data.colorVita,
		dueDate: calculatedDueDate,
		priceRub: data.priceRub ?? profile.defaultPriceRub,
		specialInstructions: data.specialInstructions ?? null,
		isOneClickPreset: data.isOneClickPreset ?? false,
		construction: data.construction,
		doctorClinicalOverride: data.doctorClinicalOverride ?? false,
		doctorOverrideReason: data.doctorOverrideReason ?? null,
	});

	if (result.kind === "patient_not_found") {
		return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в базе клиники." });
	}

	const order = result.order;
	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		action: "CREATE_EXPRESS_LAB_ORDER",
		diagnosis: `Создан экспресс-наряд ЗТЛ #${order.id} на зубы ${teethFdiStr}`,
	});

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_CREATED",
		payload: {
			orderId: order.id,
			patientId: data.patientId,
			toothFdi: teethFdiStr,
			material: profile.materialName,
			dueDate: order.dueDate,
			status: order.status,
		},
	});

	const planAge = data.treatmentPlanAgeDays ?? 0;
	return reply.status(201).send({
		success: true,
		order,
		expressMetadata: {
			workflow: "3-Click Orthopedic Express Order",
			isOneClickPreset: data.isOneClickPreset,
			standardPresetTitle: "Коронка ZrO2, цвет А2, срок 5 рабочих дней",
			turnaroundBusinessDays: profile.turnaroundDays,
			dueDateIso: calculatedDueDate.toISOString(),
			autonomy: {
				isPlanExpired: planAge > 30,
				planAgeDays: planAge,
				blocked: false,
				canProceed: true,
				doctorClinicalOverride: Boolean(data.doctorClinicalOverride),
				doctorOverrideReason: data.doctorOverrideReason ?? null,
				guarantee: "Истечение 30 дней с момента составления плана лечения не блокирует создание нарядов ЗТЛ.",
			},
			mandate8e: {
				isPlanExpired: planAge > 30,
				planAgeDays: planAge,
				blocked: false,
				canProceed: true,
				doctorClinicalOverride: Boolean(data.doctorClinicalOverride),
				doctorOverrideReason: data.doctorOverrideReason ?? null,
				guarantee: "Истечение 30 дней с момента составления плана лечения не блокирует создание нарядов ЗТЛ.",
			},
		},
	});
}
