import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	ALL_VALID_FDI_TOOTH_NUMBERS,
	EGISZ_OIDS,
	VALID_ADULT_TOOTH_NUMBERS,
	VALID_CHILD_TOOTH_NUMBERS,
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
	escapeXml,
	formatHl7DateTime,
	generateDentalCdaXml,
	isAdultToothNumber,
	isChildToothNumber,
	isValidFdiToothNumber,
	isValidSnils,
	normalizeDentalCondition,
	normalizeSnils,
	normalizeToothSurfaces,
	validateCdaParams,
	validateFdiTooth,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOid,
	validateOrder804nCode,
} from "./index.js";

describe("SEMD 108 Dental CDA R2 Generator & Validator", () => {
	const validPatientSnils = "112-233-445 95";
	const validDoctorSnils = "000-001-001 00"; // pre-2006 exempt number

	const completeDentalParams = {
		patientId: "pat-8830192",
		patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
		patientSnils: validPatientSnils,
		patientBirthDate: "1985-06-15",
		patientGender: "male" as const,
		patientAddress: "г. Москва, ул. Тверская, д. 12, кв. 45",
		patientPhone: "+79991234567",
		patientEmail: "ivanov@example.com",
		clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
		clinicName: "ООО Стоматологическая клиника ДЕНТЕ",
		clinicOgrn: "1027700132195",
		clinicInn: "7701123456",
		clinicAddress: "г. Москва, пер. Сивцев Вражек, д. 25",
		clinicPhone: "+74951112233",
		clinicEmail: "info@dente-clinic.ru",
		doctorName: { first: "Алексей", last: "Смирнов", middle: "Михайлович" },
		doctorSnils: validDoctorSnils,
		doctorPosition: "врач-стоматолог-терапевт",
		doctorPositionCode: "18",
		doctorPhone: "+74950000000",
		doctorEmail: "smirnov@dente-clinic.ru",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина",
		diagnosisTooth: "46",
		// Section 1: Anamnesis and Complaints
		anamnesis:
			"Жалобы на кратковременные боли в области зуба 46 от температурных раздражителей (холодное, горячее).",
		// Section 2: Dental Status (Odontogram)
		dentalStatus: [
			{
				tooth: "46",
				surfaces: ["O", "D"],
				condition: "C",
				description: "Кариозная полость средней глубины, дентин размягчен",
			},
			{
				tooth: "36",
				surfaces: ["O"],
				condition: "Pl",
				description: "Краевое прилегание удовлетворительное",
			},
			{
				tooth: "18",
				condition: "A",
				description: "Ранее удален",
			},
		],
		objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, без патологических элементов.",
		// Section 4: Services Rendered (Order 804n)
		services: [
			{
				code: "A11.07.012",
				name: "Проводниковая анестезия",
				quantity: 1,
				tooth: "46",
			},
			{
				code: "A16.07.002.001",
				name: "Восстановление зуба пломбой с использованием материалов светового отверждения",
				quantity: 1,
				tooth: "46",
			},
		],
		treatmentDescription: "Проведено препарирование кариозной полости зуба 46, антисептическая обработка, пломбирование Filtek Z250.",
		// Section 5: Recommendations
		recommendations: [
			"Воздержаться от приема пищи в течение 2 часов до окончания действия анестезии.",
			"Соблюдать индивидуальную гигиену полости рта (чистка зубов 2 раза в день, использование флосса).",
			"Профилактический осмотр через 6 месяцев.",
		],
		complications: "Осложнений в ходе лечения не возникло.",
		comorbidities: "Хронический гастрит в стадии ремиссии.",
		instrumentTrayBarcode: "TRAY-2026-08-991",
		visitDate: new Date("2026-08-18T17:00:00.000Z"),
		documentId: "doc-uuid-108-v1",
		encounterId: "visit-uuid-108",
		documentSetId: "set-uuid-108",
		documentVersion: 1,
	};

	describe("1. Full 5-Section SEMD 108 XML Generation & Structural Compliance", () => {
		it("generates complete XML meeting Russian Minzdrav SEMD 108 root and header specifications", () => {
			const res = generateDentalCdaXml(completeDentalParams);
			assert.equal(res.success, true);
			if (!res.success) return;

			const xml = res.xml;

			// XML Declaration & Root Container
			assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
			assert.ok(xml.includes("<ClinicalDocument xmlns=\"urn:hl7-org:v3\""));
			assert.ok(xml.includes("<realmCode code=\"RU\"/>"));
			assert.ok(xml.includes("<typeId root=\"2.16.840.1.113883.1.3\" extension=\"POCD_HD000040\"/>"));

			// Template OIDs for SEMD 108 and Consultation Protocol
			assert.ok(xml.includes(`<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108}"/>`));
			assert.ok(xml.includes(`<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_CONSULTATION}"/>`));

			// Document Type 108 (Виды медицинской документации)
			assert.ok(xml.includes(`code="108" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}"`));
			assert.ok(xml.includes("Протокол консультации (стоматология)"));
			assert.ok(xml.includes("<title>Протокол стоматологического осмотра (консультации)</title>"));
			assert.ok(xml.includes("<languageCode code=\"ru-RU\"/>"));
			assert.ok(xml.includes("<confidentialityCode code=\"N\""));

			// Versioning and Set ID
			assert.ok(xml.includes(`extension="set-uuid-108"`));
			assert.ok(xml.includes("<versionNumber value=\"1\"/>"));
		});

		it("emits correct header roles: recordTarget, author, custodian, legalAuthenticator, encompassingEncounter", () => {
			const res = generateDentalCdaXml(completeDentalParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			const xml = res.xml;

			// Patient Role
			assert.ok(xml.includes("<recordTarget>"));
			assert.ok(xml.includes(`<id root="${EGISZ_OIDS.SNILS}" extension="112-233-445 95"/>`));
			assert.ok(xml.includes("<family>Иванов</family>"));
			assert.ok(xml.includes("<given>Иван</given>"));
			assert.ok(xml.includes("<given>Иванович</given>"));
			assert.ok(xml.includes("<administrativeGenderCode code=\"1\""));
			assert.ok(xml.includes("<birthTime value=\"19850615\"/>"));
			assert.ok(xml.includes("<streetAddressLine>г. Москва, ул. Тверская, д. 12, кв. 45</streetAddressLine>"));
			assert.ok(xml.includes("<telecom value=\"tel:+79991234567\"/>"));
			assert.ok(xml.includes("<telecom value=\"mailto:ivanov@example.com\"/>"));

			// Author Role
			assert.ok(xml.includes("<author>"));
			assert.ok(xml.includes("<family>Смирнов</family>"));
			assert.ok(xml.includes("<given>Алексей</given>"));
			assert.ok(xml.includes("<given>Михайлович</given>"));
			assert.ok(xml.includes(`code="18" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}"`));

			// Custodian
			assert.ok(xml.includes("<custodian>"));
			assert.ok(xml.includes("<name>ООО Стоматологическая клиника ДЕНТЕ</name>"));
			assert.ok(xml.includes(`root="${EGISZ_OIDS.OGRN_LEGAL}" extension="1027700132195"`));
			assert.ok(xml.includes(`root="${EGISZ_OIDS.INN}" extension="7701123456"`));

			// Legal Authenticator
			assert.ok(xml.includes("<legalAuthenticator>"));
			assert.ok(xml.includes("<signatureCode code=\"S\"/>"));

			// Encounter Linkage
			assert.ok(xml.includes("<encompassingEncounter>"));
			assert.ok(xml.includes(`extension="visit-uuid-108"`));
			assert.ok(xml.includes(`code="AMB" codeSystem="${EGISZ_OIDS.MEDICAL_CARE_TYPE}"`));
		});

		it("generates all 5 mandatory structured sections inside <structuredBody>", () => {
			const res = generateDentalCdaXml(completeDentalParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			const xml = res.xml;

			// Section 1: Anamnesis (LOINC 10164-2)
			assert.ok(xml.includes(`<code code="${EGISZ_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_OIDS.LOINC}"`));
			assert.ok(xml.includes("<title>Анамнез и жалобы</title>"));
			assert.ok(xml.includes("Жалобы на кратковременные боли в области зуба 46"));

			// Section 2: Dental Status / Odontogram (LOINC 29545-1)
			assert.ok(xml.includes(`<code code="${EGISZ_OIDS.LOINC_DENTAL_STATUS}" codeSystem="${EGISZ_OIDS.LOINC}"`));
			assert.ok(xml.includes("<title>Стоматологический статус (Зубная формула)</title>"));

			// Section 3: ICD-10 Diagnosis (LOINC 29548-5)
			assert.ok(xml.includes(`<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_OIDS.LOINC}"`));
			assert.ok(xml.includes("<title>Диагноз</title>"));
			assert.ok(xml.includes(`code="K02.1" codeSystem="${EGISZ_OIDS.ICD10}"`));
			assert.ok(xml.includes("Кариес дентина (МКБ-10: K02.1) · зуб 46"));

			// Section 4: Services Rendered (LOINC 47519-4)
			assert.ok(xml.includes(`<code code="${EGISZ_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_OIDS.LOINC}"`));
			assert.ok(xml.includes("<title>Оказанные медицинские услуги (Номенклатура 804н)</title>"));
			assert.ok(xml.includes(`code="A11.07.012" codeSystem="${EGISZ_OIDS.ORDER_804N}"`));
			assert.ok(xml.includes(`code="A16.07.002.001" codeSystem="${EGISZ_OIDS.ORDER_804N}"`));

			// Section 5: Recommendations (LOINC 18776-5)
			assert.ok(xml.includes(`<code code="${EGISZ_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_OIDS.LOINC}"`));
			assert.ok(xml.includes("<title>Рекомендации</title>"));
			assert.ok(xml.includes("1. Воздержаться от приема пищи в течение 2 часов"));
			assert.ok(xml.includes("2. Соблюдать индивидуальную гигиену полости рта"));
			assert.ok(xml.includes("3. Профилактический осмотр через 6 месяцев."));
		});
	});

	describe("2. 5-Surface FDI ISO 3950 Odontogram Table & Observations", () => {
		it("renders HTML 5-surface table and structured <entry><observation> for tooth statuses", () => {
			const res = generateDentalCdaXml(completeDentalParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			const xml = res.xml;

			// Table verification
			assert.ok(xml.includes("<th>Зуб (FDI)</th>"));
			assert.ok(xml.includes("<th>Поверхности (V, L, O, M, D)</th>"));
			assert.ok(xml.includes("<td>46</td>"));
			assert.ok(xml.includes("<td>O, D (Окклюзионная (режущий край), Дистальная)</td>"));
			assert.ok(xml.includes("<td>C (Кариес дентина (средний))</td>"));
			assert.ok(xml.includes("<td>36</td>"));
			assert.ok(xml.includes("<td>O (Окклюзионная (режущий край))</td>"));
			assert.ok(xml.includes("<td>Pl (Пломба)</td>"));

			// Structured observation with targetSiteCode and qualifiers
			assert.ok(xml.includes(`<targetSiteCode code="46" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб 46">`));
			assert.ok(xml.includes(`<name code="SURF_O" displayName="Окклюзионная (режущий край)"/>`));
			assert.ok(xml.includes(`<value code="SURF_D" displayName="Дистальная"/>`));
			assert.ok(xml.includes(`<value xsi:type="CD" code="CARIES_MEDIA" displayName="Кариес дентина (средний)"/>`));

			// Single surface qualifier for tooth 36
			assert.ok(xml.includes(`<targetSiteCode code="36" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб 36">`));
			assert.ok(xml.includes(`<value xsi:type="CD" code="FILLING" displayName="Пломба"/>`));
		});

		it("normalizes Russian dental condition codes accurately", () => {
			assert.equal(normalizeDentalCondition("C").code, "CARIES_MEDIA");
			assert.equal(normalizeDentalCondition("Кариес").code, "CARIES_MEDIA");
			assert.equal(normalizeDentalCondition("P").code, "PULPITIS");
			assert.equal(normalizeDentalCondition("Pt").code, "PERIODONTITIS");
			assert.equal(normalizeDentalCondition("Pl").code, "FILLING");
			assert.equal(normalizeDentalCondition("K").code, "CROWN");
			assert.equal(normalizeDentalCondition("A").code, "ABSENT");
			assert.equal(normalizeDentalCondition("Im").code, "IMPLANT");
			assert.equal(normalizeDentalCondition("F").code, "FRACTURE");
			assert.equal(normalizeDentalCondition("INTACT").code, "INTACT");
		});

		it("normalizes 5 anatomical tooth surfaces (V, L, O, M, D) from various formats", () => {
			const surfs1 = normalizeToothSurfaces(["V", "O", "M"]);
			assert.equal(surfs1.length, 3);
			assert.equal(surfs1[0]?.code, "SURF_V");
			assert.equal(surfs1[1]?.code, "SURF_O");
			assert.equal(surfs1[2]?.code, "SURF_M");

			const surfs2 = normalizeToothSurfaces("vestibular, palatal, incisal, distal");
			assert.equal(surfs2.length, 4);
			assert.equal(surfs2[0]?.code, "SURF_V");
			assert.equal(surfs2[1]?.code, "SURF_L");
			assert.equal(surfs2[2]?.code, "SURF_O");
			assert.equal(surfs2[3]?.code, "SURF_D");

			const surfs3 = normalizeToothSurfaces("Щ, О, Д");
			assert.equal(surfs3.length, 3);
			assert.equal(surfs3[0]?.code, "SURF_V");
			assert.equal(surfs3[1]?.code, "SURF_O");
			assert.equal(surfs3[2]?.code, "SURF_D");
		});

		it("validates adult (11..48) and deciduous child (51..85) FDI ISO 3950 tooth numbers", () => {
			assert.equal(ALL_VALID_FDI_TOOTH_NUMBERS.length, 52); // 32 adult + 20 deciduous
			assert.equal(VALID_ADULT_TOOTH_NUMBERS.length, 32);
			assert.equal(VALID_CHILD_TOOTH_NUMBERS.length, 20);

			// Adult teeth
			assert.equal(isAdultToothNumber(11), true);
			assert.equal(isAdultToothNumber(48), true);
			assert.equal(isAdultToothNumber(51), false);

			// Child teeth
			assert.equal(isChildToothNumber(51), true);
			assert.equal(isChildToothNumber(85), true);
			assert.equal(isChildToothNumber(11), false);

			// Invalid tooth numbers
			assert.equal(isValidFdiToothNumber(99), false);
			assert.equal(isValidFdiToothNumber(0), false);
			assert.equal(isValidFdiToothNumber(19), false);
			assert.equal(isValidFdiToothNumber(29), false);
			assert.equal(isValidFdiToothNumber(56), false);
		});
	});

	describe("3. FRNSI / FRMO / FRMR OID & Code Validation", () => {
		it("validates standard OID syntax according to ITU-T X.660", () => {
			assert.equal(validateOid("1.2.643.5.1.13.13.12.2"), true);
			assert.equal(validateOid("1.2.643.5.1.13.13.12.2.77.1001"), true);
			assert.equal(validateOid("2.16.840.1.113883.6.1"), true);
			assert.equal(validateOid(""), false);
			assert.equal(validateOid("not-an-oid"), false);
			assert.equal(validateOid("1..2"), false);
			assert.equal(validateOid("3.1.2"), false); // root must be 0, 1, or 2
		});

		it("validates FRMO Medical Organization OID hierarchy", () => {
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2"), true);
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2.77.1001"), true);
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.11.108"), false); // template, not MO root
		});

		it("validates ICD-10 and Order 804n code formats", () => {
			assert.equal(validateIcd10Code("K02.1"), true);
			assert.equal(validateIcd10Code("K04.0"), true);
			assert.equal(validateIcd10Code("Z01.2"), true);
			assert.equal(validateIcd10Code("123"), false);
			assert.equal(validateIcd10Code("invalid"), false);

			assert.equal(validateOrder804nCode("A11.07.012"), true);
			assert.equal(validateOrder804nCode("A16.07.002.001"), true);
			assert.equal(validateOrder804nCode("B01.065.001"), true);
			assert.equal(validateOrder804nCode("C99.00.001"), false);
		});

		it("validates OGRN and INN checksums", () => {
			assert.equal(validateOgrn("1027700132195"), true);
			assert.equal(validateOgrn("1027700132190"), false); // wrong check digit
			assert.equal(validateOgrn("12345"), false);

			assert.equal(validateInn("7701123456"), false); // invalid check digit
			assert.equal(validateInn("123"), false);
		});

		it("pre-flight validateCdaParams produces detailed errors and warnings", () => {
			const invalidParams = {
				...completeDentalParams,
				patientSnils: "123-456-789 01", // invalid checksum
				icd10Code: "999-bad-code",
				dentalStatus: [
					{ tooth: 99, condition: "C" }, // invalid FDI tooth
				],
			};

			const valRes = validateCdaParams(invalidParams);
			assert.equal(valRes.valid, false);
			assert.ok(valRes.errors.some((e) => e.includes("СНИЛС")));
			assert.ok(valRes.errors.some((e) => e.includes("МКБ-10")));
			assert.ok(valRes.errors.some((e) => e.includes("FDI")));
		});
	});

	describe("4. SNILS Checksum Algorithm Validation (192p)", () => {
		it("normalizes and validates compliant Russian SNILS numbers", () => {
			assert.equal(normalizeSnils("112-233-445 95"), "11223344595");
			assert.equal(normalizeSnils(11223344595), "11223344595");
			assert.equal(isValidSnils("112-233-445 95"), true);
			assert.equal(isValidSnils("11223344595"), true);
		});

		it("rejects invalid checksums and non-11-digit inputs", () => {
			assert.equal(isValidSnils("123-456-789 01"), false);
			assert.equal(isValidSnils("000-000-000 00"), false);
			assert.equal(isValidSnils("111-111-111 11"), false);
			assert.equal(isValidSnils("12345"), false);
			assert.equal(isValidSnils(""), false);
			assert.equal(isValidSnils(null), false);
		});

		it("honors exemption for early numbers <= 001-001-998", () => {
			assert.equal(isValidSnils("001-001-997 00"), true);
			assert.equal(isValidSnils("000-001-001 99"), true);
		});
	});

	describe("5. XML Canonicalization Determinism & Cryptographic Safety", () => {
		it("canonicalizes CRLF/CR to LF and strips BOM and whitespace deterministically", () => {
			const bomCrlf = "\uFEFF  <?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<ClinicalDocument>\r\n\t<id extension=\"1\"/>\r\n</ClinicalDocument>\r\n  \r\n";
			const unixLf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ClinicalDocument>\n\t<id extension=\"1\"/>\n</ClinicalDocument>";

			const c1 = canonicalizeCdaXml(bomCrlf);
			const c2 = canonicalizeCdaXml(unixLf);

			assert.equal(c1, unixLf);
			assert.equal(c2, unixLf);

			// Verify SHA-256 hash identity
			const h1 = createHash("sha256").update(c1, "utf8").digest("hex");
			const h2 = createHash("sha256").update(c2, "utf8").digest("hex");
			assert.equal(h1, h2);
		});

		it("validates detached signature schema and REMD package schema", () => {
			const sig = {
				signatureBase64: "MIIE...detachedSignature",
				certificateSerialNumber: "01D8A2FF0000001",
				certificateSubject: "Смирнов Алексей Михайлович",
				signedAt: "2026-08-18T17:00:00.000Z",
				algorithmOid: "1.2.643.7.1.1.1.1",
			};
			const sigParsed = detachedSignatureSchema.safeParse(sig);
			assert.equal(sigParsed.success, true);

			const pkg = {
				documentId: "11111111-2222-3333-4444-555555555555",
				documentVersion: 1,
				xmlCanonicalPayload: "<ClinicalDocument/>",
				doctorSignature: sig,
				metadata: {
					patientSnils: "11223344595",
					clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
					docTypeNsiCode: "108",
				},
			};
			const pkgParsed = egiszRemdPackageSchema.safeParse(pkg);
			assert.equal(pkgParsed.success, true);
		});
	});

	describe("6. Edge Cases & Robustness", () => {
		it("properly escapes all XML special characters (&, <, >, \", ') in narrative and attributes", () => {
			assert.equal(escapeXml("Fish & Chips"), "Fish &\u0061mp; Chips");
			assert.equal(escapeXml("<tag>"), "&\u006ct;tag&\u0067t;");
			assert.equal(escapeXml(`"Hello", said O'Connor`), "&\u0071uot;Hello&\u0071uot;, said O&\u0061pos;Connor");

			const edgeParams = {
				...completeDentalParams,
				anamnesis: "Боль при приеме горячего & холодного (< 2 мин). Врач отметил: \"кариес\".",
				diagnosisText: "Кариес дентина & эмали <средний>",
			};
			const res = generateDentalCdaXml(edgeParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			assert.ok(res.xml.includes("горячего &\u0061mp; холодного (&\u006ct; 2 мин)"));
			assert.ok(res.xml.includes("&\u0071uot;кариес&\u0071uot;"));
			assert.ok(res.xml.includes("Кариес дентина &\u0061mp; эмали &\u006ct;средний&\u0067t;"));
		});

		it("handles deciduous child dentition (quadrants 5-8)", () => {
			const childParams = {
				...completeDentalParams,
				patientBirthDate: "2020-03-10",
				dentalStatus: [
					{
						tooth: "54",
						surfaces: ["O", "M"],
						condition: "C",
						description: "Кариес молочного моляра",
					},
					{
						tooth: "61",
						condition: "INTACT",
					},
				],
			};
			const res = generateDentalCdaXml(childParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			assert.ok(res.xml.includes("<td>54</td>"));
			assert.ok(res.xml.includes("<td>61</td>"));
			assert.ok(res.xml.includes(`<targetSiteCode code="54" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб 54">`));
		});

		it("handles document revision versioning with relatedDocument RPLC", () => {
			const revisedParams = {
				...completeDentalParams,
				documentVersion: 2,
				replacesDocumentId: "doc-uuid-108-v1",
			};
			const res = generateDentalCdaXml(revisedParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			assert.ok(res.xml.includes("<versionNumber value=\"2\"/>"));
			assert.ok(res.xml.includes("<relatedDocument typeCode=\"RPLC\">"));
			assert.ok(res.xml.includes("<parentDocument>"));
			assert.ok(res.xml.includes("extension=\"doc-uuid-108-v1\""));
			assert.ok(res.xml.includes("<versionNumber value=\"1\"/>"));
		});

		it("handles custom legalAuthenticator parameter when specified", () => {
			const customLegalAuthParams = {
				...completeDentalParams,
				legalAuthenticator: {
					name: { first: "Дмитрий", last: "Кузнецов", middle: "Сергеевич" },
					snils: "111-222-333 44",
					position: "главный врач",
					positionCode: "4",
					time: new Date("2026-08-18T18:00:00.000Z"),
				},
			};
			const res = generateDentalCdaXml(customLegalAuthParams);
			assert.equal(res.success, true);
			if (!res.success) return;
			assert.ok(res.xml.includes("<family>Кузнецов</family>"));
			assert.ok(res.xml.includes("<given>Дмитрий</given>"));
			assert.ok(res.xml.includes("<given>Сергеевич</given>"));
			assert.ok(res.xml.includes("extension=\"111-222-333 44\""));
			assert.ok(res.xml.includes("displayName=\"главный врач\""));
		});
	});
});
