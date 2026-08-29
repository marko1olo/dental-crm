/**
 * patientSmsAuthEngine.ts — Patient SMS Mobile Portal Authentication & Simple Electronic Signature (ПЭП 63-ФЗ) Engine.
 *
 * Pragmatic Architecture (Wave 18 — Private Dental Clinic Reality):
 * 1. Mobile Phone Normalization & Formatting:
 *    - Strict Russian mobile number normalization (+79XXXXXXXXX / E.164) and human formatting (+7 (9XX) XXX-XX-XX).
 *    - Validation against Russian numbering plan (DEF codes 900..999).
 * 2. SMS-PEP (Простая электронная подпись по 63-ФЗ):
 *    - 4-digit CSPRNG one-time passcode (OTP) challenge generation.
 *    - 3-minute (180 seconds) statutory TTL with rate-limiting (cooldown 60s, max 3 verification attempts).
 *    - Anti-bruteforce attack prevention with hourly rate-limiting windows.
 *    - Simple Electronic Signature (ПЭП) audit trail with SHA-256 cryptographic integrity hash per 63-FZ (Art. 5, 9).
 * 3. Patient Portal JWT Session & Strict RBAC Isolation:
 *    - HMAC-SHA256 cryptographic JWT tokens strictly bound to the authenticated patient.
 *    - Strict patient data isolation: read-only access to own medical records, treatment plans, contracts, invoices & imaging.
 *    - Enforced isolation guards preventing cross-patient and cross-tenant data leaks (152-FZ, 323-FZ).
 */

import { z } from "zod";
import {
	sha256Hex,
	hmacSha256,
	hmacSha256Hex,
	safeRandomBytesHex,
	safeRandomInt,
	timingSafeStringEqual,
	generateUuidV7,
} from "../sync/hashing.js";

// ─── 0. PURE PORTABLE BASE64URL ENCODING / DECODING ──────────────────────────

function base64UrlEncode(input: string | Uint8Array): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		if (byte !== undefined) {
			binary += String.fromCharCode(byte);
		}
	}
	const base64 =
		typeof btoa === "function"
			? btoa(binary)
			: typeof Buffer !== "undefined"
				? Buffer.from(bytes).toString("base64")
				: "";
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(base64url: string): string {
	let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4 !== 0) {
		base64 += "=";
	}
	const binary =
		typeof atob === "function"
			? atob(base64)
			: typeof Buffer !== "undefined"
				? Buffer.from(base64, "base64").toString("binary")
				: "";
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

// ─── 1. PHONE NUMBER NORMALIZATION & FORMATTING (RUSSIAN E.164 & PRESENTATION) ─

export const russianMobilePhoneSchema = z
	.string()
	.min(10, "Номер телефона слишком короткий")
	.max(25, "Номер телефона слишком длинный")
	.refine(
		(val) => isValidRussianPhoneNumber(val),
		"Некорректный номер мобильного телефона РФ (ожидается +7 (9XX) XXX-XX-XX)",
	);

/**
 * Normalizes any Russian phone number input into standard E.164 format (+79XXXXXXXXX).
 * Handles:
 * - "+7 (916) 123-45-67" -> "+79161234567"
 * - "8 (916) 123-45-67"  -> "+79161234567"
 * - "89161234567"        -> "+79161234567"
 * - "79161234567"        -> "+79161234567"
 * - "9161234567"         -> "+79161234567"
 * - "+7 916 123 45 67"   -> "+79161234567"
 */
