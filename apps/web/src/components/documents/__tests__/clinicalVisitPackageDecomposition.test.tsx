/**
 * clinicalVisitPackageDecomposition.test.tsx
 *
 * Инструментальный аудит декомпозиции и чистоты ClinicalVisitPackageModal:
 * 1. Декомпозиция монолита (Мандат 8b: оркестратор < 280 строк).
 * 2. Искоренение советских шифров ("1051н", "152-ФЗ", "54-ФЗ") из интерфейса (Мандат 8x, 8ap).
 * 3. Автономия врача (Мандат 8e): кнопки никогда не блокируются (disabled = false).
 * 4. Единый дизайн-код (Мандат 8am): ровно одна Primary CTA кнопка на видимый экран.
 * 5. Наличие данных законного представителя и соматической нормы в 1 клик.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { ClinicalVisitPackageModal } from "../ClinicalVisitPackageModal";
import { getDocumentsCatalogData } from "../documentsCatalogData";

describe("ClinicalVisitPackageModal & documentsCatalogData Red Team Audit", () => {
	const mockPatient = {
		id: "patient-1",
		organizationId: "org-test-uuid",
		fullName: "Иванов Иван Иванович",
		birthDate: "1985-05-12",
		gender: "male" as const,
		phone: "+7 (999) 000-11-22",
		cardNumber: "1042",
		balanceRub: 0,
		isArchived: false,
		status: "active" as const,
		administrativeProfile: {
			snils: "123-456-789 00",
			identityDocument: "4510 123456",
			legalRepresentativeFullName: "Иванова Анна Сергеевна",
			legalRepresentativeRelationship: "Мать",
			legalRepresentativePhone: "+7 (999) 555-44-33",
		},
	};

	it("1. Orchestrator and submodules line count adheres to Mandate 8b (< 280 lines for modal)", () => {
		const modalPath = path.resolve(__dirname, "../ClinicalVisitPackageModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");
		const lineCount = content.split("\n").length;

		assert.ok(lineCount < 280, `ClinicalVisitPackageModal.tsx has ${lineCount} lines (limit 280)`);
		assert.ok(lineCount > 100, `ClinicalVisitPackageModal.tsx has ${lineCount} lines (min 100)`);

		// Verify submodules exist in intakePackage
		const intakeDir = path.resolve(__dirname, "../intakePackage");
		assert.ok(fs.existsSync(path.join(intakeDir, "IntakePackageHeader.tsx")), "IntakePackageHeader.tsx must exist");
		assert.ok(fs.existsSync(path.join(intakeDir, "IntakeRepresentativeSection.tsx")), "IntakeRepresentativeSection.tsx must exist");
		assert.ok(fs.existsSync(path.join(intakeDir, "IntakePackageChecklist.tsx")), "IntakePackageChecklist.tsx must exist");
		assert.ok(fs.existsSync(path.join(intakeDir, "IntakeTaxSection.tsx")), "IntakeTaxSection.tsx must exist");
		assert.ok(fs.existsSync(path.join(intakeDir, "IntakePackageFooter.tsx")), "IntakePackageFooter.tsx must exist");
	});

	it("2. Eradicates Soviet order codes ('1051н', '152-ФЗ', '54-ФЗ') from visible catalog metadata", () => {
		const catalog = getDocumentsCatalogData();

		for (const item of catalog) {
			assert.ok(!item.badgeRu.includes("1051н"), `Item ${item.id} badgeRu contains 1051н`);
			assert.ok(!item.badgeRu.includes("152-ФЗ"), `Item ${item.id} badgeRu contains 152-ФЗ`);
			assert.ok(!item.badgeRu.includes("54-ФЗ"), `Item ${item.id} badgeRu contains 54-ФЗ`);
			assert.ok(!item.regulationRu.includes("1051н"), `Item ${item.id} regulationRu contains 1051н`);
			assert.ok(!item.regulationRu.includes("152-ФЗ"), `Item ${item.id} regulationRu contains 152-ФЗ`);
			assert.ok(!item.regulationRu.includes("54-ФЗ"), `Item ${item.id} regulationRu contains 54-ФЗ`);
		}

		const consentItem = catalog.find((i) => i.id === "doc_informed_consent_general");
		assert.strictEqual(consentItem?.badgeRu, "Согласие на лечение");
		assert.strictEqual(consentItem?.regulationRu, "Клинический стандарт согласия");

		const pdItem = catalog.find((i) => i.id === "doc_personal_data_consent");
		assert.strictEqual(pdItem?.badgeRu, "Согласие на обработку персональных данных");

		const receiptItem = catalog.find((i) => i.id === "doc_payment_receipt");
		assert.strictEqual(receiptItem?.regulationRu, "Кассовый чек и оплата");
	});

	it("3. Zero competitor mentions across documents package and catalog", () => {
		const modalPath = path.resolve(__dirname, "../ClinicalVisitPackageModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		const catalogPath = path.resolve(__dirname, "../documentsCatalogData.ts");
		const catalogContent = fs.readFileSync(catalogPath, "utf-8");

		const competitors = ["stomx", "dentalpro", "ident", "istom"];
		for (const comp of competitors) {
			const regex = new RegExp(`\\b${comp}\\b`, "i");
			assert.ok(!regex.test(modalContent), `ClinicalVisitPackageModal contains competitor ${comp}`);
			assert.ok(!regex.test(catalogContent), `documentsCatalogData contains competitor ${comp}`);
		}
	});

	it("4. Renders ClinicalVisitPackageModal with Mandate 8e Doctor Autonomy (Buttons never disabled)", () => {
		const html = renderToString(
			<ClinicalVisitPackageModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient as any}
			/>,
		);

		// Primary CTA button must NOT be disabled
		assert.ok(html.includes("Распечатать пакет первичного приёма"), "Must contain primary CTA title");
		assert.ok(!html.includes('data-testid="btn-print-primary-package-cta" disabled'), "Primary CTA must not be disabled");

		// Blank print button must NOT be disabled
		assert.ok(html.includes("Бланк (_____)"), "Must contain blank print button");
		assert.ok(!html.includes('data-testid="btn-print-blank-intake-package" disabled'), "Blank button must not be disabled");

		// Representative information rendered cleanly
		assert.ok(html.includes("Иванова Анна Сергеевна"), "Must render representative name");
		assert.ok(html.includes("Мать"), "Must render representative relationship");
		assert.ok(html.includes("Заполнить соматическую норму"), "Must render somatic norm button");
	});

	it("5. Renders clinical and tax tabs adhering to Mandate 8am (Single Primary CTA)", () => {
		// Clinical Tab
		const clinicalHtml = renderToString(
			<ClinicalVisitPackageModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient as any}
				initialTab="clinical"
			/>,
		);
		assert.ok(clinicalHtml.includes("Распечатать клинический пакет"), "Clinical tab must render clinical CTA");
		assert.ok(!clinicalHtml.includes("Распечатать пакет первичного приёма"), "Clinical tab must not render primary CTA");

		// Tax Tab
		const taxHtml = renderToString(
			<ClinicalVisitPackageModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient as any}
				initialTab="tax"
			/>,
		);
		assert.ok(taxHtml.includes("Сформировать справку НДФЛ"), "Tax tab must render tax CTA");
		assert.ok(taxHtml.includes("Код 01 (стандартное лечение)"), "Tax tab must render Code 01 card");
		assert.ok(taxHtml.includes("Код 02 (дорогостоящее лечение)"), "Tax tab must render Code 02 card");
		assert.ok(taxHtml.includes("Оценка возврата 13% НДФЛ"), "Tax tab must render refund card");
	});
});
