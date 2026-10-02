import assert from "node:assert";
import { describe, it } from "node:test";
import {
	CLINICAL_DOMAIN_KEYWORDS,
	STATUTORY_CONSENT_KEY_LABELS,
	detectConsentScopeMismatch,
	detectDomainKeywords,
	detectRequiredVisitConsents,
	getConsentStatutoryTitle,
	isConsentCovered,
} from "../consentSsotEngine";
import { resolveConsentKeyFromDocument } from "../../visit/consents/visitConsentTypes";

describe("Consent SSOT Engine Suite (323-ФЗ, 1051н, 152-ФЗ, Mandates 8e & 8n)", () => {
	describe("1. Statutory Consent Titles & Dictionary", () => {
		it("provides full statutory titles for all canonical 1051n and 152-FZ consent keys", () => {
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_INSPECTION_1051N.includes("1051н"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_ANESTHESIA.includes("обезболивание"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_THERAPY.includes("терапевтическое"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_SURGERY_IMPLANT.includes("хирургическое"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_ORTHOPEDICS.includes("ортопедическое"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_ORTHODONTICS.includes("ортодонтическое"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_HYGIENE_BLEACHING.includes("гигиену"));
			assert.ok(STATUTORY_CONSENT_KEY_LABELS.CONSENT_PERSONAL_DATA.includes("152-ФЗ"));
		});

		it("getConsentStatutoryTitle returns registered label or falls back to key", () => {
			assert.equal(
				getConsentStatutoryTitle("CONSENT_ANESTHESIA"),
				STATUTORY_CONSENT_KEY_LABELS.CONSENT_ANESTHESIA,
			);
			assert.equal(getConsentStatutoryTitle("UNKNOWN_CUSTOM_KEY"), "UNKNOWN_CUSTOM_KEY");
		});
	});

	describe("2. Domain Keyword Recognition", () => {
		it("detects surgical keywords in clinical text", () => {
			const detected = detectDomainKeywords("Сложное удаление ретинированного зуба 38", "surgery");
			assert.ok(detected.includes("удал"));
			assert.ok(detected.includes("ретинир"));
		});

		it("detects anesthesia keywords in clinical text", () => {
			const detected = detectDomainKeywords("Мандибулярная анестезия артикаин 4% 1.7 мл", "anesthesia");
			assert.ok(detected.includes("анестез"));
			assert.ok(detected.includes("артикаин"));
		});

		it("detects orthopedics keywords in clinical text", () => {
			const detected = detectDomainKeywords("Препарирование зуба 11 под коронку из диоксида циркония", "orthopedics");
			assert.ok(detected.includes("препарирован"));
			assert.ok(detected.includes("коронк"));
			assert.ok(detected.includes("циркони"));
		});

		it("detects therapy keywords in clinical text", () => {
			const detected = detectDomainKeywords("Лечение глубокого кариеса зуба 46 с постановкой пломбы светового отверждения", "therapy");
			assert.ok(detected.includes("кариес"));
			assert.ok(detected.includes("пломб"));
		});
	});

	describe("3. Visit Required Consents Evaluation", () => {
		it("requires inspection 1051n, anesthesia, and therapy when visit is open and blank", () => {
			const flags = detectRequiredVisitConsents({
				textContext: "",
				isVisitClosed: false,
				hasInspectionSigned: false,
			});
			assert.equal(flags.CONSENT_INSPECTION_1051N, true);
			assert.equal(flags.CONSENT_ANESTHESIA, true);
			assert.equal(flags.CONSENT_THERAPY, true);
			assert.equal(flags.CONSENT_SURGERY_IMPLANT, undefined);
		});

		it("detects surgical intervention and flags surgery consent", () => {
			const flags = detectRequiredVisitConsents({
				textContext: "Диагноз: дистопия зуба 48. Операция удаления зуба.",
				isVisitClosed: false,
				hasInspectionSigned: true,
			});
			assert.equal(flags.CONSENT_INSPECTION_1051N, undefined);
			assert.equal(flags.CONSENT_SURGERY_IMPLANT, true);
		});

		it("does not re-flag inspection if already signed", () => {
			const flags = detectRequiredVisitConsents({
				textContext: "Лечение кариеса",
				isVisitClosed: true,
				hasInspectionSigned: true,
			});
			assert.equal(flags.CONSENT_INSPECTION_1051N, undefined);
		});
	});

	describe("4. Consent Scope Mismatch & Invalidation", () => {
		it("detects missing surgical consent when treatment plan adds extraction to therapy", () => {
			const result = detectConsentScopeMismatch({
				signedConsentKeys: ["CONSENT_INSPECTION_1051N", "CONSENT_THERAPY", "CONSENT_ANESTHESIA"],
				treatmentPlanText: "Назначено удаление зуба 38 по ортодонтическим показаниям",
			});
			assert.equal(result.hasMismatch, true);
			assert.equal(result.canProceed, false);
			assert.ok(result.uncoveredTemplateKeys.includes("CONSENT_SURGERY_IMPLANT"));
		});

		it("returns no mismatch when all planned domains are covered by signed keys", () => {
			const result = detectConsentScopeMismatch({
				signedConsentKeys: [
					"CONSENT_INSPECTION_1051N",
					"CONSENT_THERAPY",
					"CONSENT_ANESTHESIA",
					"CONSENT_SURGERY_IMPLANT",
				],
				treatmentPlanText: "Удаление зуба 48 и пломбирование 47",
			});
			assert.equal(result.hasMismatch, false);
			assert.equal(result.canProceed, true);
			assert.equal(result.mismatchedItems.length, 0);
		});
	});

	describe("5. Mandate 8n (Zero Dead-Ends: Emergency / CITO Bypass)", () => {
		it("CITO acute pain NEVER blocks doctor treatment even when consent is missing", () => {
			const result = detectConsentScopeMismatch({
				signedConsentKeys: [], // Ни одного согласия не подписано
				complaintText: "Острая пульсирующая боль в области зуба 46, гноетечение",
				treatmentPlanText: "Неотложное вскрытие полости зуба, депульпирование, эвакуация экссудата",
				isCito: true, // Режим острой боли
			});

			assert.equal(result.hasMismatch, true);
			assert.equal(result.isCito, true);
			// Врачебная автономия (Мандат 8e & 8n): спасение жизни приоритетно!
			assert.equal(result.canProceed, true, "CITO must allow doctor to proceed without disabled buttons");
			assert.ok(result.warningTitle.includes("CITO"), "Title must highlight emergency care protocol");
			assert.ok(result.legalRiskNotice.includes("323-ФЗ"), "Legal notice must cite emergency care statute 323-FZ");
		});
	});

	describe("6. Consent Coverage Predicate", () => {
		it("accurately verifies domain coverage", () => {
			const keys = ["CONSENT_ANESTHESIA", "CONSENT_THERAPY"];
			assert.equal(isConsentCovered("CONSENT_ANESTHESIA", keys), true);
			assert.equal(isConsentCovered("CONSENT_THERAPY", new Set(keys)), true);
			assert.equal(isConsentCovered("CONSENT_SURGERY_IMPLANT", keys), false);
		});
	});

	describe("7. Document to Consent Key Reverse Resolution (Mandate 8za SSOT)", () => {
		it("resolves direct consentKey from payload", () => {
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "procedure_specific_consent_packet",
					payload: { consentKey: "CONSENT_THERAPY" },
				}),
				"CONSENT_THERAPY",
			);
		});

		it("resolves procedure types to corresponding consent keys", () => {
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "procedure_specific_consent_packet",
					payload: { procedureType: "therapy_endo_restoration" },
				}),
				"CONSENT_THERAPY",
			);
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "procedure_specific_consent_packet",
					payload: { procedureType: "surgery_extraction" },
				}),
				"CONSENT_SURGERY_IMPLANT",
			);
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "procedure_specific_consent_packet",
					payload: { procedureType: "prosthetics" },
				}),
				"CONSENT_ORTHOPEDICS",
			);
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "procedure_specific_consent_packet",
					payload: { procedureType: "professional_hygiene" },
				}),
				"CONSENT_HYGIENE_BLEACHING",
			);
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "procedure_specific_consent_packet",
					payload: { procedureSpecificConsent: { procedureType: "minor_general" } },
				}),
				"CONSENT_PEDIATRIC",
			);
		});

		it("resolves legacy and statutory document kinds", () => {
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "informed_consent",
				}),
				"CONSENT_INSPECTION_1051N",
			);
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "anesthesia_consent_log",
				}),
				"CONSENT_ANESTHESIA",
			);
			assert.equal(
				resolveConsentKeyFromDocument({
					kind: "personal_data_processing_consent",
				}),
				"CONSENT_PERSONAL_DATA",
			);
		});
	});
});
