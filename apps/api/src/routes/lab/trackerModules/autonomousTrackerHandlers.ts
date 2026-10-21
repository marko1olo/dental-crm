import type { FastifyReply, FastifyRequest } from "fastify";
import {
	createAutonomousLabOrder,
	advanceLabOrderStage,
	evaluateLabSlaRisk,
	generateLabQrPayload,
	verifyLabQrPayload,
	formatLabTelegramAlert,
	anonymizePatientForExternalLab,
	type AutonomousLabOrder,
} from "@dental/shared";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { autonomousOrdersStore } from "./autonomousTrackerStore.js";
import { createOrderBodySchema, scanAdvanceBodySchema, defectBodySchema } from "./autonomousTrackerSchemas.js";

export async function handleCreateAutonomousOrder(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return reply;

	const parsed = createOrderBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры наряда в лабораторию.",
			details: parsed.error.issues,
		});
	}

	const order = createAutonomousLabOrder({
		organizationId: orgId,
		...parsed.data,
	});

	autonomousOrdersStore.set(order.orderRef, order);
	const qrPayload = generateLabQrPayload(order.orderRef, order.qrSecretKey);
	const doctorTelegramAlert = formatLabTelegramAlert(order, "doctor");

	return reply.code(201).send({
		order,
		qrPayload,
		doctorTelegramAlert,
		trayLabelText: `${order.orderRef} | ${order.clinicTrayNumber} | ${order.patientToken.tokenizedInitials}`,
	});
}

export async function handleGetAutonomousOrder(request: FastifyRequest<{ Params: { ref: string } }>, reply: FastifyReply) {
	const { ref } = request.params;
	const order = autonomousOrdersStore.get(ref);
	if (!order) {
		return reply.code(404).send({
			error: "NotFound",
			message: `Заказ-наряд #${ref} не найден в реестре.`,
		});
	}
	const currentSlaRisk = evaluateLabSlaRisk(order, new Date());
	return reply.send({
		...order,
		slaRiskLevel: currentSlaRisk,
	});
}

export async function handleScanAdvanceAutonomousOrder(request: FastifyRequest<{ Params: { ref: string } }>, reply: FastifyReply) {
	const { ref } = request.params;
	const order = autonomousOrdersStore.get(ref);
	if (!order) {
		return reply.code(404).send({ error: "NotFound", message: `Заказ-наряд #${ref} не найден.` });
	}

	const parsed = scanAdvanceBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры сканирования QR-кода.",
			details: parsed.error.issues,
		});
	}

	const { qrPayload, nextStage, actorRole, actorName, notes, photoProofUrl, assignedTray } = parsed.data;
	const isQrValid = verifyLabQrPayload(qrPayload, ref, order.qrSecretKey);
	if (!isQrValid) {
		return reply.code(403).send({
			error: "InvalidQrCode",
			message: "QR-код недействителен, подделан или срок действия стикера истек.",
		});
	}

	try {
		const updatedOrder = advanceLabOrderStage(order, nextStage, actorRole, actorName, {
			notes, photoProofUrl, assignedTray,
		});
		autonomousOrdersStore.set(ref, updatedOrder);
		const doctorAlert = formatLabTelegramAlert(updatedOrder, "doctor");
		const techAlert = formatLabTelegramAlert(updatedOrder, "technician");

		return reply.send({
			success: true,
			updatedOrder,
			alerts: { doctorTelegramText: doctorAlert, technicianTelegramText: techAlert },
		});
	} catch (err: unknown) {
		return reply.code(422).send({
			error: "InvalidStageTransition",
			message: err instanceof Error ? err.message : String(err),
		});
	}
}

export async function handleDefectAutonomousOrder(request: FastifyRequest<{ Params: { ref: string } }>, reply: FastifyReply) {
	const { ref } = request.params;
	const order = autonomousOrdersStore.get(ref);
	if (!order) return reply.code(404).send({ error: "NotFound", message: `Заказ-наряд #${ref} не найден.` });

	const parsed = defectBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректные данные отчета о дефекте.", details: parsed.error.issues });
	}

	const defect = { reportedAt: new Date().toISOString(), ...parsed.data, isBlocking: true };
	try {
		const updatedOrder = advanceLabOrderStage(order, "rework_flagged", parsed.data.reportedByRole, parsed.data.reportedByName, {
			notes: `ДЕФЕКТ: ${defect.description}`,
			photoProofUrl: defect.proofPhotoUrl,
		});
		updatedOrder.activeDefect = defect;
		autonomousOrdersStore.set(ref, updatedOrder);

		return reply.send({
			success: true,
			updatedOrder,
			alertDoctorTelegram: `🚨 ТРЕВОГА ПО ЗТЛ #${ref}: Работа остановлена из-за дефекта (${defect.reasonCategory}). Доктор ${order.doctorName}, проверьте фото!`,
		});
	} catch (err: unknown) {
		return reply.code(422).send({ error: "TransitionFailed", message: err instanceof Error ? err.message : String(err) });
	}
}
