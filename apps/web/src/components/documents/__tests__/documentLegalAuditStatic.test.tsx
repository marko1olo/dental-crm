import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasCartoonEmojis } from "./documentLegalAuditMockDom.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Document Legal Audit and Issue Modals: Static Compliance", () => {
	const auditModalPath = path.resolve(__dirname, "../tabs/DocumentAuditFactsModal.tsx");
	const issueModalPath = path.resolve(__dirname, "../tabs/DocumentIssueConfirmationModal.tsx");
	const patientDocsTabPath = path.resolve(__dirname, "../../patients/tabs/PatientDocumentsTab.tsx");
	const patientCardPath = path.resolve(__dirname, "../../patients/PatientCard.tsx");

	const auditFactsDir = path.resolve(__dirname, "../tabs/auditFacts");
	const auditFactsExtra = fs.existsSync(auditFactsDir)
		? fs.readdirSync(auditFactsDir).map((f) => fs.readFileSync(path.join(auditFactsDir, f), "utf8")).join("\n")
		: "";
	const auditModalSource = fs.readFileSync(auditModalPath, "utf8") + "\n" + auditFactsExtra;

	const issueDir = path.resolve(__dirname, "../tabs/issueConfirmation");
	const issueExtra = fs.existsSync(issueDir)
		? fs.readdirSync(issueDir).map((f) => fs.readFileSync(path.join(issueDir, f), "utf8")).join("\n")
		: "";
	const issueModalSource = fs.readFileSync(issueModalPath, "utf8") + "\n" + issueExtra;
	const patientCardModulesDir = path.resolve(__dirname, "../../patients/patientCardModules");
	const patientCardSource =
		fs.readFileSync(patientCardPath, "utf8") +
		"\n" +
		(fs.existsSync(patientCardModulesDir)
			? fs
					.readdirSync(patientCardModulesDir)
					.map((f) => fs.readFileSync(path.join(patientCardModulesDir, f), "utf8"))
					.join("\n")
			: "");

	const patientDocsSubDir = path.resolve(__dirname, "../../patients/tabs/documents");
	const patientDocsTabSource =
		fs.readFileSync(patientDocsTabPath, "utf8") +
		"\n" +
		(fs.existsSync(patientDocsSubDir)
			? fs
					.readdirSync(patientDocsSubDir)
					.map((f) => fs.readFileSync(path.join(patientDocsSubDir, f), "utf8"))
					.join("\n")
			: "");

	it("1. DocumentAuditFactsModal statically obeys Constitution & Mandate 8d", () => {
		assert.ok(auditModalSource.includes("createPortal(modalContent, document.body)"));
		assert.ok(auditModalSource.includes('e.key === "Escape"'));
		assert.ok(auditModalSource.includes("var(--paper"));
		assert.ok(auditModalSource.includes("var(--ink"));
		assert.ok(auditModalSource.includes("var(--line"));
		assert.strictEqual(hasCartoonEmojis(auditModalSource), false);
		assert.ok(auditModalSource.includes("signatureAttestation"));
		assert.ok(auditModalSource.includes("63-ФЗ"));
		assert.ok(auditModalSource.includes("УКЭП ГОСТ"));
	});

	it("2. DocumentIssueConfirmationModal statically obeys Mandates 8d and 8e", () => {
		assert.ok(issueModalSource.includes("createPortal(modalContent, document.body)"));
		assert.ok(issueModalSource.includes('e.key === "Escape"'));
		assert.strictEqual(hasCartoonEmojis(issueModalSource), false);
		assert.ok(!issueModalSource.includes("disabled={!documentIssueAttestationReady}"));
		assert.ok(issueModalSource.includes("setDocumentIssueIdentityChecked(true)"));
	});

	it("3. PatientCard mounts PatientDocumentsTab under activeTab === 'documents'", () => {
		assert.ok(patientCardSource.includes("<PatientDocumentsTab"));
		assert.ok(patientCardSource.includes('activeTab === "documents"'));
		assert.ok(!patientCardSource.includes("Печать выписки из амбулаторной карты</span>\n\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>"));
	});

	it("4. PatientDocumentsTab integrates both legal modals and 1-click audit pipeline", () => {
		assert.ok(patientDocsTabSource.includes("<DocumentAuditFactsModal"));
		assert.ok(patientDocsTabSource.includes("<DocumentIssueConfirmationModal"));
		assert.ok(patientDocsTabSource.includes("loadDocumentAuditFacts"));
		assert.ok(patientDocsTabSource.includes("btn-patient-audit-doc-"));
		assert.ok(patientDocsTabSource.includes("printBlankMedicalContract"));
		assert.ok(patientDocsTabSource.includes("printBlankMedicalConsent"));
		assert.strictEqual(hasCartoonEmojis(patientDocsTabSource), false);
	});
});
