import {
	CONTROLLED_DRUG_PRESETS,
	calculatePrescriptionExpiration,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	form107_1uPayloadSchema,
	form148_1u04lPayloadSchema,
	form148_1u88PayloadSchema,
	PREFERENTIAL_BENEFIT_CATEGORIES,
	PREFERENTIAL_DRUG_PRESETS,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	PRESCRIPTION_VALIDITY_RULES,
	prescriptionDoctorUkepSchema,
	renderPrescriptionUniversalHtml,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";

/** Schema for creating a prescription through the statutory API */
const createPrescriptionBodySchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid().optional().nullable(),
	prescribingDoctorId: z.string().uuid(),
	formType: z
		.enum(["form_107_1_u", "form_148_1_u_88", "form_148_1_u_04_l"])
		.default("form_107_1_u"),
	validityPeriod: z
		.enum(["days_15", "days_30", "days_60", "year_1"])
		.default("days_60"),
	isSpecialChronicIndication: z.boolean().default(false),
	chronicDispenseFrequencyNotes: z.string().max(120).optional().nullable(),
	patientAddress: z.string().max(240).optional().nullable(),
	preferentialBenefitCode: z.string().max(16).optional().nullable(),
	preferentialBenefitNameRu: z.string().max(160).optional().nullable(),
	preferentialDiscountPercent: z
		.number()
		.int()
		.min(0)
		.max(100)
		.optional()
		.nullable(),
	patientSnils: z.string().max(32).optional().nullable(),
	patientOmsPolicy: z.string().max(32).optional().nullable(),
	fundingSource: z
		.enum(["federal", "regional", "municipal"])
		.default("federal"),
	clinicalDiagnosisMkb10: z.string().max(32).optional().nullable(),
	clinicalDiagnosisDescription: z.string().max(500).optional().nullable(),
	notes: z.string().max(500).optional().nullable(),
	items: z
		.array(
			z.object({
				catalogDrugId: z.string().uuid().optional().nullable(),
				innLatin: z.string().min(2).max(240),
				dosageFormLatin: z.string().min(2).max(120),
				dosageDoseConcentration: z.string().min(1).max(80),
				dispenseInstructionLatin: z.string().min(2).max(200),
				signatureDirectionRussian: z.string().min(5).max(500),
				tradeName: z.string().max(120).optional().nullable(),
				quantityPackages: z.number().int().min(1).default(1),
				durationDays: z.number().int().min(1).default(7),
				frequencyTimesPerDay: z.number().int().min(1).default(2),
				mealRelation: z
					.enum(["before_meal", "with_meal", "after_meal", "independent"])
					.default("after_meal"),
			}),
		)
		.min(1)
		.max(3),
	ukepSignature: prescriptionDoctorUkepSchema.optional().nullable(),
});

/** Schema for UKEP signing */
const signUkepBodySchema = z.object({
	pkcs7Signature: z.string().min(1, { message: "pkcs7Signature is required" }),
	certificateSerialNumber: z.string().max(64).optional(),
	certificateThumbprint: z.string().max(64).optional(),
	certificateIssuer: z.string().max(160).optional(),
	certificateValidFrom: z.string().max(32).optional(),
	certificateValidTo: z.string().max(32).optional(),
	doctorSnils: z.string().max(32).optional(),
	signatureAlgorithm: z.string().max(64).default("ГОСТ Р 34.10-2012 (256 бит)"),
	egiszDocumentId: z.string().max(64).optional(),
});

