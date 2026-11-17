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
	generatedDocuments,
	patientConsents,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../db/schema.js";
import { verifyOtpCode } from "../treatmentPlan/pep/pepOtpService.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import { DEFAULT_PORTAL_CONSENTS_CATALOG } from "./portalConsentsData.js";
import { generateSha256Hex } from "./portalUtils.js";
import {
	type SelectTierBody,
} from "./types.js";
import { isValidUuid } from "@dental/shared";

export async function registerPortalDocumentsRoutes(server: FastifyInstance): Promise<void> {
	// 4. View Document HTML (Protected)
	server.get<{ Params: { documentId: string } }>(
		"/documents/:documentId/html",
		async (request, reply) => {
			const auth = extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}
			const patientId = auth.patientId;
			const organizationId = auth.organizationId;

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

			const mergedConsents = DEFAULT_PORTAL_CONSENTS_CATALOG.map((cat) => {
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
			pepCode?: unknown;
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

		const pepCode =
			typeof request.body?.pepCode === "string" ? request.body.pepCode.trim() : "";

		// Верификация проверочного кода при подписании через SMS-OTP
		if (signatureMethod === "sms_otp" && pepCode) {
			const isCodeValid = await verifyOtpCode(consentId, pepCode, auth.organizationId, auth.patientId);
			if (!isCodeValid) {
				reply.status(400);
				return {
					error: "InvalidPepCode",
					message: "Неверный или истёкший проверочный код из SMS.",
				};
			}
		}

		const signatureSvg =
			typeof request.body?.signatureSvg === "string"
				? request.body.signatureSvg.trim()
				: "";

		let effectiveSignatureSvg = signatureSvg;
		if (!effectiveSignatureSvg) {
			if (signatureMethod === "paper_physical") {
				effectiveSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f8fafc" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">ПОДПИСАНО НА БУМАГЕ</text><text x="160" y="52" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">Оригинал хранится в медицинской карте клиники</text></svg>`;
			} else {
				effectiveSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ЭЛЕКТРОННАЯ ПОДПИСЬ ПАЦИЕНТА</text><text x="160" y="52" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Подтверждено в личном кабинете пациента</text></svg>`;
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

			// Физическая генерация официального бланка согласия в таблице generated_documents
			const normalizedKind = consentId.toLowerCase();
			let docKind:
				| "informed_consent"
				| "anesthesia_consent_log"
				| "personal_data_processing_consent"
				| "procedure_specific_consent_packet" = "informed_consent";
			let docTitle = "Информированное добровольное согласие на стоматологическое лечение (ст. 20 № 323-ФЗ)";

			if (normalizedKind.includes("anest") || normalizedKind.includes("анест")) {
				docKind = "anesthesia_consent_log";
				docTitle = "Информированное добровольное согласие на местное обезболивание";
			} else if (
				normalizedKind.includes("pd") ||
				normalizedKind.includes("пдн") ||
				normalizedKind.includes("152")
			) {
				docKind = "personal_data_processing_consent";
				docTitle = "Согласие на обработку персональных данных (152-ФЗ)";
			} else if (normalizedKind.includes("packet") || normalizedKind.includes("пакет")) {
				docKind = "procedure_specific_consent_packet";
				docTitle = "Пакет информированных добровольных согласий на медицинские вмешательства";
			}

			const [createdDoc] = await db
				.insert(generatedDocuments)
				.values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					kind: docKind,
					status: "issued",
					title: docTitle,
					signatureSvg: effectiveSignatureSvg,
					issuedSnapshotSha256: integrityHash,
					issuedAt: now,
					issuedSnapshotCreatedAt: now,
					payloadJson: JSON.stringify({
						consentId,
						signatureMethod,
						clientIp,
						integrityHash,
						signedAtIso,
					}),
				})
				.returning({ id: generatedDocuments.id });

			const generatedDocId = createdDoc?.id ?? null;

			// Update or insert patient consent record with link to generated_documents
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
					.set({ grantedAt: now, revokedAt: null, documentId: generatedDocId })
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
					documentId: generatedDocId,
				});
			}

			// Update administrative profile with signature audit
			const currentProfile = patientRow.administrativeProfile ?? {};
			const currentConsentAudit =
				(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};

			const updatedAudit: Record<string, unknown> = {
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
					},
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
				documentId: generatedDocId,
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

			if (dbPlans.length === 0) {
				// [POR-06] Честный пустой стейт (Empty State): никаких хардкодов Straumann на 540 000 ₽!
				return {
					plans: [],
					threeTierModel: null,
				};
			}

			const planIds = dbPlans.map((p) => p.id);
			const planItems = await db
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.organizationId, auth.organizationId),
						inArray(treatmentPlanItemsNew.planId, planIds),
					),
				);

			// [DEF-PORTAL-03] Ликвидация потёмкинских наценок (* 0.8 и * 1.4).
			// Если доктор завел реальные альтернативы в БД (ст. 20 323-ФЗ) — отдаем их честно.
			// Если у пациента один утвержденный план — отдаем его как канонический план лечения с реальной стоимостью без фальшивых коэффициентов.
			const hasRealAlternatives = dbPlans.some((p) => p.isAlternative || p.alternativeTier);

			const basicPlan = dbPlans.find((p) => p.alternativeTier === "basic");
			const standardPlan =
				dbPlans.find((p) => p.alternativeTier === "standard" || (!p.alternativeTier && !p.isAlternative)) ||
				dbPlans[0];
			const premiumPlan = dbPlans.find((p) => p.alternativeTier === "premium");

			const getPlanStages = (targetPlanId?: string) => {
				const items = targetPlanId
					? planItems.filter((it) => it.planId === targetPlanId)
					: planItems;
				return items.map((it, idx) => {
					const separatorIndex = (it.priceId ?? "").indexOf("::");
					const titleRu =
						separatorIndex >= 0
							? it.priceId.slice(separatorIndex + 2) || "Лечебная процедура"
							: it.priceId || "Лечебная процедура";
					const rawPrice =
						Number(it.price || 0) * (it.quantity || 1) - Number(it.discount || 0);
					const costRub = Math.max(0, Math.round(rawPrice));
					return {
						id: it.id,
						orderIndex: idx + 1,
						titleRu,
						categoryRu: "Стоматология",
						teethFdi: it.toothNumber ? [String(it.toothNumber)] : [],
						costRub,
						paidRub: 0,
						remainingRub: costRub,
						status: "in_progress" as "in_progress" | "completed",
						procedures: [titleRu],
					};
				});
			};

			const standardStages = getPlanStages(standardPlan?.id);
			const standardTotalCost = standardStages.reduce((sum, s) => sum + s.costRub, 0);

			const basicStages = basicPlan ? getPlanStages(basicPlan.id) : standardStages;
			const basicTotalCost = basicPlan
				? basicStages.reduce((sum, s) => sum + s.costRub, 0)
				: standardTotalCost;

			const premiumStages = premiumPlan ? getPlanStages(premiumPlan.id) : standardStages;
			const premiumTotalCost = premiumPlan
				? premiumStages.reduce((sum, s) => sum + s.costRub, 0)
				: standardTotalCost;

			const threeTierModel = {
				selectedTier,
				isCustomAlternatives: hasRealAlternatives,
				tiers: [
					{
						tierId: "basic" as const,
						tierNameRu: basicPlan?.name || "Базовый (Эконом)",
						subtitleRu: "Функциональное восстановление базовыми материалами",
						totalCostRub: basicTotalCost,
						warrantyMonths: 12,
						durationWeeks: 4,
						benefits: [
							"Качественное восстановление современными материалами",
							"Базовая клиническая гарантия 1 год",
						],
						stages: basicStages,
					},
					{
						tierId: "standard" as const,
						tierNameRu: standardPlan?.name || "Оптимальный (Стандарт)",
						subtitleRu: "Анатомическая реставрация и расширенная гарантия",
						totalCostRub: standardTotalCost,
						warrantyMonths: 24,
						durationWeeks: 6,
						benefits: [
							"Высокоэстетичные нанокомпозиты и премиальные материалы",
							"Лечение по международным клиническим протоколам",
							"Гарантия 2 года",
						],
						stages: standardStages,
					},
					{
						tierId: "premium" as const,
						tierNameRu: premiumPlan?.name || "Премиум (VIP All-Inclusive)",
						subtitleRu: "Премиальные технологии и бессрочное сопровождение",
						totalCostRub: premiumTotalCost,
						warrantyMonths: 60,
						durationWeeks: 8,
						benefits: [
							"Премиальные биосовместимые материалы",
							"Персональный врач-куратор",
							"Расширенная гарантия 5 лет с регулярными чекапами",
						],
						stages: premiumStages,
					},
				],
			};

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
		if (!isValidUuid(planId)) {
			reply.status(400);
			return { error: "ValidationError", message: "Идентификатор плана лечения должен быть валидным UUID." };
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

			const currentProfile = patientRow.administrativeProfile ?? {};

			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						selectedTreatmentTier: tierId,
						treatmentTierSelectedAt: new Date().toISOString(),
					},
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

	// 11. Approve Treatment Plan with 63-FZ PEP Audit (Protected)
	server.post<{
		Params: { planId: string };
		Body: {
			pepCode?: string;
			selectedTier?: string;
		};
	}>("/treatment-plans/:planId/approve", async (request, reply) => {
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
		if (!isValidUuid(planId)) {
			reply.status(400);
			return { error: "ValidationError", message: "Идентификатор плана лечения должен быть валидным UUID." };
		}

		const pepCode = typeof request.body?.pepCode === "string" ? request.body.pepCode.trim() : "";
		if (!pepCode) {
			reply.status(400);
			return {
				error: "PepCodeRequired",
				message: "Для утверждения плана лечения требуется код подтверждения из SMS (ПЭП 63-ФЗ).",
			};
		}

		const isCodeValid = await verifyOtpCode(planId, pepCode, auth.organizationId, auth.patientId);
		if (!isCodeValid) {
			reply.status(400);
			return {
				error: "InvalidPepCode",
				message: "Неверный или истёкший код подтверждения ПЭП.",
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
				return { error: "PlanNotFound", message: "План лечения не найден." };
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

			// Хэш целостности согласования по 63-ФЗ
			const integrityHash = generateSha256Hex(
				[
					planId,
					auth.patientId,
					auth.organizationId,
					signedAtIso,
					clientIp,
					"63-FZ_PEP_TREATMENT_PLAN_APPROVAL",
				].join("|"),
			);

			await db
				.update(treatmentPlans)
				.set({
					status: "Approved",
					updatedAt: now,
				})
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, auth.organizationId),
					),
				);

			// Аудит согласования в профиле пациента
			const [patientRow] = await db
				.select({ administrativeProfile: patients.administrativeProfile })
				.from(patients)
				.where(and(eq(patients.id, auth.patientId), eq(patients.organizationId, auth.organizationId)))
				.limit(1);

			const currentProfile = patientRow?.administrativeProfile ?? {};
			const currentApprovals =
				((currentProfile as Record<string, unknown>).treatmentPlanApprovals as Record<string, unknown> | undefined) || {};

			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						treatmentPlanApprovals: {
							...currentApprovals,
							[planId]: {
								planId,
								status: "Approved",
								signedAtIso,
								clientIp,
								integrityHash,
								verificationMethod: "sms_otp",
								signatureLaw: "63-FZ_PEP",
								deviceMeta: request.headers["user-agent"] || "mobile_touch_device",
							},
						},
					},
					updatedAt: now,
				})
				.where(and(eq(patients.id, auth.patientId), eq(patients.organizationId, auth.organizationId)));

			return {
				success: true,
				planId,
				status: "Approved",
				approvedAt: signedAtIso,
				integrityHash,
				signatureLaw: "63-FZ",
			};
		});
	});
}
