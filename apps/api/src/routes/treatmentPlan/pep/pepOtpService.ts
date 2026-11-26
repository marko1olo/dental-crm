import { randomInt } from "node:crypto";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import { communicationOutbox } from "../../../db/schema.js";
import { portalOtpCodes } from "../../../db/schema/auth.js";
import { hashCredential, verifyCredential } from "../../../utils/cryptoHelper.js";
import { activeOtpCache } from "./pepTypes.js";

export async function handleOtpRequest(
	planId: string,
	targetPhone: string,
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId?: string,
	patientId?: string,
) {
	const generatedCode = randomInt(100000, 999999).toString();
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

	// Персистентное сохранение в PostgreSQL 18 (таблица portal_otp_codes)
	if (organizationId && patientId) {
		try {
			const codeHash = await hashCredential(generatedCode);
			const now = new Date();

			await withTenantCtx(organizationId, async (tx) => {
				// Погасить старые неиспользованные коды пациента
				await tx
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.organizationId, organizationId),
							eq(portalOtpCodes.patientId, patientId),
							isNull(portalOtpCodes.consumedAt),
						),
					);

				await tx.insert(portalOtpCodes).values({
					organizationId,
					patientId,
					codeHash,
					channel: "sms",
					deliveryStatus: "sent",
					expiresAt,
				});

				// Постановка СМС-сообщения с кодом в реальную очередь отправки communication_outbox
				if (targetPhone) {
					await tx.insert(communicationOutbox).values({
						organizationId,
						patientId,
						channel: "sms",
						intent: "transactional_reply",
						scope: "service",
						recipientAddress: targetPhone,
						body: `Код подтверждения плана лечения DENTE: ${generatedCode}. Действителен 10 минут.`,
						status: "queued",
						dedupeKey: `pep:otp:${planId}:${Date.now()}`,
					});
				}
			});
		} catch (dbErr) {
			request.log.error({ err: dbErr }, "[PEP-SMS] Ошибка записи OTP кода в portal_otp_codes");
			return reply.code(503).send({
				success: false,
				error: "OtpPersistenceUnavailable",
				message: "Не удалось сформировать и отправить код подтверждения ПЭП. Повторите позже.",
			});
		}
	} else {
		activeOtpCache.set(planId, {
			code: generatedCode,
			expiresAt: expiresAt.getTime(),
			phone: targetPhone,
		});
	}

	const maskedPhone = targetPhone ? `${targetPhone.slice(0, 4)}***${targetPhone.slice(-2)}` : "";
	request.log.info(
		{ planId, phone: maskedPhone },
		"[PEP-SMS] Сгенерирован проверочный код ПЭП для плана лечения",
	);

	return reply.code(200).send({
		success: true,
		smsSent: true,
		timeoutSeconds: 60,
		targetPhone: maskedPhone,
		message: "Проверочный код ПЭП отправлен на номер пациента.",
	});
}

export async function verifyOtpCode(
	planId: string,
	code?: string,
	organizationId?: string,
	patientId?: string,
	executor?: TenantDb,
): Promise<boolean> {
	if (!code) return false;
	const enteredCode = code.trim();

	// 1. Авторитативная проверка в PostgreSQL 18 (portal_otp_codes) для тенантного контекста
	if (organizationId && patientId) {
		const now = new Date();
		const runVerify = async (tx: TenantDb): Promise<boolean> => {
			const [candidate] = await tx
				.select({ id: portalOtpCodes.id, codeHash: portalOtpCodes.codeHash })
				.from(portalOtpCodes)
				.where(
					and(
						eq(portalOtpCodes.organizationId, organizationId),
						eq(portalOtpCodes.patientId, patientId),
						eq(portalOtpCodes.deliveryStatus, "sent"),
						isNull(portalOtpCodes.consumedAt),
						gte(portalOtpCodes.expiresAt, now),
					),
				)
				.orderBy(desc(portalOtpCodes.createdAt))
				.for("update")
				.limit(1);

			if (!candidate) return false;
			const isMatch = await verifyCredential(enteredCode, candidate.codeHash);
			if (!isMatch) return false;

			await tx
				.update(portalOtpCodes)
				.set({ consumedAt: now })
				.where(
					and(
						eq(portalOtpCodes.id, candidate.id),
						eq(portalOtpCodes.organizationId, organizationId),
					),
				);
			return true;
		};

		const isMatched = executor
			? await runVerify(executor)
			: await withTenantCtx(organizationId, runVerify);

		if (isMatched) {
			activeOtpCache.delete(planId);
		}
		return isMatched;
	}

	// 2. Fallback для чисто локального без-БД контекста
	const cachedOtp = activeOtpCache.get(planId);
	if (cachedOtp && cachedOtp.code === enteredCode && cachedOtp.expiresAt > Date.now()) {
		activeOtpCache.delete(planId);
		return true;
	}

	return false;
}
