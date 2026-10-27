import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	executePatientBranchTransfer,
	generateTransferActHtml,
	generateTransferVerificationQrPayload,
	type PatientTransferDraft,
} from "../branchTransferEngine.js";
import { createTestSnapshot } from "./testSnapshotHelper.js";

describe("Branch Transfer QR Code Act HTML & Transfer Execution", () => {
	it("7. Renders genuine QR code, verification string and SHA-256 in statutory Transfer Act HTML", () => {
		const snapshot = createTestSnapshot();
		const actHtml = generateTransferActHtml(snapshot);

		assert.ok(actHtml.includes('src="data:image/svg+xml;utf8,'), "Act HTML must embed QR code as data URI");
		assert.ok(actHtml.includes("alt=\"QR код верификации"), "Act HTML must have descriptive QR alt");
		assert.ok(actHtml.includes(snapshot.checksumSha256), "Act HTML must display full cryptographic SHA-256");

		const expectedPayload = generateTransferVerificationQrPayload(snapshot);
		assert.ok(actHtml.includes(expectedPayload), "Act HTML must display verification payload string");
		assert.ok(actHtml.includes("ISO/IEC 18004"), "Act HTML must cite ISO/IEC 18004 standard");
	});

	it("8. executePatientBranchTransfer returns genuine QR Data URI and valid statutory act", () => {
		const draft: PatientTransferDraft = {
			patientId: "PAT-EXEC-777",
			patientFullName: "Ковалев Андрей Сергеевич",
			sourceBranchId: "branch-central",
			targetBranchId: "branch-north",
			transferReasonRu: "Продолжение лечения у хирурга-имплантолога",
			operatorStaffName: "Николаева А. И.",
			operatorStaffPosition: "Менеджер регистратуры",
			signatureType: "simple_electronic_signature_sms",
			is152FzConsentGiven: true,
			selectedComponents: {
				demographics: true,
				somaticAnamnesis: true,
				odontogram043u: true,
				visitDiaries: true,
				treatmentPlans: true,
				imagingArchive: false,
				depositBalance: true,
				activeLabOrders: false,
			},
		};

		const result = executePatientBranchTransfer({
			draft,
			demographics: {
				fullName: "Ковалев Андрей Сергеевич",
				birthDate: "1975-11-20",
				identityDocument: "Паспорт РФ 45 08 112233",
			},
			balanceRub: 45000,
			balanceKopecks: 4500000,
		});

		assert.equal(result.success, true, "Transfer must succeed");
		assert.ok(result.qrDataUri.startsWith("data:image/svg+xml;utf8,"), "Must generate genuine QR data URI");

		const decodedSvg = decodeURIComponent(result.qrDataUri.replace("data:image/svg+xml;utf8,", ""));
		assert.ok(decodedSvg.includes("<svg"), "Decoded QR must be valid SVG");
		assert.ok(decodedSvg.includes("<path d="), "Decoded QR must contain SVG module paths");
		assert.ok(!decodedSvg.includes('rect x="10" y="10" width="30" height="30"'), "Zero fake static rectangles");

		assert.ok(result.transferActHtml.includes("DENTE:TRF:"), "Transfer Act HTML must contain DENTE:TRF: payload");
		assert.ok(result.transferActHtml.includes(result.snapshot.checksumSha256), "Transfer Act HTML must contain SHA-256");
	});
});
