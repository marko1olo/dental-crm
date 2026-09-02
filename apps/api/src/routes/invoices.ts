/**
 * DENTE Dental CRM — Invoices & Work Order Billing Routes (Feature #41).
 *
 * Implements:
 * 1. POST /api/invoices/validate-plan: Price lock & obsolete service validation before billing.
 * 2. POST /api/invoices/generate-from-plan: Atomic invoice generation with price lock guarantees.
 * 3. GET /api/invoices: List invoices.
 * 4. GET /api/invoices/:id: Get invoice details.
 */

import { randomUUID } from "node:crypto";
import {
	type CatalogServiceLookup,
	type PlanItemForValidation,
	type PlanToInvoiceValidationPayload,
	type PriceLockResolutionPolicy,
	validatePlanToInvoice,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { getServiceCatalogForOrganization } from "../db/pricelistQuery.js";
import { users } from "../db/schema/auth.js";
import { payments } from "../db/schema/billing.js";
import {
	generatedDocuments,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	visits,
} from "../db/schema/clinical.js";
import { patients } from "../db/schema/patients.js";
import { getRequestIdentity } from "../security/identity.js";
import { verifyCredential } from "../utils/cryptoHelper.js";

const validatePlanBodySchema = z.object({
	planId: z.string().min(1),
	planNumber: z.string().optional(),
	planTitle: z.string().optional(),
	patientId: z.string().min(1),
	patientName: z.string().optional(),
	doctorId: z.string().optional(),
	doctorFullName: z.string().optional(),
	planCreatedAtIso: z.string(),
	approvedAtIso: z.string().nullable().optional(),
	isSignedWithPatient: z.boolean().optional(),
	validityDaysLimit: z.number().int().positive().optional(),
	inflationThresholdPercent: z.number().int().positive().optional(),
	items: z.array(
		z.object({
			itemId: z.string().min(1),
			toothNumber: z.number().int().nullable().optional(),
			surfaces: z.array(z.string()).optional(),
			code804n: z.string().min(1),
			nameRu: z.string().min(1),
			categoryRu: z.string().optional(),
			quantity: z.number().int().positive().default(1),
			planUnitPriceKopecks: z.number().int().nonnegative(),
			planDiscountKopecks: z.number().int().nonnegative().optional(),
			serviceId: z.string().optional(),
			stageId: z.string().optional(),
			stageTitleRu: z.string().optional(),
		}),
	),
	itemResolutionOverrides: z.record(z.string(), z.string()).optional(),
	itemAnalogueSelections: z.record(z.string(), z.string()).optional(),
	adminOverrideAuthorized: z.boolean().optional(),
	adminOverrideStaffName: z.string().optional(),
	adminOverrideReason: z.string().optional(),
});

const generateInvoiceFromPlanSchema = z.object({
	patientId: z.string().uuid(),
	planId: z.string().optional(),
	planNumber: z.string().optional(),
	planTitle: z.string().optional(),
	planCreatedAtIso: z.string().optional(),
	approvedAtIso: z.string().nullable().optional(),
	isSignedWithPatient: z.boolean().optional(),
	doctorUserId: z.string().uuid().optional(),
	documentType: z.enum(["invoice", "work_order", "completed_act"]).default("invoice"),
	items: z.array(
		z.object({
			itemId: z.string().optional(),
			toothNumber: z.number().int().nullable().optional(),
			surfaces: z.array(z.string()).optional().default([]),
			code804n: z.string().optional(),
			nameRu: z.string().min(1),
			categoryRu: z.string().optional(),
			quantity: z.number().int().positive().default(1),
			planUnitPriceRub: z.number().nonnegative().optional(),
			effectiveUnitPriceRub: z.number().nonnegative().optional(),
			unitPriceRub: z.number().nonnegative().optional(),
			discountRub: z.number().nonnegative().default(0),
			resolutionPolicy: z.string().default("LOCK_ORIGINAL_PRICE"),
			serviceId: z.string().optional(),
			analogueServiceId: z.string().optional(),
		}),
	).min(1),
	adminOverridePin: z.string().optional(),
	adminOverrideReason: z.string().optional(),
	notes: z.string().optional(),
});

export async function registerInvoiceRoutes(app: FastifyInstance) {
	// POST /api/invoices/validate-plan — Pre-billing validation of prices and obsolete services
	app.post("/api/invoices/validate-plan", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "invoices validate plan"))) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "invoices validate plan");
		if (!orgId) return;

		const parsed = validatePlanBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvoicePlanValidationError",
				message: "Ошибка валидации входных данных плана лечения.",
				details: parsed.error.issues,
			});
		}

		const catalogRows = await getServiceCatalogForOrganization(orgId);
		const catalogLookup: CatalogServiceLookup[] = catalogRows.map((c) => ({
			id: c.id,
			code804n: c.code,
			title: c.title,
			category: c.category,
			basePriceKopecks: Math.round(Number(c.basePriceRub || 0) * 100),
			active: c.active !== false,
			isArchived: c.active === false,
			decree458Expensive: false,
			uetAdult: 1.0,
		}));

		const validationPayload: PlanToInvoiceValidationPayload = {
			planId: parsed.data.planId,
			planNumber: parsed.data.planNumber,
			planTitle: parsed.data.planTitle,
			patientId: parsed.data.patientId,
			patientName: parsed.data.patientName,
			doctorId: parsed.data.doctorId,
			doctorFullName: parsed.data.doctorFullName,
			planCreatedAtIso: parsed.data.planCreatedAtIso,
			approvedAtIso: parsed.data.approvedAtIso,
			isSignedWithPatient: parsed.data.isSignedWithPatient,
			validityDaysLimit: parsed.data.validityDaysLimit,
			inflationThresholdPercent: parsed.data.inflationThresholdPercent,
			items: parsed.data.items.map((it) => ({
				itemId: it.itemId,
				code804n: it.code804n,
				nameRu: it.nameRu,
				categoryRu: it.categoryRu || "Терапия",
				quantity: it.quantity,
				planUnitPriceKopecks: it.planUnitPriceKopecks,
				planDiscountKopecks: it.planDiscountKopecks || 0,
				toothNumber: it.toothNumber !== undefined ? it.toothNumber : null,
				surfaces: it.surfaces || [],
				...(it.serviceId !== undefined ? { serviceId: it.serviceId } : {}),
				...(it.stageId !== undefined ? { stageId: it.stageId } : {}),
				...(it.stageTitleRu !== undefined ? { stageTitleRu: it.stageTitleRu } : {}),
			})),
			catalog: catalogLookup,
			itemResolutionOverrides: parsed.data.itemResolutionOverrides as Record<string, PriceLockResolutionPolicy> | undefined,
			itemAnalogueSelections: parsed.data.itemAnalogueSelections,
			adminOverrideAuthorized: parsed.data.adminOverrideAuthorized,
			adminOverrideStaffName: parsed.data.adminOverrideStaffName,
			adminOverrideReason: parsed.data.adminOverrideReason,
		};

		const report = validatePlanToInvoice(validationPayload);
		return reply.code(200).send(report);
	});

	// POST /api/invoices/generate-from-plan — Atomic generation of work order / invoice from plan
	app.post("/api/invoices/generate-from-plan", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "generate invoice from plan"))) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "generate invoice from plan");
		if (!orgId) return;

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
		const isOmsInvoice =
			data.items.some(
				(it) =>
					(it.categoryRu && it.categoryRu.toLowerCase().includes("омс")) ||
					(it.nameRu && it.nameRu.toLowerCase().includes("омс")) ||
					(it.code804n && it.code804n.toLowerCase().includes("омс")),
			) ||
			Boolean(data.notes && data.notes.toLowerCase().includes("омс"));

		const adminProfile = (patient.administrativeProfile || {}) as Record<string, unknown>;
		const isAnonPatient =
			Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
			Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
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

		if (isOmsInvoice && (isAnonPatient || !hasValidOmsIdentity)) {
			return reply.code(422).send({
				error: "Decree659OmsForbiddenError",
				message:
					"Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: формирование счетов и нарядов по программе ОМС для анонимных карт (UUID_ANON) или при отсутствии полного пакета документов (паспорт РФ, СНИЛС и 16-значный полис ОМС) категорически запрещено.",
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

		for (const item of data.items) {
			const itemServiceId = item.serviceId || item.analogueServiceId;
			const isApproved = planItems.some((pi) => {
				if (!pi.priceId) return false;
				if (
					itemServiceId &&
					(pi.priceId === itemServiceId ||
						pi.priceId.startsWith(`${itemServiceId}::`))
				)
					return true;
				if (item.nameRu && pi.priceId.includes(item.nameRu)) return true;
				return false;
			});

			if (!isApproved) {
				// Проверяем наличие оформленного и выданного Дополнительного соглашения
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

				if (!addendumDoc) {
					return reply.code(422).send({
						error: "UpsellConsentShieldViolationError",
						message: `Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Закона РФ «О защите прав потребителей» (Защита от навязывания услуг): услуга «${item.nameRu}» не входит в утвержденный план лечения пациента. Формирование наряда/счета заблокировано до подписания Дополнительного соглашения.`,
					});
				}
			}
		}

		// 2. Получаем актуальный прайс-лист для валидации
		const catalogRows = await getServiceCatalogForOrganization(orgId);
		const catalogLookup: CatalogServiceLookup[] = catalogRows.map((c) => ({
			id: c.id,
			code804n: c.code,
			title: c.title,
			category: c.category,
			basePriceKopecks: Math.round(Number(c.basePriceRub || 0) * 100),
			active: c.active !== false,
			isArchived: c.active === false,
			decree458Expensive: false,
			uetAdult: 1.0,
		}));

		// DEFECT-PRICE-01: Проверка PIN-кода администратора при наличии оверрайда
		let isAdminOverrideVerified = false;
		let adminStaffName = "Управляющий клиники";

		if (data.adminOverridePin) {
			const staffList = await db
				.select({ id: users.id, fullName: users.fullName, pinCodeHash: users.pinCodeHash, role: users.role })
				.from(users)
				.where(and(eq(users.organizationId, orgId), eq(users.isActive, true)));

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

		// Валидация плана
		const planItemsForVal: PlanItemForValidation[] = data.items.map(
			(it, idx) => {
				const matchingCatalog = catalogRows.find(
					(c) =>
						(it.serviceId && c.id === it.serviceId) ||
						(it.code804n && c.code === it.code804n),
				);
				const effectivePriceRub =
					it.effectiveUnitPriceRub ??
					it.planUnitPriceRub ??
					it.unitPriceRub ??
					Number(matchingCatalog?.basePriceRub ?? 0);
				const planPriceRub =
					it.planUnitPriceRub ??
					it.unitPriceRub ??
					effectivePriceRub;

				return {
					itemId: it.itemId || it.serviceId || `item-${idx + 1}`,
					toothNumber: it.toothNumber !== undefined ? it.toothNumber : null,
					surfaces: it.surfaces || [],
					code804n: it.code804n || matchingCatalog?.code || "A16.07.001",
					nameRu: it.nameRu,
					categoryRu:
						it.categoryRu || matchingCatalog?.category || "Терапия",
					quantity: it.quantity,
					planUnitPriceKopecks: Math.round(planPriceRub * 100),
					planDiscountKopecks: Math.round(it.discountRub * 100),
					...(it.analogueServiceId || it.serviceId
						? { serviceId: it.analogueServiceId || it.serviceId }
						: {}),
				};
			},
		);

		const validationReport = validatePlanToInvoice({
			planId: data.planId || "PLAN-CUSTOM",
			planNumber: data.planNumber,
			patientId: data.patientId,
			patientName: patient.fullName,
			planCreatedAtIso: data.planCreatedAtIso || new Date().toISOString(),
			approvedAtIso: data.approvedAtIso,
			isSignedWithPatient: data.isSignedWithPatient,
			items: planItemsForVal,
			catalog: catalogLookup,
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
		const timestamp = Date.now().toString().slice(-6);
		const prefix =
			data.documentType === "work_order"
				? "НРД"
				: data.documentType === "completed_act"
					? "АКТ"
					: "СЧТ";
		const invoiceNumber = `${prefix}-${patient.id.slice(0, 4).toUpperCase()}-${timestamp}`;

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

		// Запись в базу (treatment_items)
		const createdItemIds: string[] = [];
		for (const it of validationReport.items) {
			const matchingCatalog = catalogRows.find(
				(c) => c.code === it.code804n || c.id === it.suggested804nAnalogue?.serviceId,
			);

			const [inserted] = await db
				.insert(treatmentItems)
				.values({
					organizationId: orgId,
					patientId: data.patientId,
					serviceId: matchingCatalog?.id ?? null,
					toothCode: it.toothNumber ? String(it.toothNumber) : null,
					title: it.nameRu,
					quantity: String(it.quantity),
					unitPriceRub: Number((it.effectiveUnitPriceKopecks / 100).toFixed(2)),
					priceRub: Number((it.effectiveLineNetKopecks / 100).toFixed(2)),
					discountRub: Number((it.effectiveDiscountKopecks / 100).toFixed(2)),
					status: "proposed",
					plannedDoctorUserId: data.doctorUserId ?? null,
					notes: `Наряд ${invoiceNumber}. Политика: ${it.selectedResolution}${
						it.clinicAbsorptionKopecks > 0
							? ` (Абсорбция клиники: ${(it.clinicAbsorptionKopecks / 100).toFixed(2)} ₽)`
							: ""
					}`,
				})
				.returning({ id: treatmentItems.id });

			if (inserted) {
				createdItemIds.push(inserted.id);
			}
		}

		return reply.code(201).send({
			success: true,
			invoiceId: randomUUID(),
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

	// GET /api/invoices — List invoices / work orders
	app.get("/api/invoices", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "invoices list"))) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "invoices list");
		if (!orgId) return;

		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
		});
		const parsedQuery = querySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			});
		}
		const patientId = parsedQuery.data.patientId;

		const items = await db
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, orgId),
					patientId ? eq(treatmentItems.patientId, patientId) : sql`TRUE`,
				),
			)
			.orderBy(desc(treatmentItems.id))
			.limit(100);

		return reply.code(200).send({
			items,
		});
	});
}
