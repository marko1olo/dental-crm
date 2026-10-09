import { formatKopecksToRubles, type CreatePaymentInput } from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import { toKopecks } from "../../money/patientDebt.js";
import type { TenantDb } from "../rls.js";
import * as schema from "../schema.js";
import { Decree659Error, type LockedPatientForBilling } from "./types.js";

export async function validateDecree659AndPriceCompliance(
	tx: TenantDb,
	params: {
		organizationId: string;
		lockedPatient: LockedPatientForBilling;
		input: CreatePaymentInput;
		incomingPaymentKopecks: number;
		isWarrantyOrFullDiscount: boolean;
	},
): Promise<void> {
	const {
		organizationId,
		lockedPatient,
		input,
		incomingPaymentKopecks,
		isWarrantyOrFullDiscount,
	} = params;

	// 1. БЛОКИРУЮЩИЙ ГЕЙТ №1 (ПОСТАНОВЛЕНИЕ №659 И СТ. 16 ФЗ-326):
	// Запрет приема оплаты по ОМС для анонимных карт или при отсутствии 16-значного полиса ОМС, паспорта и СНИЛС
	const adminProfile = (lockedPatient.administrativeProfile || {}) as Record<string, unknown>;
	const isAnonPatient =
		Boolean((lockedPatient as unknown as { isAnonymous?: boolean }).isAnonymous) ||
		Boolean(lockedPatient.fullName?.startsWith("UUID_ANON")) ||
		Boolean(lockedPatient.fullName?.toLowerCase().includes("аноним")) ||
		adminProfile["isAnonymous"] === true;

	const policyRaw =
		typeof adminProfile["insurancePolicyNumber"] === "string"
			? adminProfile["insurancePolicyNumber"].trim().replace(/\D/g, "")
			: "";
	const hasValidOmsIdentity = Boolean(
		adminProfile["identityDocument"] &&
		adminProfile["snils"] &&
		policyRaw.length === 16,
	);

	const isInsuranceMethod = input.method === "insurance";
	const isOmsNote = typeof input.note === "string" && (input.note.toLowerCase().includes("омс") || input.note.toLowerCase().includes("oms"));

	// Постановление №659 и ст. 16 ФЗ-326:
	// 1. Анонимным картам (UUID_ANON) страховая оплата (ОМС/ДМС) запрещена.
	// 2. По программе ОМС требуется полный пакет (паспорт РФ, СНИЛС и 16-значный полис ОМС).
	// 3. Коммерческое добровольное страхование (ДМС) идентифицированных пациентов регулируется гл. 48 ГК РФ
	//    и Законом № 4015-1 и не требует 16-значного полиса государственного фонда ОМС.
	if (isAnonPatient && (isInsuranceMethod || isOmsNote)) {
		throw new Decree659Error(
			"Decree659OmsForbiddenError",
			"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: оплата по программе страхования для анонимных карт (UUID_ANON) категорически запрещена. Допустимы только прямые коммерческие расчеты (касса 54-ФЗ / безнал).",
		);
	}

	if (isOmsNote && !hasValidOmsIdentity) {
		throw new Decree659Error(
			"Decree659OmsForbiddenError",
			"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: оплата по программе ОМС для анонимных карт (UUID_ANON) или при отсутствии полного пакета документов (паспорт РФ, СНИЛС и 16-значный полис ОМС) категорически запрещена. Допустимы только прямые коммерческие расчеты (касса 54-ФЗ / безнал).",
		);
	}

	if (isAnonPatient && input.taxDeductionCode) {
		throw new Decree659Error(
			"Decree659TaxDeductionForbiddenError",
			"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 219 НК РФ: оформление социального налогового вычета по НДФЛ (код вычета 01/02) для анонимных карт (UUID_ANON / isAnonymous) категорически запрещено.",
		);
	}

	// 1b. Price Spoofing & Upsell Consent Shield Defense
	const targetServiceId = input.serviceId || input.catalogItemId;
	if (targetServiceId) {
		const [serviceItem] = await tx
			.select()
			.from(schema.serviceCatalogItems)
			.where(
				and(
					eq(schema.serviceCatalogItems.id, targetServiceId),
					eq(schema.serviceCatalogItems.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!serviceItem) {
			throw new Error(`Услуга с ID «${targetServiceId}» не найдена в каталоге клиники.`);
		}

		// БЛОКИРУЮЩИЙ ГЕЙТ №3 (ПОСТАНОВЛЕНИЕ №659 И СТ. 16 ЗОЗПП):
		// Защита от навязывания услуг (Upsell Consent Shield):
		// Если у пациента есть утвержденный план лечения (status: 'Approved'), а оплачиваемая услуга
		// не входит в утвержденный перечень позиций плана, оплата БЛОКИРУЕТСЯ до подписания/выпуска
		// Дополнительного соглашения (generatedDocuments kind: "treatment_plan_acceptance", status: "issued").
		const approvedPlans = await tx
			.select({ id: schema.treatmentPlans.id })
			.from(schema.treatmentPlans)
			.where(
				and(
					eq(schema.treatmentPlans.organizationId, organizationId),
					eq(schema.treatmentPlans.patientId, input.patientId),
					eq(schema.treatmentPlans.status, "Approved"),
				),
			);

		if (approvedPlans.length > 0) {
			const approvedPlanIds = approvedPlans.map((p) => p.id);

			// Проверяем наличие услуги в утвержденных позициях плана (treatmentPlanItemsNew или treatmentItems)
			const planItems = await tx
				.select({ priceId: schema.treatmentPlanItemsNew.priceId })
				.from(schema.treatmentPlanItemsNew)
				.where(
					and(
						eq(schema.treatmentPlanItemsNew.organizationId, organizationId),
						inArray(schema.treatmentPlanItemsNew.planId, approvedPlanIds),
					),
				);

			const isServiceInPlan = planItems.some(
				(it) => it.priceId && (it.priceId === targetServiceId || it.priceId.startsWith(`${targetServiceId}::`)),
			);

			if (!isServiceInPlan) {
				// Проверяем наличие оформленного и выданного Дополнительного соглашения в generatedDocuments
				const addendumDocs = await tx
					.select({
						id: schema.generatedDocuments.id,
						title: schema.generatedDocuments.title,
						totalAmountRub: schema.generatedDocuments.totalAmountRub,
					})
					.from(schema.generatedDocuments)
					.where(
						and(
							eq(schema.generatedDocuments.organizationId, organizationId),
							eq(schema.generatedDocuments.patientId, input.patientId),
							eq(schema.generatedDocuments.kind, "treatment_plan_acceptance"),
							eq(schema.generatedDocuments.status, "issued"),
						),
					)
					.orderBy(desc(schema.generatedDocuments.createdAt));

				// Ищем выданное дополнительное соглашение, покрывающее сумму платежа
				const matchingAddendum = addendumDocs.find((doc) => {
					const limit = Number(doc.totalAmountRub || 0);
					return limit === 0 || input.amountRub <= limit;
				});

				if (!matchingAddendum) {
					// Не блокируем кассу и не выбрасываем 422 ошибку по ПП РФ №659!
					// Логируем предупреждение о необходимости оформления аддендума
					console.warn(
						`[Upsell Warning - ПП РФ №659]: услуга «${serviceItem.title}» не входит в утвержденный план лечения пациента ${input.patientId}. Оплата на сумму ${input.amountRub} ₽ фискализируется без блокировки кассы. Рекомендуется оформить Дополнительное соглашение.`,
					);
				}
			}
		}

		const catalogPriceKopecks = toKopecks(serviceItem.priceRub, "цена услуги в каталоге");
		let discountKopecks = 0;
		if (input.discountRub !== undefined && input.discountRub !== null) {
			discountKopecks = toKopecks(input.discountRub, "скидка на услугу");
		} else if (input.discountPercent !== undefined && input.discountPercent !== null) {
			discountKopecks = Math.trunc(
				(catalogPriceKopecks * Math.round(input.discountPercent * 100)) / 10000,
			);
		} else if (isWarrantyOrFullDiscount) {
			discountKopecks = catalogPriceKopecks;
		}

		const verifiedAmountKopecks = Math.max(0, catalogPriceKopecks - discountKopecks);
		if (incomingPaymentKopecks > verifiedAmountKopecks) {
			throw new Error(
				`Попытка подмены прайса для услуги «${serviceItem.title}»: цена в каталоге составляет ${formatKopecksToRubles(catalogPriceKopecks)} ₽ (к списанию с учетом скидки: ${formatKopecksToRubles(verifiedAmountKopecks)} ₽), получено ${formatKopecksToRubles(incomingPaymentKopecks)} ₽. Превышение стоимости запрещено.`,
			);
		}
	} else {
		// Случай внесения аванса / предоплаты БЕЗ указания конкретного serviceId:
		// Проверяем наличие утвержденных планов лечения
		const approvedPlans = await tx
			.select({
				id: schema.treatmentPlans.id,
				totalPriceRub: schema.treatmentPlans.totalPriceRub,
				totalPrice: schema.treatmentPlans.totalPrice,
			})
			.from(schema.treatmentPlans)
			.where(
				and(
					eq(schema.treatmentPlans.organizationId, organizationId),
					eq(schema.treatmentPlans.patientId, input.patientId),
					eq(schema.treatmentPlans.status, "Approved"),
				),
			);

		if (approvedPlans.length > 0) {
			const approvedTotalRub = approvedPlans.reduce((sum, p) => {
				const val = Number(p.totalPriceRub || p.totalPrice || 0);
				return sum + (Number.isFinite(val) ? val : 0);
			}, 0);

			const existingPayments = await tx
				.select({ amountRub: schema.payments.amountRub })
				.from(schema.payments)
				.where(
					and(
						eq(schema.payments.organizationId, organizationId),
						eq(schema.payments.patientId, input.patientId),
					),
				);

			const paidTotalRub = existingPayments.reduce((sum, p) => {
				const val = Number(p.amountRub || 0);
				return sum + (Number.isFinite(val) ? val : 0);
			}, 0);

			const remainingAgreedBalanceRub = Math.max(0, approvedTotalRub - paidTotalRub);

			if (input.amountRub > remainingAgreedBalanceRub) {
				// Проверяем наличие выданных Дополнительных соглашений
				const addendumDocs = await tx
					.select({
						id: schema.generatedDocuments.id,
						title: schema.generatedDocuments.title,
						totalAmountRub: schema.generatedDocuments.totalAmountRub,
					})
					.from(schema.generatedDocuments)
					.where(
						and(
							eq(schema.generatedDocuments.organizationId, organizationId),
							eq(schema.generatedDocuments.patientId, input.patientId),
							eq(schema.generatedDocuments.kind, "treatment_plan_acceptance"),
							eq(schema.generatedDocuments.status, "issued"),
						),
					);

				const totalAddendumLimitRub = addendumDocs.reduce((sum, d) => sum + (Number(d.totalAmountRub) || 0), 0);
				const totalAuthorizedRub = approvedTotalRub + totalAddendumLimitRub;
				const maxAllowedAmountRub = Math.max(0, totalAuthorizedRub - paidTotalRub);

				if (input.amountRub > maxAllowedAmountRub) {
					// Не блокируем кассу и не выбрасываем 422 по ПП РФ №659!
					// Логируем информационное предупреждение
					console.warn(
						`[Upsell Warning - ПП РФ №659]: сумма аванса/предоплаты (${input.amountRub} ₽) превышает доступный лимит согласованного лечения с учетом допсоглашений (${maxAllowedAmountRub} ₽). Платеж фискализируется без блокировки кассы.`,
					);
				}
			}
		}
	}
}
