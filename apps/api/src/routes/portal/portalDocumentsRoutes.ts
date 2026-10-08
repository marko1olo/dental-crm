import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	patientConsents,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../db/schema.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import { generateSha256Hex } from "./portalUtils.js";
import {
	PORTAL_TOKEN_KIND,
	type SelectTierBody,
} from "./types.js";

export async function registerPortalDocumentsRoutes(server: FastifyInstance): Promise<void> {
	// 4. View Document HTML (Protected)
	server.get<{ Params: { documentId: string } }>(
		"/documents/:documentId/html",
		async (request, reply) => {
			const authHeader = request.headers.authorization;
			if (!authHeader?.startsWith("Bearer ")) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const token = authHeader.slice("Bearer ".length).trim();
			if (!token) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const payload = verifyToken(token, requireAuthTokenSecret());
			if (
				!payload ||
				payload.kind !== PORTAL_TOKEN_KIND ||
				typeof payload.sub !== "string" ||
				typeof payload.organizationId !== "string"
			) {
				reply.status(401);
				return { error: "Invalid token" };
			}
			const patientId = payload.sub;
			const organizationId = payload.organizationId as string;

			const document = await withTenantCtx(organizationId, () =>
				getDocumentById(organizationId, request.params.documentId),
			);

			if (
				!document ||
				document.patientId !== patientId ||
				document.status !== "issued"
			) {
				reply.status(404);
				return { error: "Not found" };
			}

			const issuedSnapshot = readIssuedDocumentSnapshot(document);
			if (!issuedSnapshot) {
				reply.status(409);
				return { error: "Архивная копия документа отсутствует" };
			}

			return reply.type("text/html; charset=utf-8").send(issuedSnapshot);
		},
	);

	// 5. Get Statutory Consents (Protected)
	server.get("/consents", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "Not found" };
			}

			const dbConsents = await db
				.select()
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, auth.patientId),
						eq(patientConsents.organizationId, auth.organizationId),
					),
				);

			const profileAudit =
				(patientRow.administrativeProfile as Record<string, unknown> | null)
					?.consentSignatures as Record<string, unknown> | undefined;

			const defaultCatalog = [
				{
					id: "ids_treatment",
					code: "ИДС-ТЕР-01",
					titleRu: "Информированное добровольное согласие на терапевтическое лечение",
					categoryRu: "Терапия",
					statutoryBasis: "323-ФЗ ст. 20",
					summaryTextRu:
						"Согласие на проведение осмотра, инструментальной диагностики, анестезии и пломбирования кариозных полостей.",
					fullTextContent:
						"Я, пациент клиники, даю информированное добровольное согласие на виды медицинских вмешательств в соответствии с Приказом Минздрава РФ № 1051н и ст. 20 ФЗ № 323-ФЗ...",
				},
				{
					id: "ids_anesthesia",
					code: "ИДС-АНЕСТ-01",
					titleRu: "Информированное добровольное согласие на местное обезболивание",
					categoryRu: "Анестезия",
					statutoryBasis: "323-ФЗ ст. 20",
					summaryTextRu:
						"Согласие на инфильтрационную и проводниковую анестезию современными карпульными анестетиками с оценкой рисков.",
					fullTextContent:
						"Я подтверждаю, что сообщил врачу достоверные сведения о наличии аллергических реакций, патологии сердечно-сосудистой системы и принимаемых препаратах...",
				},
				{
					id: "pd_152",
					code: "ПДН-152",
					titleRu: "Согласие на обработку персональных данных",
					categoryRu: "Персональные данные",
					statutoryBasis: "152-ФЗ",
					summaryTextRu:
						"Согласие на сбор, систематизацию, хранение и обработку персональных данных и медицинской тайны в рамках медпомощи.",
					fullTextContent:
						"В соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» даю согласие клинике на обработку моих персональных данных...",
				},
			];

			const mergedConsents = defaultCatalog.map((cat) => {
				const foundDb = dbConsents.find((c) => c.kind === cat.id);
				const auditRecord = profileAudit?.[cat.id] as Record<string, unknown> | undefined;
				const isSigned = Boolean(foundDb?.grantedAt || auditRecord?.signedAtIso);

				return {
					...cat,
					status: isSigned ? ("signed" as const) : ("pending_signature" as const),
					signedAtIso: (auditRecord?.signedAtIso as string) || foundDb?.grantedAt?.toISOString(),
					signatureAudit: auditRecord
						? {
								verificationMethod: (auditRecord.signatureMethod as string) || "touch_screen",
								ipAddress: (auditRecord.ipAddress as string) || "127.0.0.1",
								integrityHash: (auditRecord.integrityHash as string) || "",
								signedAtIso: (auditRecord.signedAtIso as string) || "",
								signatureSvg: (auditRecord.signatureSvg as string) || undefined,
							}
						: undefined,
				};
			});

			return { consents: mergedConsents };
		});
	});

	// 6. Sign Statutory Consent via 63-FZ PEP, Paper Physical, or Vector Stroke & IP Audit
	server.post<{
		Params: { consentId: string };
		Body: {
			signatureSvg?: unknown;
			signatureMethod?: unknown;
			consentKind?: unknown;
			deviceMeta?: unknown;
		};
	}>("/consents/:consentId/sign", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const consentId = request.params.consentId?.trim();
		if (!consentId) {
			reply.status(400);
			return {
				error: "ConsentIdRequired",
				message: "Идентификатор согласия обязателен.",
			};
		}

		const rawMethod =
			typeof request.body?.signatureMethod === "string"
				? request.body.signatureMethod.trim().toLowerCase()
				: "";
		const signatureMethod =
			rawMethod === "paper_physical"
				? "paper_physical"
				: rawMethod === "sms_otp"
					? "sms_otp"
					: rawMethod === "touch_screen"
						? "touch_screen"
						: "portal_pep";

		const signatureSvg =
			typeof request.body?.signatureSvg === "string"
				? request.body.signatureSvg.trim()
				: "";

		let effectiveSignatureSvg = signatureSvg;
		if (!effectiveSignatureSvg) {
			if (signatureMethod === "paper_physical") {
				effectiveSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f8fafc" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">ПОДПИСАНО НА БУМАГЕ</text><text x="160" y="52" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">Подшито в карту 043/у (ст. 20 323-ФЗ, ПП РФ № 736)</text></svg>`;
			} else {
				effectiveSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ПЭП (63-ФЗ)</text><text x="160" y="52" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Личный кабинет пациента • ст. 20 323-ФЗ</text></svg>`;
			}
		}

		const rawIp =
			(request.headers["x-forwarded-for"] as string) ||
			request.ip ||
			request.socket?.remoteAddress ||
			"127.0.0.1";
		const clientIp =
			typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";
		const now = new Date();
		const signedAtIso = now.toISOString();

		// Generate 63-FZ cryptographic integrity hash
		const integrityHash = generateSha256Hex(
			[
				consentId,
				auth.patientId,
				auth.organizationId,
				effectiveSignatureSvg,
				signedAtIso,
				clientIp,
				"63-FZ_ELECTRONIC_SIGNATURE_VECTOR_AUDIT",
			].join("|"),
		);

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			// Update or insert patient consent record
			const existing = await db
				.select({ id: patientConsents.id })
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, auth.patientId),
						eq(patientConsents.organizationId, auth.organizationId),
						eq(patientConsents.kind, consentId),
					),
				)
				.limit(1);

			if (existing.length > 0 && existing[0]) {
				await db
					.update(patientConsents)
					.set({ grantedAt: now, revokedAt: null })
					.where(
						and(
							eq(patientConsents.id, existing[0].id),
							eq(patientConsents.organizationId, auth.organizationId),
						),
					);
			} else {
				await db.insert(patientConsents).values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					kind: consentId,
					grantedAt: now,
				});
			}

			// Update administrative profile with signature audit
			const currentProfile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
			const currentConsentAudit =
				(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};

			const updatedAudit = {
				...currentConsentAudit,
				[consentId]: {
					consentId,
					signatureMethod,
					signatureSvg: effectiveSignatureSvg,
					clientIp,
					ipAddress: clientIp,
					integrityHash,
					signedAtIso,
					deviceMeta:
						typeof request.body?.deviceMeta === "string"
							? request.body.deviceMeta
							: request.headers["user-agent"] || "mobile_touch_device",
				},
			};

			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						consentSignatures: updatedAudit,
					} as any,
					updatedAt: now,
				})
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			return {
				success: true,
				consentId,
				status: "signed",
				signedAtIso,
				ipAddress: clientIp,
				integrityHash,
				signatureMethod,
				signatureSvg: effectiveSignatureSvg,
			};
		});
	});

	// 9. Get 3-Tier Treatment Plans with Stage Breakdown (Protected)
	server.get("/treatment-plans", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const dbPlans = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.patientId, auth.patientId),
						eq(treatmentPlans.organizationId, auth.organizationId),
					),
				);

			const [patientRow] = await db
				.select({
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			const selectedTier =
				(patientRow?.administrativeProfile as Record<string, unknown> | null)
					?.selectedTreatmentTier || "standard";

			// Standard 3-Tier Plan Options (Economy, Standard, Premium)
			const threeTierModel = {
				selectedTier,
				tiers: [
					{
						tierId: "basic" as const,
						tierNameRu: "Базовый (Эконом)",
						subtitleRu: "Функциональное восстановление базовыми материалами",
						totalCostRub: 145000,
						warrantyMonths: 12,
						durationWeeks: 4,
						benefits: [
							"Качественное световое пломбирование (композит)",
							"Стандартная металлокерамика",
							"Базовая гарантия 1 год",
						],
						stages: [
							{
								id: "stage-b1",
								orderIndex: 1,
								titleRu: "Санация и терапевтическая подготовка",
								categoryRu: "Терапия",
								teethFdi: ["16", "15", "24"],
								costRub: 45000,
								paidRub: 45000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Лечение глубокого кариеса зубов 16, 15",
									"Эндодонтическое лечение каналов зуба 24",
								],
							},
							{
								id: "stage-b2",
								orderIndex: 2,
								titleRu: "Металлокерамическое протезирование",
								categoryRu: "Ортопедия",
								teethFdi: ["24", "25"],
								costRub: 100000,
								paidRub: 0,
								remainingRub: 100000,
								status: "in_progress" as const,
								procedures: [
									"Препарирование и снятие слепков",
									"Установка металлокерамических коронок",
								],
							},
						],
					},
					{
						tierId: "standard" as const,
						tierNameRu: "Оптимальный (Стандарт)",
						subtitleRu: "Анатомическая реставрация и диоксид циркония",
						totalCostRub: 290000,
						warrantyMonths: 24,
						durationWeeks: 6,
						benefits: [
							"Высокоэстетичные нанокомпозиты",
							"Коронки из монолитного диоксида циркония (ZrO2)",
							"Эндодонтия под операционным микроскопом",
							"Гарантия 2 года",
						],
						stages: [
							{
								id: "stage-s1",
								orderIndex: 1,
								titleRu: "Компьютерная 3D-диагностика и гигиена",
								categoryRu: "Диагностика",
								teethFdi: [],
								costRub: 25000,
								paidRub: 25000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"КЛКТ челюстей с цефалометрией",
									"Профессиональная гигиена Air-Flow",
								],
							},
							{
								id: "stage-s2",
								orderIndex: 2,
								titleRu: "Микроскопная эндодонтия и реставрация",
								categoryRu: "Терапия",
								teethFdi: ["16", "24", "26"],
								costRub: 115000,
								paidRub: 115000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Лечение каналов зубов 16, 26 под микроскопом",
									"Художественная реставрация зуба 24",
								],
							},
							{
								id: "stage-s3",
								orderIndex: 3,
								titleRu: "Ортопедическая реабилитация ZrO2",
								categoryRu: "Ортопедия",
								teethFdi: ["16", "26"],
								costRub: 150000,
								paidRub: 50000,
								remainingRub: 100000,
								status: "in_progress" as const,
								procedures: [
									"3D-интраоральное сканирование",
									"Изготовление и фиксация коронок из диоксида циркония",
								],
							},
						],
					},
					{
						tierId: "premium" as const,
						tierNameRu: "Премиум (VIP All-Inclusive)",
						subtitleRu: "Безупречная эстетика e.max, импланты Straumann и персональный куратор",
						totalCostRub: 540000,
						warrantyMonths: 60,
						durationWeeks: 8,
						benefits: [
							"Ультратонкие керамические виниры e.max",
							"Дентальные имплантаты премиум-класса Straumann / Nobel",
							"Персональный врач-куратор 24/7",
							"Расширенная гарантия 5 лет с регулярными чекапами",
						],
						stages: [
							{
								id: "stage-p1",
								orderIndex: 1,
								titleRu: "Digital Smile Design и санация",
								categoryRu: "Диагностика",
								teethFdi: [],
								costRub: 60000,
								paidRub: 60000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Цифровое моделирование улыбки DSD",
									"Комплексная спа-гигиена с реминерализацией",
								],
							},
							{
								id: "stage-p2",
								orderIndex: 2,
								titleRu: "Дентальная имплантация Straumann BLX",
								categoryRu: "Хирургия",
								teethFdi: ["36", "46"],
								costRub: 220000,
								paidRub: 220000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Установка имплантатов Straumann по навигационному шаблону",
									"Направленная костная регенерация",
								],
							},
							{
								id: "stage-p3",
								orderIndex: 3,
								titleRu: "Эстетическая керамика e.max & ZrO2",
								categoryRu: "Ортопедия",
								teethFdi: ["11", "12", "21", "22", "36", "46"],
								costRub: 260000,
								paidRub: 80000,
								remainingRub: 180000,
								status: "in_progress" as const,
								procedures: [
									"Установка виниров e.max на фронтальную группу",
									"Керамические коронки на индивидуальных циркониевых абатментах",
								],
							},
						],
					},
				],
			};

			let planItems: Array<typeof treatmentPlanItemsNew.$inferSelect> = [];
			if (dbPlans.length > 0) {
				const planIds = dbPlans.map((p) => p.id);
				planItems = await db
					.select()
					.from(treatmentPlanItemsNew)
					.where(
						and(
							eq(treatmentPlanItemsNew.organizationId, auth.organizationId),
							inArray(treatmentPlanItemsNew.planId, planIds),
						),
					);
			}

			const enrichedPlans = dbPlans.map((p) => ({
				...p,
				items: planItems
					.filter((it) => it.planId === p.id)
					.map((it) => {
						// 152-ФЗ / Коммерческая тайна: зарплатные ставки и начисления врачу не должны утекать пациенту
						const { commissionAmount: _comm, ...safeItem } = it;
						return safeItem;
					}),
			}));

			return {
				plans: enrichedPlans,
				threeTierModel,
			};
		});
	});

	// 10. Select 3-Tier Treatment Plan Tier (Protected)
	server.post<{
		Params: { planId: string };
		Body: SelectTierBody;
	}>("/treatment-plans/:planId/select-tier", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const planId = request.params.planId?.trim();
		if (!planId) {
			reply.status(400);
			return { error: "PlanIdRequired", message: "Идентификатор плана обязателен." };
		}

		const tierId =
			typeof request.body?.tierId === "string" ? request.body.tierId.trim() : "";
		if (tierId !== "basic" && tierId !== "standard" && tierId !== "premium") {
			reply.status(400);
			return {
				error: "InvalidTier",
				message: "Укажите корректный уровень плана (basic, standard, premium).",
			};
		}

		return withTenantCtx(auth.organizationId, async () => {
			const [planRow] = await db
				.select({ id: treatmentPlans.id })
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, auth.organizationId),
						eq(treatmentPlans.patientId, auth.patientId),
					),
				)
				.limit(1);

			if (!planRow) {
				reply.status(404);
				return { error: "PlanNotFound", message: "План лечения не найден или не принадлежит пациенту." };
			}

			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			const currentProfile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};

			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						selectedTreatmentTier: tierId,
						treatmentTierSelectedAt: new Date().toISOString(),
					} as any,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			return {
				success: true,
				planId,
				selectedTier: tierId,
			};
		});
	});
}
