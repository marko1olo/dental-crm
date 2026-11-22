import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	auditEvents,
	organizations,
	patients,
	portalBudgetTokens,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { LEDGER_ID_PREFIX_LENGTH } from "../../routes/odontogram/types.js";
import { cancelRejectedPlanTierLedgerItems } from "../../routes/treatmentPlan/handlers/mutations/planLedgerSync.js";
import { createInvoiceForApprovedPlan } from "../../routes/treatmentPlan/handlers/mutations/statusTreatmentPlanHandler.js";
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
	LOCKOUT_DURATION_MS,
	MAX_PORTAL_VERIFY_ATTEMPTS,
	type GenerateBudgetPortalTokenOptions,
	type MarkBudgetViewedResult,
	type PortalAuthMethod,
	type PortalBudgetItem,
	type PortalBudgetSignature,
	type PortalBudgetStatus,
	type PublicBudgetDto,
	type SignBudgetPayload,
	type SignBudgetReqMeta,
	type SignBudgetResult,
	type StoredPortalBudget,
	type VerifyBudgetAccessPayload,
	type VerifyBudgetAccessResult,
} from "./types.js";

/**
 * Загрузка сметы из PostgreSQL (portal_budget_tokens)
 */
export async function loadBudget(token: string): Promise<StoredPortalBudget | null> {
	const [row] = await db
		.select()
		.from(portalBudgetTokens)
		.where(eq(portalBudgetTokens.token, token))
		.limit(1);

	if (!row) return null;

	return {
		token: row.token,
		planId: row.planId ?? undefined,
		organizationId: row.organizationId,
		patientId: row.patientId,
		doctorId: row.doctorId ?? undefined,
		status: row.status as PortalBudgetStatus,
		clinicName: row.clinicName,
		clinicPhone: row.clinicPhone ?? undefined,
		clinicAddress: row.clinicAddress ?? undefined,
		doctorName: row.doctorName,
		patientFirstName: row.patientFirstName,
		patientPhone: row.patientPhone ?? undefined,
		patientBirthDate: row.patientBirthDate ?? undefined,
		authMethod: (row.authMethod || "phone_last4") as PortalAuthMethod,
		verbalPinHash: row.verbalPinHash ?? undefined,
		items: (row.items as PortalBudgetItem[]) ?? [],
		totalPriceRub: Number(row.totalPriceRub) || 0,
		discountRub: Number(row.discountRub) || 0,
		netTotalRub: Number(row.netTotalRub) || 0,
		currency: row.currency,
		failedAttempts: row.failedAttempts,
		totalFailures: row.totalFailures,
		isLocked: row.isLocked,
		lockedUntil: row.lockedUntil ?? undefined,
		viewedAt: row.viewedAt ? row.viewedAt.toISOString() : undefined,
		signedAt: row.signedAt ? row.signedAt.toISOString() : undefined,
		signerName: row.signerName ?? undefined,
		documentHash: row.documentHash ?? undefined,
		signature: (row.signature as PortalBudgetSignature) ?? undefined,
		validUntil: row.validUntil ? row.validUntil.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
	};
}

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Сохранение сметы в PostgreSQL (portal_budget_tokens)
 */
export async function persistBudget(budget: StoredPortalBudget, executor: DbOrTx = db): Promise<void> {
	await executor
		.insert(portalBudgetTokens)
		.values({
			token: budget.token,
			planId: budget.planId || null,
			organizationId: budget.organizationId,
			patientId: budget.patientId,
			doctorId: budget.doctorId || null,
			status: budget.status,
			clinicName: budget.clinicName,
			clinicPhone: budget.clinicPhone || null,
			clinicAddress: budget.clinicAddress || null,
			doctorName: budget.doctorName,
			patientFirstName: budget.patientFirstName,
			patientPhone: budget.patientPhone || null,
			patientBirthDate: budget.patientBirthDate || null,
			authMethod: budget.authMethod,
			verbalPinHash: budget.verbalPinHash || null,
			items: budget.items,
			totalPriceRub: String(Math.round(budget.totalPriceRub)),
			discountRub: String(Math.round(budget.discountRub)),
			netTotalRub: String(Math.round(budget.netTotalRub)),
			totalPriceKopecks: BigInt(rublesToKopecks(budget.totalPriceRub)),
			discountKopecks: BigInt(rublesToKopecks(budget.discountRub)),
			netTotalKopecks: BigInt(rublesToKopecks(budget.netTotalRub)),
			currency: budget.currency || "RUB",
			failedAttempts: budget.failedAttempts,
			totalFailures: budget.totalFailures,
			isLocked: budget.isLocked,
			lockedUntil: budget.lockedUntil ? new Date(budget.lockedUntil) : null,
			viewedAt: budget.viewedAt ? new Date(budget.viewedAt) : null,
			signedAt: budget.signedAt ? new Date(budget.signedAt) : null,
			signerName: budget.signerName || null,
			documentHash: budget.documentHash || null,
			signature: budget.signature ?? null,
			validUntil: budget.validUntil ? new Date(budget.validUntil) : null,
		})
		.onConflictDoUpdate({
			target: portalBudgetTokens.token,
			set: {
				status: budget.status,
				failedAttempts: budget.failedAttempts,
				totalFailures: budget.totalFailures,
				isLocked: budget.isLocked,
				lockedUntil: budget.lockedUntil ? new Date(budget.lockedUntil) : null,
				viewedAt: budget.viewedAt ? new Date(budget.viewedAt) : null,
				signedAt: budget.signedAt ? new Date(budget.signedAt) : null,
				signerName: budget.signerName || null,
				documentHash: budget.documentHash || null,
				signature: budget.signature ?? null,
				validUntil: budget.validUntil ? new Date(budget.validUntil) : null,
				items: budget.items,
				totalPriceRub: String(Math.round(budget.totalPriceRub)),
				discountRub: String(Math.round(budget.discountRub)),
				netTotalRub: String(Math.round(budget.netTotalRub)),
				totalPriceKopecks: BigInt(rublesToKopecks(budget.totalPriceRub)),
				discountKopecks: BigInt(rublesToKopecks(budget.discountRub)),
				netTotalKopecks: BigInt(rublesToKopecks(budget.netTotalRub)),
				updatedAt: new Date(),
			},
		});
}

