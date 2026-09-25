/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CDA R2 XML BUILDER & FNS TAX DEDUCTION SPECIFICATION TESTS — DENTE DENTAL CRM
 * Verification of HL7 CDA R2 XML Generation, Cyrillic XML Structure Parsing,
 * 256/512-bit GOST Signatures, C14N Detached Law, and Statutory OID Invariants
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canonicalizeCdaXml,
	escapeXml,
	formatHl7DateTime,
	formatKopecksToRubles,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificateXml,
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	validateXmlStructure,
	type EgiszDentalCdaPayload,
	type FnsTaxCertificatePayload,
	type GostSignatureInfo,
} from "../cdaR2XmlBuilder";

describe("cdaR2XmlBuilder — HL7 CDA R2 Generation & Legal Standards", () => {
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

	it("1. Generates well-formed HL7 CDA R2 XML for SEMD 105 Consultation Protocol", () => {
		const payload: EgiszDentalCdaPayload = {
			docTypeCode: "105",
			documentUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			clinic: validClinic,
			doctor: validDoctor,
			patient: validPatient,
			complaints: "Острая ноющая боль в области зуба 46 при приеме холодной пищи.",
			anamnesisMorbi: "Боль появилась 2 дня назад, постепенно усиливалась.",
			anamnesisVitae: "Аллергоанамнез не отягощен, гепатиты и туберкулез отрицает.",
			toothStates: {
				46: "C", // Кариес
				11: "N", // Здоров
			},
			toothSurfaces: {
				46: ["O", "M"],
			},
			diagnoses: [
				{
					icd10Code: "K02.1",
					icd10Name: "Кариес дентина",
					isPrimary: true,
					tooth: 46,
					clinicalDescription: "Глубокая кариозная полость на окклюзионной и медиальной поверхностях.",
				},
			],
			procedures: [
				{
					code: "A16.07.002.001",
					name: "Препарирование кариозной полости",
					tooth: 46,
				},
				{
					code: "A16.07.002.010",
					name: "Пломбирование зуба композитом светового отверждения",
					tooth: 46,
				},
			],
			recommendations: "Контрольный осмотр через 6 месяцев. Гигиена полости рта дважды в день.",
		};

		const xml = generateEgiszDentalCdaXml(payload);
		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('<ClinicalDocument xmlns="urn:hl7-org:v3"'));
		assert.ok(xml.includes(validClinic.clinicOid));
		assert.ok(xml.includes(validClinic.clinicOgrn));
		assert.ok(xml.includes("K02.1"));
		assert.ok(xml.includes("Кариес дентина"));
		assert.ok(xml.includes("A16.07.002.001"));
		assert.ok(xml.includes("Кузнецов"));
		assert.ok(xml.includes("Смирнова"));

		// Verify well-formedness
		const validation = validateXmlStructure(xml);
		assert.equal(validation.isValid, true);
		assert.equal(validation.errors.length, 0);
		assert.ok(validation.tagCount > 20);
	});

	it("2. Cyrillic XML Tag Structure Validation (FNS Tax & Minzdrav Standards)", () => {
		// Valid FNS XML with Russian Cyrillic tags
		const cyrillicXml = `<?xml version="1.0" encoding="windows-1251"?>
<Файл ИдФайл="DP_SPRMED_7701234567_770101001_20260925_0001" ВерсПрог="DenteCRM 2.5" ВерсФорм="5.01">
	<Документ КНД="1151156" ДатаДок="25.09.2026" НомДок="СПР-00123" НалогПериод="2025">
		<СвОрг НаимОрг="ООО Денте Клиник" ИННЮЛ="7701234567" КПП="770101001" ОГРН="1027700132195">
			<Контакт Тлф="+74951234567"/>
		</СвОрг>
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

		const validation = validateXmlStructure(cyrillicXml);
		assert.equal(validation.isValid, true, "Cyrillic XML must be valid");
		assert.equal(validation.errors.length, 0);
		assert.ok(validation.tagCount >= 7, "Cyrillic tags must be counted properly");

		// Invalid Cyrillic XML with unclosed tag
		const brokenCyrillicXml = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="TEST">
	<Документ НомДок="1">
		<СвОрг НаимОрг="Клиника">
			<Контакт Тлф="123"/>
		<!-- missing </СвОрг> -->
	</Документ>
</Файл>`;

		const brokenValidation = validateXmlStructure(brokenCyrillicXml);
		assert.equal(brokenValidation.isValid, false, "Must detect unclosed Cyrillic tag");
		assert.ok(brokenValidation.errors.length > 0);
		assert.ok(brokenValidation.errors.some((e) => e.includes("СвОрг") || e.includes("не совпадает")));
	});

	it("3. Supports GOST R 34.10-2012 256-bit and 512-bit XMLDSig Signature Blocks", () => {
		const sig256: GostSignatureInfo = {
			signatureBase64: "MEYCIQDx...test256base64...",
			certificateSerialNumber: "7A8B9C0D1E2F3A4B",
			certificateSubject: "CN=Смирнова Анна Сергеевна, O=ООО Денте Клиник",
			signedAt: "2026-09-25T10:00:00Z",
			algorithmOid: "1.2.643.7.1.1.1.1", // GOST 34.10-2012 256
			digestAlgorithmOid: "1.2.643.7.1.1.2.2", // GOST 34.11-2012 256
		};

		const block256 = generateGostXmlSignatureBlock(sig256, "doc-cda-root");
		assert.ok(block256.includes("gostr34102012-256"));
		assert.ok(block256.includes("gostr34112012-256"));
		assert.ok(block256.includes("7A8B9C0D1E2F3A4B"));
		assert.ok(block256.includes("doc-cda-root"));

		const sig512: GostSignatureInfo = {
			signatureBase64: "MEUCIQDz...test512base64...",
			certificateSerialNumber: "1122334455667788",
			certificateSubject: "CN=Иванов Иван Иванович, O=ООО Денте Клиник",
			signedAt: "2026-09-25T10:00:00Z",
			algorithmOid: "1.2.643.7.1.1.1.2", // GOST 34.10-2012 512
			digestAlgorithmOid: "1.2.643.7.1.1.2.3", // GOST 34.11-2012 512
		};

		const block512 = generateGostXmlSignatureBlock(sig512, "doc-cda-root");
		assert.ok(block512.includes("gostr34102012-512"));
		assert.ok(block512.includes("gostr34112012-512"));
		assert.ok(block512.includes("1122334455667788"));
	});

	it("4. Deterministic C14N Canonicalization Enforces Detached PKCS#7 Signatures", () => {
		const sampleXml = `<ClinicalDocument xmlns="urn:hl7-org:v3">
	<id root="1.2.643.5.1.13.13.12.2.77.9999" extension="doc-123"/>
	<title>Стоматологический протокол</title>
</ClinicalDocument>`;

		const canonicalized = canonicalizeCdaXml(sampleXml);
		assert.ok(canonicalized.length > 0);
		assert.ok(!canonicalized.startsWith("\uFEFF"), "BOM must be stripped");

		// Attempting enveloped XML-DSig signature insertion into canonicalization must throw
		const envelopedXml = `<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
	<title>Doc</title>
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
			() => canonicalizeCdaXml(envelopedXml),
			/enveloped|detached|disallow/i,
			"Minzdrav RF Order 947n requires detached PKCS#7 signatures and forbids enveloped transforms",
		);
	});

	it("5. Exact Integer Kopeck Conversion & Financial Precision", () => {
		// Round-trip precision
		assert.equal(formatKopecksToRubles(1250050), "12500.50");
		assert.equal(parseRublesToKopecks("12500.50"), 1250050);
		assert.equal(parseRublesToKopecks("12500,50"), 1250050);
		assert.equal(formatKopecksToRubles(0), "0.00");
		assert.equal(parseRublesToKopecks("0.00"), 0);

		// Extreme/negative values
		assert.equal(parseRublesToKopecks("-500"), 0);
		assert.equal(formatKopecksToRubles(-100), "0.00");
	});

	it("6. Generates FNS Tax Certificate (КНД 1151156) XML", () => {
		const fnsPayload: FnsTaxCertificatePayload = {
			documentNumber: "СПР-043/2026",
			documentDate: "2026-09-25",
			taxYear: 2025,
			clinic: {
				name: 'ООО "Денте Клиник"',
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1027700132195",
				phone: "+7 (495) 123-45-67",
			},
			taxpayer: {
				fullName: "Кузнецов Петр Дмитриевич",
				inn: "770298765432",
			},
			patient: {
				fullName: "Кузнецов Петр Дмитриевич",
				relationshipCode: "1", // Налогоплательщик (он же пациент)
			},
			payments: [
				{
					date: "2025-04-10",
					serviceCode: "1", // Обычное лечение
					serviceDescription: "Терапевтическое лечение кариеса",
					amountKopecks: 1500000, // 15 000 руб.
				},
				{
					date: "2025-08-20",
					serviceCode: "2", // Дорогостоящее лечение (имплантация)
					serviceDescription: "Дентальная имплантация",
					amountKopecks: 4500000, // 45 000 руб.
				},
			],
			signer: {
				fullName: "Иванов И.И.",
				position: "Главный врач",
			},
		};

		const xml = generateFnsTaxCertificateXml(fnsPayload);
		assert.ok(xml.includes("<Файл"));
		assert.ok(xml.includes('КНД="1151156"'));
		assert.ok(xml.includes('НомДок="СПР-043/2026"'));
		assert.ok(xml.includes('Сумма="15000.00"'));
		assert.ok(xml.includes('Сумма="45000.00"'));
		assert.ok(xml.includes('ИтогоСумма="60000.00"'));

		const validation = validateXmlStructure(xml);
		assert.equal(validation.isValid, true);
	});

	it("7. Generates GOST Visual Stamps (HTML & SVG) per GOST R 7.0.97-2016", () => {
		const stampHtml = generateGostSignatureStampHtml({
			signerName: "Смирнова Анна Сергеевна",
			certificateNumber: "00A1B2C3D4E5F6",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			orgName: 'ООО "Денте Клиник"',
		});

		assert.ok(stampHtml.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampHtml.includes("00A1B2C3D4E5F6"));
		assert.ok(stampHtml.includes("Смирнова Анна Сергеевна"));
		assert.ok(stampHtml.includes("Денте Клиник"));

		const stampSvg = generateGostSignatureStampSvg({
			signerName: "Смирнова Анна Сергеевна",
			certificateNumber: "00A1B2C3D4E5F6",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			orgName: 'ООО "Денте Клиник"',
		});

		assert.ok(stampSvg.startsWith("<svg"));
		assert.ok(stampSvg.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampSvg.includes("00A1B2C3D4E5F6"));
	});
});
