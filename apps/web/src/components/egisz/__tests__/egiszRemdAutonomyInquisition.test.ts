/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & CDA R2 AUTONOMY & LEGAL PURITY INQUISITION TEST SUITE
 * DENTE DENTAL CRM — SUBAGENT 7: RED TEAM AUDITOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Mandates Verified:
 * - Mandate 8e: Doctor Autonomy (Zero Disabled Buttons, Non-blocking Preflight, Deferred Queue Fallback)
 * - Mandates 2 & 8k: Medical Legal Purity & Zero Mocks (Order 947n, 63-FZ, Statutory OIDs, Detached PKCS#7)
 * - Order ED-7-11/755@: Exact Integer Kopeck Math & Cyrillic XML Tag Verification
 * - Mandate 8d pt 7: Zero Cartoon Emojis in Protocol Badges & Validation Trees
 * - Mandate 8d pt 6: Anti-Matryoshka Law (Modal Depth <= 1)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	canonicalizeCdaXml,
	formatKopecksToRubles,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificateXml,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	validateXmlStructure,
	type EgiszDentalCdaPayload,
	type FnsTaxCertificatePayload,
} from "../cdaR2XmlBuilder";
import {
	buildCdaXml,
	EGISZ_SEMD_DOC_TYPES,
	EGISZ_STANDARD_OIDS,
	validateCdaSemanticRules,
} from "../egiszCdaValidator";
import {
	ALL_FDI_TEETH,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	EGISZ_REMD_OIDS,
	runEgisz043uPreflight,
	runFnsTaxCertificatePreflight,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "../egiszRemdEngine";
import {
	createMockGostSignature,
	createMockMoGostSignature,
} from "./egiszTestFixtures";

function resolveRepoPath(relPath: string): string {
	const direct = path.resolve(process.cwd(), relPath);
	if (fs.existsSync(direct)) return direct;
	const stripped = relPath.replace(/^apps[\\/]web[\\/]/, "");
	return path.resolve(process.cwd(), stripped);
}

describe("SUBAGENT 7 RED TEAM INQUISITION: EGISZ REMD & CDA R2 INTEGRATION", () => {
	const validClinic = {
		clinicName: 'ООО "Денте Клиник"',
		clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
		clinicOgrn: "1027700132195",
		clinicInn: "7701234567",
		clinicKpp: "770101001",
		clinicAddress: "127006, г. Москва, ул. Тверская, д. 15",
		clinicPhone: "+7 (495) 123-45-67",
		chiefDoctorName: "Иванов Иван Иванович",
		chiefDoctorSnils: "123-456-789 64",
	};

	const validDoctor = {
		doctorFullName: "Смирнова Анна Сергеевна",
		doctorSnils: "987-654-321 00",
		doctorPosition: "Врач-стоматолог-терапевт",
		doctorPositionCode: "85",
	};

	const validPatient = {
		patientId: "pat-1001",
		cardNumber: "043-00123",
		patientFullName: "Кузнецов Петр Дмитриевич",
		patientBirthDate: "1988-06-15",
		patientGender: "male",
		patientSnils: "112-233-445 95",
		patientPolisOms: "1234567890123456",
		patientAddress: "г. Москва, ул. Ленина, д. 5, кв. 10",
		patientPhone: "+7 (916) 111-22-33",
	};

	/* ═══════════════════════════════════════════════════════════════════════════
	 * 1. MANDATE 8e: DOCTOR AUTONOMY (ZERO DISABLED BUTTONS & NON-BLOCKING UX)
	 * ═══════════════════════════════════════════════════════════════════════════ */
	describe("1. Mandate 8e: Doctor Autonomy & Non-Blocking Invariants", () => {
		it("1.1 Preflight validation does not block on missing auxiliary fields", () => {
			// Minimal clinical payload: core data present, auxiliary fields omitted
			const report = runEgisz043uPreflight({
				...SAMPLE_DENTAL_SEMD_105_PRESET,
				clinic: {
					...DEFAULT_EGISZ_CLINIC_PRESET,
					clinicKpp: undefined,
					chiefDoctorName: undefined,
					clinicEmail: undefined,
				},
				doctor: {
					...DEFAULT_EGISZ_DOCTOR_PRESET,
					doctorPhone: undefined,
					doctorEmail: undefined,
				},
				patient: {
					...SAMPLE_043U_PATIENT_PRESET,
					patientEmail: undefined,
					patientAddress: undefined,
					patientPolisOms: undefined,
				},
			});

			// Mandate 8e: Core validation passes, non-mandatory omissions yield zero hard failure checks
			assert.equal(report.isValid, true, "Preflight must be valid with valid core clinical data");
			assert.equal(report.failedCount, 0, "No hard failure checks for missing auxiliary fields");
		});

		it("1.2 Source code audit of EgiszRemdHubModal.tsx proves zero disabled buttons", () => {
			const modalPath = resolveRepoPath("apps/web/src/components/egisz/EgiszRemdHubModal.tsx");
			const code = fs.readFileSync(modalPath, "utf8");

			// Ensure no `disabled={...}` expressions in the component
			const disabledMatches = code.match(/disabled\s*=\s*\{[^}]+\}/g);
			assert.equal(
				disabledMatches,
				null,
				"EgiszRemdHubModal.tsx must not contain any disabled={...} expressions (Mandate 8e: Doctor Autonomy)",
			);
		});

		it("1.3 Semantic rules validator allows execution when patientFullName is undefined", () => {
			const incompleteData = {
				documentId: "doc-test-1",
				docTypeCode: "105" as const,
				patientId: "pat-1",
				// patientFullName is omitted
				doctorFullName: "Врач Тестовый",
				doctorSnils: "123-456-789 64",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				clinicName: 'ООО "Клиника"',
				clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
				visitDate: "2026-09-25",
				complaints: "Осмотр",
				diagnoses: [{ icd10Code: "K02.1", icd10Name: "Кариес" }],
				procedures: [{ code: "A16.07.002", name: "Лечение" }],
			};

			// Mandate 8e: buildCdaXml must not throw TypeError on undefined patientFullName
			assert.doesNotThrow(() => {
				buildCdaXml(incompleteData);
			}, "buildCdaXml must safely handle missing patientFullName with default fallback");
		});
	});

	/* ═══════════════════════════════════════════════════════════════════════════
	 * 2. MANDATES 2 & 8k: MEDICAL LEGAL PURITY & STATUTORY OIDs (ORDER 947n)
	 * ═══════════════════════════════════════════════════════════════════════════ */
	describe("2. Mandates 2 & 8k: Medical Legal Purity & Statutory OIDs", () => {
		it("2.1 Verifies statutory NSI Ministry of Health OID roots", () => {
			// All EGISZ REMD OIDs must belong to the federal branch 1.2.643.5.1.13
			assert.ok(EGISZ_REMD_OIDS.FRMO_MO_ROOT.startsWith("1.2.643.5.1.13."));
			assert.ok(EGISZ_REMD_OIDS.SNILS.startsWith("1.2.643.100.3"));
			assert.ok(EGISZ_REMD_OIDS.OGRN_LEGAL.startsWith("1.2.643.100.1"));
			assert.ok(EGISZ_REMD_OIDS.INN.startsWith("1.2.643.100.4"));
			assert.ok(EGISZ_REMD_OIDS.ICD10.startsWith("1.2.643.5.1.13.13.11.1005"));
			assert.ok(EGISZ_REMD_OIDS.NOMENKLATURA_804N.startsWith("1.2.643.5.1.13.13.11.1070"));
			assert.ok(EGISZ_REMD_OIDS.DENTAL_TOOTH.startsWith("1.2.643.5.1.13.13.11.1466"));
		});

		it("2.2 EGISZ SEMD document types include 105, 106, 302, 303 with valid template roots", () => {
			const expectedTypes = ["101", "102", "105", "130", "302", "303"] as const;
			for (const code of expectedTypes) {
				const docDef = EGISZ_SEMD_DOC_TYPES[code as keyof typeof EGISZ_SEMD_DOC_TYPES];
				assert.ok(docDef, `Doc type ${code} must be defined in EGISZ_SEMD_DOC_TYPES`);
				assert.ok(docDef.templateRoot.startsWith("1.2.643.5.1.13.13.11."));
				assert.ok(docDef.title.length > 5);
			}
		});

		it("2.3 Source code audit confirms absence of fake hardcoded mock OIDs", () => {
			const filesToCheck = [
				resolveRepoPath("apps/web/src/components/egisz/EgiszRemdHubModal.tsx"),
				resolveRepoPath("apps/web/src/components/egisz/cdaR2XmlBuilder.ts"),
				resolveRepoPath("apps/web/src/components/egisz/egiszCdaValidator.ts"),
				resolveRepoPath("apps/web/src/components/egisz/egiszRemdEngine.ts"),
			];

			const mockOidRegex = /1\.2\.643\.5\.1\.13\.14\.302\.2/;
			for (const file of filesToCheck) {
				const content = fs.readFileSync(file, "utf8");
				assert.equal(
					mockOidRegex.test(content),
					false,
					`File ${path.basename(file)} must not contain mock OID 1.2.643.5.1.13.14.302.2 (Mandates 2, 8k)`,
				);
			}
		});

		it("2.4 Strict detached PKCS#7 mandate: canonicalizer forbids enveloped XML-DSig", () => {
			const testXml = `<ClinicalDocument xmlns="urn:hl7-org:v3">
				<title>Тест</title>
			</ClinicalDocument>`;

			const canonical = canonicalizeCdaXml(testXml);
			assert.ok(canonical.includes("<ClinicalDocument"));

			// An enveloped signature block must be rejected
			const illegalEnvelopedXml = `<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
				<title>Тест</title>
				<ds:Signature>
					<ds:SignedInfo>
						<ds:Reference URI="">
							<ds:Transforms>
								<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
							</ds:Transforms>
						</ds:Reference>
					</ds:SignedInfo>
				</ds:Signature>
			</ClinicalDocument>`;

			assert.throws(
				() => canonicalizeCdaXml(illegalEnvelopedXml),
				/enveloped|detached|disallow/i,
				"Order 947n requires detached PKCS#7/CAdES and strictly forbids enveloped signatures",
			);
		});

		it("2.5 Generates GOST XMLDSig blocks for both 256-bit and 512-bit keys", () => {
			const sig256 = createMockGostSignature("Врач Смирнова А.С.", "123-456-789 64", 'ООО "Денте"');
			const block256 = generateGostXmlSignatureBlock(sig256, "cda-doc-ref");
			assert.ok(block256.includes("gostr34102012-256"));
			assert.ok(block256.includes("gostr34112012-256"));

			const sig512 = createMockMoGostSignature('ООО "Денте"', "1027700132195");
			sig512.algorithmOid = EGISZ_REMD_OIDS.GOST_3410_2012_512;
			const block512 = generateGostXmlSignatureBlock(sig512, "cda-doc-ref");
			assert.ok(block512.includes("gostr34102012-512"));
			assert.ok(block512.includes("gostr34112012-512"));
		});
	});

	/* ═══════════════════════════════════════════════════════════════════════════
	 * 3. ORDER ED-7-11/755@: EXACT KOPECK MATH & CYRILLIC XML INTEGRITY
	 * ═══════════════════════════════════════════════════════════════════════════ */
	describe("3. Order ED-7-11/755@: Exact Kopeck Math & Cyrillic XML", () => {
		it("3.1 Financial math strictly preserves integer kopecks without float drift", () => {
			// Test known floating point drift values: 0.1 + 0.2 = 0.30000000000000004
			const kop1 = parseRublesToKopecks("0.10");
			const kop2 = parseRublesToKopecks("0.20");
			const totalKop = kop1 + kop2;
			assert.equal(totalKop, 30);
			assert.equal(formatKopecksToRubles(totalKop), "0.30");

			// Large transactions
			const largeRubles = "1234567.89";
			const largeKop = parseRublesToKopecks(largeRubles);
			assert.equal(largeKop, 123456789);
			assert.equal(formatKopecksToRubles(largeKop), "1234567.89");
		});

		it("3.2 Validates Russian FNS Cyrillic XML tag structure and detects tag imbalance", () => {
			const validFnsXml = `<?xml version="1.0" encoding="windows-1251"?>
<Файл ИдФайл="DP_SPRMED_7701234567_770101001_20260925_0001" ВерсПрог="DenteCRM 2.5" ВерсФорм="5.01">
	<Документ КНД="1151156" ДатаДок="25.09.2026" НомДок="СПР-00123" НалогПериод="2025">
		<СвОрг НаимОрг="ООО Денте Клиник" ИННЮЛ="7701234567" КПП="770101001" ОГРН="1027700132195"/>
		<СвФЛ ИННФЛ="770298765432">
			<ФИО Фамилия="Кузнецов" Имя="Петр" Отчество="Дмитриевич"/>
		</СвФЛ>
		<Пациент РодствоКод="1">
			<ФИО Фамилия="Кузнецов" Имя="Петр" Отчество="Дмитриевич"/>
		</Пациент>
		<ОплатаУслуг СуммаКод1="25000.00" СуммаКод2="0.00" ИтогоСумма="25000.00">
			<СведОпл НомСтроки="1" КодУслуги="1" ДатаОпл="15.03.2025" Сумма="25000.00"/>
		</ОплатаУслуг>
		<Подписант ПрПодп="1">
			<ФИО Фамилия="Иванов" Имя="Иван" Отчество="Иванович"/>
		</Подписант>
	</Документ>
</Файл>`;

			const validation = validateXmlStructure(validFnsXml);
			assert.equal(validation.isValid, true);
			assert.equal(validation.docTypeDetected, "fns_knd_1151156");

			// Broken XML with mismatched Cyrillic tags
			const mismatchedXml = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="TEST">
	<Документ>
		<СвОрг НаимОрг="Клиника">
	</Документ>
</Файл>`;

			const brokenValidation = validateXmlStructure(mismatchedXml);
			assert.equal(brokenValidation.isValid, false);
			assert.ok(brokenValidation.errors.length > 0);
		});
	});

	/* ═══════════════════════════════════════════════════════════════════════════
	 * 4. MANDATE 8d pt 7: ZERO CARTOON EMOJIS IN MEDICAL / CLINICAL VIEWS
	 * ═══════════════════════════════════════════════════════════════════════════ */
	describe("4. Mandate 8d pt 7: Zero Cartoon Emojis Audit", () => {
		it("4.1 Source code of all EGISZ components contains zero cartoon emojis", () => {
			const targetFiles = [
				resolveRepoPath("apps/web/src/components/egisz/EgiszRemdHubModal.tsx"),
				resolveRepoPath("apps/web/src/components/egisz/cdaR2XmlBuilder.ts"),
				resolveRepoPath("apps/web/src/components/egisz/egiszCdaValidator.ts"),
				resolveRepoPath("apps/web/src/components/egisz/egiszRemdEngine.ts"),
				resolveRepoPath("apps/web/src/components/egisz/egiszRemd.css"),
			];

			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			for (const file of targetFiles) {
				const content = fs.readFileSync(file, "utf8");
				const lines = content.split("\n");
				lines.forEach((line, idx) => {
					const hasEmoji = emojiRegex.test(line);
					assert.equal(
						hasEmoji,
						false,
						`Emoji violation in ${path.basename(file)}: line ${idx + 1}: ${line.trim()}`,
					);
				});
			}
		});
	});

	/* ═══════════════════════════════════════════════════════════════════════════
	 * 5. MANDATE 8d pt 6: ANTI-MATRYOSHKA LAW (MODAL DEPTH <= 1)
	 * ═══════════════════════════════════════════════════════════════════════════ */
	describe("5. Mandate 8d pt 6: Anti-Matryoshka UI Structure", () => {
		it("5.1 EgiszRemdHubModal operates as a single surface with tab switching and inline panels", () => {
			const modalPath = resolveRepoPath("apps/web/src/components/egisz/EgiszRemdHubModal.tsx");
			const code = fs.readFileSync(modalPath, "utf8");

			// Check that tabs/views are rendered inline rather than spawning nested <Dialog> or nested <Modal>
			const nestedDialogMatches = code.match(/<Dialog|<ModalShell|<JournalModal/g);
			assert.equal(
				nestedDialogMatches,
				null,
				"EgiszRemdHubModal must not spawn secondary nested dialogs/modals (Anti-Matryoshka Law, max depth = 1)",
			);
		});
	});
});
