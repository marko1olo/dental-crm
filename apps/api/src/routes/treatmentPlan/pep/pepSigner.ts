import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { auditEvents, patients, treatmentPlans } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { handleOtpRequest, verifyOtpCode } from "./pepOtpService.js";
import { activeOtpCache, signTreatmentPlanPepSchema } from "./pepTypes.js";

export async function handleSignTreatmentPlanPep(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const planId = request.params.id;
	const parsed = signTreatmentPlanPepSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры подписания плана через ПЭП.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const [plan] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!plan) {
		return reply.code(404).send({ error: "TreatmentPlanNotFound", message: "План лечения не найден." });
	}

	const [patient] = await db
		.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
		.from(patients)
		.where(and(eq(patients.id, plan.patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	const patientFullName = data.signerName || patient?.fullName || "Пациент";
	const targetPhone = data.phone || patient?.phone || "";

	if (data.action === "request_code") {
		return handleOtpRequest(planId, targetPhone, request, reply);
	}

	if (data.method === "sms" && !verifyOtpCode(planId, data.code)) {
		return reply.code(400).send({
			error: "InvalidVerificationCode",
			message: "Неверный код подтверждения СМС или срок его действия истек.",
		});
	}

	const planPayloadToHash = JSON.stringify({
		planId: plan.id,
		patientId: plan.patientId,
		totalPriceRub: plan.totalPriceRub || plan.totalPrice,
		name: plan.name,
		signedAt: new Date().toISOString(),
		signerName: patientFullName,
		organizationId,
	});
	const documentHash = createHash("sha256").update(planPayloadToHash).digest("hex");
	const pepMethodKey = data.method === "sms" ? "pep_sms" : data.method === "qr_touch" ? "pep_qr_touch" : "paper_physical";

	const pepRecord = {
		method: pepMethodKey,
		signedAtIso: new Date().toISOString(),
		signerPhone: targetPhone,
		signerName: patientFullName,
		clientIp: request.ip || "127.0.0.1",
		userAgent: request.headers["user-agent"] || "",
		documentHash,
		signatureBase64: data.signatureBase64 || null,
		verified: true,
	};

	const [signedPlan] = await db
		.update(treatmentPlans)
		.set({
			patientSignature: JSON.stringify(pepRecord),
			status: "Approved",
			approvedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: planId,
			action: "TREATMENT_PLAN_SIGNED_PEP",
			reason: `План лечения «${plan.name}» успешно утвержден и подписан через ПЭП (${pepMethodKey})`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит подписания ПЭП");
	}

	activeOtpCache.delete(planId);
	wsBroker.broadcastToOrganization(organizationId, {
		type: "TREATMENT_PLAN_PEP_SIGNED",
		payload: { planId, patientId: plan.patientId, signature: pepRecord },
	});

	return reply.code(200).send({
		success: true,
		signed: true,
		treatmentPlan: signedPlan,
		signature: pepRecord,
		documentHash,
	});
}
