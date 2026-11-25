import { kopecksToNumericString, SbpQrEngine } from "@dental/shared";
import { createApiLogger } from "../../observability/logger.js";
import { createTelegramQrSvg } from "../../telegramQr.js";
import type {
	GenerateQrResponse,
	GenerateSbpDynamicQrInput,
	VerifyPayloadResponse,
} from "./types.js";

const logger = createApiLogger("sbpQrService");

/** Generates dynamic SBP QR code and vector SVG */
export function generateSbpDynamicQrService(
	input: GenerateSbpDynamicQrInput,
): GenerateQrResponse {
	const { payloadUrl, cleanOperationId, crc16 } =
		SbpQrEngine.buildNspkDynamicPayload({
			operationId: input.operationId,
			bankMemberId: input.bankMemberId,
			amountKopecks: input.amountKopecks,
			currency: input.currency,
		});

	let qrSvg: string | null = null;
	try {
		qrSvg = createTelegramQrSvg(payloadUrl);
	} catch (err) {
		logger.warn(
			{ err, operationId: cleanOperationId },
			"[SbpQrService] Failed to render SVG QR for SBP payload",
		);
		qrSvg = null;
	}

	return {
		success: true,
		payloadUrl,
		operationId: cleanOperationId,
		crc16,
		amountKopecks: input.amountKopecks,
		amountRub: Number(kopecksToNumericString(input.amountKopecks)),
		currency: input.currency,
		qrSvg,
		ttlSeconds: input.ttlSeconds,
		expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
	};
}

/** Verifies payload URL and CRC16 checksum */
export function verifySbpPayloadService(
	payloadUrl: string,
): VerifyPayloadResponse {
	const verification = SbpQrEngine.verifyNspkPayload(payloadUrl);
	return {
		success: true,
		verification,
	};
}
