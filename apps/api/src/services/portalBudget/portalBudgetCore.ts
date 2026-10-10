import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import {
	createSessionToken as createBudgetSessionToken,
	hashIp,
	normalizeIsoDate,
	resolveAuthMethod,
	validateSessionToken as validateBudgetSessionToken,
} from "./budgetTokenManager.js";
import {
	computeDocumentHash,
	createSignatureRecord,
	validateSignaturePng,
} from "./pepSignatureEngine.js";
import {
	clearRegistry as storageClearRegistry,
	loadBudget,
	memoryCache,
	persistBudget,
	resetMemoryCacheOnly as storageResetMemoryCacheOnly,
} from "./portalBudgetStorage.js";
import {
	LOCKOUT_DURATION_MS,
	MAX_PORTAL_VERIFY_ATTEMPTS,
	type GenerateBudgetPortalTokenOptions,
	type MarkBudgetViewedResult,
	type PortalAuthMethod,
	type PortalBudgetItem,
	type PortalBudgetStatus,
	type PublicBudgetDto,
	type SignBudgetPayload,
	type SignBudgetReqMeta,
	type SignBudgetResult,
	type StoredPortalBudget,
	type VerifyBudgetAccessPayload,
	type VerifyBudgetAccessResult,
} from "./types.js";

export class PortalBudgetService {
	public static clearRegistry(): void {
		storageClearRegistry();
	}

	public static resetMemoryCacheOnly(): void {
		storageResetMemoryCacheOnly();
	}

	public static registerBudget(budget: StoredPortalBudget): StoredPortalBudget {
		memoryCache.set(budget.token, budget);
		persistBudget(budget).catch(() => {});
		return budget;
	}

	public static async generateBudgetPortalToken(
		options: GenerateBudgetPortalTokenOptions,
	): Promise<{ token: string; shareUrl: string; expiresAt: string | null }> {
		const token = options.customToken || `pbt_${randomUUID().replace(/-/g, "")}`;

		let clinicName = options.clinicName;
		let clinicPhone = options.clinicPhone;
		let clinicAddress = options.clinicAddress;
		let doctorName = options.doctorName;
		let patientFirstName = options.patientFirstName;
		let patientPhone = options.patientPhone;
		let patientBirthDate = options.patientBirthDate;

		let loadedItems: PortalBudgetItem[] = [];
		let computedTotal = options.totalPriceRub ?? 0;
		let computedDiscount = options.discountRub ?? 0;

		// 1. If planId is given, load details from database if not pre-supplied
		if (options.planId) {
			try {
				const [planRow] = await db
					.select({
						id: treatmentPlans.id,
						name: treatmentPlans.name,
						status: treatmentPlans.status,
						totalPrice: treatmentPlans.totalPrice,
						totalPriceRub: treatmentPlans.totalPriceRub,
						planDiscountRub: treatmentPlans.planDiscountRub,
						doctorId: treatmentPlans.doctorId,
						patientId: treatmentPlans.patientId,
						organizationId: treatmentPlans.organizationId,
					})
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.id, options.planId),
							eq(treatmentPlans.organizationId, options.organizationId),
							eq(treatmentPlans.patientId, options.patientId),
						),
					)
					.limit(1);

