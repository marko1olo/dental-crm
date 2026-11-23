import { generateQrCodeSvg } from "@dental/shared";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { signToken } from "../../utils/cryptoHelper.js";
import type { ShareConsentLinkInput } from "./types.js";

export function generateConsentShareLink(
	origin: string,
	orgIdOrPatientId: string,
	patientIdOrInput: string | ShareConsentLinkInput,
	maybeInput?: ShareConsentLinkInput,
	logger?: { warn: (obj: unknown, msg?: string) => void },
) {
	let orgId = "";
	let patientId = "";
	let input: ShareConsentLinkInput;

	if (typeof patientIdOrInput === "string") {
		orgId = orgIdOrPatientId;
		patientId = patientIdOrInput;
		if (!maybeInput) {
			throw new Error("Missing required ShareConsentLinkInput in generateConsentShareLink");
		}
		input = maybeInput;
	} else {
		patientId = orgIdOrPatientId;
		input = patientIdOrInput;
	}

	const tokenPayload = {
		scope: "cs",
		pid: patientId,
		oid: orgId || undefined,
		k: input.kind,
		vid: input.visitId || undefined,
	};

	let shareToken: string;
	try {
		shareToken = signToken(tokenPayload, requireAuthTokenSecret(), 7200); // 2 часа (TTL)
	} catch (err) {
		logger?.warn({ err }, "[shareLink] Не удалось подписать криптографический токен согласия");
		throw new Error("ConsentTokenGenerationFailed: Криптографическая подпись токена не удалась");
	}

	const params = new URLSearchParams({
		token: shareToken,
	});
	if (input.visitId) params.set("visitId", input.visitId);

	const signUrl = `${origin.replace(/\/$/, "")}/portal/consents/sign?${params.toString()}`;
	let qrSvg = "";
	try {
		qrSvg = generateQrCodeSvg(signUrl, {
			size: 180,
			margin: 1,
			foregroundColor: "#0f766e",
			backgroundColor: "#ffffff",
			title: `Подписание согласия: ${input.title ?? "Информированное согласие"}`,
		});
	} catch (err) {
		logger?.warn({ err }, "[shareLink] Ошибка построения QR-кода, используется векторная заглушка");
		qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180"><rect width="100%" height="100%" fill="#f8fafc" stroke="#0d9488" stroke-width="2" rx="8"/><text x="90" y="90" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f766e">QR-КОД СОГЛАСИЯ</text><text x="90" y="110" text-anchor="middle" font-size="10" fill="#475569">Сканируйте для подписи</text></svg>`;
	}

	const whatsappText = encodeURIComponent(
		`Здравствуйте! Для начала стоматологического лечения в клинике, пожалуйста, ознакомьтесь и подпишите согласие онлайн со смартфона: ${signUrl}`,
	);
	const whatsappUrl = input.phone
		? `https://wa.me/${input.phone.replace(/\D/g, "")}?text=${whatsappText}`
		: `https://wa.me/?text=${whatsappText}`;

	return {
		signUrl,
		token: shareToken,
		qrSvg,
		whatsappUrl,
		expiresInHours: 2,
	};
}
