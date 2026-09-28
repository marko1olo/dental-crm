/**
 * informedConsentAutonomyInquisition.test.ts
 *
 * Subagent 9 Red Team Inquisitor for Informed Voluntary Consents (ИДС) & Legal Digital Signatures:
 * Regulatory Standards:
 * - Order of Minzdrav RF No. 1051n (Informed Voluntary Consent for medical interventions)
 * - Federal Law No. 323-FZ (Art. 20)
 * - Federal Law No. 152-FZ (Personal Data & EGISZ)
 *
 * Constitutional Mandates:
 * - Mandate 2 & 8k: Zero Mocks & Zero Boilerplate in clinical risk disclosures
 * - Mandate 8d pt 6: Anti-Matryoshka Law (Modal nesting depth <= 1)
 * - Mandate 8d pt 7: Zero Cartoon Emojis across all statutory templates, packages, and badges
 * - Mandate 8e: Doctor & Patient Autonomy (Zero disabled buttons, frictionless 1-click confirmation)
 * - Design Tokens & Theme Hygiene: Enforcing CSS variables (var(--paper), var(--ink), var(--teal))
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
globalThis.React = React;
import { renderToString } from "react-dom/server";
import {
	CONSENT_ANESTHESIA,
	CONSENT_HYGIENE_BLEACHING,
	CONSENT_INSPECTION_1051N,
	CONSENT_ORTHODONTICS,
	CONSENT_ORTHOPEDICS,
	CONSENT_PEDIATRIC,
	CONSENT_PERSONAL_DATA,
	CONSENT_SURGERY_IMPLANT,
	CONSENT_TEMPLATES,
	CONSENT_THERAPY,
	getAllConsentPackages,
	getAllConsentTemplates,
	getBlankConsentSubstitutionContext,
	getConsentPackage,
	getConsentTemplate,
	renderConsentTemplate,
	substitutePlaceholders,
	type ConsentTemplateKey,
} from "../consentTemplates.js";
const { InformedConsentModal } = await import("../InformedConsentModal.js");

describe("Red Team Inquisition: Informed Voluntary Consents (1051n & 323-FZ)", () => {
	const mockPatient = {
		fullName: "Васильев Алексей Сергеевич",
		birthDate: "12.08.1985",
		passport: "4509 № 987654 выдан ОВД г. Москвы",
		phone: "+7 (916) 111-22-33",
		snils: "123-456-789 00",
		address: "г. Москва, ул. Стоматологов, д. 5",
		cardNumber: "043/у-2026/789",
	};

	describe("1. Regulatory Standards & Clinical Risk Disclosures (Zero Mocks)", () => {
		it("registers exactly 9 statutory consent templates without mocks or stubs", () => {
			const templates = getAllConsentTemplates();
			assert.equal(templates.length, 9, "Must contain all 9 statutory consent templates");

			for (const tpl of templates) {
				assert.ok(tpl.code.length >= 5, `Template ${tpl.key} must have valid code`);
				assert.ok(tpl.title.length > 15, `Template ${tpl.key} must have full title`);
				assert.ok(tpl.subtitle.length > 20, `Template ${tpl.key} must have descriptive subtitle`);
				assert.ok(tpl.statutoryBasis.includes("323-ФЗ") || tpl.statutoryBasis.includes("152-ФЗ"));
				assert.ok(tpl.sections.length >= 3, `Template ${tpl.key} must have at least 3 sections`);

				// Verify NO mock placeholders or TODOs
				const json = JSON.stringify(tpl);
				assert.ok(!json.includes("TODO"), `Template ${tpl.key} must not contain TODO`);
				assert.ok(!json.includes("FIXME"), `Template ${tpl.key} must not contain FIXME`);
				assert.ok(!json.includes("заглушк"), `Template ${tpl.key} must not contain заглушка`);
			}
		});

		it("CONSENT_ANESTHESIA (ИДС-06-АНЕСТ) discloses full local anesthesia pharmacology & somatic risks", () => {
			const tpl = CONSENT_ANESTHESIA;
			const fullText = JSON.stringify(tpl);

			assert.ok(fullText.includes("Артикаин 4%"), "Must specify Articaine 4%");
			assert.ok(fullText.includes("Мепивакаин 3%"), "Must specify Mepivacaine 3%");
			assert.ok(fullText.includes("эпинефрин"), "Must specify Epinephrine/Adrenaline");
			assert.ok(fullText.includes("проводниковая"), "Must include conductive anesthesia");
			assert.ok(fullText.includes("инфильтрационная"), "Must include infiltration anesthesia");

			// Risks: numbness, lip biting, hematoma, tachycardia, allergy/anaphylaxis
			assert.ok(fullText.includes("онемения"), "Must disclose numbness duration");
			assert.ok(fullText.includes("прикусывания"), "Must warn of accidental lip/cheek biting");
			assert.ok(fullText.includes("гематомы"), "Must disclose hematoma at injection site");
			assert.ok(fullText.includes("тахикардия"), "Must disclose tachycardia from vasoconstrictor");
			assert.ok(fullText.includes("Аллергические"), "Must disclose allergy/toxic risk");
		});

		it("CONSENT_SURGERY_IMPLANT (ИДС-02-ХИР-ИМПЛ) discloses surgical extraction & implantology risks", () => {
			const tpl = CONSENT_SURGERY_IMPLANT;
			const fullText = JSON.stringify(tpl);

			assert.ok(fullText.includes("удаление"), "Must disclose tooth extraction");
			assert.ok(fullText.includes("имплантат"), "Must disclose dental implant placement");
			assert.ok(fullText.includes("синус-лифтинг"), "Must disclose sinus lift");
			assert.ok(fullText.includes("НКР") || fullText.includes("костная"), "Must disclose bone regeneration");

			// Statutory anatomical risks: IAN nerve paresthesia, Schneiderian membrane, alveolitis, de-integration
			assert.ok(fullText.includes("IAN") || fullText.includes("нижнеальвеолярного нерва"), "Must disclose IAN paresthesia");
			assert.ok(fullText.includes("парестезия") || fullText.includes("онемение"), "Must disclose paresthesia risk");
			assert.ok(fullText.includes("Шнайдера") || fullText.includes("пазухи"), "Must disclose Schneiderian membrane perforation");
			assert.ok(fullText.includes("дезинтеграции") || fullText.includes("отторжения"), "Must disclose 1-3% implant de-integration rate");
			assert.ok(fullText.includes("альвеолит"), "Must disclose dry socket (alveolitis) risk");
		});

		it("CONSENT_THERAPY (ИДС-01-ТЕР) discloses endodontic & direct restoration risks", () => {
			const tpl = CONSENT_THERAPY;
			const fullText = JSON.stringify(tpl);

			assert.ok(fullText.includes("коффердам"), "Must mandate rubber dam isolation");
			assert.ok(fullText.includes("корневых каналов"), "Must specify root canal treatment");
			assert.ok(fullText.includes("обтурацию"), "Must specify 3D root canal obturation");
			assert.ok(fullText.includes("постпломбировочных болей"), "Must disclose 3-7 day post-op sensitivity");
			assert.ok(fullText.includes("ИРОПЗ"), "Must disclose IROPZ > 0.5 crown requirement to prevent root fracture");
		});

		it("CONSENT_ORTHOPEDICS (ИДС-04-ОРТОПЕД) discloses prosthodontic risks & warranty rules", () => {
			const tpl = CONSENT_ORTHOPEDICS;
			const fullText = JSON.stringify(tpl);

			assert.ok(fullText.includes("препарирование"), "Must disclose tooth preparation");
			assert.ok(fullText.includes("коронок"), "Must disclose crown fabrication");
			assert.ok(fullText.includes("гиперестезии") || fullText.includes("пульпита"), "Must disclose vital preparation risk");
			assert.ok(fullText.includes("скола керамической облицовки"), "Must disclose ceramic chipping risk");
			assert.ok(fullText.includes("бруксизм"), "Must address bruxism & night guard");
			assert.ok(fullText.includes("6 месяцев"), "Must mandate 6-month checkup for warranty");
		});

		it("CONSENT_ORTHODONTICS (ИДС-03-ОРТОДОНТ) discloses root resorption & retention requirements", () => {
			const tpl = CONSENT_ORTHODONTICS;
			const fullText = JSON.stringify(tpl);

			assert.ok(fullText.includes("брекет"), "Must disclose bracket systems");
			assert.ok(fullText.includes("элайнер"), "Must disclose clear aligners");
			assert.ok(fullText.includes("резорбции"), "Must disclose apical root resorption");
			assert.ok(fullText.includes("деминерализации эмали"), "Must disclose enamel demineralization");
			assert.ok(fullText.includes("ретенционный"), "Must mandate retention period to prevent relapse");
		});

		it("CONSENT_INSPECTION_1051N (ИДС-1051н) conforms strictly to Order 1051n & radiation safety", () => {
			const tpl = CONSENT_INSPECTION_1051N;
			const fullText = JSON.stringify(tpl);

			assert.ok(tpl.statutoryBasis.includes("1051н"), "Must cite Order 1051n");
			assert.ok(tpl.statutoryBasis.includes("323-ФЗ"), "Must cite 323-FZ");
			assert.ok(fullText.includes("радиовизиография") || fullText.includes("RVG"), "Must include RVG");
			assert.ok(fullText.includes("томография") || fullText.includes("КЛКТ"), "Must include CBCT");
			assert.ok(fullText.includes("СанПиН"), "Must cite SanPiN radiation safety");
			assert.ok(fullText.includes("отказаться"), "Must inform patient of statutory right to refuse");
		});

		it("CONSENT_PEDIATRIC (ИДС-09-ДЕТ) protects minors <15 years with statutory parental supervision", () => {
			const tpl = CONSENT_PEDIATRIC;
			const fullText = JSON.stringify(tpl);

			assert.ok(tpl.statutoryBasis.includes("1051н"));
			assert.ok(fullText.includes("законного представителя"), "Must mandate legal representative");
			assert.ok(fullText.includes("шкале Франкла"), "Must mention Frankl scale");
			assert.ok(fullText.includes("прикусывания губы") || fullText.includes("прикусывание"), "Must issue critical lip biting warning");
			assert.ok(fullText.includes("2–3 часа") || fullText.includes("2-3 часа"), "Must specify supervision duration");
		});
	});

	describe("2. Doctor & Patient Autonomy (Mandate 8e: Zero Disabled Buttons)", () => {
		it("renders with ZERO disabled buttons in both paper and tablet verification modes", () => {
			const html = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					initialMode: "single",
					initialTemplateKey: "CONSENT_THERAPY",
					initialVerificationMethod: "paper_physical",
					patient: mockPatient,
					doctorName: "Д-р Лебедев С. В.",
				}),
			);

			// Assert modal container is present
			assert.ok(html.includes("consent-modal-container"));

			// Check primary and action buttons are not disabled
			assert.ok(html.includes('data-testid="btn-confirm-paper-signed"'));
			assert.ok(!html.includes('data-testid="btn-confirm-paper-signed" disabled'));
			assert.ok(html.includes('data-testid="btn-confirm-sign"'));
			assert.ok(!html.includes('data-testid="btn-confirm-sign" disabled'));

			// Check tablet vector pad mode
			const tabletHtml = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					initialMode: "single",
					initialTemplateKey: "CONSENT_THERAPY",
					initialVerificationMethod: "tablet_stylus",
					patient: mockPatient,
					doctorName: "Д-р Лебедев С. В.",
				}),
			);

			// Check that clear button has NO disabled attribute
			assert.ok(tabletHtml.includes('data-testid="btn-clear-vector-strokes"'));
			assert.ok(
				!tabletHtml.includes('data-testid="btn-clear-vector-strokes" disabled'),
				"Clear button must NEVER be disabled (Mandate 8e: zero disabled buttons)",
			);
		});

		it("allows 1-click package confirmation signing all documents without bureaucratic gates", () => {
			const html = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					initialMode: "packages",
					initialPackageKey: "PACKAGE_PRIMARY_VISIT",
					patient: mockPatient,
				}),
			);

			assert.ok(html.includes("Пакет информированных добровольных согласий"));
			assert.ok(html.includes('data-testid="pkg-tab-PACKAGE_PRIMARY_VISIT"'));
			assert.ok(html.includes("Подтвердить пакет (4 док.) в 1 клик"));
		});

		it("renders 1-click blank print button ('________') without patient data requirements", () => {
			const html = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					initialMode: "packages",
					patient: null,
				}),
			);

			// Should render without error and have inline blank print option
			assert.ok(html.includes('data-testid="btn-print-blank-consent-inline"'));
			assert.ok(html.includes("Печать чистых бланков пакета («________»)"));
		});
	});

	describe("3. Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		it("guarantees 0 cartoon emojis in all statutory templates", () => {
			const templates = getAllConsentTemplates();
			for (const tpl of templates) {
				const fullStr = JSON.stringify(tpl);
				assert.ok(
					!emojiRegex.test(fullStr),
					`Template ${tpl.key} must contain 0 cartoon emojis`,
				);
			}
		});

		it("guarantees 0 cartoon emojis in package descriptions and titles", () => {
			const pkgs = getAllConsentPackages();
			for (const pkg of pkgs) {
				const fullStr = JSON.stringify(pkg);
				assert.ok(
					!emojiRegex.test(fullStr),
					`Package ${pkg.key} must contain 0 cartoon emojis`,
				);
			}
		});

		it("guarantees 0 cartoon emojis in rendered modal HTML", () => {
			const html = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					initialMode: "packages",
					initialPackageKey: "PACKAGE_PRIMARY_VISIT",
					patient: mockPatient,
				}),
			);
			assert.ok(!emojiRegex.test(html), "Rendered modal HTML must contain 0 cartoon emojis");
		});
	});

	describe("4. Anti-Matryoshka Law (Mandate 8d pt 6: Modal Depth <= 1)", () => {
		it("ensures modal renders as a single monolithic overlay without nested modal dialogs", () => {
			const html = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
				}),
			);

			// Count occurrences of role="dialog" or aria-modal="true"
			const dialogMatches = html.match(/role="dialog"/g) || [];
			const modalMatches = html.match(/aria-modal="true"/g) || [];

			assert.equal(dialogMatches.length, 1, "Must contain exactly 1 dialog container (depth = 1)");
			assert.equal(modalMatches.length, 1, "Must contain exactly 1 aria-modal container");

			// Ensure no nested cards inside document sheet
			assert.ok(!html.includes("consent-document-sheet card card"));
		});
	});

	describe("5. CSS Design Tokens & Theme Hygiene Audit", () => {
		it("verifies informedConsent.css uses design tokens and no raw hardcoded hex in document title", () => {
			const cssPath = path.resolve(
				process.cwd(),
				"apps/web/src/components/consents/informedConsent.css",
			);
			const cssContent = fs.readFileSync(cssPath, "utf8");

			// Check that .consent-document-title uses var(--ink)
			const titleRule = cssContent.match(/\.consent-document-title\s*\{[^}]+\}/)?.[0] || "";
			assert.ok(titleRule.length > 0, "Must define .consent-document-title");
			assert.ok(
				titleRule.includes("var(--ink)"),
				".consent-document-title must use var(--ink) instead of hardcoded hex",
			);

			// Check dark mode sheet overrides
			assert.ok(cssContent.includes('[data-theme="dark"] .consent-document-sheet'));
			assert.ok(cssContent.includes("var(--paper-strong"));

			// Check that standard tokens are used
			assert.ok(cssContent.includes("var(--paper)"));
			assert.ok(cssContent.includes("var(--teal)"));
			assert.ok(cssContent.includes("var(--muted)"));
		});
	});
});
