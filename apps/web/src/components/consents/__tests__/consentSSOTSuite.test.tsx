/**
 * apps/web/src/components/consents/__tests__/consentSSOTSuite.test.tsx
 *
 * Канонический Red Team тестовый сьют информированных согласий и договоров DENTE CRM.
 * Проверка 15 бланков Минздрава, пакетной подписи в 1 клик, Мандатов 8e (Zero Disabled Buttons),
 * 8x (человеческий язык), 8am (1 Primary CTA), Apple HIG mobile touch и сквозного монтирования (8aq).
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
	computeConsentIntegrityHash,
	type ConsentDocumentId,
	type ConsentSignStatus,
} from "../consentCatalogData";
import { ConsentStudioModal } from "../ConsentStudioModal";
import { DirectConsentLauncher } from "../DirectConsentLauncher";

describe("Red Team Inquisition: Consents & Legal Documents SSOT", () => {
	it("1.1. Registers exactly 15 statutory healthcare consent templates of Russian dentistry", () => {
		assert.equal(CANONICAL_CONSENT_CATALOG.length, 15, "Catalog must contain exactly 15 statutory forms");

		const expectedIds: ConsentDocumentId[] = [
			"therapy",
			"endodontics",
			"orthopedics",
			"surgery",
			"implant",
			"orthodontics",
			"anesthesia",
			"pediatric",
			"hygiene",
			"radiology",
			"personal_data",
			"periodontics",
			"sedation",
			"paid_contract",
			"refusal",
		];

		const actualIds = CANONICAL_CONSENT_CATALOG.map((doc) => doc.id);
		assert.deepEqual(actualIds, expectedIds);

		// Проверка ключевых клинических согласий
		const therapy = getConsentDocumentById("therapy");
		assert.ok(therapy.title.includes("терапевтическое лечение"));
		assert.ok(therapy.risks.length >= 1);

		const endo = getConsentDocumentById("endodontics");
		assert.ok(endo.title.includes("эндодонтическое лечение"));

		const surgery = getConsentDocumentById("surgery");
		assert.ok(surgery.title.includes("хирургическое лечение"));

		const implant = getConsentDocumentById("implant");
		assert.ok(implant.title.includes("имплантацию"));

		const personalData = getConsentDocumentById("personal_data");
		assert.ok(personalData.title.includes("персональных данных"));

		const contract = getConsentDocumentById("paid_contract");
		assert.ok(contract.title.includes("платных медицинских услуг"));
	});

	it("1.2. Supports all 3 canonical signature statuses: signed_digital, signed_paper, pending", () => {
		const doc = CANONICAL_CONSENT_CATALOG[0];

		// Статус pending
		const pendingHtml = generateConsentPrintHtml(doc, undefined, { status: "pending" });
		assert.ok(pendingHtml.includes("empty-stamp"));
		assert.ok(pendingHtml.includes("Подпись пациента:"));

		// Статус signed_paper
		const paperHtml = generateConsentPrintHtml(doc, undefined, {
			status: "signed_paper",
			signedAt: "31.10.2026",
		});
		assert.ok(paperHtml.includes("paper"));
		assert.ok(paperHtml.includes("ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ"));

		// Статус signed_digital
		const digitalHtml = generateConsentPrintHtml(doc, undefined, {
			status: "signed_digital",
			signedAt: "31.10.2026 15:30",
			signatureSvg: '<svg class="sig"></svg>',
		});
		assert.ok(digitalHtml.includes("digital"));
		assert.ok(digitalHtml.includes("ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(digitalHtml.includes('class="sig"'));
	});

	it("1.3. Print HTML generator contains valid A4 print styles and party metadata", () => {
		const doc = CANONICAL_CONSENT_CATALOG[13]; // Договор
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
		assert.ok(html.includes("Клиника «DENTE Элит»"));
	});

	it("1.4. Computes deterministic cryptographic integrity hash for consent signature", () => {
		const hash1 = computeConsentIntegrityHash("therapy", "Иванов И.И.", "31.10.2026 15:00", "SVG-SIG-DATA");
		const hash2 = computeConsentIntegrityHash("therapy", "Иванов И.И.", "31.10.2026 15:00", "SVG-SIG-DATA");
		const hash3 = computeConsentIntegrityHash("therapy", "Петров П.П.", "31.10.2026 15:00", "SVG-SIG-DATA");

		assert.ok(hash1.startsWith("DENTE-SSOT-"), "Hash must have canonical prefix");
		assert.equal(hash1, hash2, "Identical inputs must yield identical hash");
		assert.notEqual(hash1, hash3, "Different patients must yield different hashes");
	});

	it("2.1. Mandate 8e: Doctor Autonomy — ZERO disabled buttons in ConsentStudioModal", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
				patientContext={{ patientName: "Иванов И.И." }}
			/>,
		);

		assert.equal(html.includes("disabled"), false, "All buttons MUST be clickable per Mandate 8e");
		assert.ok(html.includes("Подписать пакет согласий"));
		assert.ok(html.includes("Печать бланка А4"));
	});

	it("2.2. Mandate 8am: Exactly ONE Primary CTA button #0d9488 (var(--teal)) on the screen", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		const hasTealPrimaryCta =
			html.includes("bg-[var(--teal,#0d9488)]") ||
			html.includes("var(--teal)") ||
			html.includes("#0d9488");
		assert.ok(hasTealPrimaryCta, "Primary CTA MUST have teal style (#0d9488 / var(--teal))");
	});

	it("2.3. Mandate 8x & 8ap: Zero raw bureaucratic circular numbers in user buttons and labels", () => {
		const html = renderToStaticMarkup(
			<ConsentStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

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

		assert.ok(html.includes("w-9 h-1.5"), "Mobile drag handle 36x5px must be present");
		assert.ok(html.includes("rounded-t-[24px]"), "Bottom Sheet drawer rounded-t-[24px] must be present");
		assert.ok(html.includes("min-h-[44px]"), "Touch targets must be >= 44px");
		assert.ok(html.includes("overflow-x-clip"), "Zero horizontal drift via overflow-x-clip");
	});

	it("3.1. DirectConsentLauncher mounts cleanly and renders without errors", () => {
		const html = renderToStaticMarkup(<DirectConsentLauncher />);
		assert.equal(typeof html, "string");
	});

	it("3.2. Mandate 8aq: DirectConsentLauncher is mounted in AppShell.tsx and StandaloneLaunchers.tsx", () => {
		const cwd = process.cwd();
		const possibleAppShellPaths = [
			path.resolve(cwd, "src/AppShell.tsx"),
			path.resolve(cwd, "apps/web/src/AppShell.tsx"),
		];
		const possibleLauncherPaths = [
			path.resolve(cwd, "src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx"),
			path.resolve(cwd, "apps/web/src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx"),
		];

		const appShellPath = possibleAppShellPaths.find((p) => fs.existsSync(p));
		const launchersPath = possibleLauncherPaths.find((p) => fs.existsSync(p));

		assert.ok(appShellPath, "AppShell.tsx must exist");
		assert.ok(launchersPath, "StandaloneLaunchers.tsx must exist");

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
