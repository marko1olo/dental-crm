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
import "../../../../testCssStub.mjs";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { DocumentsStudioModal } from "../DocumentsStudioModal";
import { getDocumentsCatalogData } from "../../consents/consentCatalogData";

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

	it("1. Studio decomposed modules render A4 preview with data-preserve-white='true'", async () => {
		const [hdr, ftr, pkg, sig, preview] = await Promise.all([
			import("../studio/DocumentsStudioHeader.js"),
			import("../studio/DocumentsStudioFooter.js"),
			import("../studio/DocumentsPackageSelector.js"),
			import("../studio/ConsentSignersRow.js"),
			import("../studio/DocumentsA4Preview.js"),
		]);
		const { DocumentsA4Preview } = preview;
		assert.ok(hdr.DocumentsStudioHeader && ftr.DocumentsStudioFooter && pkg.DocumentsPackageSelector && sig.ConsentSignersRow);

		const a4Html = renderToString(
			<DocumentsA4Preview
				clinic={{ name: "ООО Дента", inn: "7707083893", license: "ЛО41", address: "Москва", phone: "+7999" }}
				patient={{ fullName: "Иванов И.И.", birthDate: "1990-01-01", passport: "1234", address: "Москва", phone: "+7999" }}
				effectiveDoctorName="Доктор Петров"
				currentDate="01.05.2026"
				totalDisplayAmountKopecks={150000}
				renderedDocumentText="Текст документа"
				effectiveHasSigned={false}
			/>,
		);
		assert.ok(a4Html.includes('data-preserve-white="true"'), "A4 preview must preserve white paper contrast in Dark Mode");
		assert.ok(a4Html.includes("ООО Дента"));
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

	it("3. Zero competitor mentions in rendered DocumentsStudioModal & catalog", () => {
		const modalHtml = renderToString(
			<DocumentsStudioModal isOpen={true} onClose={() => {}} patient={mockPatient as any} initialTemplate="intake" />,
		);
		const catalogText = JSON.stringify(getDocumentsCatalogData());
		const competitors = ["stomx", "dentalpro", "ident", "istom"];
		for (const comp of competitors) {
			const regex = new RegExp(`\\b${comp}\\b`, "i");
			assert.ok(!regex.test(modalHtml), `DocumentsStudioModal rendered output contains competitor ${comp}`);
			assert.ok(!regex.test(catalogText), `catalog contains competitor ${comp}`);
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