export class PortalBudgetService {
	public static clearRegistry(): void {
		// Zero in-memory cache per Mandate 8s
	}

	public static resetMemoryCacheOnly(): void {
		// Zero in-memory cache per Mandate 8s
	}

	public static registerBudget(budget: StoredPortalBudget): StoredPortalBudget {
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

					// Fetch doctor (strictly tenant-isolated)
					if (planRow.doctorId) {
						const [docRow] = await db
							.select({ id: users.id, fullName: users.fullName })
							.from(users)
							.where(
								and(
									eq(users.id, planRow.doctorId),
									eq(users.organizationId, options.organizationId),
								),
							)
							.limit(1);
						if (docRow && !doctorName) {
							doctorName = docRow.fullName;
						}
					}

					// Load plan items if not pre-supplied (strictly tenant-isolated)
					if (!options.items || options.items.length === 0) {
						const itemsRows = await db
							.select()
							.from(treatmentPlanItemsNew)
							.where(
								and(
									eq(treatmentPlanItemsNew.planId, options.planId),
									eq(treatmentPlanItemsNew.organizationId, options.organizationId),
								),
							);

						if (itemsRows && itemsRows.length > 0) {
							loadedItems = itemsRows.map((it, idx) => {
								const qty = it.quantity || 1;
								const priceKop = it.priceKopecks ? Number(it.priceKopecks) : rublesToKopecks(Number(it.price) || 0);
								const discKop = it.discountKopecks ? Number(it.discountKopecks) : 0;
								const totalKop = Math.max(0, qty * priceKop - discKop);
								return {
									id: it.id || `item-${idx + 1}`,
									title: it.name || "Стоматологическая услуга",
									toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
									quantity: qty,
									priceRub: kopecksToRubles(priceKop),
									discountRub: kopecksToRubles(discKop),
									totalRub: kopecksToRubles(totalKop),
								};
							});
						}
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
				const priceKop = rublesToKopecks(it.priceRub);
				const discKop = rublesToKopecks(it.discountRub || 0);
				const totalKop = Math.max(0, qty * priceKop - discKop);
				return {
					id: it.id || `item-${idx + 1}`,
					title: it.title,
					toothNumber: it.toothNumber ?? null,
					quantity: qty,
					priceRub: kopecksToRubles(priceKop),
					discountRub: kopecksToRubles(discKop),
					totalRub: kopecksToRubles(totalKop),
				};
			});
		}

		if (loadedItems.length > 0) {
			const totalKop = loadedItems.reduce(
				(acc, it) => acc + (it.quantity * rublesToKopecks(it.priceRub)),
				0,
			);
			const discKop = loadedItems.reduce((acc, it) => acc + rublesToKopecks(it.discountRub), 0);
			computedTotal = kopecksToRubles(totalKop);
			computedDiscount = kopecksToRubles(discKop);
		}

		const resolvedMethod =
			options.authMethod || resolveAuthMethod({ phone: patientPhone, birthDate: patientBirthDate });
		const netTotalKop = Math.max(
			0,
			rublesToKopecks(computedTotal) - rublesToKopecks(computedDiscount),
		);
		const netTotal = kopecksToRubles(netTotalKop);

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
				message: `Неверные данные подтверждения. Осталось попыток: ${remaining}`,
				remainingAttempts: remaining,
			};
		}

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
				message: "Смета не найдена.",
			};
		}

		if (budget.status === "accepted") {
			return {
				success: false,
				status: 409,
				error: "AlreadyAccepted",
				message: "Смета уже подписана и принята.",
				signedAt: budget.signedAt ?? undefined,
				signerName: budget.signerName ?? undefined,
				documentHash: budget.documentHash ?? undefined,
			};
		}

		if (budget.authMethod !== "none") {
			const sessionToken = reqMeta.sessionToken;
			if (!sessionToken || !validateBudgetSessionToken(sessionToken, budget.patientId, budget.token)) {
				return {
					success: false,
					status: 401,
					error: "Unauthorized",
					message: "Требуется авторизация для подписания сметы.",
				};
			}
		}

		const signaturePng = payload.signaturePng?.trim() || "";
		if (!validateSignaturePng(signaturePng)) {
			return {
				success: false,
				status: 400,
				error: "InvalidSignature",
				message: "Некорректный формат векторной подписи.",
			};
		}

		const signerName = (payload.signerName || budget.patientFirstName || "Пациент").trim();
		const signedAt = new Date().toISOString();
		const clientIp = reqMeta.ipAddress || "127.0.0.1";
		const ipHash = hashIp(clientIp);

		const documentHash = computeDocumentHash({
			token: budget.token,
			planId: budget.planId,
			totalPriceRub: budget.netTotalRub,
			items: budget.items,
			signedByName: signerName,
			signedAt,
			ipHash,
		});

		const signature = createSignatureRecord({
			signaturePng,
			signedByName: signerName,
			relationshipToPatient: payload.relationship || "patient",
			clientIp,
			ipHash,
			userAgent: reqMeta.userAgent,
			signedAtIso: signedAt,
			documentHash,
		});

		budget.status = "accepted";
		budget.signedAt = signedAt;
		budget.signerName = signerName;
		budget.documentHash = documentHash;
		budget.signature = signature;

		await db.transaction(async (tx) => {
			await persistBudget(budget, tx);

			if (budget.planId) {
				const [planToLock] = await tx
					.select()
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.id, budget.planId),
							eq(treatmentPlans.organizationId, budget.organizationId),
						),
					)
					.for("update")
					.limit(1);

				if (planToLock) {
					const [updatedPlan] = await tx
						.update(treatmentPlans)
						.set({
							status: "Approved",
							patientSignature: signaturePng,
							approvedAt: new Date(signedAt),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(treatmentPlans.id, budget.planId),
								eq(treatmentPlans.organizationId, budget.organizationId),
							),
						)
						.returning();

					// DEF-PLAN-01 / Мандат 8e: Синхронизируем позиции плана в книге лечения (treatment_items)
					await tx
						.update(treatmentItems)
						.set({
							status: "approved",
							treatmentPlanId: budget.planId,
						})
						.where(
							and(
								eq(treatmentItems.organizationId, budget.organizationId),
								eq(treatmentItems.patientId, budget.patientId),
								eq(treatmentItems.status, "proposed"),
								or(
									eq(treatmentItems.treatmentPlanId, budget.planId),
									sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${budget.planId} AND organization_id = ${budget.organizationId})`,
								),
							),
						);

					// SEV-2.4: Аннулируем позиции отвергнутых альтернативных тарифов в той же группе планов
					await cancelRejectedPlanTierLedgerItems(tx, {
						organizationId: budget.organizationId,
						patientId: budget.patientId,
						approvedPlanId: budget.planId,
						planGroupId: planToLock.planGroupId,
					});

					// DEF-PLAN-01: Создаем реальный счет/наряд в кассе при утверждении сметы пациентом
					await createInvoiceForApprovedPlan(tx, {
						organizationId: budget.organizationId,
						patientId: budget.patientId,
						planId: budget.planId,
						planName: updatedPlan?.name || planToLock.name || "План лечения (подписан пациентом)",
						planTotalPriceRub: updatedPlan?.totalPriceRub || updatedPlan?.totalPrice || budget.netTotalRub,
						discountMode: updatedPlan?.discountMode ?? "plan_fixed",
						planDiscountPercent: updatedPlan?.planDiscountPercent ? Number(updatedPlan.planDiscountPercent) : 0,
						planDiscountRub: updatedPlan?.planDiscountRub ? Number(updatedPlan.planDiscountRub) : 0,
					});

					// Мандат 8bo: Аудит пишется строго внутри единой ACID-транзакции tx
					await tx.insert(auditEvents).values({
						organizationId: budget.organizationId,
						actorUserId: null,
						entityType: "treatment_plan",
						entityId: budget.planId,
						action: "TREATMENT_PLAN_SIGNED_PORTAL",
						reason: `План лечения «${updatedPlan?.name || planToLock.name}» подписан пациентом через портал (сумма: ${budget.netTotalRub} ₽)`,
					});
				}
			}
		});

		return {
			success: true,
			status: 200,
			signedAt,
			signerName,
			documentHash,
			ipHash,
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
