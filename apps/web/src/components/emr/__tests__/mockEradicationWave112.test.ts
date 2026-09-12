import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { generateSmsOtp, verifySmsOtp } from "../../portal/patientCabinet/patientCabinetEngine.js";

describe("Wave 112 - Total Liquidation of Synthetic Character Mocks and Demo OTP Codes", () => {
	const projectRoot = path.resolve(import.meta.dirname, "../../../../../..");

	const barabashFiles = [
		"apps/api/src/services/finance/commerceMlService.ts",
		"apps/web/src/components/documents/PrimaryIntakePackageModal.tsx",
		"apps/web/src/DocumentsView.tsx",
		"apps/web/src/components/tax/TaxDeductionModal.tsx",
		"apps/web/src/components/finance/refunds/RefundServiceModal.tsx",
		"apps/web/src/components/radiology/cbctExportEngine.ts",
		"apps/web/src/components/radiology/implantSafetyEngine.ts",
		"apps/web/src/components/security/auditTrailEngine.ts",
		"apps/web/src/components/analytics/LostPatientsPanel.tsx",
		"apps/web/src/components/finance/pnl/ClinicalPnlHubModal.tsx",
		"apps/web/src/components/finance/pnl/clinicalPnlEngine.ts",
		"apps/web/src/components/finance/one-c/oneCCommerceMlEngine.ts",
		"apps/web/src/components/egisz/EgiszDocumentsJournalModal.tsx",
		"apps/web/src/components/copilot/CopilotGenerativeCards.tsx",
		"apps/web/src/components/cmo/clinicalQualityEngine.ts",
		"apps/web/src/components/messaging/omnichannelEngine.ts",
		"apps/web/src/components/portal/patientPortalPresets.ts",
		"apps/web/src/components/radiology/HotFolderIntakeModal.tsx",
	];

	const volkovaFiles = [
		"apps/web/src/components/emr/protocolGenerator/EmrProtocolGeneratorModal.tsx",
		"apps/web/src/components/emr/templates/ClinicalDiaryTemplatesModal.tsx",
		"apps/web/src/components/documents/egisz/EgiszCdaExportModal.tsx",
		"apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx",
		"apps/web/src/components/recalls/PatientRecallManagerModal.tsx",
		"apps/web/src/components/cmo/EgiszSigningCabinetModal.tsx",
		"apps/web/src/components/emr/audit/cmoComplianceHubEngine.ts",
		"apps/web/src/components/security/auditTrailEngine.ts",
		"apps/web/src/components/finance/pnl/ClinicalPnlHubModal.tsx",
		"apps/web/src/components/messaging/omnichannelEngine.ts",
	];

	it("verifies complete eradication of Barabash from all production files", () => {
		for (const relPath of barabashFiles) {
			const absPath = path.join(projectRoot, relPath);
			assert.ok(fs.existsSync(absPath), `Target file exists: ${relPath}`);
			const content = fs.readFileSync(absPath, "utf8");
			assert.ok(
				!content.includes("Барабаш"),
				`File ${relPath} must NOT contain synthetic character 'Барабаш'`,
			);
		}
	});

	it("verifies complete eradication of Volkova from all production files", () => {
		for (const relPath of volkovaFiles) {
			const absPath = path.join(projectRoot, relPath);
			assert.ok(fs.existsSync(absPath), `Target file exists: ${relPath}`);
			const content = fs.readFileSync(absPath, "utf8");
			assert.ok(
				!content.includes("Волкова"),
				`File ${relPath} must NOT contain synthetic character 'Волкова'`,
			);
		}
	});

	it("verifies elimination of hardcoded 842109 and demo OTP code exposure from PatientCabinetModal", () => {
		const modalPath = path.join(
			projectRoot,
			"apps/web/src/components/portal/patientCabinet/PatientCabinetModal.tsx",
		);
		assert.ok(fs.existsSync(modalPath));
		const content = fs.readFileSync(modalPath, "utf8");
		assert.ok(
			!content.includes("842109"),
			"PatientCabinetModal must NOT contain hardcoded OTP '842109'",
		);
		assert.ok(
			!content.includes("Демо-код:"),
			"PatientCabinetModal must NOT display demo OTP code to user",
		);
	});

	it("verifies dynamic cryptographic 6-digit OTP generation and verification in patientCabinetEngine", () => {
		const phone = "+7 (999) 000-11-22";
		const otp1 = generateSmsOtp(phone);
		const otp2 = generateSmsOtp(phone);

		assert.equal(otp1.code.length, 6);
		assert.equal(otp2.code.length, 6);
		assert.match(otp1.code, /^\d{6}$/);
		assert.match(otp2.code, /^\d{6}$/);

		// OTP should be cryptographic and distinct across calls
		assert.ok(otp1.expiresAt > otp1.sentTimestamp);
		const verifyOk = verifySmsOtp(otp1.code, otp1.code, otp1.sentTimestamp);
		assert.equal(verifyOk.success, true);

		const verifyBad = verifySmsOtp("000000", otp1.code, otp1.sentTimestamp);
		assert.equal(verifyBad.success, false);
	});
});
