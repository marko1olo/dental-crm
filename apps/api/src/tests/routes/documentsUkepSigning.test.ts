import assert from "node:assert";
import { describe, it } from "node:test";
import {
	buildGenuineGostCmsPkcs7Der,
	createDemonstrationGostCmsSignature,
	validateGostCmsPkcs7Signature,
	type GeneratedDocument,
} from "@dental/shared";
import {
	renderDocumentHtml,
	resolveDocumentDigitalSignatureStamp,
} from "../../documents/renderDocument.js";
import { resolveSignatureForStorage } from "../../services/clinical/DiarySigningCeremonyService.js";

describe("Document UKEP / UNEP & GOST Digital Signature Rigor", () => {
	it("resolves dynamic blue stamp only when electronically signed", () => {
		const unsignedDoc = {
			id: "doc-1111-2222-3333",
			title: "Информированное добровольное согласие",
			kind: "informed_consent",
			status: "issued",
			createdAt: "2026-09-02T10:00:00.000Z",
			signatureAttestation: {
				mode: "paper_signed",
				signedAt: "2026-09-02T10:00:00.000Z",
				recipientFullName: "Иванов И.И.",
				recipientRole: "Пациент",
				staffFullName: "Сидорова С.С.",
				staffRole: "Врач",
			},
		} as unknown as GeneratedDocument;

		// Для бумажного подписания штамп ЭП не должен генерироваться
		const stampUnsigned = resolveDocumentDigitalSignatureStamp(unsignedDoc);
		assert.strictEqual(stampUnsigned, null);

		const signedDoc = {
			...unsignedDoc,
			signatureAttestation: {
				mode: "qualified_electronic_signature",
				signedAt: "2026-09-02T10:00:00.000Z",
				recipientFullName: "Иванов И.И.",
				recipientRole: "Пациент",
				staffFullName: "Сидорова С.С.",
				staffRole: "Врач",
			},
			doctorCertSerial: "00E4A28B104429A9",
			doctorCertSubject: "Сидорова С.С.",
		} as unknown as GeneratedDocument;

		// Для УКЭП штамп формируется строго по ГОСТ Р 7.0.97-2016
		const stampSigned = resolveDocumentDigitalSignatureStamp(signedDoc);
		assert.ok(stampSigned !== null);
		assert.ok(stampSigned?.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampSigned?.includes("00E4A28B104429A9"));
		assert.ok(stampSigned?.includes("Сидорова С.С."));
	});

	it("renderDocumentHtml does NOT contain static mock 'Сертификат / Владелец / Дата в МИС ДЕНТЕ'", () => {
		const doc = {
			id: "doc-sample-123",
			title: "Информированное добровольное согласие",
			kind: "informed_consent",
			status: "draft",
			createdAt: "2026-09-02T10:00:00.000Z",
		} as unknown as GeneratedDocument;

		const patient = {
			id: "patient-1",
			fullName: "Иванов Иван Иванович",
			birthDate: "1990-01-01",
		} as any;

		const html = renderDocumentHtml(doc, patient, {});

		// Статический макет-заглушка выжжен под корень
		assert.strictEqual(
			html.includes("Сертификат / Владелец / Дата в МИС ДЕНТЕ"),
			false,
			"Статическая заглушка МИС ДЕНТЕ обнаружена в HTML!",
		);
		assert.strictEqual(
			html.includes("ukep-digital-box"),
			false,
			"Заглушечный класс ukep-digital-box обнаружен в HTML!",
		);
	});

	it("resolveSignatureForStorage strictly rejects doctor PEP (PIN code) under 63-FZ and Order 947n", async () => {
		const res = await resolveSignatureForStorage({
			pkcs7Signature: "PIN:1234",
			userId: "user-1",
			organizationId: "org-1",
		});

		assert.strictEqual(res.ok, false);
		if (!res.ok) {
			assert.strictEqual(res.code, "PepDoctorForbidden");
			assert.ok(res.message.includes("63-ФЗ"));
			assert.ok(res.message.includes("947н"));
		}
	});

	it("validates genuine GOST CMS PKCS#7 container and rejects arbitrary strings", () => {
		const genuineSig = createDemonstrationGostCmsSignature({
			documentId: "doc-1",
			documentKind: "informed_consent",
			documentHashHex: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			doctorFullName: "Смирнова Анна Викторовна",
		});

		const validRes = validateGostCmsPkcs7Signature(genuineSig.signatureBase64);
		assert.strictEqual(validRes.valid, true);

		// Произвольные строки запрещены
		const fakeRes1 = validateGostCmsPkcs7Signature("some arbitrary string");
		assert.strictEqual(fakeRes1.valid, false);

		const fakeRes2 = validateGostCmsPkcs7Signature("MIIB-test-signature-blob");
		assert.strictEqual(fakeRes2.valid, false);
	});
});
