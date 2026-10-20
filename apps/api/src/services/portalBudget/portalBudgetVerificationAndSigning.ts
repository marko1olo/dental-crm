import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { treatmentPlans } from "../../db/schema.js";
import {
	createSessionToken as createBudgetSessionToken,
	hashIp,
	normalizeIsoDate,
	validateSessionToken as validateBudgetSessionToken,
} from "./budgetTokenManager.js";
import {
	computeDocumentHash,
	createSignatureRecord,
	validateSignaturePng,
} from "./pepSignatureEngine.js";
import {
	loadBudget,
	persistBudget,
} from "./portalBudgetStorage.js";
import {
	LOCKOUT_DURATION_MS,
	MAX_PORTAL_VERIFY_ATTEMPTS,
	type PortalAuthMethod,
	type SignBudgetPayload,
	type SignBudgetReqMeta,
	type SignBudgetResult,
	type VerifyBudgetAccessPayload,
	type VerifyBudgetAccessResult,
} from "./types.js";

export async function executeVerifyBudgetAccess(
	token: string,
	payload: VerifyBudgetAccessPayload,
	_ipAddress?: string,
): Promise<VerifyBudgetAccessResult> {
	const budget = await loadBudget(token);
	if (!budget) {
		return {
			success: false,
			status: 404,
			error: "BudgetNotFound",
			message: "Ссылка на смету не найдена.",
		};
	}

	if (budget.status === "accepted") {
		return {
			success: false,
			status: 409,
			error: "AlreadyAccepted",
			message: "Смета уже согласована.",
		};
	}

	const now = Date.now();
	if (budget.isLocked || (budget.lockedUntil && budget.lockedUntil.getTime() > now)) {
		return {
			success: false,
			status: 429,
			error: "RateLimited",
			message:
				"Превышено число попыток ввода (максимум 5). Доступ временно заблокирован на 15 минут.",
			isLocked: true,
			remainingAttempts: 0,
		};
	}

	const method = (payload.method || budget.authMethod || "phone_last4") as PortalAuthMethod;
	const rawVal = payload.value ?? (method === "phone_last4" ? payload.phone_last4 : payload.dob);
	const inputVal = (rawVal || "").trim();

	let isMatch = false;

	if (method === "none") {
		isMatch = true;
	} else if (method === "phone_last4") {
		const cleanPhone = (budget.patientPhone || "").replace(/\D/g, "");
		const expectedLast4 = cleanPhone.slice(-4);
		const cleanInput = inputVal.replace(/\D/g, "");
		if (cleanPhone.length >= 4 && cleanInput.length === 4) {
			isMatch = timingSafeEqual(Buffer.from(cleanInput), Buffer.from(expectedLast4));
		}
	} else if (method === "dob") {
		const normPatient = normalizeIsoDate(budget.patientBirthDate);
		const normInput = normalizeIsoDate(inputVal);
		if (normPatient && normInput && normPatient.length === normInput.length) {
			isMatch = timingSafeEqual(Buffer.from(normInput), Buffer.from(normPatient));
		}
	}

	if (!isMatch) {
		budget.failedAttempts += 1;
		budget.totalFailures += 1;
		const remaining = Math.max(0, MAX_PORTAL_VERIFY_ATTEMPTS - budget.failedAttempts);

		if (budget.failedAttempts >= MAX_PORTAL_VERIFY_ATTEMPTS) {
			budget.isLocked = true;
			budget.lockedUntil = new Date(now + LOCKOUT_DURATION_MS);
			await persistBudget(budget);
			return {
				success: false,
				status: 429,
				error: "RateLimited",
				message:
					"Превышено число попыток ввода (максимум 5). Доступ заблокирован на 15 минут.",
				isLocked: true,
				remainingAttempts: 0,
			};
		}

		await persistBudget(budget);
		return {
			success: false,
			status: 401,
			error: "VerificationFailed",
			message: `Неверные последние 4 цифры номера телефона. Осталось попыток: ${remaining}`,
			remainingAttempts: remaining,
		};
	}

	// Verification passed!
	budget.failedAttempts = 0;
	budget.isLocked = false;
	budget.lockedUntil = null;
	await persistBudget(budget);

	const sessionToken = createBudgetSessionToken(budget.patientId, budget.token);

	return {
		success: true,
		status: 200,
		sessionToken,
	};
}

export async function executeSignBudget(
	token: string,
	payload: SignBudgetPayload,
	reqMeta: SignBudgetReqMeta = {},
): Promise<SignBudgetResult> {
	const budget = await loadBudget(token);
	if (!budget) {
		return {
			success: false,
			status: 404,
			error: "BudgetNotFound",
			message: "Ссылка на смету не найдена.",
		};
	}

	if (budget.status === "accepted") {
		return {
			success: true,
			status: 200,
			signedAt: budget.signedAt || undefined,
			documentHash: budget.documentHash || undefined,
			signerName: budget.signerName || undefined,
		};
	}

	// If verification required, verify session token
	if (budget.authMethod !== "none") {
		const isAuthed = reqMeta.sessionToken
			? validateBudgetSessionToken(reqMeta.sessionToken, budget.patientId, budget.token)
			: false;

		// If no valid session token and attempts were not completed
		if (!isAuthed && budget.failedAttempts > 0) {
			return {
				success: false,
				status: 401,
				error: "VerificationRequired",
				message: "Необходимо подтвердить номер телефона перед подписанием.",
			};
		}
	}

	const validation = validateSignaturePng(payload.signaturePng);
	if (!validation.valid) {
		return {
			success: false,
			status: 400,
			error: validation.error,
			message: validation.message,
		};
	}

	const signedAt = new Date().toISOString();
	const clientIp = reqMeta.ipAddress || "127.0.0.1";
	const ipHashVal = hashIp(clientIp);
	const signer = (payload.signerName || budget.patientFirstName || "Пациент").trim();

	const documentHash = computeDocumentHash({
		token: budget.token,
		planId: budget.planId,
		totalPriceRub: budget.netTotalRub,
		items: budget.items,
		signedByName: signer,
		signedAt,
		ipHash: ipHashVal,
	});

	const signatureRecord = createSignatureRecord({
		signaturePng: payload.signaturePng,
		signatureSvg: payload.signatureSvg,
		signedByName: signer,
		relationshipToPatient: payload.relationship,
		clientIp,
		ipHash: ipHashVal,
		userAgent: reqMeta.userAgent,
		signedAtIso: signedAt,
		documentHash,
	});

	budget.signature = signatureRecord;
	budget.status = "accepted";
	budget.signedAt = signedAt;
	budget.signerName = signer;
	budget.documentHash = documentHash;

	await persistBudget(budget);

	// If linked to PostgreSQL treatment plan, update DB in ACID transaction
	if (budget.planId) {
		try {
			await db
				.update(treatmentPlans)
				.set({
					status: "Approved",
					patientSignature: payload.signaturePng,
					approvedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(treatmentPlans.id, budget.planId),
						eq(treatmentPlans.organizationId, budget.organizationId),
						eq(treatmentPlans.patientId, budget.patientId),
					),
				);
		} catch {
			// Database sync failure logged
		}
	}

	return {
		success: true,
		status: 200,
		signedAt,
		documentHash,
		signerName: signer,
		ipHash: ipHashVal,
	};
}
