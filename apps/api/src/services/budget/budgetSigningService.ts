import { createHash, randomUUID } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { kopecksToNumericString, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
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
import { cancelRejectedPlanTierLedgerItems } from "../../routes/treatmentPlan/handlers/mutations/planLedgerSync.js";
import { createInvoiceForApprovedPlan } from "../../routes/treatmentPlan/handlers/mutations/statusTreatmentPlanHandler.js";
import { resolveAuthMethod } from "../portalBudget/budgetTokenManager.js";
import type {
	GenerateBudgetPortalTokenOptions,
	PortalBudgetItem,
} from "../portalBudget/types.js";
import { wsBroker } from "../websocketBroker.js";
import type { SignBody } from "./budgetSchemas.js";
import { buildDerived3TierSummary } from "./budgetTiersSummary.js";

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
	const primaryNetKopecks =
		budget.netTotalKopecks != null &&
		(Number(budget.netTotalKopecks) !== 0 || Number(budget.netTotalRub || 0) === 0)
			? Number(budget.netTotalKopecks)
			: rublesToKopecks(Number(budget.netTotalRub) || 0);
	const docData = JSON.stringify({
		token: budget.token,
		planId: budget.planId,
		totalPriceKopecks: primaryNetKopecks,
		totalPriceRub: kopecksToRubles(primaryNetKopecks),
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
		selectedTierId: parsedSignData.selectedTierId === "standard" ? "optimum" : parsedSignData.selectedTierId,
		ipAddress: clientIp,
		ipHash: clientIpHash,
		userAgent,
		signedAtIso: signedAt.toISOString(),
		documentHash,
	};

	const normalizedSelectedTier =
		parsedSignData.selectedTierId === "standard"
			? "optimum"
			: parsedSignData.selectedTierId;

	let approvedPlanId = budget.planId;

	// Единая неделимая ACID-транзакция Postgres (tx)
	await withTenantCtx(budget.organizationId, async (tx) => {
		// 1. Фиксация подписи в portal_budget_tokens
		await tx
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

		// 2. Если смета привязана к плану лечения в БД — синхронизируем статус Approved, выбранный тариф и создаем инвойс
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
				let targetPlan = planToLock;
				if (normalizedSelectedTier && planToLock.planGroupId) {
					const siblings = await tx
						.select()
						.from(treatmentPlans)
						.where(
							and(
								eq(treatmentPlans.organizationId, budget.organizationId),
								eq(treatmentPlans.planGroupId, planToLock.planGroupId),
							),
						)
						.for("update");
					const matchingSibling = siblings.find((sib) => {
						const tier = (sib.alternativeTier ?? "").trim().toLowerCase();
						return (
							tier === normalizedSelectedTier ||
							(normalizedSelectedTier === "optimum" && tier === "standard")
						);
					});
					if (matchingSibling) {
						targetPlan = matchingSibling;
					}
				}
				approvedPlanId = targetPlan.id;

				const anchorRawTier = (planToLock.alternativeTier ?? "").trim().toLowerCase();
				const anchorTier =
					anchorRawTier === "economy" || anchorRawTier === "premium"
						? anchorRawTier
						: "optimum";
				const baseNetKopecks =
					budget.netTotalKopecks != null
						? Number(budget.netTotalKopecks)
						: rublesToKopecks(Number(budget.netTotalRub) || 0);
				const baseDiscountKopecks =
					budget.discountKopecks != null
						? Number(budget.discountKopecks)
						: rublesToKopecks(Number(budget.discountRub) || 0);

				let overrideTotalKopecks: number | undefined;
				let overrideTotalRub: string | number | undefined;
				if (normalizedSelectedTier && targetPlan.id === planToLock.id && normalizedSelectedTier !== anchorTier) {
					const derived = buildDerived3TierSummary(
						baseNetKopecks,
						baseDiscountKopecks,
						anchorTier,
					);
					const chosenSummary = derived.tiersSummary.find(
						(t) => t.tierId === normalizedSelectedTier,
					);
					if (chosenSummary) {
						overrideTotalKopecks = chosenSummary.netTotalKopecks;
						overrideTotalRub = kopecksToNumericString(chosenSummary.netTotalKopecks);
					}
				}

				const [updatedPlan] = await tx
					.update(treatmentPlans)
					.set({
						status: "Approved",
						...(normalizedSelectedTier ? { alternativeTier: normalizedSelectedTier } : {}),
						patientSignature: parsedSignData.signaturePng,
						approvedAt: signedAt,
						updatedAt: signedAt,
					})
					.where(
						and(
							eq(treatmentPlans.id, targetPlan.id),
							eq(treatmentPlans.organizationId, budget.organizationId),
						),
					)
					.returning();

				// Синхронизируем позиции плана в книге лечения (treatment_items) в статус approved
				await tx
					.update(treatmentItems)
					.set({
						status: "approved",
						treatmentPlanId: targetPlan.id,
					})
					.where(
						and(
							eq(treatmentItems.organizationId, budget.organizationId),
							eq(treatmentItems.patientId, budget.patientId),
							eq(treatmentItems.status, "proposed"),
							or(
								eq(treatmentItems.treatmentPlanId, targetPlan.id),
								sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${targetPlan.id} AND organization_id = ${budget.organizationId})`,
							),
						),
					);

				// Аннулируем позиции отвергнутых альтернативных тарифов в той же группе планов
				await cancelRejectedPlanTierLedgerItems(tx, {
					organizationId: budget.organizationId,
					patientId: budget.patientId,
					approvedPlanId: targetPlan.id,
					planGroupId: targetPlan.planGroupId,
				});

				// Создаем реальный счет/наряд в кассе в целочисленных копейках
				const resolvedPlanTotalKopecks =
					overrideTotalKopecks !== undefined
						? BigInt(overrideTotalKopecks)
						: updatedPlan?.totalPriceKopecks != null &&
								(updatedPlan.totalPriceKopecks !== 0n || Number(updatedPlan.totalPriceRub ?? updatedPlan.totalPrice ?? 0) === 0)
							? updatedPlan.totalPriceKopecks
							: BigInt(baseNetKopecks);
				const resolvedPlanDiscountKopecks =
					updatedPlan?.planDiscountKopecks != null &&
					(updatedPlan.planDiscountKopecks !== 0n || Number(updatedPlan.planDiscountRub ?? 0) === 0)
						? updatedPlan.planDiscountKopecks
						: BigInt(rublesToKopecks(Number(updatedPlan?.planDiscountRub ?? 0)));
				await createInvoiceForApprovedPlan(tx, {
					organizationId: budget.organizationId,
					patientId: budget.patientId,
					planId: targetPlan.id,
					planName: updatedPlan?.name || targetPlan.name || "План лечения (подписан пациентом)",
					totalPriceKopecks: resolvedPlanTotalKopecks,
					planDiscountKopecks: resolvedPlanDiscountKopecks,
					planTotalPriceRub:
						overrideTotalRub ??
						kopecksToRubles(resolvedPlanTotalKopecks),
					discountMode: updatedPlan?.discountMode ?? "plan_fixed",
					planDiscountPercent: updatedPlan?.planDiscountPercent ? Number(updatedPlan.planDiscountPercent) : 0,
					planDiscountRub: kopecksToRubles(resolvedPlanDiscountKopecks),
				});

				// Журнал аудита пишется строго внутри единой ACID-транзакции tx
				await tx.insert(auditEvents).values({
					organizationId: budget.organizationId,
					actorUserId: null,
					entityType: "treatment_plan",
					entityId: targetPlan.id,
					action: "BUDGET_SIGNED_REMOTE",
					reason: `Дистанционное согласование сметы пациентом ${signer}${normalizedSelectedTier ? ` (тариф: ${normalizedSelectedTier})` : ""} (IP hash: ${clientIpHash.slice(0, 8)}...)`,
				});
			} else {
				log.warn({ planId: budget.planId }, "План лечения для утверждения не найден в организации");
			}
		} else {
			await tx.insert(auditEvents).values({
				organizationId: budget.organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: budget.token,
				action: "BUDGET_SIGNED_REMOTE",
				reason: `Дистанционное согласование сметы пациентом ${signer} (IP hash: ${clientIpHash.slice(0, 8)}...)`,
			});
		}
	});

	// Вебсокет-оповещение для координаторов и врачей (только после успешного коммита транзакции)
	wsBroker.broadcastToOrganization(budget.organizationId, {
		type: "TREATMENT_PLAN_BUDGET_SIGNED",
		payload: {
			token: budget.token,
			planId: approvedPlanId,
			patientId: budget.patientId,
			selectedTierId: normalizedSelectedTier ?? null,
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

/**
 * Генерация безопасного токена сметы для дистанционного согласования пациентом
 */
export async function generateBudgetPortalToken(
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

	// 1. Если указан planId, загружаем параметры плана и пациента из БД при необходимости
	const targetPlanId = options.planId;
	if (targetPlanId) {
		try {
			await withTenantCtx(options.organizationId, async (tx) => {
				const [planRow] = await tx
					.select({
						id: treatmentPlans.id,
						name: treatmentPlans.name,
						status: treatmentPlans.status,
						totalPrice: treatmentPlans.totalPrice,
						totalPriceKopecks: treatmentPlans.totalPriceKopecks,
						totalPriceRub: treatmentPlans.totalPriceRub,
						planDiscountKopecks: treatmentPlans.planDiscountKopecks,
						planDiscountRub: treatmentPlans.planDiscountRub,
						doctorId: treatmentPlans.doctorId,
						patientId: treatmentPlans.patientId,
						organizationId: treatmentPlans.organizationId,
					})
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.id, targetPlanId),
							eq(treatmentPlans.organizationId, options.organizationId),
							eq(treatmentPlans.patientId, options.patientId),
						),
					)
					.limit(1);

				if (planRow) {
					const rowTotalKop =
						planRow.totalPriceKopecks != null &&
						(Number(planRow.totalPriceKopecks) !== 0 || Number(planRow.totalPriceRub ?? planRow.totalPrice ?? 0) === 0)
							? Number(planRow.totalPriceKopecks)
							: rublesToKopecks(Number(planRow.totalPriceRub ?? planRow.totalPrice ?? 0) || 0);
					if (rowTotalKop > 0) {
						computedTotal = kopecksToRubles(rowTotalKop);
					}
					const rowDiscountKop =
						planRow.planDiscountKopecks != null &&
						(Number(planRow.planDiscountKopecks) !== 0 || Number(planRow.planDiscountRub ?? 0) === 0)
							? Number(planRow.planDiscountKopecks)
							: rublesToKopecks(Number(planRow.planDiscountRub ?? 0) || 0);
					if (rowDiscountKop > 0) {
						computedDiscount = kopecksToRubles(rowDiscountKop);
					}

					// Загрузка пациента с изоляцией тенанта
					const [patientRow] = await tx
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

					// Загрузка реквизитов организации
					const [orgRow] = await tx
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

					// Загрузка врача
					if (planRow.doctorId) {
						const [docRow] = await tx
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

					// Загрузка позиций плана лечения из treatment_plan_items_new
					if (!options.items || options.items.length === 0) {
						const itemsRows = await tx
							.select()
							.from(treatmentPlanItemsNew)
							.where(
								and(
									eq(treatmentPlanItemsNew.planId, targetPlanId),
									eq(treatmentPlanItemsNew.organizationId, options.organizationId),
								),
							);

						if (itemsRows && itemsRows.length > 0) {
							loadedItems = itemsRows.map((it, idx) => {
								const qty = it.quantity || 1;
								const priceKop = it.priceKopecks
									? Number(it.priceKopecks)
									: rublesToKopecks(Number(it.price) || 0);
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
			});
		} catch {
			// Fallback к переданным options при ошибке чтения базы
		}
	}

	// 2. Если позиции переданы явно — нормализуем с точностью до копейки
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
			(acc, it) => acc + it.quantity * rublesToKopecks(it.priceRub),
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

	await withTenantCtx(options.organizationId, async (tx) => {
		await tx
			.insert(portalBudgetTokens)
			.values({
				token,
				planId: options.planId || null,
				organizationId: options.organizationId,
				patientId: options.patientId,
				doctorId: options.doctorId || null,
				status: "sent",
				clinicName: clinicName || "Стоматологическая клиника ДЕНТЕ",
				clinicPhone: clinicPhone || "+7 (495) 100-20-30",
				clinicAddress: clinicAddress || "г. Москва",
				doctorName: doctorName || "Врач-стоматолог",
				patientFirstName: patientFirstName || "Пациент",
				patientPhone: patientPhone || null,
				patientBirthDate: patientBirthDate || null,
				authMethod: resolvedMethod,
				items: loadedItems,
				totalPriceRub: kopecksToNumericString(rublesToKopecks(computedTotal)),
				discountRub: kopecksToNumericString(rublesToKopecks(computedDiscount)),
				netTotalRub: kopecksToNumericString(netTotalKop),
				totalPriceKopecks: BigInt(rublesToKopecks(computedTotal)),
				discountKopecks: BigInt(rublesToKopecks(computedDiscount)),
				netTotalKopecks: BigInt(netTotalKop),
				currency: "RUB",
				failedAttempts: 0,
				totalFailures: 0,
				isLocked: false,
				validUntil: options.validUntil ? new Date(options.validUntil) : null,
			})
			.onConflictDoUpdate({
				target: portalBudgetTokens.token,
				set: {
					status: "sent",
					items: loadedItems,
					totalPriceRub: kopecksToNumericString(rublesToKopecks(computedTotal)),
					discountRub: kopecksToNumericString(rublesToKopecks(computedDiscount)),
					netTotalRub: kopecksToNumericString(netTotalKop),
					totalPriceKopecks: BigInt(rublesToKopecks(computedTotal)),
					discountKopecks: BigInt(rublesToKopecks(computedDiscount)),
					netTotalKopecks: BigInt(netTotalKop),
					updatedAt: new Date(),
				},
			});
	});

	return {
		token,
		shareUrl: `/portal/budget/${token}`,
		expiresAt: options.validUntil || null,
	};
}

export const PortalBudgetService = {
	generateBudgetPortalToken,
};
