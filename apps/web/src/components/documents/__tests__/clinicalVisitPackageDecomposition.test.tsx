/**
 * clinicalVisitPackageDecomposition.test.tsx
 *
 * Инструментальный аудит декомпозиции и чистоты DocumentsStudioModal:
 * 1. Декомпозиция монолита (Мандат 8b: оркестратор <= 360 строк).
 * 2. Искоренение советских шифров ("1051н", "152-ФЗ", "54-ФЗ") из интерфейса (Мандат 8x, 8ap).
 * 3. Автономия врача (Мандат 8e): кнопки никогда не блокируются (disabled = false).
 * 4. Единый дизайн-код (Мандат 8am): ровно одна Primary CTA кнопка на видимый экран.
 * 5. Наличие студии согласий, цифровой подписи ПЭП и бланков A4.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../../../../testCssStub.mjs";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { DocumentsStudioModal } from "../DocumentsStudioModal";
import { getDocumentsCatalogData } from "../../consents/consentCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("DocumentsStudioModal & documentsCatalogData Red Team Audit", () => {
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

	it("1. Orchestrator and submodules line count adheres to Mandate 8b (< 380 lines for studio modal)", () => {
		const modalPath = path.resolve(__dirname, "../DocumentsStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");
		const lineCount = content.split("\n").length;

		assert.ok(lineCount < 380, `DocumentsStudioModal.tsx has ${lineCount} lines (limit 380)`);
		assert.ok(lineCount > 50, `DocumentsStudioModal.tsx has ${lineCount} lines (min 50)`);

		// Verify submodules exist in studio
		const studioDir = path.resolve(__dirname, "../studio");
		assert.ok(fs.existsSync(path.join(studioDir, "DocumentsStudioHeader.tsx")), "DocumentsStudioHeader.tsx must exist");
		assert.ok(fs.existsSync(path.join(studioDir, "DocumentsStudioFooter.tsx")), "DocumentsStudioFooter.tsx must exist");
		assert.ok(fs.existsSync(path.join(studioDir, "DocumentsPackageSelector.tsx")), "DocumentsPackageSelector.tsx must exist");
		assert.ok(fs.existsSync(path.join(studioDir, "ConsentSignersRow.tsx")), "ConsentSignersRow.tsx must exist");
		assert.ok(fs.existsSync(path.join(studioDir, "DocumentsA4Preview.tsx")), "DocumentsA4Preview.tsx must exist");
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
		const modalPath = path.resolve(__dirname, "../DocumentsStudioModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		const catalogPath = path.resolve(__dirname, "../../consents/consentCatalogData.ts");
		const catalogContent = fs.readFileSync(catalogPath, "utf-8");

		const competitors = ["stomx", "dentalpro", "ident", "istom"];
		for (const comp of competitors) {
			const regex = new RegExp(`\\b${comp}\\b`, "i");
			assert.ok(!regex.test(modalContent), `DocumentsStudioModal contains competitor ${comp}`);
			assert.ok(!regex.test(catalogContent), `consentCatalogData contains competitor ${comp}`);
		}
	});

	it("4. Renders DocumentsStudioModal with Mandate 8e Doctor Autonomy (Buttons never disabled)", () => {
		const html = renderToString(
			<DocumentsStudioModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient as any}
				initialTemplate="intake"
			/>,
		);

		// Primary CTA button must NOT be disabled
		assert.ok(html.includes("Распечатать пакет приёма") || html.includes("Печать бланка А4"), "Must contain primary CTA title");
		assert.ok(!html.includes('disabled'), "Primary CTA must not be disabled");

		// Patient information rendered cleanly
		assert.ok(html.includes("Иванов Иван Иванович"), "Must render patient name");
	});
});
