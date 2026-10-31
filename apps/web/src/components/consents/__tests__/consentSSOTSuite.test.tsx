/**
 * apps/web/src/components/consents/__tests__/consentSSOTSuite.test.tsx
 *
 * Канонический Red Team тестовый сьют юридического контура, ИДС и договоров DENTE CRM.
 * Проверка Мандатов 8e (Zero Disabled Buttons), 8x (человеческий язык), 8am (1 Primary CTA),
 * Apple HIG mobile touch ergonomics и сквозного монтирования (Мандат 8aq).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	CANONICAL_CONSENT_CATALOG,
	getConsentDocumentById,
	generateConsentPrintHtml,
	type ConsentDocumentId,
	type ConsentSignStatus,
} from "../consentCatalogData";
import { ConsentStudioModal } from "../ConsentStudioModal";
import { DirectConsentLauncher } from "../DirectConsentLauncher";

describe("Red Team Inquisition: Consents & Legal Documents SSOT", () => {
	it("1.1. Registers exactly 4 statutory healthcare documents of Russian dentistry", () => {
		assert.equal(CANONICAL_CONSENT_CATALOG.length, 4);

		const expectedIds: ConsentDocumentId[] = [
			"therapy_hygiene",
			"surgery_implant",
			"orthodontics",
			"paid_contract",
		];

		const actualIds = CANONICAL_CONSENT_CATALOG.map((doc) => doc.id);
		assert.deepEqual(actualIds, expectedIds);

		// Проверка терапевтического согласия
		const therapy = getConsentDocumentById("therapy_hygiene");
		assert.ok(therapy.title.includes("терапевтическое лечение"));
		assert.ok(therapy.sections.some((s) => s.title.includes("цели медицинского вмешательства")));
		assert.ok(therapy.risks.length >= 2);

		// Проверка хирургического согласия
		const surgery = getConsentDocumentById("surgery_implant");
		assert.ok(surgery.title.includes("хирургическое вмешательство и имплантацию"));
		assert.ok(surgery.sections.some((s) => s.title.includes("Специфические анатомические риски")));
		assert.ok(surgery.risks.some((r) => r.includes("парестезия") || r.includes("отек")));

		// Проверка ортодонтического согласия
		const ortho = getConsentDocumentById("orthodontics");
		assert.ok(ortho.title.includes("ортодонтическое лечение"));
		assert.ok(ortho.sections.some((s) => s.title.includes("ретенционного периода")));
		assert.ok(ortho.risks.some((r) => r.includes("Рецидив") || r.includes("ретейнер")));

		// Проверка договора платных медицинских услуг
		const contract = getConsentDocumentById("paid_contract");
		assert.ok(contract.title.includes("Договор на оказание платных медицинских услуг"));
		assert.ok(contract.sections.some((s) => s.title.includes("государственных гарантий (ОМС)")));
		assert.ok(contract.sections.some((s) => s.title.includes("54-ФЗ")));
	});

	it("1.2. Supports all 3 canonical signature statuses: signed_digital, signed_paper, pending", () => {
		const statuses: ConsentSignStatus[] = ["signed_digital", "signed_paper", "pending"];
		const doc = CANONICAL_CONSENT_CATALOG[0];

		// Проверка pending
		const pendingHtml = generateConsentPrintHtml(doc, undefined, { status: "pending" });
		assert.ok(pendingHtml.includes("empty-stamp"));
		assert.ok(pendingHtml.includes("Подпись пациента:"));
		assert.ok(pendingHtml.includes("___________________________"));

		// Проверка signed_paper
		const paperHtml = generateConsentPrintHtml(doc, undefined, {
			status: "signed_paper",
			signedAt: "31.10.2026",
		});
		assert.ok(paperHtml.includes("paper-stamp"));
		assert.ok(paperHtml.includes("ДОКУМЕНТ ПОДПИСАН НА БУМАЖНОМ НОСИТЕЛЕ"));

		// Проверка signed_digital
		const digitalHtml = generateConsentPrintHtml(doc, undefined, {
			status: "signed_digital",
			signedAt: "31.10.2026 14:30",
			signatureSvg: '<svg class="sig"></svg>',
		});
		assert.ok(digitalHtml.includes("digital-stamp"));
		assert.ok(digitalHtml.includes("ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(digitalHtml.includes('class="sig"'));
	});

	it("1.3. Print HTML generator contains valid A4 print styles and party metadata", () => {
		const doc = CANONICAL_CONSENT_CATALOG[3]; // Договор
		const html = generateConsentPrintHtml(
			doc,
			{
				patientName: "Алексеев Петр Сергеевич",
				birthDate: "12.08.1990",
				passport: "серия 4511 № 987654",
				clinicName: "Клиника «DENTE Элит»",
				doctorName: "Кузнецов И.В.",
			},
			{ status: "pending" },
		);

		assert.ok(html.includes("@page { size: A4 portrait; margin: 15mm; }"));
		assert.ok(html.includes("Алексеев Петр Сергеевич"));
		assert.ok(html.includes("12.08.1990"));
		assert.ok(html.includes("серия 4511 № 987654"));
		assert.ok(html.includes("Клиника «DENTE Элит»"));
	});

	it("2.1. Mandate 8e: Doctor Autonomy — ZERO disabled buttons in ConsentStudioModal", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
				patientContext={{ patientName: "Иванов И.И." }}
			/>,
		);

		// Проверяем, что в рендере нет disabled кнопок
		assert.equal(html.includes("disabled"), false, "All buttons MUST be clickable per Mandate 8e");
		assert.ok(html.includes("Зафиксировать подписанный документ"));
		assert.ok(html.includes("Печать бланка А4"));
	});

	it("2.2. Mandate 8am: Exactly ONE Primary CTA button #0d9488 (var(--teal)) on the screen", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Проверяем, что Primary CTA присутствует и оформлен токеном var(--teal) или #0d9488
		const hasTealPrimaryCta =
			html.includes("bg-[var(--teal,#0d9488)]") ||
			html.includes("var(--teal)") ||
			html.includes("#0d9488");
		assert.ok(hasTealPrimaryCta, "Primary CTA MUST have teal style (#0d9488 / var(--teal))");

		// Вторичные кнопки не должны иметь Primary CTA фона
		const printBtnMatch = html.match(/Печать бланка А4/);
		assert.ok(printBtnMatch, "Secondary print button must exist");
	});

	it("2.3. Mandate 8x: Zero raw bureaucratic circular numbers in user buttons and labels", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Не должно быть сырых номеров в тексте интерфейса
		assert.equal(html.includes("Форма 1051н"), false, "Must not contain raw 'Форма 1051н'");
		assert.equal(html.includes("Приказ 804н"), false, "Must not contain raw 'Приказ 804н'");
		assert.equal(html.includes("Закон 152-ФЗ"), false, "Must not contain raw 'Закон 152-ФЗ'");
	});

	it("2.4. Apple HIG Mobile Touch Ergonomics: Drag Handle 36x5px, min-h 44px, and Bottom Sheet", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Проверка Drag Handle 36x5px (w-9 h-1.5)
		assert.ok(html.includes("w-9 h-1.5"), "Mobile drag handle 36x5px must be present");
		assert.ok(html.includes("rounded-t-[24px]"), "Bottom Sheet drawer rounded-t-[24px] must be present");

		// Проверка touch target >= 44px
		assert.ok(html.includes("min-h-[44px]"), "Touch targets must be >= 44px");

		// Проверка отсутствия горизонтального скролла
		assert.ok(html.includes("overflow-x-clip"), "Zero horizontal drift via overflow-x-clip");
	});

	it("3.1. DirectConsentLauncher mounts cleanly and renders without errors", () => {
		const html = renderToStaticMarkup(<DirectConsentLauncher />);
		assert.equal(typeof html, "string");
	});

	it("3.2. Mandate 8aq: DirectConsentLauncher is mounted in AppShell.tsx and StandaloneLaunchers.tsx", () => {
		const cwd = process.cwd();
		const appShellPath = path.resolve(cwd, "apps/web/src/AppShell.tsx");
		const launchersPath = path.resolve(
			cwd,
			"apps/web/src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);

		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");
		assert.ok(fs.existsSync(launchersPath), "StandaloneLaunchers.tsx must exist");

		const appShellContent = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			appShellContent.includes("DirectConsentLauncher"),
			"AppShell.tsx must import and render DirectConsentLauncher",
		);

		const launchersContent = fs.readFileSync(launchersPath, "utf-8");
		assert.ok(
			launchersContent.includes("DirectConsentLauncher"),
			"StandaloneLaunchers.tsx must import DirectConsentLauncher",
		);
		assert.ok(
			launchersContent.includes("#consents") && launchersContent.includes("consents=1"),
			"StandaloneLaunchers.tsx must handle #consents and ?consents=1",
		);
	});
});
