import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../../db/client.js";
import { auditEvents, portalBudgetTokens, treatmentPlans } from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import type { SignBody } from "./budgetSchemas.js";

export interface CompleteBudgetSigningInput {
	budget: typeof portalBudgetTokens.$inferSelect;
	parsedSignData: SignBody;
	clientIp: string;
	clientIpHash: string;
	userAgent: string;
	log: FastifyBaseLogger;
}

export interface CompleteBudgetSigningResult {
	signedAt: Date;
	signerName: string;
	documentHash: string;
}

export async function completeBudgetSigning({
	budget,
	parsedSignData,
	clientIp,
	clientIpHash,
	userAgent,
	log,
}: CompleteBudgetSigningInput): Promise<CompleteBudgetSigningResult> {
	const signedAt = new Date();
	const signer = (parsedSignData.signerName || budget.patientFirstName || "Пациент").trim();

	// Формируем неизменяемый документный хеш
	const docData = JSON.stringify({
		token: budget.token,
		planId: budget.planId,
		totalPriceRub: budget.netTotalRub,
		signer,
		signedAtIso: signedAt.toISOString(),
		ipHash: clientIpHash,
	});
	const documentHash = createHash("sha256").update(docData).digest("hex");

	const signatureRecord = {
		signaturePng: parsedSignData.signaturePng,
		signatureSvg: parsedSignData.signatureSvg,
		signedByName: signer,
		relationshipToPatient: parsedSignData.relationship || "patient",
		ipAddress: clientIp,
		ipHash: clientIpHash,
		userAgent,
		signedAtIso: signedAt.toISOString(),
		documentHash,
	};

	// Обновляем токен сметы в базе
	await db
		.update(portalBudgetTokens)
		.set({
			status: "accepted",
			signedAt,
			signerName: signer,
			documentHash,
			signature: signatureRecord,
			updatedAt: signedAt,
		})
		.where(eq(portalBudgetTokens.token, budget.token));

	// Если смета привязана к плану лечения в БД — синхронизируем статус Approved
	if (budget.planId) {
		try {
			await db
				.update(treatmentPlans)
				.set({
					status: "Approved",
					patientSignature: parsedSignData.signaturePng,
					approvedAt: signedAt,
					updatedAt: signedAt,
				})
				.where(
					and(
						eq(treatmentPlans.id, budget.planId),
						eq(treatmentPlans.organizationId, budget.organizationId),
					),
				);
		} catch (dbErr) {
			log.warn({ err: dbErr, planId: budget.planId }, "Ошибка синхронизации статуса плана лечения");
		}
	}

	// Журнал аудита (Mandate 8a PostgreSQL 18 Law)
	try {
		await db.insert(auditEvents).values({
			organizationId: budget.organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: budget.planId || budget.token,
			action: "BUDGET_SIGNED_REMOTE",
			reason: `Дистанционное согласование сметы пациентом ${signer} (IP hash: ${clientIpHash.slice(0, 8)}...)`,
		});
	} catch (auditErr) {
		log.warn({ err: auditErr }, "Не удалось записать событие согласования сметы в журнал аудита");
	}

	// Вебсокет-оповещение для координаторов и врачей
	wsBroker.broadcastToOrganization(budget.organizationId, {
		type: "TREATMENT_PLAN_BUDGET_SIGNED",
		payload: {
			token: budget.token,
			planId: budget.planId,
			patientId: budget.patientId,
			signedAt: signedAt.toISOString(),
			signerName: signer,
			documentHash,
		},
	});

	return {
		signedAt,
		signerName: signer,
		documentHash,
	};
}
