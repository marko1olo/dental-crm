import { calculateSha256 } from "./patientWebappCrypto";
import type {
	PatientWebappSessionParams,
	PatientWebappSessionToken,
	PatientWebappScope,
} from "./patientWebappSessionTypes";

const DEFAULT_SECRET_SALT = "DENTE_PATIENT_WEBAPP_HMAC_SALT_2026";

export function generatePatientWebappSession(params: PatientWebappSessionParams): {
	session: PatientWebappSessionToken;
	encodedToken: string;
} {
	const now = Date.now();
	const ttlMs = (params.ttlHours ?? 72) * 60 * 60 * 1000;
	const expiresAt = now + ttlMs;
	const scopes = params.scopes && params.scopes.length > 0
		? params.scopes
		: (["portal:read", "portal:write", "portal:sign", "portal:pay"] as const);

	const sessionId = `SES-${params.patientId.slice(-6)}-${now.toString(36).toUpperCase()}`;
	const clinicId = params.clinicId || "CLINIC-MAIN";
	const nonce = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Date.now().toString(36);
	const secret = params.secretKey || DEFAULT_SECRET_SALT;

	const signaturePayload = [
		sessionId,
		params.patientId,
		clinicId,
		params.phone,
		now.toString(),
		expiresAt.toString(),
		scopes.join(","),
		nonce,
		secret,
	].join("|");

	const signature = calculateSha256(signaturePayload);

	const session: PatientWebappSessionToken = {
		sessionId,
		patientId: params.patientId,
		clinicId,
		phone: params.phone,
		issuedAtTimestamp: now,
		expiresAtTimestamp: expiresAt,
		scopes,
		nonce,
		signature,
	};

	const rawJson = JSON.stringify(session);
	const encodedToken = typeof Buffer !== "undefined"
		? Buffer.from(rawJson, "utf8").toString("base64url")
		: btoa(encodeURIComponent(rawJson));

	return { session, encodedToken };
}

export function validatePatientWebappSession(
	encodedToken: string,
	options?: { secretKey?: string; requiredScope?: PatientWebappScope; nowMs?: number },
): { isValid: boolean; session?: PatientWebappSessionToken; error?: string } {
	if (!encodedToken || typeof encodedToken !== "string") {
		return { isValid: false, error: "Токен сессии отсутствует или пуст." };
	}
	try {
		const decodedJson = typeof Buffer !== "undefined"
			? Buffer.from(encodedToken, "base64url").toString("utf8")
			: decodeURIComponent(atob(encodedToken));

		const session = JSON.parse(decodedJson) as PatientWebappSessionToken;
		if (!session.sessionId || !session.patientId || !session.signature) {
			return { isValid: false, error: "Некорректная структура токена сессии." };
		}
		const now = options?.nowMs ?? Date.now();
		if (now > session.expiresAtTimestamp) {
			return { isValid: false, error: "Срок действия сессии пациента истёк. Авторизуйтесь заново." };
		}
		const secret = options?.secretKey || DEFAULT_SECRET_SALT;
		const expectedPayload = [
			session.sessionId,
			session.patientId,
			session.clinicId,
			session.phone,
			session.issuedAtTimestamp.toString(),
			session.expiresAtTimestamp.toString(),
			session.scopes.join(","),
			session.nonce,
			secret,
		].join("|");

		if (session.signature !== calculateSha256(expectedPayload)) {
			return { isValid: false, error: "Цифровая подпись сессии не совпадает (нарушение целостности)." };
		}
		if (options?.requiredScope && !session.scopes.includes(options.requiredScope)) {
			return { isValid: false, error: `У сессии нет разрешения на операцию: ${options.requiredScope}` };
		}
		return { isValid: true, session };
	} catch (err: any) {
		return { isValid: false, error: `Ошибка разбора токена сессии: ${err.message || "Неверный формат"}` };
	}
}

export function generatePatientMagicLink(
	baseUrl: string,
	encodedToken: string,
	targetTab: "home" | "appointments" | "plan" | "photos" | "payments" | "documents" | "postop" = "plan",
): string {
	const cleanBase = baseUrl.replace(/\/+$/, "");
	return `${cleanBase}/#/portal/webapp?token=${encodeURIComponent(encodedToken)}&tab=${targetTab}`;
}