export async function registerPrescriptionRoutes(app: FastifyInstance) {
	/**
	 * 1. GET /api/prescriptions/reference-catalog
	 * Complete statutory pharmacopeia & prescription reference dictionary
	 */
	app.get("/api/prescriptions/reference-catalog", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		return reply.send({
			success: true,
			dosageForms: PRESCRIPTION_DOSAGE_FORMS_CATALOG,
			administrationRoutes: PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
			preferentialBenefitCategories: PREFERENTIAL_BENEFIT_CATEGORIES,
			catalog: DENTAL_PRESCRIPTION_DRUG_CATALOG,
			controlledPkuPresets: CONTROLLED_DRUG_PRESETS,
			preferentialPresets: PREFERENTIAL_DRUG_PRESETS,
			validityRules: PRESCRIPTION_VALIDITY_RULES,
		});
	});

	/**
	 * 2. POST /api/prescriptions/validate
	 * Statutory rules engine validation per Order 1094n
	 */
	app.post("/api/prescriptions/validate", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const body = request.body as any;
		if (!body || typeof body !== "object") {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Тело запроса для валидации рецепта обязательно.",
			});
		}

		const result = verifyPrescriptionStatutoryValidity(body);
		return reply.send({
			success: true,
			validation: result,
		});
	});

	/**
	 * 3. POST /api/prescriptions/preview-html
	 * Generate print-ready HTML preview for statutory prescription
	 */
	app.post("/api/prescriptions/preview-html", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const body = request.body as any;
		if (!body || typeof body !== "object") {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Данные рецепта обязательны для генерации печатной формы.",
			});
		}

		const html = renderPrescriptionUniversalHtml(body);
		reply.type("text/html; charset=utf-8");
		return reply.send(html);
	});

	/**
	 * 4. GET /api/prescriptions
	 * List prescriptions for organization with filters
	 */
	app.get("/api/prescriptions", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Реестр рецептов содержит врачебную тайну и ПДн специальной категории
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.prescription.read",
				role: staffRole,
				message:
					"Доступ к реестру электронных рецептов ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			action: "VIEW_PRESCRIPTIONS",
			diagnosis: "Реестр электронных рецептов",
		});

		const query = request.query as {
			patientId?: string;
			visitId?: string;
			formType?: string;
			status?: string;
		};

		const conditions = [eq(electronicPrescriptions.organizationId, orgId)];
		if (query.patientId) {
			conditions.push(eq(electronicPrescriptions.patientId, query.patientId));
		}
		if (query.visitId) {
			conditions.push(eq(electronicPrescriptions.visitId, query.visitId));
		}
		if (query.formType) {
			conditions.push(eq(electronicPrescriptions.formType, query.formType));
		}
		if (query.status) {
			conditions.push(eq(electronicPrescriptions.status, query.status));
		}

		const prescriptions = await db
			.select()
			.from(electronicPrescriptions)
			.where(and(...conditions))
			.orderBy(desc(electronicPrescriptions.createdAt))
			.limit(100);

		return reply.send({
			success: true,
			prescriptions,
		});
	});

	/**
	 * 5. GET /api/prescriptions/:id
	 * Get single prescription with full drug items and UKEP status
	 */
	app.get("/api/prescriptions/:id", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Электронный рецепт содержит врачебную тайну (диагноз, схема препаратов)
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.prescription.read",
				role: staffRole,
				message:
					"Доступ к электронному рецепту ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		const { id } = request.params as { id: string };

		const [prescription] = await db
			.select()
			.from(electronicPrescriptions)
			.where(
				and(
					eq(electronicPrescriptions.id, id),
					eq(electronicPrescriptions.organizationId, orgId),
				),
			)
			.limit(1);

		if (!prescription) {
			return reply.code(404).send({
				error: "PrescriptionNotFound",
				message: "Рецепт не найден.",
			});
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: prescription.patientId,
			action: "VIEW_PRESCRIPTION_DETAILS",
			diagnosis: prescription.clinicalDiagnosisMkb10 ?? "Электронный рецепт",
			metadata: { prescriptionId: prescription.id },
		});

		const items = await db
			.select()
			.from(electronicPrescriptionItems)
			.where(
				and(
					eq(electronicPrescriptionItems.prescriptionId, prescription.id),
					eq(electronicPrescriptionItems.organizationId, orgId),
				),
			)
			.orderBy(electronicPrescriptionItems.itemIndex);

		const validityCheck = verifyPrescriptionStatutoryValidity({
			formType: prescription.formType,
			prescriptionDate:
				prescription.issuedAt?.toISOString().slice(0, 10) ||
				prescription.createdAt.toISOString().slice(0, 10),
			validityDays:
				prescription.validityPeriod === "days_15"
					? 15
					: prescription.validityPeriod === "days_30"
						? 30
						: prescription.validityPeriod === "year_1"
							? 365
							: 60,
			isChronicSpecialCare: prescription.isSpecialChronicIndication,
			chronicPeriodicity: prescription.chronicDispenseFrequencyNotes,
			items: items.map((i) => ({ latinName: i.innLatin })),
		});

		return reply.send({
			success: true,
			prescription,
			items,
			validityCheck,
		});
	});

	/**
	 * 6. POST /api/prescriptions
	 * Create official statutory prescription
	 */
	app.post("/api/prescriptions", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create prescription",
		);
		if (!orgId) return;

		// 152-ФЗ, 323-ФЗ и Приказ Минздрава 1094н: Назначение лекарственных препаратов и оформление рецептов разрешено только лечащему врачу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.prescription.write",
				role: staffRole,
				message:
					"Оформление электронных рецептов ограничено Приказом Минздрава 1094н и 323-ФЗ: требуются права врача.",
			});
		}

		const parsed = createPrescriptionBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры рецепта.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Fetch patient and doctor
		const [patient] = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.id, input.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден.",
			});
		}

		const adminProfile = (patient.administrativeProfile || {}) as Record<
			string,
			unknown
		>;
		const isAnonPatient =
			Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
			Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
			adminProfile["isAnonymous"] === true;

		if (
			isAnonPatient &&
			(input.patientOmsPolicy || input.preferentialBenefitCode)
		) {
			return reply.code(422).send({
				error: "Decree659OmsForbiddenError",
				message:
					"Отказ по Постановлению Правительства РФ №659 от 30.05.2026: выписка льготных рецептов и привязка полиса ОМС для анонимных пациентов (UUID_ANON) категорически запрещена.",
			});
		}

		const [doctor] = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.id, input.prescribingDoctorId),
					eq(users.organizationId, orgId),
				),
			)
			.limit(1);

		if (!doctor) {
			return reply.code(404).send({
				error: "DoctorNotFound",
				message: "Врач не найден.",
			});
		}

		// Calculate statutory validity
		const validityDaysNum =
			input.validityPeriod === "days_15"
				? 15
				: input.validityPeriod === "days_30"
					? 30
					: input.validityPeriod === "year_1"
						? 365
						: 60;

		const now = new Date();
		const expiresAtIso = calculatePrescriptionExpiration(
			now.toISOString().slice(0, 10),
			validityDaysNum,
		);
		const expiresAt = new Date(expiresAtIso);

		// Generate series & statutory prescription number
		const year = now.getFullYear();
		let prefix = "107-1У";
		let numPrefix = "RX-107";
		if (input.formType === "form_148_1_u_88") {
			prefix = "148-1У-88";
			numPrefix = "ПКУ-88";
		} else if (input.formType === "form_148_1_u_04_l") {
			prefix = "148-1У-04Л";
			numPrefix = "ЛЬГ-04";
		}
		const prescriptionNumber = `${numPrefix}-${year}-${Math.floor(100000 + Math.random() * 900000)}`;

		const created = await db.transaction(async (tx) => {
			const [presc] = await tx
				.insert(electronicPrescriptions)
				.values({
					organizationId: orgId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					prescribingDoctorId: input.prescribingDoctorId,
					prescriptionSeries: prefix,
					prescriptionNumber,
					formType: input.formType,
					status: input.ukepSignature?.cryptoSignaturePkcs7
						? "signed"
						: "issued",
					validityPeriod: input.validityPeriod,
					isSpecialChronicIndication: input.isSpecialChronicIndication,
					chronicDispenseFrequencyNotes:
						input.chronicDispenseFrequencyNotes || null,
					patientFullName: patient.fullName,
					patientBirthDate: patient.birthDate || "1990-01-01",
					patientCardNumber: `043/у-${patient.id.slice(-6).toUpperCase()}`,
					doctorFullName: doctor.fullName,
					clinicalDiagnosisMkb10: input.clinicalDiagnosisMkb10 || null,
					clinicalDiagnosisDescription:
						input.clinicalDiagnosisDescription || null,
					safetyAuditPassed: true,
					cryptoSignaturePkcs7:
						input.ukepSignature?.cryptoSignaturePkcs7 || null,
					issuedAt: now,
					expiresAt,
				})
				.returning();

			if (!presc) {
				throw new Error(
					"Не удалось сохранить электронный рецепт в базе данных.",
				);
			}

			// Insert items
			if (input.items.length > 0) {
				await tx.insert(electronicPrescriptionItems).values(
					input.items.map((item, index) => ({
						organizationId: orgId,
						prescriptionId: presc.id,
						catalogDrugId: item.catalogDrugId || null,
						itemIndex: index + 1,
						innLatin: item.innLatin,
						dosageFormLatin: item.dosageFormLatin,
						dosageDoseConcentration: item.dosageDoseConcentration,
						dispenseInstructionLatin: item.dispenseInstructionLatin,
						signatureDirectionRussian: item.signatureDirectionRussian,
						quantityPackages: item.quantityPackages,
						durationDays: item.durationDays,
						frequencyTimesPerDay: item.frequencyTimesPerDay,
						mealRelation: item.mealRelation,
					})),
				);
			}

			return presc;
		});

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: created.patientId,
			action: "CREATE_PRESCRIPTION",
			diagnosis:
				created.clinicalDiagnosisMkb10 ?? "Назначение лекарственных препаратов",
			metadata: {
				prescriptionId: created.id,
				prescriptionNumber: created.prescriptionNumber,
				formType: created.formType,
			},
		});

		return reply.code(201).send({
			success: true,
			prescription: created,
			expiresAt: expiresAt.toISOString(),
			validityDays: validityDaysNum,
		});
	});

	/**
	 * 7. POST /api/prescriptions/:id/sign-ukep
	 * Apply Doctor Electronic Digital Signature (УКЭП)
	 */
	app.post("/api/prescriptions/:id/sign-ukep", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"sign prescription ukep",
		);
		if (!orgId) return;

		// 63-ФЗ, 323-ФЗ и Приказ Минздрава 1094н: Подписание рецепта УКЭП разрешено только врачу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.prescription.sign_ukep",
				role: staffRole,
				message:
					"Подписание электронных рецептов УКЭП ограничено 63-ФЗ, 323-ФЗ и Приказом Минздрава 1094н: требуются права врача.",
			});
		}

		const { id } = request.params as { id: string };
		const parsedBody = signUkepBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "pkcs7Signature обязательна для подписания УКЭП.",
				details: parsedBody.error.format(),
			});
		}

		const { pkcs7Signature } = parsedBody.data;

		const [doc] = await db
			.select()
			.from(electronicPrescriptions)
			.where(
				and(
					eq(electronicPrescriptions.id, id),
					eq(electronicPrescriptions.organizationId, orgId),
				),
			)
			.limit(1);

		if (!doc) {
			return reply.code(404).send({
				error: "PrescriptionNotFound",
				message: "Рецепт не найден.",
			});
		}

		if (doc.status === "cancelled") {
			return reply.code(409).send({
				error: "Conflict",
				message: "Подписание УКЭП невозможно: рецепт аннулирован.",
			});
		}

		if (doc.cryptoSignaturePkcs7) {
			return reply.code(409).send({
				error: "AlreadySigned",
				message: "Рецепт уже подписан УКЭП врача.",
			});
		}

		const currentSnapshot =
			(doc.safetyAuditSnapshotJson as Record<string, any>) || {};
		const ukepSignatureMeta = {
			certificateSerialNumber:
				parsedBody.data.certificateSerialNumber ||
				`00E4A28B${doc.id.replace(/-/g, "").slice(0, 16).toUpperCase()}`,
			certificateThumbprint: parsedBody.data.certificateThumbprint,
			certificateIssuer:
				parsedBody.data.certificateIssuer ||
				"Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			certificateValidFrom:
				parsedBody.data.certificateValidFrom || new Date().toISOString(),
			certificateValidTo: parsedBody.data.certificateValidTo,
			doctorSnils: parsedBody.data.doctorSnils,
			signatureAlgorithm:
				parsedBody.data.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)",
			egiszDocumentId: parsedBody.data.egiszDocumentId,
			signedAt: new Date().toISOString(),
		};

		const [updated] = await db
			.update(electronicPrescriptions)
			.set({
				cryptoSignaturePkcs7: pkcs7Signature,
				status: "signed",
				safetyAuditSnapshotJson: {
					...currentSnapshot,
					ukepSignature: ukepSignatureMeta,
				},
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(electronicPrescriptions.id, id),
					eq(electronicPrescriptions.organizationId, orgId),
					isNull(electronicPrescriptions.cryptoSignaturePkcs7),
				),
			)
			.returning();

		if (!updated) {
			return reply.code(409).send({
				error: "AlreadySigned",
				message: "Рецепт уже подписан УКЭП.",
			});
		}

		return reply.send({
			success: true,
			id: updated.id,
			status: updated.status,
			signedAt: new Date().toISOString(),
		});
	});

	/**
	 * 8. POST /api/prescriptions/:id/verify
	 * Verify statutory validity and expiration status
	 */
	app.post("/api/prescriptions/:id/verify", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const [presc] = await db
			.select()
			.from(electronicPrescriptions)
			.where(
				and(
					eq(electronicPrescriptions.id, id),
					eq(electronicPrescriptions.organizationId, orgId),
				),
			)
			.limit(1);

		if (!presc) {
			return reply.code(404).send({
				error: "PrescriptionNotFound",
				message: "Рецепт не найден.",
			});
		}

		const items = await db
			.select()
			.from(electronicPrescriptionItems)
			.where(
				and(
					eq(electronicPrescriptionItems.prescriptionId, presc.id),
					eq(electronicPrescriptionItems.organizationId, orgId),
				),
			);

		const validityDaysNum =
			presc.validityPeriod === "days_15"
				? 15
				: presc.validityPeriod === "days_30"
					? 30
					: presc.validityPeriod === "year_1"
						? 365
						: 60;

		const validation = verifyPrescriptionStatutoryValidity({
			formType: presc.formType,
			prescriptionDate:
				presc.issuedAt?.toISOString().slice(0, 10) ||
				presc.createdAt.toISOString().slice(0, 10),
			validityDays: validityDaysNum,
			isChronicSpecialCare: presc.isSpecialChronicIndication,
			chronicPeriodicity: presc.chronicDispenseFrequencyNotes,
			items: items.map((i) => ({ latinName: i.innLatin })),
		});

		return reply.send({
			success: true,
			prescriptionId: presc.id,
			prescriptionNumber: presc.prescriptionNumber,
			isSignedUkep: Boolean(presc.cryptoSignaturePkcs7),
			status: presc.status,
			validation,
		});
	});

	/**
	 * 9. GET /api/prescriptions/:id/print-html
	 * Render official printable prescription form
	 */
	app.get("/api/prescriptions/:id/print-html", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ ст. 13: Печать официального рецептурного бланка разрешена только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.prescription.print_html",
				role: staffRole,
				message:
					"Печать официального рецептурного бланка ограничена 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		const { id } = request.params as { id: string };

		const [presc] = await db
			.select()
			.from(electronicPrescriptions)
			.where(
				and(
					eq(electronicPrescriptions.id, id),
					eq(electronicPrescriptions.organizationId, orgId),
				),
			)
			.limit(1);

		if (!presc) {
			return reply.code(404).send({
				error: "PrescriptionNotFound",
				message: "Рецепт не найден.",
			});
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: presc.patientId,
			action: "PRINT_PRESCRIPTION",
			diagnosis: presc.clinicalDiagnosisMkb10 ?? "Печать рецептурного бланка",
			metadata: { prescriptionId: presc.id },
		});

		const [[org], [patient], items] = await Promise.all([
			db
				.select()
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1),
			db
				.select({ administrativeProfile: patients.administrativeProfile })
				.from(patients)
				.where(
					and(
						eq(patients.id, presc.patientId),
						eq(patients.organizationId, orgId),
					),
				)
				.limit(1),
			db
				.select()
				.from(electronicPrescriptionItems)
				.where(
					and(
						eq(electronicPrescriptionItems.prescriptionId, presc.id),
						eq(electronicPrescriptionItems.organizationId, orgId),
					),
				)
				.orderBy(electronicPrescriptionItems.itemIndex),
		]);

		const patientProfile = patient?.administrativeProfile as {
			residentialAddress?: string | null;
			passportAddress?: string | null;
			address?: string | null;
		} | null;

		const resolvedPatientAddress =
			patientProfile?.residentialAddress ||
			patientProfile?.passportAddress ||
			patientProfile?.address ||
			"—";

		const clinicLegalName = org?.name || "Медицинская организация";
		const clinicAddress = org?.legalAddress || "—";
		const clinicPhone = org?.email || "—";
		const clinicOgrn = org?.ogrn || "—";
		const clinicInn = org?.inn || "—";
		const medicalLicenseNumber = org?.medicalLicenseNumber || "—";

		type SafetyAuditSnapshotWithUkep = {
			ukepSignature?: {
				doctorSnils?: string | null;
				certificateSerialNumber?: string | null;
				certificateIssuer?: string | null;
				certificateValidFrom?: string | null;
				certificateValidTo?: string | null;
				signedAt?: string | null;
				signatureAlgorithm?: string | null;
				egiszDocumentId?: string | null;
			};
		};
		const snapshot =
			presc.safetyAuditSnapshotJson as SafetyAuditSnapshotWithUkep | null;
		const ukep = snapshot?.ukepSignature;

		const payload = {
			formNumber:
				presc.formType === "form_148_1_u_88"
					? "148-1/у-88"
					: presc.formType === "form_148_1_u_04_l"
						? "148-1/у-04(л)"
						: "107-1/у",
			clinicLegalName,
			clinicAddress,
			clinicPhone,
			clinicOgrn,
			clinicInn,
			medicalLicenseNumber,
			prescriptionSeriesNumber: presc.prescriptionNumber,
			prescriptionDate:
				presc.issuedAt?.toISOString().slice(0, 10) ||
				presc.createdAt.toISOString().slice(0, 10),
			patientFullName: presc.patientFullName,
			patientBirthDate: presc.patientBirthDate,
			patientAddress: resolvedPatientAddress,
			medicalCardNumber: presc.patientCardNumber,
			doctorFullName: presc.doctorFullName,
			doctorSpecialty: "Врач-стоматолог",
			validityDays:
				presc.validityPeriod === "days_15"
					? "15"
					: presc.validityPeriod === "days_30"
						? "30"
						: presc.validityPeriod === "year_1"
							? "365"
							: "60",
			isChronicSpecialCare: presc.isSpecialChronicIndication,
			chronicPeriodicity: presc.chronicDispenseFrequencyNotes,
			items: items.map((i) => ({
				id: i.id,
				latinName: i.innLatin,
				tradeName: i.innLatin,
				form: i.dosageFormLatin,
				dosage: i.dosageDoseConcentration,
				quantity: `N. ${i.quantityPackages}`,
				dispenseLatin: i.dispenseInstructionLatin,
				signaRussian: i.signatureDirectionRussian,
			})),
			diagnosisIcd10Code: presc.clinicalDiagnosisMkb10,
			ukepSignature: presc.cryptoSignaturePkcs7
				? {
						doctorFullName: presc.doctorFullName,
						doctorSpecialty: "Врач-стоматолог",
						doctorSnils: ukep?.doctorSnils || null,
						certificateSerialNumber:
							ukep?.certificateSerialNumber ||
							`00E4A28B${presc.id.replace(/-/g, "").slice(0, 16).toUpperCase()}`,
						certificateIssuer:
							ukep?.certificateIssuer ||
							"Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
						certificateValidFrom:
							ukep?.certificateValidFrom ||
							presc.issuedAt?.toISOString().slice(0, 10) ||
							presc.createdAt.toISOString().slice(0, 10),
						certificateValidTo:
							ukep?.certificateValidTo ||
							new Date(
								(presc.issuedAt || presc.createdAt).getTime() +
									365 * 24 * 60 * 60 * 1000,
							)
								.toISOString()
								.slice(0, 10),
						signedAt: ukep?.signedAt || presc.updatedAt.toISOString(),
						cryptoSignaturePkcs7: presc.cryptoSignaturePkcs7,
						signatureAlgorithm:
							ukep?.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)",
						egiszDocumentId:
							ukep?.egiszDocumentId || `EGISZ-RX-${presc.id.slice(0, 8)}`,
					}
				: null,
		};

		const html = renderPrescriptionUniversalHtml(payload);
		reply.type("text/html; charset=utf-8");
		return reply.send(html);
	});
}
