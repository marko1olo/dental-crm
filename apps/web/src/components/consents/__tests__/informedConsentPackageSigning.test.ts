import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONSENT_PACKAGES,
	CONSENT_TEMPLATES,
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	getAllConsentPackages,
	getAllConsentTemplates,
	getBlankConsentSubstitutionContext,
	getConsentPackage,
	getConsentTemplate,
	generateConsentPackagePrintHtml,
	renderConsentTemplate,
} from "../consentTemplates.js";
import {
	generateConsentIntegrityHash,
	generatePaperSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
} from "../signaturePadMath.js";
import { PACKAGE_SHORT_TITLES, TEMPLATE_SHORT_TITLES } from "../InformedConsentModal.js";

describe("Informed Consent Packages & Batch Signing Suite (Mandates 8e, 8i, 8k, 8n)", () => {
	const mockContext: ConsentSubstitutionContext = {
		patientName: "Иванов Иван Иванович",
		birthDate: "15.05.1985",
		passport: "4508 № 123456, выдан ОВД г. Москвы",
		doctorName: "Петрова Анна Сергеевна",
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicLegalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicAddress: "г. Москва, ул. Профсоюзная, д. 45",
		clinicOgrn: "1157746123456",
		licenseNumber: "ЛО41-01137-77/00345678",
		diagnosisIcd: "K02.1 Кариес дентина",
		toothNumbers: "2.5, 2.6",
		date: "06.09.2026",
		phone: "+7 (999) 123-45-67",
	};

	describe("1. Statutory Packages & Template Registry (Mandates 8e, 8i)", () => {
		it("registers all 3 canonical clinical packages with valid keys", () => {
			const packages = getAllConsentPackages();
			assert.equal(packages.length, 3);

			const expectedKeys: ConsentPackageKey[] = [
				"PACKAGE_PRIMARY_VISIT",
				"PACKAGE_SURGERY",
				"PACKAGE_ORTHOPEDICS",
			];

			for (const key of expectedKeys) {
				assert.ok(CONSENT_PACKAGES[key], `Package ${key} must exist in CONSENT_PACKAGES`);
				assert.ok(PACKAGE_SHORT_TITLES[key], `Short title for ${key} must exist`);
			}
		});

		it("PACKAGE_PRIMARY_VISIT contains 152-ФЗ, 1051н, Анестезия, Терапия (4 documents)", () => {
			const pkg = getConsentPackage("PACKAGE_PRIMARY_VISIT");
			assert.equal(pkg.templateKeys.length, 4);
			assert.deepEqual(pkg.templateKeys, [
				"CONSENT_PERSONAL_DATA",
				"CONSENT_INSPECTION_1051N",
				"CONSENT_ANESTHESIA",
				"CONSENT_THERAPY",
			]);
		});

		it("PACKAGE_SURGERY contains 152-ФЗ, Анестезия, Хирургия (3 documents)", () => {
			const pkg = getConsentPackage("PACKAGE_SURGERY");
			assert.equal(pkg.templateKeys.length, 3);
			assert.deepEqual(pkg.templateKeys, [
				"CONSENT_PERSONAL_DATA",
				"CONSENT_ANESTHESIA",
				"CONSENT_SURGERY_IMPLANT",
			]);
		});

		it("PACKAGE_ORTHOPEDICS contains 152-ФЗ, Анестезия, Ортопедия (3 documents)", () => {
			const pkg = getConsentPackage("PACKAGE_ORTHOPEDICS");
			assert.equal(pkg.templateKeys.length, 3);
			assert.deepEqual(pkg.templateKeys, [
				"CONSENT_PERSONAL_DATA",
				"CONSENT_ANESTHESIA",
				"CONSENT_ORTHOPEDICS",
			]);
		});

		it("all templates referenced in packages exist in CONSENT_TEMPLATES", () => {
			for (const pkg of Object.values(CONSENT_PACKAGES)) {
				for (const tplKey of pkg.templateKeys) {
					assert.ok(CONSENT_TEMPLATES[tplKey], `Template ${tplKey} must exist in CONSENT_TEMPLATES`);
					const tpl = getConsentTemplate(tplKey);
					assert.ok(tpl.title.length > 0, `Template ${tplKey} must have non-empty title`);
					assert.ok(tpl.sections.length > 0, `Template ${tplKey} must have sections`);
				}
			}
		});

		it("CONSENT_INSPECTION_1051N conforms to statutory standards (Приказ МЗ РФ № 1051н)", () => {
			const tpl = getConsentTemplate("CONSENT_INSPECTION_1051N");
			assert.equal(tpl.code, "ИДС-1051н");
			assert.ok(tpl.statutoryBasis.includes("1051н"));
			assert.ok(TEMPLATE_SHORT_TITLES.CONSENT_INSPECTION_1051N);

			const rendered = renderConsentTemplate(tpl, mockContext);
			assert.ok(rendered.fullTextContent.includes("1051н"));
			assert.ok(rendered.fullTextContent.includes("Иванов Иван Иванович"));
			assert.ok(rendered.fullTextContent.includes("радиовизиографию"));
			assert.ok(rendered.fullTextContent.includes("СанПиН 2.6.1.1192-03"));
		});
	});

	describe("2. Frictionless Blank Context & 403-Free Paper Printing (Mandates 8e, 8n)", () => {
		it("getBlankConsentSubstitutionContext populates underlined blanks for pre-fill without patient data", () => {
			const blankCtx = getBlankConsentSubstitutionContext({
				clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
				clinicAddress: "г. Москва, ул. Профсоюзная, д. 45",
				licenseNumber: "ЛО41-01137-77/00345678",
			});

			assert.ok(blankCtx.patientName?.includes("_____"));
			assert.ok(blankCtx.passport?.includes("_____"));
			assert.ok(blankCtx.birthDate?.includes("_____"));
			assert.equal(blankCtx.clinicName, "ООО «Стоматологическая клиника ДЕНТЕ»");
			assert.equal(blankCtx.clinicAddress, "г. Москва, ул. Профсоюзная, д. 45");
		});

		it("generateConsentPackagePrintHtml generates multi-page HTML with page breaks for blank package", () => {
			const html = generateConsentPackagePrintHtml("PACKAGE_PRIMARY_VISIT", {
				mode: "blank",
				clinicDefaults: {
					clinicName: "ООО «ДЕНТЕ»",
				},
			});

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("page-break-after: always;"));
			assert.ok(html.includes("СОГЛ-152-ПДН"));
			assert.ok(html.includes("ИДС-1051н"));
			assert.ok(html.includes("ИДС-06-АНЕСТ")); // Анестезия
			assert.ok(html.includes("ИДС-01-ТЕР")); // Терапия
			assert.ok(html.includes("________________________________________"));
		});

		it("generateConsentPackagePrintHtml generates filled multi-page HTML with substituted patient context", () => {
			const html = generateConsentPackagePrintHtml("PACKAGE_SURGERY", {
				mode: "filled",
				context: mockContext,
			});

			assert.ok(html.includes("Иванов Иван Иванович"));
			assert.ok(html.includes("Петрова Анна Сергеевна"));
			assert.ok(html.includes("СОГЛ-152-ПДН"));
			assert.ok(html.includes("ИДС-06-АНЕСТ"));
			assert.ok(html.includes("ИДС-02-ХИР-ИМПЛ")); // Хирургия
		});
	});

	describe("3. Batch Cryptographic Integrity Hashes SHA-256 (Mandates 8e, 8k)", () => {
		it("computes distinct SHA-256 integrity hash for each document in a package", () => {
			const pkg = getConsentPackage("PACKAGE_PRIMARY_VISIT");
			const hashes: string[] = [];

			for (const tplKey of pkg.templateKeys) {
				const tpl = getConsentTemplate(tplKey);
				const rend = renderConsentTemplate(tpl, mockContext);
				const hashRecord = generateConsentIntegrityHash({
					documentText: rend.fullTextContent,
					patientInfo: {
						name: mockContext.patientName,
						passportOrBirth: mockContext.passport,
						phone: mockContext.phone,
					},
					timestamp: 1700000000000,
					strokes: [],
					verificationMethod: "paper_physical",
				});

				assert.equal(hashRecord.hash.length, 64, "SHA-256 hash must be 64 hexadecimal characters");
				assert.match(hashRecord.hash, /^[0-9a-f]{64}$/i);
				hashes.push(hashRecord.hash);
			}

			// All 4 documents in the package must have unique hashes because their statutory texts differ
			const uniqueHashes = new Set(hashes);
			assert.equal(uniqueHashes.size, pkg.templateKeys.length);
		});

		it("detects document tampering: altered text results in completely different hash", () => {
			const tpl = getConsentTemplate("CONSENT_THERAPY");
			const rend1 = renderConsentTemplate(tpl, mockContext);
			const hash1 = generateConsentIntegrityHash({
				documentText: rend1.fullTextContent,
				patientInfo: { name: mockContext.patientName },
				timestamp: 1700000000000,
				strokes: [],
				verificationMethod: "paper_physical",
			});

			const hash2 = generateConsentIntegrityHash({
				documentText: rend1.fullTextContent + " [ИЗМЕНЕНИЕ: Несанкционированный текст]",
				patientInfo: { name: mockContext.patientName },
				timestamp: 1700000000000,
				strokes: [],
				verificationMethod: "paper_physical",
			});

			assert.notEqual(hash1.hash, hash2.hash);
		});
	});

	describe("4. Paper Signature Fallback SVG & Fast 1-Click Support (Mandate 8e)", () => {
		it("generatePaperSignatureSvg outputs valid SVG with legal stamp and date", () => {
			const svg = generatePaperSignatureSvg({
				date: "06.09.2026",
				clinicName: "ООО «ДЕНТЕ»",
			});

			assert.ok(svg.startsWith("<svg"));
			assert.ok(svg.endsWith("</svg>"));
			assert.ok(svg.includes("ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ"));
			assert.ok(svg.includes("06.09.2026"));
			assert.ok(svg.includes("323-ФЗ ст. 20"));
		});

		it("PAPER_SIGNATURE_FALLBACK_PNG is a valid PNG base64 data URI", () => {
			assert.ok(PAPER_SIGNATURE_FALLBACK_PNG.startsWith("data:image/png;base64,"));
			assert.ok(PAPER_SIGNATURE_FALLBACK_PNG.length > 50);
		});
	});
});