export function normalizeRussianPhoneNumber(phone: unknown): string {
	if (typeof phone !== "string" && typeof phone !== "number") {
		return "";
	}
	const raw = String(phone).trim();
	const digits = raw.replace(/\D/g, "");

	// 11 digits starting with 7 or 8 (standard Russian number)
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7${digits.slice(1)}`;
	}

	// 10 digits starting with 9 (mobile number without country code)
	if (digits.length === 10 && digits.startsWith("9")) {
		return `+7${digits}`;
	}

	// Already prefixed with '+'
	if (raw.startsWith("+") && digits.length >= 10) {
		return `+${digits}`;
	}

	return digits.length > 0 ? `+${digits}` : "";
}

/**
 * Validates whether the given string is a valid Russian mobile phone number.
 * Must resolve to +7 followed by 9 and 9 digits (+79XXXXXXXXX).
 */
export function isValidRussianPhoneNumber(phone: unknown): boolean {
	const normalized = normalizeRussianPhoneNumber(phone);
	return /^\+79\d{9}$/.test(normalized);
}

/**
 * Formats a normalized or raw Russian phone number into standard human presentation:
 * "+7 (9XX) XXX-XX-XX".
 */
export function formatRussianPhoneNumber(phone: unknown): string {
	const normalized = normalizeRussianPhoneNumber(phone);
	if (!/^\+79\d{9}$/.test(normalized)) {
		return typeof phone === "string" ? phone : "";
	}

	const digits = normalized.slice(2); // 10 digits starting with 9
	const def = digits.slice(0, 3);
	const p1 = digits.slice(3, 6);
	const p2 = digits.slice(6, 8);
	const p3 = digits.slice(8, 10);

	return `+7 (${def}) ${p1}-${p2}-${p3}`;
}

// ─── 2. SMS-PEP (ПРОСТАЯ ЭЛЕКТРОННАЯ ПОДПИСЬ ПО 63-ФЗ) OTP ENGINE ───────────

export const smsPepPolicySchema = z.object({
	codeLength: z.number().int().min(4).max(8).default(4), // 4 digits as standard for Russian private clinics
	ttlSeconds: z.number().int().min(60).max(900).default(180), // 3 minutes (180s) default per statutory portal requirements
	maxAttempts: z.number().int().min(1).max(10).default(3), // 3 attempts max before challenge lockout
	resendCooldownSeconds: z.number().int().min(10).max(600).default(60), // 60s cooldown between SMS resends
	maxPerWindow: z.number().int().min(1).max(20).default(5), // 5 requests per hour limit
	windowSeconds: z.number().int().min(300).max(86400).default(3600), // 1-hour window for rate-limiting
	smsTemplate: z
		.string()
		.default("Код подтверждения для входа в личный кабинет DENTE: {code}. Действует {minutes} мин. Никому не сообщайте."),
});
export type SmsPepPolicy = z.infer<typeof smsPepPolicySchema>;

export const DEFAULT_SMS_PEP_POLICY: SmsPepPolicy = smsPepPolicySchema.parse({});

export const smsPepChallengeStateSchema = z.object({
	challengeId: z.string().min(1),
	phone: z.string().min(10),
	normalizedPhone: z.string().regex(/^\+79\d{9}$/),
	formattedPhone: z.string().min(10),
	codeHash: z.string().min(32),
	salt: z.string().min(16),
	codeLength: z.number().int().min(4).max(8),
	attemptsCount: z.number().int().min(0),
	maxAttempts: z.number().int().min(1),
	expiresAtIso: z.string().datetime(),
	createdAtIso: z.string().datetime(),
	consumedAtIso: z.string().datetime().nullable(),
	isConsumed: z.boolean(),
	deliveryChannel: z.enum(["sms", "telegram", "whatsapp", "developer_log"]).default("sms"),
});
export type SmsPepChallengeState = z.infer<typeof smsPepChallengeStateSchema>;

export const pep63FzSignatureAuditSchema = z.object({
	signatureId: z.string().uuid(),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	organizationId: z.string().min(1),
	phone: z.string().min(10),
	documentId: z.string().min(1),
	documentKind: z.string().min(1),
	documentSha256Hex: z.string().regex(/^[0-9a-fA-F]{64}$/, "Хеш документа должен быть 64-значным SHA-256"),
	signatureKind: z.literal("PEP_63FZ"),
	statutoryBasis: z.string().default("63-ФЗ ст. 5, 9 (Простая электронная подпись)"),
	authMethod: z.literal("sms_pep"),
	clientIp: z.string().default("127.0.0.1"),
	userAgent: z.string().default("patient_mobile_portal"),
	timestampIso: z.string().datetime(),
	integrityHash: z.string().regex(/^[0-9a-fA-F]{64}$/),
});
export type Pep63FzSignatureAudit = z.infer<typeof pep63FzSignatureAuditSchema>;

/**
 * Timing-safe string comparison preventing side-channel timing leaks.
 */
export function safeStringCompare(a: string, b: string): boolean {
	return timingSafeStringEqual(a, b);
}

/**
 * Generates a cryptographically strong numeric OTP code (4 digits by default).
 */
export function generateNumericOtpCode(length = 4): string {
	const safeLength = Math.max(4, Math.min(8, length));
	const max = 10 ** safeLength;
	const codeInt = safeRandomInt(0, max);
	return String(codeInt).padStart(safeLength, "0");
}

/**
 * Hashes OTP code with a per-challenge salt using SHA-256.
 */
export function hashOtpWithSalt(code: string, salt: string): string {
	return sha256Hex(`${salt}:${code}:PEP_63FZ_OTP`);
}

/**
 * Creates a new 4-digit SMS-PEP OTP challenge for patient authentication.
 */
export function createSmsAuthChallenge(params: {
	phone: string;
	organizationId?: string | undefined;
	patientId?: string | undefined;
	policy?: Partial<SmsPepPolicy> | undefined;
	channel?: "sms" | "telegram" | "whatsapp" | "developer_log" | undefined;
	now?: Date | undefined;
}): {
	challenge: SmsPepChallengeState;
	plainCode: string;
	messageText: string;
} {
	const normalizedPhone = normalizeRussianPhoneNumber(params.phone);
	if (!isValidRussianPhoneNumber(normalizedPhone)) {
		throw new Error(`Некорректный номер мобильного телефона РФ: "${params.phone}"`);
	}

	const policy = smsPepPolicySchema.parse(params.policy ?? {});
	const now = params.now ?? new Date();
	const plainCode = generateNumericOtpCode(policy.codeLength);
	const salt = safeRandomBytesHex(16);
	const codeHash = hashOtpWithSalt(plainCode, salt);
	const challengeId = `pep-${safeRandomBytesHex(12)}`;
	const expiresAt = new Date(now.getTime() + policy.ttlSeconds * 1000);
	const formattedPhone = formatRussianPhoneNumber(normalizedPhone);

	const minutes = Math.max(1, Math.round(policy.ttlSeconds / 60));
	const messageText = policy.smsTemplate
		.replace(/\{code\}/g, plainCode)
		.replace(/\{minutes\}/g, String(minutes));

	const challenge: SmsPepChallengeState = {
		challengeId,
		phone: params.phone,
		normalizedPhone,
		formattedPhone,
		codeHash,
		salt,
		codeLength: policy.codeLength,
		attemptsCount: 0,
		maxAttempts: policy.maxAttempts,
		createdAtIso: now.toISOString(),
		expiresAtIso: expiresAt.toISOString(),
		consumedAtIso: null,
		isConsumed: false,
		deliveryChannel: params.channel ?? "sms",
	};

	return { challenge, plainCode, messageText };
}

// Alias for backwards compatibility
export const createSmsPepChallenge = createSmsAuthChallenge;

export type SmsPepVerificationResult =
	| {
			success: true;
			updatedChallenge: SmsPepChallengeState;
	  }
	| {
			success: false;
			error: "CODE_MISMATCH" | "CODE_EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "ALREADY_CONSUMED";
			remainingAttempts: number;
			updatedChallenge: SmsPepChallengeState;
	  };

/**
 * Verifies an entered SMS OTP passcode against challenge state.
 */
export function verifySmsAuthChallenge(
	challengeInput: SmsPepChallengeState,
	plainCode: string,
	nowInput?: Date,
): SmsPepVerificationResult {
	const now = nowInput ?? new Date();
	const challenge: SmsPepChallengeState = { ...challengeInput };

	// 1. Check if already consumed
	if (challenge.isConsumed || challenge.consumedAtIso) {
		return {
			success: false,
			error: "ALREADY_CONSUMED",
			remainingAttempts: 0,
			updatedChallenge: challenge,
		};
	}

	// 2. Check if expired (3 min TTL)
	const expiresAt = new Date(challenge.expiresAtIso).getTime();
	if (now.getTime() > expiresAt) {
		return {
			success: false,
			error: "CODE_EXPIRED",
			remainingAttempts: 0,
			updatedChallenge: challenge,
		};
	}

	// 3. Check if max attempts already exceeded
	if (challenge.attemptsCount >= challenge.maxAttempts) {
		return {
			success: false,
			error: "MAX_ATTEMPTS_EXCEEDED",
			remainingAttempts: 0,
			updatedChallenge: challenge,
		};
	}

	// 4. Verify code hash
	const candidateHash = hashOtpWithSalt(plainCode.trim(), challenge.salt);
	const isMatch = safeStringCompare(candidateHash, challenge.codeHash);

	if (!isMatch) {
		challenge.attemptsCount += 1;
		const remaining = Math.max(0, challenge.maxAttempts - challenge.attemptsCount);
		return {
			success: false,
			error: challenge.attemptsCount >= challenge.maxAttempts ? "MAX_ATTEMPTS_EXCEEDED" : "CODE_MISMATCH",
			remainingAttempts: remaining,
			updatedChallenge: challenge,
		};
	}

	// 5. Successful verification -> consume challenge
	challenge.isConsumed = true;
	challenge.consumedAtIso = now.toISOString();

	return {
		success: true,
		updatedChallenge: challenge,
	};
}

// Alias for backwards compatibility
export const verifySmsPepChallenge = verifySmsAuthChallenge;

/**
 * Checks if a patient's SMS issuance is throttled due to cooldown (60s) or hourly limit (5/hour).
 */
export function isSmsPepIssuanceThrottled(
	recentChallenges: readonly SmsPepChallengeState[],
	policyInput?: Partial<SmsPepPolicy>,
	nowInput?: Date,
): { throttled: boolean; reason?: "COOLDOWN_ACTIVE" | "WINDOW_LIMIT_EXCEEDED" | undefined; retryAfterSeconds: number } {
	const policy = smsPepPolicySchema.parse(policyInput ?? {});
	const now = nowInput ?? new Date();
	const nowMs = now.getTime();

	if (recentChallenges.length === 0) {
		return { throttled: false, retryAfterSeconds: 0 };
	}

	// Sort newest first
	const sorted = [...recentChallenges].sort(
		(a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime(),
	);
	const latest = sorted[0];

	if (latest) {
		const latestCreatedMs = new Date(latest.createdAtIso).getTime();
		const diffSeconds = (nowMs - latestCreatedMs) / 1000;
		if (diffSeconds < policy.resendCooldownSeconds) {
			return {
				throttled: true,
				reason: "COOLDOWN_ACTIVE",
				retryAfterSeconds: Math.ceil(policy.resendCooldownSeconds - diffSeconds),
			};
		}
	}

	const windowStartMs = nowMs - policy.windowSeconds * 1000;
	const inWindow = sorted.filter((c) => new Date(c.createdAtIso).getTime() >= windowStartMs);

	if (inWindow.length >= policy.maxPerWindow) {
		const oldestInWindow = inWindow[inWindow.length - 1];
		const oldestMs = oldestInWindow ? new Date(oldestInWindow.createdAtIso).getTime() : nowMs;
		const retryAfter = Math.ceil((oldestMs + policy.windowSeconds * 1000 - nowMs) / 1000);
		return {
			throttled: true,
			reason: "WINDOW_LIMIT_EXCEEDED",
			retryAfterSeconds: Math.max(1, retryAfter),
		};
	}

	return { throttled: false, retryAfterSeconds: 0 };
}

/**
 * Computes cryptographic 63-FZ integrity hash for Simple Electronic Signature audit trails.
 */
export function computePep63FzIntegrityHash(fields: {
	signatureId: string;
	patientId: string;
	organizationId: string;
	documentId: string;
	documentSha256Hex: string;
	phone: string;
	timestampIso: string;
	clientIp: string;
	authMethod: string;
}): string {
	const canonical = [
		fields.signatureId,
		fields.patientId,
		fields.organizationId,
		fields.documentId,
		fields.documentSha256Hex,
		fields.phone,
		fields.timestampIso,
		fields.clientIp,
		fields.authMethod,
		"63-FZ_SIMPLE_ELECTRONIC_SIGNATURE_STATUTORY_INTEGRITY_V1",
	].join("|");
	return sha256Hex(canonical);
}

/**
 * Creates a statutory Simple Electronic Signature (ПЭП) audit record under 63-FZ.
 */
export function createPep63FzSignatureAudit(params: {
	signatureId?: string | undefined;
	patientId: string;
	patientFullName: string;
	organizationId: string;
	phone: string;
	documentId: string;
	documentKind: string;
	documentContentOrBuffer: string | Uint8Array | Buffer;
	clientIp?: string | undefined;
	userAgent?: string | undefined;
	now?: Date | undefined;
}): Pep63FzSignatureAudit {
	const now = params.now ?? new Date();
	const signatureId = params.signatureId ?? `pep-sig-${safeRandomBytesHex(16)}`;
	const timestampIso = now.toISOString();

	const documentSha256Hex = sha256Hex(
		typeof params.documentContentOrBuffer === "string"
			? params.documentContentOrBuffer
			: params.documentContentOrBuffer instanceof Uint8Array
				? params.documentContentOrBuffer
				: new Uint8Array(params.documentContentOrBuffer),
	);

	const clientIp = params.clientIp ?? "127.0.0.1";
	const userAgent = params.userAgent ?? "patient_mobile_portal";
	const normalizedPhone = normalizeRussianPhoneNumber(params.phone);

	const integrityHash = computePep63FzIntegrityHash({
		signatureId,
		patientId: params.patientId,
		organizationId: params.organizationId,
		documentId: params.documentId,
		documentSha256Hex,
		phone: normalizedPhone,
		timestampIso,
		clientIp,
		authMethod: "sms_pep",
	});

	return {
		signatureId,
		patientId: params.patientId,
		patientFullName: params.patientFullName,
		organizationId: params.organizationId,
		phone: normalizedPhone,
		documentId: params.documentId,
		documentKind: params.documentKind,
		documentSha256Hex,
		signatureKind: "PEP_63FZ",
		statutoryBasis: "63-ФЗ ст. 5, 9 (Простая электронная подпись)",
		authMethod: "sms_pep",
		clientIp,
		userAgent,
		timestampIso,
		integrityHash,
	};
}

/**
 * Verifies that a PEP 63-FZ audit record has not been tampered with.
 */
export function verifyPep63FzSignatureIntegrity(audit: Pep63FzSignatureAudit): boolean {
	const expected = computePep63FzIntegrityHash({
		signatureId: audit.signatureId,
		patientId: audit.patientId,
		organizationId: audit.organizationId,
		documentId: audit.documentId,
		documentSha256Hex: audit.documentSha256Hex,
		phone: audit.phone,
		timestampIso: audit.timestampIso,
		clientIp: audit.clientIp,
		authMethod: audit.authMethod,
	});
	return safeStringCompare(expected, audit.integrityHash);
}

// ─── 3. PATIENT PORTAL JWT SESSION & RBAC PERMISSION SYSTEM ──────────────────

export const PATIENT_PORTAL_PERMISSIONS = [
	"portal:medical_records:read", // Просмотр своих медицинских данных, визитов, планов лечения
	"portal:contracts:read", // Просмотр своих договоров и актов
	"portal:invoices:read", // Просмотр своих счетов, чеков 54-ФЗ и оплат
	"portal:imaging:read", // Просмотр и скачивание своих снимков (КЛКТ, ОПТГ, прицельные)
	"portal:booking:manage", // Онлайн-запись, перенос и отмена своих визитов
	"portal:questionnaire:write", // Заполнение анкеты здоровья и соматического статуса
	"portal:consents:sign", // Подписание согласий простой электронной подписью (63-ФЗ)
] as const;

export type PatientPortalPermission = (typeof PATIENT_PORTAL_PERMISSIONS)[number];
export const patientPortalPermissionSchema = z.enum(PATIENT_PORTAL_PERMISSIONS);

export const DEFAULT_PATIENT_PORTAL_PERMISSIONS: readonly PatientPortalPermission[] = [
	"portal:medical_records:read",
	"portal:contracts:read",
	"portal:invoices:read",
	"portal:imaging:read",
	"portal:booking:manage",
	"portal:questionnaire:write",
	"portal:consents:sign",
];

export const patientPortalTokenPayloadSchema = z.object({
	patientId: z.string().min(1),
	organizationId: z.string().min(1),
	phone: z.string().min(10),
	fullName: z.string().optional(),
	authMethod: z.literal("sms_pep"),
	tokenKind: z.literal("patient_portal"),
	sessionId: z.string().min(1),
	permissions: z.array(patientPortalPermissionSchema),
	iat: z.number().int(),
	exp: z.number().int(),
});
export type PatientPortalTokenPayload = z.infer<typeof patientPortalTokenPayloadSchema>;

export interface PatientPortalTokenPayloadInput {
	patientId: string;
	organizationId: string;
	phone: string;
	fullName?: string | undefined;
	authMethod?: "sms_pep" | undefined;
	sessionId?: string | undefined;
	permissions?: readonly PatientPortalPermission[] | undefined;
}

/**
 * Signs a cryptographic JWT session token for the patient mobile portal.
 */
export function signPatientPortalJwt(
	payloadInput: PatientPortalTokenPayloadInput,
	secret: string,
	ttlSeconds = 60 * 60 * 12, // 12 hours
): string {
	if (!secret || secret.length < 16) {
		throw new Error("Секретный ключ JWT должен содержать минимум 16 символов");
	}

	const normalizedPhone = normalizeRussianPhoneNumber(payloadInput.phone);
	const nowSec = Math.floor(Date.now() / 1000);
	const fullPayload: PatientPortalTokenPayload = {
		patientId: payloadInput.patientId,
		organizationId: payloadInput.organizationId,
		phone: normalizedPhone,
		...(payloadInput.fullName ? { fullName: payloadInput.fullName } : {}),
		authMethod: "sms_pep",
		tokenKind: "patient_portal",
		sessionId: payloadInput.sessionId ?? safeRandomBytesHex(16),
		permissions: payloadInput.permissions ? [...payloadInput.permissions] : [...DEFAULT_PATIENT_PORTAL_PERMISSIONS],
		iat: nowSec,
		exp: nowSec + ttlSeconds,
	};

	const header = { alg: "HS256", typ: "JWT" };
	const headerEncoded = base64UrlEncode(JSON.stringify(header));
	const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
	const data = `${headerEncoded}.${payloadEncoded}`;
	const signatureBytes = hmacSha256(secret, data);
	const signature = base64UrlEncode(signatureBytes);

	return `${data}.${signature}`;
}

/**
 * Verifies and decodes a Patient Portal JWT session token.
 */
export function verifyPatientPortalJwt(
	token: string | null | undefined,
	secret: string,
): PatientPortalTokenPayload | null {
	if (!token || typeof token !== "string" || !secret) {
		return null;
	}

	try {
		const parts = token.trim().split(".");
		if (parts.length !== 3) return null;

		const [headerB64, payloadB64, signatureB64] = parts;
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		const data = `${headerB64}.${payloadB64}`;
		const expectedSignatureBytes = hmacSha256(secret, data);
		const expectedSignature = base64UrlEncode(expectedSignatureBytes);

		if (!safeStringCompare(signatureB64, expectedSignature)) {
			return null;
		}

		const payloadJson = base64UrlDecode(payloadB64);
		const parsed = JSON.parse(payloadJson) as Record<string, unknown>;

		const nowSec = Math.floor(Date.now() / 1000);
		if (typeof parsed.exp === "number" && parsed.exp < nowSec) {
			return null; // Expired token
		}

		if (parsed.tokenKind !== "patient_portal") {
			return null;
		}

		return patientPortalTokenPayloadSchema.parse(parsed);
	} catch {
		return null;
	}
}

/**
 * Strict Patient RBAC & Isolation Guard:
 * Ensures patient can ONLY access their own records and only with required permission.
 * Prevents cross-patient and cross-tenant data leaks (152-FZ / 323-FZ).
 */
export function checkPatientPortalAccess(
	session: PatientPortalTokenPayload | null | undefined,
	targetPatientId: string,
	requiredPermission: PatientPortalPermission,
): {
	allowed: boolean;
	reason?: "UNAUTHENTICATED" | "PATIENT_ISOLATION_VIOLATION" | "MISSING_PERMISSION" | undefined;
	descriptionRu: string;
} {
	if (!session) {
		return {
			allowed: false,
			reason: "UNAUTHENTICATED",
			descriptionRu: "Сессия пациента не авторизована или истёк срок действия токена.",
		};
	}

	if (session.patientId !== targetPatientId) {
		return {
			allowed: false,
			reason: "PATIENT_ISOLATION_VIOLATION",
			descriptionRu: "Запрещён доступ к медицинским данным другого пациента (152-ФЗ / 323-ФЗ).",
		};
	}

	if (!session.permissions.includes(requiredPermission)) {
		return {
			allowed: false,
			reason: "MISSING_PERMISSION",
			descriptionRu: `Отсутствует необходимое право доступа: ${requiredPermission}`,
		};
	}

	return {
		allowed: true,
		descriptionRu: "Доступ разрешён.",
	};
}
