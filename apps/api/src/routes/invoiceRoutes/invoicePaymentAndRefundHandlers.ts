/**
 * DENTE Dental CRM — Invoice Billing, Price Lock Validation & Generation Route Handlers (Feature #41).
 *
 * Implements:
 * 1. POST /api/invoices/validate-plan: Price lock & obsolete service validation before billing.
 * 2. POST /api/invoices/generate-from-plan: Atomic invoice generation with price lock guarantees.
 */

import { randomUUID } from "node:crypto";
import { validatePlanToInvoice } from "@dental/shared";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getActivePriceFreezeToken } from "../../db/priceFreezeTokensQuery.js";
import { getServiceCatalogForOrganization } from "../../db/pricelistQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { users } from "../../db/schema/auth.js";
import { patientInvoices } from "../../db/schema/billing.js";
import {
	generatedDocuments,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../db/schema/clinical.js";
import { patients } from "../../db/schema/patients.js";
import { verifyCredential } from "../../utils/cryptoHelper.js";
import {
	buildEffectiveItemResolutionOverrides,
	buildPlanItemsForValidation,
	buildTreatmentItemsToInsert,
	buildValidatePlanPayload,
	evaluateOmsCompliance,
	findDiscountLimitViolation,
	formatInvoiceNumber,
	isServiceApprovedInPlanItems,
	mapCatalogRowsToLookup,
} from "./invoiceCalculationHelpers.js";
import {
	generateInvoiceFromPlanSchema,
	type PriceFreezeTokenResult,
	type TreatmentPlanItemRow,
	type TreatmentPlanRow,
	validatePlanBodySchema,
} from "./types.js";

export async function registerInvoiceBillingAndValidationRoutes(app: FastifyInstance) {
	// POST /api/invoices/validate-plan — Pre-billing validation of prices and obsolete services
	app.post("/api/invoices/validate-plan", async (request: FastifyRequest, reply: FastifyReply) => {
		if (reply.sent) return reply;
		const context = await requireClinicalReadContext(request, reply, "invoices validate plan");
		if (!context) return reply;
		const orgId = context.organizationId;

		const parsed = validatePlanBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvoicePlanValidationError",
				message: "Ошибка валидации входных данных плана лечения.",
				details: parsed.error.issues,
			});
		}

		const catalogRows = await getServiceCatalogForOrganization(orgId);
		const catalogLookup = mapCatalogRowsToLookup(catalogRows);

		let freezeTokenForValidation: PriceFreezeTokenResult = null;
		if (parsed.data.planId) {
			freezeTokenForValidation = await getActivePriceFreezeToken(db, orgId, parsed.data.planId);
		}

		const validationPayload = buildValidatePlanPayload(
			parsed.data,
			catalogLookup,
			freezeTokenForValidation,
		);

		const report = validatePlanToInvoice(validationPayload);
		return reply.code(200).send(report);
	});

	// POST /api/invoices/generate-from-plan — Atomic generation of work order / invoice from plan
	app.post("/api/invoices/generate-from-plan", async (request: FastifyRequest, reply: FastifyReply) => {
		if (reply.sent) return reply;
		const context = await requireClinicalMutationContext(request, reply, "generate invoice from plan");
		if (!context) return reply;
		const orgId = context.organizationId;

		const parsed = generateInvoiceFromPlanSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvalidGenerateInvoicePayload",
				message: "Некорректные параметры создания наряда/счета из плана лечения.",
				details: parsed.error.issues,
			});
		}

		const data = parsed.data;

		// 1. Получаем данные пациента
		const [patient] = await db
			.select()
			.from(patients)
			.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в базе данных.",
			});
		}

		// 1.1 БЛОКИРУЮЩИЙ ГЕЙТ №1 (ПОСТАНОВЛЕНИЕ №659 И СТ. 16 ФЗ-326):
		// Запрет выписки счетов по программе ОМС для анонимных карт или при отсутствии полного пакета документов (паспорт, СНИЛС, полис ОМС)
		const { isOmsInvoice, isAnonPatient, hasValidOmsIdentity } = evaluateOmsCompliance(
			data,
			patient,
		);

		if (isOmsInvoice && (isAnonPatient || !hasValidOmsIdentity)) {
			return reply.code(422).send({
				error: "Decree659OmsForbiddenError",
				message:
					"Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: формирование счетов и нарядов по программе ОМС для анонимных карт или при отсутствии полного пакета документов (паспорт РФ, СНИЛС и 16-значный полис ОМС) категорически запрещено.",
			});
		}

		// 1.2 БЛОКИРУЮЩИЙ ГЕЙТ №2 (ПОСТАНОВЛЕНИЕ №659 И СТ. 16 ЗОЗПП):
		// Проверка позиций выставляемого счета на соответствие утвержденному плану лечения (status: 'Approved')
		const approvedPlans = await db
			.select({ id: treatmentPlans.id })
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.organizationId, orgId),
					eq(treatmentPlans.patientId, data.patientId),
					eq(treatmentPlans.status, "Approved"),
				),
			);

		const approvedPlanIds = approvedPlans.map((p) => p.id);

		const planItems =
			approvedPlanIds.length > 0
				? await db
						.select({ priceId: treatmentPlanItemsNew.priceId })
						.from(treatmentPlanItemsNew)
						.where(
							and(
								eq(treatmentPlanItemsNew.organizationId, orgId),
								inArray(treatmentPlanItemsNew.planId, approvedPlanIds),
							),
						)
				: [];

		// Проверяем наличие оформленного и выданного Дополнительного соглашения один раз (устранение N+1)
		const [addendumDoc] = await db
			.select({
				id: generatedDocuments.id,
				totalAmountRub: generatedDocuments.totalAmountRub,
			})
			.from(generatedDocuments)
			.where(
				and(
					eq(generatedDocuments.organizationId, orgId),
					eq(generatedDocuments.patientId, data.patientId),
					eq(generatedDocuments.kind, "treatment_plan_acceptance"),
					eq(generatedDocuments.status, "issued"),
				),
			)
			.limit(1);

		for (const item of data.items) {
			const isApproved = isServiceApprovedInPlanItems(item, planItems);

			if (!isApproved) {
				if (!addendumDoc && !data.allowUnplannedServices) {
					return reply.code(422).send({
						error: "UpsellConsentShieldViolationError",
						message: `Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Закона РФ «О защите прав потребителей» (Защита от навязывания услуг): услуга «${item.nameRu}» не входит в утвержденный план лечения пациента. Формирование наряда/счета заблокировано до подписания Дополнительного соглашения.`,
					});
				}
				if (!addendumDoc) {
					request.log.info(
						{ item: item.nameRu },
						"[Invoices] Unplanned service added by doctor/staff without blocking",
					);
				}
			}
		}

		// 2. Получаем актуальный прайс-лист для валидации
		const catalogRows = await getServiceCatalogForOrganization(orgId);
		const catalogLookup = mapCatalogRowsToLookup(catalogRows);

		// DEFECT-PRICE-01: Проверка PIN-кода администратора при наличии оверрайда
		let isAdminOverrideVerified = false;
		let adminStaffName = "Управляющий клиники";

		if (data.adminOverridePin) {
			const staffList = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					pinCodeHash: users.pinCodeHash,
					role: users.role,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
						isNotNull(users.pinCodeHash),
					),
				);

			for (const staff of staffList) {
				if (staff.pinCodeHash) {
					const isMatched = await verifyCredential(data.adminOverridePin, staff.pinCodeHash);
					if (isMatched) {
						isAdminOverrideVerified = true;
						adminStaffName = staff.fullName || "Администратор";
						break;
					}
				}
			}

			if (!isAdminOverrideVerified) {
				return reply.code(401).send({
					error: "InvalidAdminPinError",
					message: "Неверный PIN-код администратора для согласования фиксации/пересчета цен.",
				});
			}
		}

		// 2.1 Проверяем наличие активного токена закрепления цен (Price Freeze Token / GAP_REPORT строка 164)
		// и режим скидок плана лечения (GAP_REPORT строка 165: none | plan_fixed | on_selection)
		const targetPlanId = data.planId || approvedPlanIds[0];
		let targetPlan: TreatmentPlanRow | null = null;
		let freezeToken: PriceFreezeTokenResult = null;
		let targetPlanDbItems: TreatmentPlanItemRow[] = [];

		if (targetPlanId) {
			const [found] = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, targetPlanId),
						eq(treatmentPlans.organizationId, orgId),
					),
				)
				.limit(1);
			targetPlan = found ?? null;
			if (targetPlan) {
				freezeToken = await getActivePriceFreezeToken(db, orgId, targetPlan.id);
				targetPlanDbItems = await db
					.select()
					.from(treatmentPlanItemsNew)
					.where(
						and(
							eq(treatmentPlanItemsNew.planId, targetPlan.id),
							eq(treatmentPlanItemsNew.organizationId, orgId),
						),
					);
			}
		}

		// Защита от навязывания услуг, дополнительных анестетиков и расходных материалов
		// (Upsell Consent Shield, ПП РФ №659, ПП РФ №736 п. 23, ст. 16 ЗоЗПП, ст. 709 ГК РФ):
		// Любая услуга, анестетик или расходный материал, включаемый в наряд из плана лечения,
		// обязан входить в утвержденный план лечения либо быть согласованным в Дополнительном соглашении.
		if (targetPlan && targetPlanDbItems.length > 0) {
			for (const item of data.items) {
				const isApprovedInPlan = isServiceApprovedInPlanItems(item, targetPlanDbItems);

				if (!isApprovedInPlan) {
					if (!addendumDoc && !data.allowUnplannedServices) {
						return reply.code(422).send({
							error: "UpsellConsentShieldViolationError",
							message: `Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Закона РФ «О защите прав потребителей» (Защита от навязывания услуг): услуга/материал «${item.nameRu}» не входит в утвержденный план лечения пациента. Формирование наряда/счета заблокировано до подписания Дополнительного соглашения.`,
						});
					}
					if (!addendumDoc) {
						request.log.info(
							{ item: item.nameRu },
							"[Invoices] Unplanned service/material added by doctor/staff without blocking",
						);
					}
				}
			}
		}

		// При наличии токена фиксации цен — его статус является первичным источником истины о блокировке цен.
		// Если токен истек (freezeToken.isExpired === true), цена НЕ зафиксирована, даже если план Approved.
		const isPriceLockedFinal = freezeToken
			? freezeToken.isPriceLocked
			: Boolean(
					data.isSignedWithPatient === true ||
						data.approvedAtIso ||
						targetPlan?.status === "Approved",
				);

		// Защита от манипуляций со скидками (ст. 16 ЗоЗПП, 54-ФЗ, ПП РФ №659):
		// Скидка не может превышать 100% стоимости услуги (скидка > стоимости позиции).
		const discountViolation = findDiscountLimitViolation(
			data.items,
			catalogRows,
			targetPlanDbItems,
		);
		if (discountViolation) {
			return reply.code(422).send({
				error: "InvalidDiscountError",
				code: "Decree659DiscountLimitExceededError",
				message: `Сумма скидки (${discountViolation.discountRub} ₽) по позиции «${discountViolation.nameRu}» превышает 100% стоимости услуги (${discountViolation.lineGrossRub} ₽). Предоставление скидки сверх стоимости услуги категорически запрещено (54-ФЗ / ПП РФ №659).`,
			});
		}

		// При истечении токена смета считается просроченной (срок фиксации истек)
		const isPlanExpiredExplicit = freezeToken?.isExpired === true ? true : undefined;

		// Валидация плана с учетом закрепления цен (Price Freeze Token) и режимов скидок
		const planItemsForVal = buildPlanItemsForValidation({
			items: data.items,
			catalogRows,
			freezeToken,
			targetPlanDbItems,
			targetPlan,
			isPriceLockedFinal,
			isAdminOverrideVerified,
		});

		// Лимит дней и порог инфляции берутся из токена фиксации (по умолчанию 10% по ПП РФ №659)
		const effectiveValidityDaysLimit = freezeToken
			? freezeToken.daysRemaining || 30
			: data.planCreatedAtIso
				? 30
				: undefined;

		const effectiveInflationThreshold = freezeToken?.inflationThresholdPercent ?? 10;

		const effectiveItemResolutionOverrides = buildEffectiveItemResolutionOverrides(data.items);

		const validationReport = validatePlanToInvoice({
			planId: data.planId || targetPlan?.id || "PLAN-CUSTOM",
			planNumber: data.planNumber,
			patientId: data.patientId,
			patientName: patient.fullName,
			planCreatedAtIso:
				data.planCreatedAtIso ||
				targetPlan?.createdAt?.toISOString() ||
				new Date().toISOString(),
			approvedAtIso: data.approvedAtIso || targetPlan?.approvedAt?.toISOString(),
			isSignedWithPatient: isPriceLockedFinal,
			isPlanExpired: isPlanExpiredExplicit,
			validityDaysLimit: effectiveValidityDaysLimit,
			inflationThresholdPercent: effectiveInflationThreshold,
			items: planItemsForVal,
			catalog: catalogLookup,
			itemResolutionOverrides: effectiveItemResolutionOverrides,
			adminOverrideAuthorized: isAdminOverrideVerified,
			adminOverrideStaffName: adminStaffName,
			adminOverrideReason: data.adminOverrideReason,
		});

		// DEFECT-PRICE-02: Жесткий запрет на выписку при наличии неразрешенных архивных услуг
		if (!validationReport.canGenerateWorkOrder) {
			return reply.code(400).send({
				error: "BlockedArchivedServiceError",
				message:
					"Оформление наряда заблокировано: смета содержит архивные, исключенные из прайса услуги или недействительные цены.",
				blockingReasons: validationReport.blockingReasons,
				report: validationReport,
			});
		}

		// 3. Формируем уникальный номер наряда/счета
		const invoiceNumber = formatInvoiceNumber(data.documentType, patient.id);

		const totalGrossRub = Number(
			(validationReport.effectiveInvoiceGrossKopecks / 100).toFixed(2),
		);
		const totalDiscountRub = Number(
			(validationReport.effectiveInvoiceDiscountKopecks / 100).toFixed(2),
		);
		const totalNetRub = Number(
			(validationReport.effectiveInvoiceNetKopecks / 100).toFixed(2),
		);
		const clinicAbsorptionRub = Number(
			(validationReport.totalClinicAbsorptionKopecks / 100).toFixed(2),
		);

		// Запись в базу (patient_invoices + treatment_items в единой транзакции)
		const invoiceId = randomUUID();
		const createdItemIds: string[] = [];
		await withTenantCtx(orgId, async (tx) => {
			if (data.planId) {
				await tx
					.select()
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.id, data.planId),
							eq(treatmentPlans.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);
			}

			// Атомарное сохранение счёта в patient_invoices
			await tx.insert(patientInvoices).values({
				id: invoiceId,
				organizationId: orgId,
				patientId: data.patientId,
				totalRub: String(totalNetRub),
				totalAmountRub: totalNetRub,
				status: "draft",
				issuedAt: new Date(),
			});

			if (validationReport.items.length > 0) {
				const itemsToInsert = buildTreatmentItemsToInsert({
					validationReportItems: validationReport.items,
					reqItems: data.items,
					catalogRows,
					targetPlanDbItems,
					orgId,
					patientId: data.patientId,
					doctorUserId: data.doctorUserId,
					invoiceNumber,
				});

				const insertedRows = await tx
					.insert(treatmentItems)
					.values(itemsToInsert)
					.returning({ id: treatmentItems.id });

				for (const inserted of insertedRows) {
					createdItemIds.push(inserted.id);
				}
			}
		});

		return reply.code(201).send({
			success: true,
			invoiceId,
			invoiceNumber,
			documentType: data.documentType,
			patientId: data.patientId,
			totalGrossRub,
			totalDiscountRub,
			totalNetRub,
			clinicAbsorptionRub,
			createdTreatmentItemIds: createdItemIds,
			isPriceLocked: validationReport.isPriceLocked,
			validationReport,
			issuedAt: new Date().toISOString(),
		});
	});
}
