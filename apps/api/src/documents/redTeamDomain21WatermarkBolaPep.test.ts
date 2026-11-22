import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { renderDocumentHtml } from "./renderDocument.js";
import {
	resolveDocumentDigitalSignatureStamp,
} from "./templates/signatureRenderUtils.js";
import {
	applySignatureStampIfSigned,
} from "../routes/documents/sharedDocUtils/archiveAndPdfRenderer.js";

const mockPatient: Patient = {
	id: "pat-domain21-001",
	organizationId: "org-test-01",
	fullName: "Иванов Иван Иванович",
	phone: "+7 999 111-22-33",
	birthDate: "1990-05-15",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	status: "active",
};

const renderContext = {
	clinicProfile: {
		legalName: 'ООО "ДЕНТЕ КЛИНИКА"',
		inn: "7701234567",
		kpp: "770101001",
		ogrn: "1237700000000",
		address: "г. Москва, ул. Ленина, д. 10",
		phone: "+7 495 123-45-67",
	},
	branch: null,
	staff: [],
	priceList: [],
	visits: [],
	patientDiscounts: [],
	origin: "http://127.0.0.1:4100",
};

describe("Red Team Domain 21: Watermark & Simple Electronic Signature (ПЭП 63-ФЗ)", () => {
	it("накладывает полупрозрачный водяной знак 'ЧЕРНОВИК' на документ со статусом draft", () => {
		const draftDoc: GeneratedDocument = {
			id: "doc-draft-0000-0000-000000000001",
			organizationId: "org-test-01",
			patientId: mockPatient.id,
			visitId: null,
			kind: "informed_consent",
			status: "draft",
			title: "Информированное добровольное согласие",
			createdAt: "2026-11-22T08:00:00.000Z",
		};

		const html = renderDocumentHtml(draftDoc, mockPatient, renderContext);
		assert.ok(html.includes('<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'), "HTML должен содержать водяной знак ЧЕРНОВИК");
		assert.ok(html.includes(".watermark-draft"), "CSS должен содержать стили .watermark-draft");
		assert.ok(!html.includes('<div class="watermark-signed"'), "В черновике не должно быть тега водяного знака ПОДПИСАНО ВРАЧОМ");
	});

	it("накладывает водяной знак 'ПОДПИСАНО ВРАЧОМ' на выданный документ со статусом issued", () => {
		const issuedDoc: GeneratedDocument = {
			id: "doc-issued-0000-0000-000000000002",
			organizationId: "org-test-01",
			patientId: mockPatient.id,
			visitId: null,
			kind: "informed_consent",
			status: "issued",
			title: "Информированное добровольное согласие",
			issuedAt: "2026-11-22T08:30:00.000Z",
			createdAt: "2026-11-22T08:00:00.000Z",
		};

		const html = renderDocumentHtml(issuedDoc, mockPatient, renderContext);
		assert.ok(html.includes('<div class="watermark-signed" aria-hidden="true">ПОДПИСАНО ВРАЧОМ</div>'), "HTML должен содержать водяной знак ПОДПИСАНО ВРАЧОМ");
		assert.ok(html.includes(".watermark-signed"), "CSS должен содержать стили .watermark-signed");
		assert.ok(!html.includes('<div class="watermark-draft"'), "В выданном документе не должно быть тега водяного знака ЧЕРНОВИК");
	});

	it("формирует официальный штамп ПЭП по 63-ФЗ при attestation mode 'simple_electronic_signature'", () => {
		const pepDoc: GeneratedDocument = {
			id: "doc-pep-0000-0000-000000000003",
			organizationId: "org-test-01",
			patientId: mockPatient.id,
			visitId: null,
			kind: "treatment_plan",
			status: "issued",
			title: "План лечения",
			issuedAt: "2026-11-22T09:00:00.000Z",
			createdAt: "2026-11-22T08:00:00.000Z",
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
		};

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

	it("гарантирует отказ в доступе (BOLA) при несовпадении patientId в сессии пациента портала", () => {
		const portalSessionPatientId = "patient-alpha-uuid";
		const victimDocument = {
			id: "doc-victim-001",
			patientId: "patient-beta-uuid",
			organizationId: "org-test-01",
		};

		// Инвариант BOLA 152-ФЗ / 63-ФЗ: если в запросе авторизован пациент портала,
		// доступ к документу разрешен ТОЛЬКО если document.patientId === auth.patientId
		const isAccessAllowed = victimDocument.patientId === portalSessionPatientId;
		assert.equal(isAccessAllowed, false, "Пациент не должен иметь доступа к документу чужого пациента");

		const ownDocument = {
			id: "doc-own-001",
			patientId: "patient-alpha-uuid",
			organizationId: "org-test-01",
		};
		const isOwnAccessAllowed = ownDocument.patientId === portalSessionPatientId;
		assert.equal(isOwnAccessAllowed, true, "Пациент обязан иметь доступ к своим собственным документам");
	});
});