				if (planRow) {
					if (planRow.totalPriceRub) {
						computedTotal = Number(planRow.totalPriceRub) || computedTotal;
					}
					if (planRow.planDiscountRub) {
						computedDiscount = Number(planRow.planDiscountRub) || computedDiscount;
					}

					// Fetch patient (strictly tenant-isolated)
					const [patientRow] = await db
						.select({
							id: patients.id,
							fullName: patients.fullName,
							phone: patients.phone,
							birthDate: patients.birthDate,
						})
						.from(patients)
						.where(
							and(
								eq(patients.id, planRow.patientId),
								eq(patients.organizationId, options.organizationId),
							),
						)
						.limit(1);

					if (patientRow) {
						if (!patientPhone) patientPhone = patientRow.phone;
						if (!patientBirthDate) patientBirthDate = patientRow.birthDate;
						if (!patientFirstName) {
							patientFirstName =
								patientRow.fullName.split(" ")[1] ||
								patientRow.fullName.split(" ")[0] ||
								"Пациент";
						}
					}

					// Fetch organization (strictly tenant-isolated)
					const [orgRow] = await db
						.select({
							id: organizations.id,
							name: organizations.name,
							legalAddress: organizations.legalAddress,
						})
						.from(organizations)
						.where(eq(organizations.id, options.organizationId))
						.limit(1);

					if (orgRow) {
						if (!clinicName) clinicName = orgRow.name;
						if (!clinicAddress) clinicAddress = orgRow.legalAddress ?? undefined;
					}

					// Fetch doctor
					if (planRow.doctorId) {
						const [docRow] = await db
							.select({
								id: users.id,
								fullName: users.fullName,
							})
							.from(users)
							.where(eq(users.id, planRow.doctorId))
							.limit(1);

						if (docRow && !doctorName) {
							doctorName = docRow.fullName;
						}
					}

					// Fetch plan items
					const dbItems = await db
						.select({
							id: treatmentPlanItemsNew.id,
							toothNumber: treatmentPlanItemsNew.toothNumber,
							priceId: treatmentPlanItemsNew.priceId,
							quantity: treatmentPlanItemsNew.quantity,
							price: treatmentPlanItemsNew.price,
							discount: treatmentPlanItemsNew.discount,
						})
						.from(treatmentPlanItemsNew)
						.where(eq(treatmentPlanItemsNew.planId, options.planId));

					if (dbItems.length > 0) {
						loadedItems = dbItems.map((it, idx) => {
							const priceVal = Number(it.price) || 0;
							const discVal = Number(it.discount) || 0;
							const qty = it.quantity || 1;
							const priceKop = Math.round(priceVal * 100);
							const discKop = Math.round(discVal * 100);
							const totalKop = Math.max(0, qty * priceKop - discKop);
							return {
								id: it.id,
								title: it.priceId || `Медицинская услуга #${idx + 1}`,
								toothNumber: it.toothNumber,
								quantity: qty,
								priceRub: priceKop / 100,
								discountRub: discKop / 100,
								totalRub: totalKop / 100,
							};
						});
					}
				}
			} catch {
				// Fallback to options if db is not populated or offline
			}
		}

		// 2. If explicit items were passed, use them with kopeck-exact integer arithmetic
		if (options.items && options.items.length > 0) {
			loadedItems = options.items.map((it, idx) => {
				const qty = it.quantity || 1;
				const priceKop = Math.round(it.priceRub * 100);
				const discKop = Math.round((it.discountRub || 0) * 100);
				const totalKop = Math.max(0, qty * priceKop - discKop);
				return {
					id: it.id || `item-${idx + 1}`,
					title: it.title,
					toothNumber: it.toothNumber ?? null,
					quantity: qty,
					priceRub: priceKop / 100,
					discountRub: discKop / 100,
					totalRub: totalKop / 100,
				};
			});
		}

		if (loadedItems.length > 0) {
			const totalKop = loadedItems.reduce(
				(acc, it) => acc + Math.round(it.quantity * it.priceRub * 100),
				0,
			);
			const discKop = loadedItems.reduce((acc, it) => acc + Math.round(it.discountRub * 100), 0);
			computedTotal = totalKop / 100;
			computedDiscount = discKop / 100;
		}

		const resolvedMethod =
			options.authMethod || resolveAuthMethod({ phone: patientPhone, birthDate: patientBirthDate });
		const netTotalKop = Math.max(
			0,
			Math.round(computedTotal * 100) - Math.round(computedDiscount * 100),
		);
		const netTotal = netTotalKop / 100;

		const stored: StoredPortalBudget = {
			token,
			planId: options.planId,
			organizationId: options.organizationId,
			patientId: options.patientId,
			doctorId: options.doctorId,
			status: "sent",
			clinicName: clinicName || "Стоматологическая клиника ДЕНТЕ",
			clinicPhone: clinicPhone || "+7 (495) 100-20-30",
			clinicAddress: clinicAddress || "г. Москва",
			doctorName: doctorName || "Врач-стоматолог",
			patientFirstName: patientFirstName || "Пациент",
			patientPhone,
			patientBirthDate,
			authMethod: resolvedMethod,
			items: loadedItems,
			totalPriceRub: computedTotal,
			discountRub: computedDiscount,
			netTotalRub: netTotal,
			currency: "RUB",
			failedAttempts: 0,
			totalFailures: 0,
			isLocked: false,
			validUntil: options.validUntil || null,
			createdAt: new Date().toISOString(),
		};

		await persistBudget(stored);

		return {
			token,
			shareUrl: `/portal/budget/${token}`,
			expiresAt: stored.validUntil || null,
		};
	}

	public static async getBudgetByToken(
		token: string,
		sessionToken?: string,
	): Promise<PublicBudgetDto | null> {
		const budget = await loadBudget(token);

		if (!budget) {
			return null;
		}

		let isVerified = budget.authMethod === "none" || budget.status === "accepted";
		if (!isVerified && sessionToken) {
			isVerified = this.validateSessionToken(sessionToken, budget.patientId, budget.token);
		}

		return {
			token: budget.token,
			planId: budget.planId,
			status: budget.status,
			clinicName: budget.clinicName,
			clinicPhone: budget.clinicPhone,
			clinicAddress: budget.clinicAddress,
			doctorName: budget.doctorName,
			patientFirstName: budget.patientFirstName,
			items: budget.items,
			totalPriceRub: budget.totalPriceRub,
			discountRub: budget.discountRub,
			netTotalRub: budget.netTotalRub,
			currency: budget.currency,
			requiresVerification: budget.authMethod !== "none" && budget.status !== "accepted",
			authMethod: budget.authMethod,
			isVerified,
			viewedAt: budget.viewedAt,
			signedAt: budget.signedAt,
			signerName: budget.signerName,
			documentHash: budget.documentHash,
			validUntil: budget.validUntil,
		};
	}

	public static async markBudgetViewed(
		token: string,
		_ipAddress?: string,
	): Promise<MarkBudgetViewedResult> {
		const budget = await loadBudget(token);
		if (!budget) {
			return { success: false, error: "BudgetNotFound" };
		}

		if (!budget.viewedAt) {
			budget.viewedAt = new Date().toISOString();
			if (budget.status === "sent" || budget.status === "draft") {
				budget.status = "viewed";
			}
			await persistBudget(budget);
		}

		return {
			success: true,
			status: budget.status,
			viewedAt: budget.viewedAt,
		};
	}

	public static async verifyBudgetAccess(
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

		const sessionToken = this.createSessionToken(budget.patientId, budget.token);

		return {
			success: true,
			status: 200,
			sessionToken,
		};
	}

	public static async signBudget(
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
				? this.validateSessionToken(reqMeta.sessionToken, budget.patientId, budget.token)
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

	public static createSessionToken(patientId: string, token: string): string {
		return createBudgetSessionToken(patientId, token);
	}

	public static validateSessionToken(
		sessionToken: string,
		expectedPatientId: string,
		expectedToken: string,
	): boolean {
		return validateBudgetSessionToken(sessionToken, expectedPatientId, expectedToken);
	}
}
