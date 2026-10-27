import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizationLogs, visitDiaries } from "../../../../db/schema.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import {
	buildAutoProvisionSterilizationLogValues,
	evaluateSterilizationLogForLinking,
} from "../sterilizationHelpers.js";
import { linkSchema } from "../sterilizationSchemas.js";
import { executeLinkDiaryTransaction } from "./sterilizationLinkTransaction.js";

export async function handleSterilizationLink(req: FastifyRequest, reply: FastifyReply) {
	const clinical = await requireClinicalMutationContext(req, reply, "sterilization link");
	if (!clinical) return;
	const organizationId = clinical.organizationId;

	const linkParsed = linkSchema.safeParse(req.body);
	if (!linkParsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "visitId обязателен." });
	}
	const { visitId, barcode } = linkParsed.data;
	const trimmedBarcode = (barcode || "").trim();
	const identity = getRequestIdentity(req);
	const doctorUserId = identity.userId ?? null;

	if (!trimmedBarcode) {
		const [existingDiary] = await db
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.visitId, visitId), eq(visitDiaries.organizationId, organizationId)))
			.limit(1);
		if (existingDiary) return reply.send(existingDiary);

		const result = await executeLinkDiaryTransaction({
			organizationId,
			visitId,
			trimmedBarcode: "",
			doctorUserId,
			isEmergencyAdmission: false,
			emergencyAdmissionNote: "",
		});
		return reply.send(result.kind === "ok" ? result.diary : { success: true, visitId });
	}

	const barcodeCandidates = [trimmedBarcode];
	if (trimmedBarcode.includes("|")) {
		const parts = trimmedBarcode.split("|");
		let firstPart = (parts[0] || "").trim();
		const hashIdx = firstPart.lastIndexOf("#");
		if (hashIdx !== -1) firstPart = firstPart.slice(0, hashIdx).trim();
		if (firstPart) barcodeCandidates.push(firstPart);
	}

	const foundLogs = await db
		.select()
		.from(sterilizationLogs)
		.where(and(eq(sterilizationLogs.organizationId, organizationId), inArray(sterilizationLogs.barcode, barcodeCandidates)))
		.orderBy(desc(sterilizationLogs.timestamp));

	let log = barcodeCandidates.map((c) => foundLogs.find((l) => l.barcode === c)).find(Boolean);

	if (!log) {
		const autoValues = buildAutoProvisionSterilizationLogValues({
			organizationId,
			barcode: trimmedBarcode,
			operatorId: doctorUserId,
			now: new Date(),
		});
		const [autoCreatedLog] = await db.insert(sterilizationLogs).values(autoValues).returning();
		if (!autoCreatedLog) {
			return reply.code(500).send({ error: "SterilizationAutoProvisionFailed", message: "Не удалось зарегистрировать лоток." });
		}
		log = autoCreatedLog;
		wsBroker.broadcastToOrganization(organizationId, { type: "STERILIZATION_LOG_ADDED", payload: autoCreatedLog });
	}

	const evaluation = evaluateSterilizationLogForLinking(log);
	const isEmergencyAdmission = !evaluation.allowed || evaluation.isExpired;
	const emergencyAdmissionNote = !evaluation.allowed
		? `[Экстренный допуск лотка ${trimmedBarcode} под личную ответственность врача (СанПиН 3.3686-21)]`
		: (evaluation.emergencyLogNote || "");

	const diaryResult = await executeLinkDiaryTransaction({
		organizationId,
		visitId,
		trimmedBarcode,
		doctorUserId,
		isEmergencyAdmission,
		emergencyAdmissionNote,
	});

	if (diaryResult.kind === "failed_insert") {
		return reply.code(500).send({ error: "VisitDiaryCreateFailed", message: "Не удалось инициализировать дневник визита." });
	}

	wsBroker.broadcastToOrganization(organizationId, { type: "VISIT_DIARY_UPDATED", payload: diaryResult.diary });
	return reply.send(diaryResult.diary);
}
