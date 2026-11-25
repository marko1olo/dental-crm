import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	documentSignatures,
	generatedDocuments,
	organizations,
	patients,
	portalOtpCodes,
	users,
} from "../db/schema.js";
import { register as registerHtmlRoute } from "../routes/documents/html.js";
import { register as registerSignatureRoute } from "../routes/documents/signature.js";
import { PORTAL_TOKEN_KIND } from "../routes/portal/types.js";
import { registerPortalDocumentsRoutes } from "../routes/portal/portalDocumentsRoutes.js";
import { authTokenSecret } from "../security/authSecret.js";
import { hashCredential, signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";
import { renderDocumentHtml } from "./renderDocument.js";
import {
	resolveDocumentDigitalSignatureStamp,
} from "./templates/signatureRenderUtils.js";
import {
	applySignatureStampIfSigned,
} from "../routes/documents/sharedDocUtils/archiveAndPdfRenderer.js";
import {
	createTestClinicProfile,
	createTestGeneratedDocument,
	createTestPatient,
} from "./testDocumentFixtures.js";

const mockPatient: Patient = createTestPatient({
	id: "pat-domain21-001",
	organizationId: "org-test-01",
	fullName: "Иванов Иван Иванович",
	phone: "+7 999 111-22-33",
	birthDate: "1990-05-15",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	status: "active",
});

const renderContext = {
	clinicProfile: createTestClinicProfile({
		legalName: 'ООО "ДЕНТЕ КЛИНИКА"',
		inn: "7701234567",
		kpp: "770101001",
		ogrn: "1237700000000",
		address: "г. Москва, ул. Ленина, д. 10",
		phone: "+7 495 123-45-67",
	}),
	branch: null,
	staff: [],
	priceList: [],
	visits: [],
	patientDiscounts: [],
	origin: "http://127.0.0.1:4100",
};

describe("Red Team Domain 21: Watermark & Simple Electronic Signature (ПЭП 63-ФЗ)", () => {
	it("накладывает полупрозрачный водяной знак 'ЧЕРНОВИК' на документ со статусом draft", () => {
		const draftDoc: GeneratedDocument = createTestGeneratedDocument({
			id: "doc-draft-0000-0000-000000000001",
			organizationId: "org-test-01",
			patientId: mockPatient.id,
			visitId: null,
			kind: "informed_consent",
			status: "draft",
			title: "Информированное добровольное согласие",
			issuedAt: null,
		});

		const html = renderDocumentHtml(draftDoc, mockPatient, renderContext);
		assert.ok(html.includes('<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'), "HTML должен содержать водяной знак ЧЕРНОВИК");
		assert.ok(html.includes(".watermark-draft"), "CSS должен содержать стили .watermark-draft");
		assert.ok(!html.includes('<div class="watermark-signed"'), "В черновике не должно быть тега водяного знака ПОДПИСАНО ВРАЧОМ");
	});

	it("накладывает водяной знак 'ПОДПИСАНО ВРАЧОМ' на выданный документ со статусом issued", () => {
		const issuedDoc: GeneratedDocument = createTestGeneratedDocument({
			id: "doc-issued-0000-0000-000000000002",
			organizationId: "org-test-01",
			patientId: mockPatient.id,
			visitId: null,
			kind: "informed_consent",
			status: "issued",
			title: "Информированное добровольное согласие",
			issuedAt: "2026-11-22T08:30:00.000Z",
		});

		const html = renderDocumentHtml(issuedDoc, mockPatient, renderContext);
		assert.ok(html.includes('<div class="watermark-signed" aria-hidden="true">ПОДПИСАНО ВРАЧОМ</div>'), "HTML должен содержать водяной знак ПОДПИСАНО ВРАЧОМ");
		assert.ok(html.includes(".watermark-signed"), "CSS должен содержать стили .watermark-signed");
		assert.ok(!html.includes('<div class="watermark-draft"'), "В выданном документе не должно быть тега водяного знака ЧЕРНОВИК");
	});

	it("формирует официальный штамп ПЭП по 63-ФЗ при attestation mode 'simple_electronic_signature'", () => {
		const pepDoc: GeneratedDocument = createTestGeneratedDocument({
			id: "doc-pep-0000-0000-000000000003",
			organizationId: "org-test-01",
			patientId: mockPatient.id,
			visitId: null,
			kind: "treatment_plan",
			status: "issued",
			title: "План лечения",
			issuedAt: "2026-11-22T09:00:00.000Z",
			signatureAttestation: {
				mode: "simple_electronic_signature",
				signedAt: "2026-11-22 09:00:00",
				recipientFullName: "Иванов И.И.",
				recipientRole: "пациент",
				staffFullName: "Смирнова А.В.",
				staffRole: "врач",
				identityChecked: true,
				documentOpenedAndChecked: true,
				recipientSigned: true,
				clinicRepresentativeSigned: true,
			},
		});

		const stampHtml = resolveDocumentDigitalSignatureStamp(pepDoc, renderContext.clinicProfile);
		assert.ok(stampHtml, "Штамп ПЭП должен быть сгенерирован");
		assert.ok(stampHtml.includes("gost-stamp-simple"), "Штамп должен иметь класс gost-stamp-simple");
		assert.ok(stampHtml.includes("ДОКУМЕНТ ПОДПИСАН ВРАЧОМ"), "Заголовок штампа ПЭП");
		assert.ok(stampHtml.includes("ПРОСТАЯ ЭЛЕКТРОННАЯ ПОДПИСЬ (ПЭП)"), "Тип подписи по 63-ФЗ");
		assert.ok(stampHtml.includes("ПЭП-DOC-PEP-"), "Серийный номер/идентификатор ПЭП");
		assert.ok(stampHtml.includes("Смирнова А.В."), "Врач-подписант должен отображаться в штампе");

		// Проверяем также инжекцию через applySignatureStampIfSigned
		const rawHtml = "<html><body><h1>План лечения</h1><section class=\"signature-column signature-right\"><p class=\"signature-line\">Подпись: ___</p></section></body></html>";
		const stampedHtml = applySignatureStampIfSigned(pepDoc, rawHtml);
		assert.ok(stampedHtml.includes("gost-stamp-simple"), "Штамп ПЭП должен быть внедрен в HTML через applySignatureStampIfSigned");
	});

	describe("HTTP / PostgreSQL 18 BOLA, Void XSS, PEP OTP & UKEP Preservation", () => {
		const NS = "domain21RealHttp";
		const ORG_ID = fixtureUuid(NS, 1);
		const DOCTOR_ID = fixtureUuid(NS, 2);
		const ALPHA_PATIENT_ID = fixtureUuid(NS, 3);
		const BETA_PATIENT_ID = fixtureUuid(NS, 4);
		const BETA_DOC_ID = fixtureUuid(NS, 5);
		const VOIDED_DOC_ID = fixtureUuid(NS, 6);
		const DRAFT_DOC_ID = fixtureUuid(NS, 7);
		const UKEP_ISSUED_DOC_ID = fixtureUuid(NS, 8);
		const CONSENT_ID = fixtureUuid(NS, 9);

		let app: FastifyInstance;
		let dbReady = true;
		let staffHeaders: Record<string, string> = {};
		let alphaPortalHeaders: Record<string, string> = {};

		before(async () => {
			process.env.NODE_ENV = "test";
			app = createTenantTestApp();
			await registerHtmlRoute(app);
			await registerSignatureRoute(app);
			await app.register(registerPortalDocumentsRoutes, { prefix: "/api/portal" });
			await app.ready();

			const secret = authTokenSecret();
			const staffToken = signToken(
				{ userId: DOCTOR_ID, organizationId: ORG_ID, role: "doctor", fullName: "Д-р Смирнова А.В." },
				secret,
			);
			staffHeaders = {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": staffToken,
			};
			const alphaPortalToken = signToken(
				{ kind: PORTAL_TOKEN_KIND, sub: ALPHA_PATIENT_ID, organizationId: ORG_ID },
				secret,
			);
			alphaPortalHeaders = {
				authorization: `Bearer ${alphaPortalToken}`,
			};

			try {
				await purgeFixtureOrganizations([ORG_ID]);
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx
						.insert(organizations)
						.values({ id: ORG_ID, name: "Клиника Тест 21" })
						.onConflictDoUpdate({
							target: organizations.id,
							set: { name: "Клиника Тест 21" },
						});
					await tx
						.insert(users)
						.values({
							id: DOCTOR_ID,
							organizationId: ORG_ID,
							fullName: "Д-р Смирнова А.В.",
							role: "doctor",
							isActive: true,
						})
						.onConflictDoUpdate({
							target: users.id,
							set: {
								organizationId: ORG_ID,
								fullName: "Д-р Смирнова А.В.",
								role: "doctor",
								isActive: true,
							},
						});
					await tx
						.insert(patients)
						.values([
							{
								id: ALPHA_PATIENT_ID,
								organizationId: ORG_ID,
								fullName: "Пациент Альфа А.А.",
								phone: "+79991110001",
							},
							{
								id: BETA_PATIENT_ID,
								organizationId: ORG_ID,
								fullName: "Пациент Бета Б.Б.",
								phone: "+79991110002",
							},
						])
						.onConflictDoUpdate({
							target: patients.id,
							set: {
								organizationId: ORG_ID,
							},
						});
					await tx
						.delete(documentSignatures)
						.where(eq(documentSignatures.organizationId, ORG_ID));
					await tx
						.delete(portalOtpCodes)
						.where(eq(portalOtpCodes.organizationId, ORG_ID));
					await tx
						.insert(generatedDocuments)
						.values([
							{
								id: BETA_DOC_ID,
								organizationId: ORG_ID,
								patientId: BETA_PATIENT_ID,
								kind: "informed_consent",
								title: "ИДС Бета",
								status: "issued",
								issuedAt: new Date(),
								issuedSnapshotSha256: "deadbeef",
								storagePath: "/tmp/nonexistent-beta.html",
							},
							{
								id: VOIDED_DOC_ID,
								organizationId: ORG_ID,
								patientId: ALPHA_PATIENT_ID,
								kind: "treatment_plan",
								title: "План аннулированный",
								status: "voided",
								voidedAt: new Date(),
								voidAttestation: {
									reasonCode: "other",
									reasonText: '<script>alert("xss")</script>',
									voidedAt: new Date().toISOString(),
									staffFullName: "Врач",
									staffRole: "doctor",
									replacementRequired: false,
									patientOrPayerNotified: false,
									archivePreserved: true,
									statusReviewed: true,
								},
							},
							{
								id: DRAFT_DOC_ID,
								organizationId: ORG_ID,
								patientId: ALPHA_PATIENT_ID,
								kind: "informed_consent",
								title: "ИДС Черновик",
								status: "draft",
							},
							{
								id: UKEP_ISSUED_DOC_ID,
								organizationId: ORG_ID,
								patientId: ALPHA_PATIENT_ID,
								kind: "informed_consent",
								title: "ИДС с УКЭП врача",
								status: "issued",
								issuedAt: new Date(),
								storagePath: "/archive/ukep-original.html",
								issuedSnapshotSha256: "origukephash123",
								issuedSnapshotCreatedAt: new Date("2026-01-01T00:00:00.000Z"),
								doctorSignaturePkcs7: "BASE64_UKEP_DOCTOR",
							},
						])
						.onConflictDoNothing();
				});
			} catch (err) {
				if (isDatabaseUnavailable(err)) {
					dbReady = false;
				} else {
					throw err;
				}
			}
		});

		after(async () => {
			if (app) await app.close();
			if (dbReady) await purgeFixtureOrganizations([ORG_ID]);
		});

		it("отклоняет невалидный UUID в GET /api/documents/:id/html и /api/portal/documents/:documentId/html", async () => {
			const staffRes = await app.inject({
				method: "GET",
				url: "/api/documents/not-a-uuid/html",
				headers: staffHeaders,
			});
			assert.strictEqual(staffRes.statusCode, 400);

			const portalRes = await app.inject({
				method: "GET",
				url: "/api/portal/documents/not-a-uuid/html",
				headers: alphaPortalHeaders,
			});
			assert.strictEqual(portalRes.statusCode, 400);
		});

		it("блокирует доступ портала к чужому документу (403 BOLA) и экранирует XSS в водяном знаке аннулирования", async (t) => {
			if (!dbReady) return t.skip("PostgreSQL unavailable");

			const bolaRes = await app.inject({
				method: "GET",
				url: `/api/documents/${BETA_DOC_ID}/html`,
				headers: alphaPortalHeaders,
			});
			assert.strictEqual(bolaRes.statusCode, 403);

			const xssRes = await app.inject({
				method: "GET",
				url: `/api/documents/${VOIDED_DOC_ID}/html`,
				headers: staffHeaders,
			});
			assert.strictEqual(xssRes.statusCode, 200);
			assert.ok(!xssRes.body.includes('<script>alert("xss")</script>'));
			assert.ok(xssRes.body.includes("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"));
		});

		it("блокирует хардкодный байпас '1234'/'123456' в /pep-sms/verify и не утекает devCode в /pep-sms/send", async (t) => {
			if (!dbReady) return t.skip("PostgreSQL unavailable");

			const sendRes = await app.inject({
				method: "POST",
				url: "/api/documents/pep-sms/send",
				headers: staffHeaders,
				payload: {
					patientId: ALPHA_PATIENT_ID,
					phone: "+79991110001",
				},
			});
			assert.strictEqual(sendRes.statusCode, 200);
			const sendBody = sendRes.json();
			assert.strictEqual(sendBody.success, true);
			assert.strictEqual("devCode" in sendBody, false);

			const bypassRes = await app.inject({
				method: "POST",
				url: "/api/documents/pep-sms/verify",
				headers: staffHeaders,
				payload: {
					patientId: ALPHA_PATIENT_ID,
					phone: "+79991110001",
					code: "1234",
				},
			});
			assert.strictEqual(bypassRes.statusCode, 400);
		});

		it("подписывает черновик без дубля в document_signatures, проверяет OTP и сохраняет УКЭП-архив при последующей ПЭП", async (t) => {
			if (!dbReady) return t.skip("PostgreSQL unavailable");

			const otpPlain = "654321";
			const otpHash = await hashCredential(otpPlain);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.update(portalOtpCodes)
					.set({ consumedAt: new Date() })
					.where(and(eq(portalOtpCodes.organizationId, ORG_ID), eq(portalOtpCodes.patientId, ALPHA_PATIENT_ID)));
				await tx.insert(portalOtpCodes).values({
					organizationId: ORG_ID,
					patientId: ALPHA_PATIENT_ID,
					phone: "79991110001",
					codeHash: otpHash,
					channel: "sms",
					deliveryStatus: "sent",
					expiresAt: new Date(Date.now() + 180_000),
				});
			});

			// 1. Подписание черновика через pep_sms с реальным OTP -> ровно 1 строка в document_signatures
			const draftSignRes = await app.inject({
				method: "POST",
				url: `/api/documents/${DRAFT_DOC_ID}/signature`,
				headers: staffHeaders,
				payload: {
					signatureSvg: "<svg><path d='M0 0 L10 10'/></svg>",
					mode: "pep_sms",
					pepCode: otpPlain,
				},
			});
			assert.strictEqual(draftSignRes.statusCode, 200);

			const sigRows = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(documentSignatures)
					.where(and(eq(documentSignatures.organizationId, ORG_ID), eq(documentSignatures.documentId, DRAFT_DOC_ID))),
			);
			assert.strictEqual(sigRows.length, 1);

			// Повторное использование того же OTP отклоняется (anti-replay)
			const replayRes = await app.inject({
				method: "POST",
				url: `/api/documents/${UKEP_ISSUED_DOC_ID}/signature`,
				headers: staffHeaders,
				payload: {
					signatureSvg: "<svg><path d='M0 0'/></svg>",
					mode: "pep_sms",
					pepCode: otpPlain,
				},
			});
			assert.strictEqual(replayRes.statusCode, 400);

			// 2. Последующее ПЭП поверх УКЭП-документа сохраняет storagePath / issuedSnapshotSha256
			const ukepPepRes = await app.inject({
				method: "POST",
				url: `/api/documents/${UKEP_ISSUED_DOC_ID}/signature`,
				headers: staffHeaders,
				payload: {
					signatureSvg: "<svg><path d='M1 1 L9 9'/></svg>",
					mode: "simple_electronic_signature",
				},
			});
			assert.strictEqual(ukepPepRes.statusCode, 200);

			const [ukepDocAfter] = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(generatedDocuments)
					.where(and(eq(generatedDocuments.organizationId, ORG_ID), eq(generatedDocuments.id, UKEP_ISSUED_DOC_ID))),
			);
			assert.ok(ukepDocAfter);
			assert.strictEqual(ukepDocAfter.storagePath, "/archive/ukep-original.html");
			assert.strictEqual(ukepDocAfter.issuedSnapshotSha256, "origukephash123");

			// 3. Портал /consents/:id/sign отклоняет невалидный signatureMethod и пустой pepCode для sms_otp
			const badMethodRes = await app.inject({
				method: "POST",
				url: `/api/portal/consents/${CONSENT_ID}/sign`,
				headers: alphaPortalHeaders,
				payload: { signatureMethod: "unknown_hack_method" },
			});
			assert.strictEqual(badMethodRes.statusCode, 400);

			const emptyOtpRes = await app.inject({
				method: "POST",
				url: `/api/portal/consents/${CONSENT_ID}/sign`,
				headers: alphaPortalHeaders,
				payload: { signatureMethod: "sms_otp", pepCode: "" },
			});
			assert.strictEqual(emptyOtpRes.statusCode, 400);

			const latestOtp = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(portalOtpCodes)
					.where(eq(portalOtpCodes.patientId, ALPHA_PATIENT_ID))
					.orderBy(desc(portalOtpCodes.createdAt))
					.limit(1),
			);
			assert.ok(latestOtp.length > 0);
		});
	});
});
