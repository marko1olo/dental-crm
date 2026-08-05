import assert from "node:assert";
import { test, describe } from "node:test";
import { generateDentalCdaXml } from "../egiszCdaGenerator.js";
import type { EgiszCdaParams } from "../egiszCdaGenerator.js";

describe("egiszCdaGenerator", () => {
	test("generateDentalCdaXml with full parameter set", (t) => {
		t.mock.timers.enable({ apis: ["Date"] });
		// 2024-05-15T12:00:00.000Z
		const fixedDate = new Date("2024-05-15T12:00:00.000Z");
		t.mock.timers.setTime(fixedDate.getTime());

		const params: EgiszCdaParams = {
			patientId: "pat-123",
			patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.888",
			clinicName: "ООО Стоматология",
			doctorName: { first: "Петр", last: "Петров", middle: "Петрович" },
			doctorSnils: "987-654-321 00",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			anamnesis: "Жалобы на боли от сладкого",
			instrumentTrayBarcode: "TRAY-043-001",
			treatmentDescription: "Препарирование, пломба",
			visitDate: new Date("2024-05-15T10:00:00.000Z"),
			documentId: "doc-001",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(xml.includes('displayName="Врач-стоматолог"'));
		assert.ok(xml.includes('<versionNumber value="1"/>'));
		/* DEFECT #65: serviceEvent must include clock time from visitDate (local TZ) */
		{
			const vd = params.visitDate;
			const pad = (n: number) => n.toString().padStart(2, "0");
			const expectedVisit =
				`${vd.getFullYear()}${pad(vd.getMonth() + 1)}${pad(vd.getDate())}` +
				`${pad(vd.getHours())}${pad(vd.getMinutes())}${pad(vd.getSeconds())}`;
			assert.ok(
				xml.includes(`<effectiveTime value="${expectedVisit}"/>`),
				"documentationOf/serviceEvent must use yyyyMMddHHmmss from visitDate",
			);
			assert.ok(
				expectedVisit.length === 14,
				"encounter effectiveTime must be 14-digit datetime, not date-only",
			);
		}
		t.assert.snapshot(xml);

		// DEFECT #61: revised diary.version must appear in CDA versionNumber
		const revised_res = generateDentalCdaXml({ ...params, documentVersion: 3 });
		assert.ok(revised_res.success, revised_res.success ? "" : String(revised_res.error));
		const revised = revised_res.xml;
		assert.ok(revised.includes('<versionNumber value="3"/>'));
		assert.ok(!revised.includes('<versionNumber value="1"/>'));
	});

	test("generateDentalCdaXml with missing optional parameters", (t) => {
		t.mock.timers.enable({ apis: ["Date"] });
		const fixedDate = new Date("2024-05-15T12:00:00.000Z");
		t.mock.timers.setTime(fixedDate.getTime());

		const params: EgiszCdaParams = {
			patientId: "pat-456",
			patientName: { first: "Анна", last: "Смирнова" }, // No middle name
			patientSnils: "111-222-333 44",
			patientBirthDate: null,
			patientGender: "female",
			// No clinicOid
			clinicName: "Городская Поликлиника",
			doctorName: { first: "Елена", last: "Сидорова" }, // No middle name
			// No doctorSnils, doctorPosition
			icd10Code: "K04.0",
			diagnosisText: "Пульпит",
			// No anamnesis, treatmentDescription
			visitDate: new Date("2024-05-16T11:00:00.000Z"),
			documentId: "doc-002",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		t.assert.snapshot(xml);
	});

	test("generateDentalCdaXml with other/null gender", (t) => {
		t.mock.timers.enable({ apis: ["Date"] });
		const fixedDate = new Date("2024-05-15T12:00:00.000Z");
		t.mock.timers.setTime(fixedDate.getTime());

		const params: EgiszCdaParams = {
			patientId: "pat-789",
			patientName: { first: "Алекс", last: "Джонс" },
			patientSnils: "000-000-000 00",
			patientBirthDate: "1990-05-05T00:00:00.000Z",
			patientGender: null, // Test null gender
			clinicName: "Клиника",
			doctorName: { first: "Врач", last: "Врачев" },
			icd10Code: "K05.0",
			diagnosisText: "Гингивит",
			visitDate: new Date("2024-05-17T09:00:00.000Z"),
			documentId: "doc-003",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		t.assert.snapshot(xml);

        params.patientGender = "other"; // Test other gender
        const xmlOther_res = generateDentalCdaXml(params);
		assert.ok(xmlOther_res.success, xmlOther_res.success ? "" : String(xmlOther_res.error));
		const xmlOther = xmlOther_res.xml;
        t.assert.snapshot(xmlOther);
	});

	test("DEFECT #72: documentTime drives ClinicalDocument + author effectiveTime", (t) => {
		t.mock.timers.enable({ apis: ["Date"] });
		// Generation "now" deliberately different from diary sign time
		const generationNow = new Date("2024-06-01T18:00:00.000Z");
		t.mock.timers.setTime(generationNow.getTime());

		const lockedAt = new Date("2024-05-10T09:30:45.000Z");
		const visitDate = new Date("2024-05-10T08:00:00.000Z");
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fmt = (d: Date) =>
			`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
			`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
		const expectedDocTime = fmt(lockedAt);
		const expectedNow = fmt(generationNow);
		const expectedVisit = fmt(visitDate);

		const base: EgiszCdaParams = {
			patientId: "pat-72",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicName: "Клиника",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			visitDate,
			documentId: "doc-72",
		};

		const withSign_res = generateDentalCdaXml({ ...base, documentTime: lockedAt });
		assert.ok(withSign_res.success, withSign_res.success ? "" : String(withSign_res.error));
		const withSign = withSign_res.xml;
		// Root ClinicalDocument effectiveTime
		assert.ok(
			withSign.includes(`<effectiveTime value="${expectedDocTime}"/>`),
			"ClinicalDocument effectiveTime must equal diary lockedAt (documentTime)",
		);
		// author/time uses same document clock
		assert.ok(
			withSign.includes(`<time value="${expectedDocTime}"/>`),
			"author/time must equal diary lockedAt (documentTime)",
		);
		// Must NOT silently use download/generation wall clock
		assert.ok(
			!withSign.includes(`<effectiveTime value="${expectedNow}"/>`),
			"document/author effectiveTime must not be generation now when documentTime set",
		);
		assert.ok(
			!withSign.includes(`<time value="${expectedNow}"/>`),
			"author/time must not be generation now when documentTime set",
		);
		// visit encounter time stays independent (DEFECT #55/#65)
		assert.ok(
			withSign.includes(`<effectiveTime value="${expectedVisit}"/>`),
			"documentationOf/serviceEvent must still use visitDate, not documentTime",
		);
		assert.notStrictEqual(
			expectedDocTime,
			expectedNow,
			"test setup: lockedAt and generation now must differ",
		);
		assert.notStrictEqual(
			expectedDocTime,
			expectedVisit,
			"test setup: documentTime and visitDate must differ",
		);

		// Without documentTime: falls back to generation now
		const withoutSign_res = generateDentalCdaXml(base);
		assert.ok(withoutSign_res.success, withoutSign_res.success ? "" : String(withoutSign_res.error));
		const withoutSign = withoutSign_res.xml;
		assert.ok(
			withoutSign.includes(`<effectiveTime value="${expectedNow}"/>`),
			"without documentTime, ClinicalDocument effectiveTime falls back to now",
		);
		assert.ok(
			withoutSign.includes(`<time value="${expectedNow}"/>`),
			"without documentTime, author/time falls back to now",
		);
		// Invalid Date must not stick — fall back to now
		const invalid_res = generateDentalCdaXml({
			...base,
			documentTime: new Date("not-a-date"),
		});
		assert.ok(invalid_res.success, invalid_res.success ? "" : String(invalid_res.error));
		const invalid = invalid_res.xml;
		assert.ok(
			invalid.includes(`<effectiveTime value="${expectedNow}"/>`),
			"invalid documentTime must fall back to generation now",
		);
	});

	/**
	 * DEFECT #83: assignedAuthor must carry representedOrganization (clinic MO).
	 * БЫЛО: author had person only; legalAuthenticator already embeds clinic
	 * under assignedEntity. EGISZ SEMD / CDA R2 expects author.assignedAuthor
	 * .representedOrganization so the document author is attributed to the MO.
	 */
	test("DEFECT #83: assignedAuthor includes representedOrganization with clinicName", () => {
		const amp = "&" + "amp;";
		const xml_res = generateDentalCdaXml({
			patientId: "pat-83",
			patientName: { first: "A", last: "B" },
			patientSnils: "000",
			patientBirthDate: "1990-01-01",
			patientGender: "male",
			clinicName: "Clinic & Co",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-83",
		});
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;

		const authorEnd = "</assignedAuthor>";
		const authorBlock = xml.slice(
			xml.indexOf("<assignedAuthor>"),
			xml.indexOf(authorEnd) + authorEnd.length,
		);
		assert.ok(
			authorBlock.includes("<representedOrganization>"),
			"assignedAuthor must include representedOrganization",
		);
		assert.ok(
			authorBlock.includes("</representedOrganization>"),
			"assignedAuthor representedOrganization must be closed",
		);
		assert.ok(
			authorBlock.includes("<name>Clinic " + amp + " Co</name>"),
			"assignedAuthor representedOrganization must carry XML-escaped clinicName",
		);
		// representedOrganization must sit after assignedPerson (CDA R2 order)
		const personEnd = authorBlock.indexOf("</assignedPerson>");
		const orgStart = authorBlock.indexOf("<representedOrganization>");
		assert.ok(
			personEnd > 0 && orgStart > personEnd,
			"representedOrganization must follow assignedPerson inside assignedAuthor",
		);
	});

	/**
	 * DEFECT #81: unknown patient gender must not invent code "0".
	 * NSI 1.2.643.5.1.13.13.11.1040: 1=М, 2=Ж — "0" is not valid.
	 * Route already 422s (DEFECT #68); generator uses nullFlavor="UNK".
	 */
	test("DEFECT #81: administrativeGenderCode nullFlavor UNK when gender unknown; 1/2 when known", () => {

		const base = {
			patientId: "pat-81",
			patientName: { first: "A", last: "B" },
			patientSnils: "000",
			patientBirthDate: "1990-01-01",
			patientGender: null as "male" | "female" | "other" | null,
			clinicName: "C",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-81",
		};

		const unknown_res = generateDentalCdaXml(base);
		assert.ok(unknown_res.success, unknown_res.success ? "" : String(unknown_res.error));
		const unknown = unknown_res.xml;
		assert.ok(
			unknown.includes('<administrativeGenderCode nullFlavor="UNK"/>'),
			"null gender must emit administrativeGenderCode nullFlavor=UNK",
		);
		assert.ok(
			!unknown.includes('administrativeGenderCode code="0"'),
			"must never invent gender code 0",
		);

		const other_res = generateDentalCdaXml({
			...base,
			patientGender: "other",
		});
		assert.ok(other_res.success, other_res.success ? "" : String(other_res.error));
		const other = other_res.xml;
		assert.ok(
			other.includes('<administrativeGenderCode nullFlavor="UNK"/>'),
			"other gender must emit nullFlavor=UNK (not invent code 0 or 3 without NSI mapping)",
		);
		assert.ok(
			!other.includes('administrativeGenderCode code="0"'),
			"other gender must not invent code 0",
		);

		const male_res = generateDentalCdaXml({
			...base,
			patientGender: "male",
		});
		assert.ok(male_res.success, male_res.success ? "" : String(male_res.error));
		const male = male_res.xml;
		assert.ok(
			male.includes(
				'administrativeGenderCode code="1" codeSystem="1.2.643.5.1.13.13.11.1040"',
			),
			"male must emit code 1",
		);
		assert.ok(
			!male.includes('<administrativeGenderCode nullFlavor="UNK"/>'),
			"male must not use nullFlavor",
		);

		const female_res = generateDentalCdaXml({
			...base,
			patientGender: "female",
		});
		assert.ok(female_res.success, female_res.success ? "" : String(female_res.error));
		const female = female_res.xml;
		assert.ok(
			female.includes(
				'administrativeGenderCode code="2" codeSystem="1.2.643.5.1.13.13.11.1040"',
			),
			"female must emit code 2",
		);
		assert.ok(
			!female.includes('<administrativeGenderCode nullFlavor="UNK"/>'),
			"female must not use nullFlavor",
		);
	});

	/**
	 * DEFECT #80: missing/invalid patient DOB must not be faked as 19000101.
	 * Route already 422s (DEFECT #64); generator must still not invent DOB
	 * for direct callers / future paths — use birthTime nullFlavor="UNK".
	 */
	test("DEFECT #80: birthTime nullFlavor UNK when DOB missing/invalid; real date when present", () => {

		const base = {
			patientId: "pat-80",
			patientName: { first: "A", last: "B" },
			patientSnils: "000",
			patientBirthDate: "",
			patientGender: "male" as const,
			clinicName: "C",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-80",
		};

		const missing_res = generateDentalCdaXml(base);
		assert.ok(missing_res.success, missing_res.success ? "" : String(missing_res.error));
		const missing = missing_res.xml;
		assert.ok(
			missing.includes('<birthTime nullFlavor="UNK"/>'),
			"missing DOB must emit birthTime nullFlavor=UNK",
		);
		assert.ok(
			!missing.includes('birthTime value="19000101"'),
			"must never invent 19000101 as birthTime",
		);
		assert.ok(
			!missing.includes("19000101"),
			"fake 19000101 must not appear anywhere in CDA",
		);

		const invalid_res = generateDentalCdaXml({
			...base,
			patientBirthDate: "not-a-date",
		});
		assert.ok(invalid_res.success, invalid_res.success ? "" : String(invalid_res.error));
		const invalid = invalid_res.xml;
		assert.ok(
			invalid.includes('<birthTime nullFlavor="UNK"/>'),
			"invalid DOB must emit birthTime nullFlavor=UNK",
		);
		assert.ok(!invalid.includes("19000101"), "invalid DOB must not invent 19000101");

		const real_res = generateDentalCdaXml({
			...base,
			patientBirthDate: "1980-05-15T00:00:00.000Z",
		});
		assert.ok(real_res.success, real_res.success ? "" : String(real_res.error));
		const real = real_res.xml;
		assert.ok(
			real.includes('<birthTime value="'),
			"valid DOB must emit birthTime value",
		);
		assert.ok(
			!real.includes('<birthTime nullFlavor="UNK"/>'),
			"valid DOB must not use nullFlavor",
		);
		// yyyyMMdd local — at least year 1980 must appear
		assert.ok(
			real.includes('birthTime value="1980'),
			"valid DOB must start with year 1980",
		);
	});

	/**
	 * DEFECT #79 + #94: patientRole/id must not emit empty SNILS extension=""
	 * when patientSnils is blank/missing. REMD rejects empty II.extension.
	 * After #94: local MRN (patientId) is always present, so blank SNILS no
	 * longer needs nullFlavor NI — MRN alone satisfies II 1..*.
	 */
	test("DEFECT #79: patientRole never emits empty SNILS extension; SNILS when present", () => {

		const base = {
			patientId: "pat-79",
			patientName: { first: "A", last: "B" },
			patientSnils: "",
			patientBirthDate: "1990-01-01",
			patientGender: "male" as const,
			clinicName: "C",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-79",
		};

		const blank_res = generateDentalCdaXml(base);
		assert.ok(blank_res.success, blank_res.success ? "" : String(blank_res.error));
		const blank = blank_res.xml;
		const roleBlank = blank.slice(
			blank.indexOf("<patientRole>"),
			blank.indexOf("</patientRole>") + "</patientRole>".length,
		);
		assert.ok(
			!roleBlank.includes('extension=""'),
			"patientRole must not emit empty extension attribute",
		);
		assert.ok(
			!roleBlank.includes('root="1.2.643.100.3"'),
			"patientRole must not emit SNILS root when patientSnils blank",
		);
		/* DEFECT #94: MRN present instead of NI placeholder */
		assert.ok(
			roleBlank.includes('extension="pat-79"'),
			"patientRole must carry local MRN when SNILS blank",
		);

		const whitespace_res = generateDentalCdaXml({
			...base,
			patientSnils: "   ",
		});
		assert.ok(whitespace_res.success, whitespace_res.success ? "" : String(whitespace_res.error));
		const whitespace = whitespace_res.xml;
		const roleWs = whitespace.slice(
			whitespace.indexOf("<patientRole>"),
			whitespace.indexOf("</patientRole>") + "</patientRole>".length,
		);
		assert.ok(
			!roleWs.includes('root="1.2.643.100.3"'),
			"whitespace-only patientSnils must not emit SNILS id",
		);
		assert.ok(
			roleWs.includes('extension="pat-79"'),
			"whitespace-only SNILS still keeps MRN id",
		);

		const withSnils_res = generateDentalCdaXml({
			...base,
			patientSnils: "123-456-789 00",
		});
		assert.ok(withSnils_res.success, withSnils_res.success ? "" : String(withSnils_res.error));
		const withSnils = withSnils_res.xml;
		const roleOk = withSnils.slice(
			withSnils.indexOf("<patientRole>"),
			withSnils.indexOf("</patientRole>") + "</patientRole>".length,
		);
		assert.ok(
			roleOk.includes('root="1.2.643.100.3" extension="123-456-789 00"'),
			"patientRole must emit SNILS id when patientSnils present",
		);
		assert.ok(
			!roleOk.includes('<id nullFlavor="NI"/>'),
			"patientRole must not use nullFlavor when patientSnils present",
		);

		// Evil SNILS must be escaped
		const lt = "&" + "lt;";
		const amp = "&" + "amp;";
		const evilSnils =
			"12" + String.fromCharCode(60) + "3" + String.fromCharCode(38) + "4";
		const evil_res = generateDentalCdaXml({
			...base,
			patientSnils: evilSnils,
		});
		assert.ok(evil_res.success, evil_res.success ? "" : String(evil_res.error));
		const evil = evil_res.xml;
		assert.ok(
			evil.includes('extension="12' + lt + "3" + amp + '4"'),
			"patientSnils must be XML-escaped in patientRole id extension",
		);
	});


	/**
	 * DEFECT #78: custodian organization id must not emit empty extension=""
	 * when clinicOid is absent; clinicOid must be XML-escaped when present.
	 */
	test("DEFECT #78: custodian id nullFlavor NI without clinicOid; escaped when present", () => {

		const base = {
			patientId: "pat-78",
			patientName: { first: "A", last: "B" },
			patientSnils: "000",
			patientBirthDate: "1990-01-01",
			patientGender: "male" as const,
			clinicName: "Clinic & Co",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-78",
		};

		const withoutOid_res = generateDentalCdaXml(base);
		assert.ok(withoutOid_res.success, withoutOid_res.success ? "" : String(withoutOid_res.error));
		const withoutOid = withoutOid_res.xml;
		const custodianBlock = withoutOid.slice(
			withoutOid.indexOf("<custodian>"),
			withoutOid.indexOf("</custodian>") + "</custodian>".length,
		);
		assert.ok(
			custodianBlock.includes('<id nullFlavor="NI"/>'),
			"custodian must emit id nullFlavor=NI when clinicOid absent",
		);
		assert.ok(
			!custodianBlock.includes('extension=""'),
			"custodian must not emit empty extension attribute",
		);
		const amp = "&" + "amp;";
		const lt = "&" + "lt;";
		const quot = "&" + "quot;";
		assert.ok(
			custodianBlock.includes("Clinic " + amp + " Co"),
			"custodian name must XML-escape clinicName",
		);

		const withOid_res = generateDentalCdaXml({
			...base,
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1",
		});
		assert.ok(withOid_res.success, withOid_res.success ? "" : String(withOid_res.error));
		const withOid = withOid_res.xml;
		const custWith = withOid.slice(
			withOid.indexOf("<custodian>"),
			withOid.indexOf("</custodian>") + "</custodian>".length,
		);
		assert.ok(
			custWith.includes(
				'root="1.2.643.5.1.13.13.12.2" extension="1.2.643.5.1.13.13.12.2.77.1"',
			),
			"custodian must emit MO registry root + clinicOid extension when present",
		);
		assert.ok(
			!custWith.includes('<id nullFlavor="NI"/>'),
			"custodian must not use nullFlavor when clinicOid present",
		);

		// Evil OID must be escaped in custodian extension and document id/setId roots
		const evilOid =
			"1.2" + String.fromCharCode(60) + String.fromCharCode(34) + "x";
		const evil_res = generateDentalCdaXml({
			...base,
			clinicOid: evilOid,
		});
		assert.ok(evil_res.success, evil_res.success ? "" : String(evil_res.error));
		const evil = evil_res.xml;
		const escapedEvil = "1.2" + lt + quot + "x";
		assert.ok(
			evil.includes('extension="' + escapedEvil + '"'),
			"clinicOid must be XML-escaped in custodian extension",
		);
		assert.ok(
			evil.includes('root="' + escapedEvil + '"'),
			"clinicOid must be XML-escaped in ClinicalDocument id/setId root",
		);
		assert.ok(
			!evil.includes('extension=""'),
			"evil clinicOid path must not leave empty extension",
		);
	});


	/**
	 * DEFECT #76: realmCode RU is required by HL7 CDA R2 / EGISZ SEMD header.
	 * Without it validators reject the document before body checks run.
	 */
	test("DEFECT #76: realmCode RU present in ClinicalDocument header", () => {

		const xml_res = generateDentalCdaXml({
			patientId: "pat-76",
			patientName: { first: "A", last: "B" },
			patientSnils: "000",
			patientBirthDate: "1990-01-01",
			patientGender: "male",
			clinicName: "C",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-76",
		});
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(
			xml.includes('<realmCode code="RU"/>'),
			"ClinicalDocument must carry realmCode RU",
		);
		// realmCode must appear before typeId (HL7 CDA R2 header order)
		const realmIdx = xml.indexOf('<realmCode code="RU"/>');
		const typeIdIdx = xml.indexOf("<typeId ");
		assert.ok(realmIdx > 0 && typeIdIdx > realmIdx, "realmCode before typeId");
	});

	/**
	 * DEFECT #75: legalAuthenticator (signer of Form 043/у) is required by
	 * EGISZ REMD / SEMD validators. CDA previously had author + custodian only.
	 * Signature party must mirror doctorName and use documentClock (lockedAt).
	 */
	test("DEFECT #75: legalAuthenticator present with doctor name and document time", () => {

		const lockedAt = new Date("2024-06-01T12:30:00.000Z");
		const xml_res = generateDentalCdaXml({
			patientId: "pat-75",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicName: "Клиника Тест",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "111-222-333 44",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-75",
			documentTime: lockedAt,
		});
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;

		assert.ok(
			xml.includes("<legalAuthenticator>"),
			"CDA must include legalAuthenticator block",
		);
		assert.ok(
			xml.includes('<signatureCode code="S"/>'),
			"legalAuthenticator must carry signatureCode S",
		);
		// documentClock = lockedAt → 20240601123000+0000 (or local offset)
		assert.ok(
			xml.includes("<legalAuthenticator>") &&
				xml.includes("</legalAuthenticator>"),
			"legalAuthenticator must be a closed element pair",
		);
		const laBlock = xml.slice(
			xml.indexOf("<legalAuthenticator>"),
			xml.indexOf("</legalAuthenticator>") + "</legalAuthenticator>".length,
		);
		assert.ok(
			laBlock.includes("<family>Петров</family>"),
			"legalAuthenticator must include doctor family name",
		);
		assert.ok(
			laBlock.includes("<given>Петр</given>"),
			"legalAuthenticator must include doctor given name",
		);
		assert.ok(
			laBlock.includes("<given>Сергеевич</given>"),
			"legalAuthenticator must include doctor middle name when provided",
		);
		assert.ok(
			laBlock.includes('root="1.2.643.100.3" extension="111-222-333 44"'),
			"legalAuthenticator must include doctor SNILS when provided",
		);
		assert.ok(
			laBlock.includes('displayName="Врач-стоматолог"'),
			"legalAuthenticator must include doctor position when provided",
		);
		assert.ok(
			laBlock.includes("<name>Клиника Тест</name>"),
			"legalAuthenticator representedOrganization must carry clinic name",
		);
		// time value must match document effectiveTime (lockedAt)
		assert.ok(
			laBlock.includes('<time value="'),
			"legalAuthenticator must include time",
		);
		// Generator uses local yyyyMMddHHmmss (14 digits), same as ClinicalDocument effectiveTime
		const timeMatch = laBlock.match(/<time value="(\d{14})"/);
		assert.ok(timeMatch, "legalAuthenticator time must be yyyyMMddHHmmss");
		assert.ok(
			xml.includes(`<effectiveTime value="${timeMatch![1]}"`),
			"legalAuthenticator time must equal document effectiveTime (documentClock)",
		);

		// Without optional SNILS/position — block still present, optional tags omitted
		const minimal_res = generateDentalCdaXml({
			patientId: "pat-75b",
			patientName: { first: "А", last: "Б" },
			patientSnils: "000",
			patientBirthDate: "1990-01-01",
			patientGender: "female",
			clinicName: "X",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.0",
			diagnosisText: "d",
			visitDate: new Date("2024-01-01T00:00:00.000Z"),
			documentId: "doc-75b",
		});
		assert.ok(minimal_res.success, minimal_res.success ? "" : String(minimal_res.error));
		const minimal = minimal_res.xml;
		assert.ok(
			minimal.includes("<legalAuthenticator>"),
			"legalAuthenticator required even without doctorSnils/position",
		);
		const laMin = minimal.slice(
			minimal.indexOf("<legalAuthenticator>"),
			minimal.indexOf("</legalAuthenticator>") +
				"</legalAuthenticator>".length,
		);
		// DEFECT #77: id required (1..*) — nullFlavor NI when SNILS absent
		assert.ok(
			laMin.includes('<id nullFlavor="NI"/>'),
			"legalAuthenticator must emit id nullFlavor=NI when doctorSnils absent",
		);
		assert.ok(
			!laMin.includes('root="1.2.643.100.3"'),
			"SNILS root omitted when doctorSnils absent",
		);
		assert.ok(
			!laMin.includes("displayName="),
			"position code omitted when doctorPosition absent",
		);
	});

	/**
	 * DEFECT #77: assignedAuthor/id and legalAuthenticator assignedEntity/id
	 * are required (1..*) in CDA R2. Omitting <id> when doctorSnils is absent
	 * (users table has no snils column) makes the document schema-invalid.
	 */
	test("DEFECT #77: assignedAuthor and legalAuthenticator always emit id", () => {
		const base = {
			patientId: "pat-77",
			patientName: { first: "A", last: "B" },
			patientSnils: "000",
			patientBirthDate: "1990-01-01",
			patientGender: "male" as const,
			clinicName: "C",
			doctorName: { first: "D", last: "E" },
			icd10Code: "K02.1",
			diagnosisText: "x",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-77",
		};

		const withoutSnils_res = generateDentalCdaXml(base);
		assert.ok(withoutSnils_res.success, withoutSnils_res.success ? "" : String(withoutSnils_res.error));
		const withoutSnils = withoutSnils_res.xml;
		// assignedAuthor must have exactly one id — nullFlavor NI
		const authorBlock = withoutSnils.slice(
			withoutSnils.indexOf("<assignedAuthor>"),
			withoutSnils.indexOf("</assignedAuthor>") + "</assignedAuthor>".length,
		);
		assert.ok(
			authorBlock.includes('<id nullFlavor="NI"/>'),
			"assignedAuthor must emit id nullFlavor=NI when doctorSnils absent",
		);
		assert.ok(
			!authorBlock.includes('root="1.2.643.100.3"'),
			"assignedAuthor must not emit SNILS root when doctorSnils absent",
		);

		const laBlock = withoutSnils.slice(
			withoutSnils.indexOf("<legalAuthenticator>"),
			withoutSnils.indexOf("</legalAuthenticator>") +
				"</legalAuthenticator>".length,
		);
		assert.ok(
			laBlock.includes('<id nullFlavor="NI"/>'),
			"legalAuthenticator assignedEntity must emit id nullFlavor=NI when doctorSnils absent",
		);

		// With SNILS — real id, no nullFlavor on id
		const withSnils_res = generateDentalCdaXml({
			...base,
			doctorSnils: "111-222-333 44",
		});
		assert.ok(withSnils_res.success, withSnils_res.success ? "" : String(withSnils_res.error));
		const withSnils = withSnils_res.xml;
		const authorWith = withSnils.slice(
			withSnils.indexOf("<assignedAuthor>"),
			withSnils.indexOf("</assignedAuthor>") + "</assignedAuthor>".length,
		);
		assert.ok(
			authorWith.includes('root="1.2.643.100.3" extension="111-222-333 44"'),
			"assignedAuthor must emit SNILS id when doctorSnils present",
		);
		assert.ok(
			!authorWith.includes('<id nullFlavor="NI"/>'),
			"assignedAuthor must not use nullFlavor when doctorSnils present",
		);
		const laWith = withSnils.slice(
			withSnils.indexOf("<legalAuthenticator>"),
			withSnils.indexOf("</legalAuthenticator>") +
				"</legalAuthenticator>".length,
		);
		assert.ok(
			laWith.includes('root="1.2.643.100.3" extension="111-222-333 44"'),
			"legalAuthenticator must emit SNILS id when doctorSnils present",
		);
		assert.ok(
			!laWith.includes('<id nullFlavor="NI"/>'),
			"legalAuthenticator must not use nullFlavor when doctorSnils present",
		);

		// Whitespace-only SNILS treated as absent
		const blankSnils_res = generateDentalCdaXml({
			...base,
			doctorSnils: "   ",
		});
		assert.ok(blankSnils_res.success, blankSnils_res.success ? "" : String(blankSnils_res.error));
		const blankSnils = blankSnils_res.xml;
		assert.ok(
			blankSnils.includes('<id nullFlavor="NI"/>'),
			"whitespace-only doctorSnils must emit nullFlavor NI",
		);
	});


	/**
	 * DEFECT #74: ISO 3950 tooth from visit_diaries.diagnosis_tooth must appear
	 * in CDA diagnosis observation as targetSiteCode (and in human-readable text).
	 * Without this, signed 043 tooth never reaches EGISZ/REMD export.
	 */
	test("DEFECT #74: diagnosisTooth exports as targetSiteCode on diagnosis observation", () => {

		const base: EgiszCdaParams = {
			patientId: "pat-74",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicName: "Клиника",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			visitDate: new Date("2024-06-01T10:00:00.000Z"),
			documentId: "doc-74",
		};

		const withTooth_res = generateDentalCdaXml({
			...base,
			diagnosisTooth: "36",
		});
		assert.ok(withTooth_res.success, withTooth_res.success ? "" : String(withTooth_res.error));
		const withTooth = withTooth_res.xml;
		assert.ok(
			withTooth.includes(
				'targetSiteCode code="36" codeSystem="1.2.643.5.1.13.13.11.1466"',
			),
			"diagnosis observation must carry ISO 3950 targetSiteCode",
		);
		assert.ok(
			withTooth.includes("· зуб 36"),
			"human-readable diagnosis text must include tooth number",
		);
		assert.ok(
			withTooth.includes('displayName="Зуб 36"'),
			"targetSiteCode displayName must include tooth",
		);

		const withoutTooth_res = generateDentalCdaXml(base);
		assert.ok(withoutTooth_res.success, withoutTooth_res.success ? "" : String(withoutTooth_res.error));
		const withoutTooth = withoutTooth_res.xml;
		assert.ok(
			!withoutTooth.includes("targetSiteCode"),
			"targetSiteCode must be omitted when diagnosisTooth absent",
		);
		assert.ok(
			!withoutTooth.includes("· зуб"),
			"human-readable tooth suffix must be omitted when diagnosisTooth absent",
		);

		// Blank/whitespace tooth must not emit empty targetSiteCode
		const blankTooth_res = generateDentalCdaXml({
			...base,
			diagnosisTooth: "   ",
		});
		assert.ok(blankTooth_res.success, blankTooth_res.success ? "" : String(blankTooth_res.error));
		const blankTooth = blankTooth_res.xml;
		assert.ok(
			!blankTooth.includes("targetSiteCode"),
			"whitespace-only diagnosisTooth must not emit targetSiteCode",
		);

		// XML special chars in tooth must be escaped
		const evilTooth_res = generateDentalCdaXml({
			...base,
			diagnosisTooth: "3" + String.fromCharCode(60) + "6" + String.fromCharCode(62) + String.fromCharCode(38) + "x",
		});
		assert.ok(evilTooth_res.success, evilTooth_res.success ? "" : String(evilTooth_res.error));
		const evilTooth = evilTooth_res.xml;
		const lt = "&" + "lt;";
		const gt = "&" + "gt;";
		const amp = "&" + "amp;";
		assert.ok(
			evilTooth.includes("targetSiteCode code=\"3" + lt + "6" + gt + amp + "x\""),
			"diagnosisTooth must be XML-escaped in targetSiteCode@code",
		);
		assert.ok(
			!evilTooth.includes("code=\"3" + String.fromCharCode(60) + "6"),
			"raw < must not appear in targetSiteCode@code",
		);
	});

	test("DEFECT #86: componentOf/encompassingEncounter links CDA to ambulatory encounter", () => {
		const visitDate = new Date("2024-05-15T10:30:45.000Z");
		const pad = (n: number) => n.toString().padStart(2, "0");
		const expectedVisit =
			`${visitDate.getFullYear()}${pad(visitDate.getMonth() + 1)}${pad(visitDate.getDate())}` +
			`${pad(visitDate.getHours())}${pad(visitDate.getMinutes())}${pad(visitDate.getSeconds())}`;

		const params: EgiszCdaParams = {
			patientId: "pat-enc",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.888",
			clinicName: "ООО Стоматология",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			visitDate,
			documentId: "doc-enc-001",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(
			xml.includes("<componentOf>"),
			"CDA R2 header must include componentOf",
		);
		assert.ok(
			xml.includes("<encompassingEncounter>"),
			"componentOf must wrap encompassingEncounter",
		);
		assert.ok(
			xml.includes(
				`<id root="1.2.643.5.1.13.13.12.2.888" extension="doc-enc-001"/>`,
			),
			"encompassingEncounter id must use clinicOid root + documentId extension",
		);
		assert.ok(
			xml.includes(
				`<encompassingEncounter>\n\t\t\t<id root="1.2.643.5.1.13.13.12.2.888" extension="doc-enc-001"/>\n\t\t\t<effectiveTime value="${expectedVisit}"/>`,
			) ||
				(xml.includes("<encompassingEncounter>") &&
					xml.includes(`extension="doc-enc-001"`) &&
					xml.includes(`<effectiveTime value="${expectedVisit}"/>`)),
			"encompassingEncounter effectiveTime must match visitDate yyyyMMddHHmmss",
		);
		/* same clock as documentationOf/serviceEvent */
		const serviceIdx = xml.indexOf("<documentationOf>");
		const encIdx = xml.indexOf("<encompassingEncounter>");
		assert.ok(serviceIdx > 0 && encIdx > serviceIdx);
		assert.ok(
			xml.includes(
				`<serviceEvent classCode="PCPR">\n\t\t\t<effectiveTime value="${expectedVisit}"/>`,
			) || xml.includes(`<effectiveTime value="${expectedVisit}"/>`),
		);

		/* missing clinicOid → default MO registry root; documentId XML-escaped */
		const noOid_res = generateDentalCdaXml({
			...params,
			clinicOid: undefined,
			documentId: "doc" + String.fromCharCode(60) + "enc" + String.fromCharCode(62) + String.fromCharCode(38) + "x",
		});
		assert.ok(noOid_res.success, noOid_res.success ? "" : String(noOid_res.error));
		const noOid = noOid_res.xml;
		const lt = "&" + "lt;";
		const gt = "&" + "gt;";
		const amp = "&" + "amp;";
		assert.ok(
			noOid.includes(
				'root="1.2.643.5.1.13.13.12.2" extension="doc' + lt + "enc" + gt + amp + 'x"',
			),
			"missing clinicOid uses default root; documentId must be XML-escaped",
		);
		assert.ok(noOid.includes("<componentOf>"));
		assert.ok(noOid.includes("<encompassingEncounter>"));
	});

	test("DEFECT #87: encompassingEncounter extension prefers encounterId over documentId", () => {
		const visitDate = new Date("2024-06-01T09:15:00.000Z");
		const base: EgiszCdaParams = {
			patientId: "pat-87",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.999",
			clinicName: "ООО Стоматология",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate,
			documentId: "doc-uuid-aaa",
			encounterId: "visit-uuid-bbb",
		};

		const xml_res = generateDentalCdaXml(base);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		/* ClinicalDocument/id keeps documentId */
		assert.ok(
			xml.includes('extension="doc-uuid-aaa"'),
			"ClinicalDocument id extension remains documentId",
		);
		/* encompassingEncounter uses encounterId (separate REMD join key) */
		assert.ok(
			xml.includes(
				`<id root="1.2.643.5.1.13.13.12.2.999" extension="visit-uuid-bbb"/>`,
			),
			"encompassingEncounter extension must be encounterId (visit), not documentId",
		);
		const encBlock = xml.slice(
			xml.indexOf("<encompassingEncounter>"),
			xml.indexOf("</encompassingEncounter>"),
		);
		assert.ok(
			encBlock.includes('extension="visit-uuid-bbb"'),
			"encounter block must carry visit id",
		);
		assert.ok(
			!encBlock.includes('extension="doc-uuid-aaa"'),
			"encounter block must not reuse ClinicalDocument documentId when encounterId set",
		);

		/* blank encounterId → fall back to documentId (legacy) */
		const fallback_res = generateDentalCdaXml({
			...base,
			encounterId: "   ",
		});
		assert.ok(fallback_res.success, fallback_res.success ? "" : String(fallback_res.error));
		const fallback = fallback_res.xml;
		const fbEnc = fallback.slice(
			fallback.indexOf("<encompassingEncounter>"),
			fallback.indexOf("</encompassingEncounter>"),
		);
		assert.ok(
			fbEnc.includes('extension="doc-uuid-aaa"'),
			"blank encounterId falls back to documentId",
		);

		/* omitted encounterId → same fallback */
		const { encounterId: _omit, ...noEnc } = base;
		const omitted_res = generateDentalCdaXml(noEnc);
		assert.ok(omitted_res.success, omitted_res.success ? "" : String(omitted_res.error));
		const omitted = omitted_res.xml;
		const omEnc = omitted.slice(
			omitted.indexOf("<encompassingEncounter>"),
			omitted.indexOf("</encompassingEncounter>"),
		);
		assert.ok(
			omEnc.includes('extension="doc-uuid-aaa"'),
			"missing encounterId falls back to documentId",
		);

		/* encounterId XML-escaped */
		const esc_res = generateDentalCdaXml({
			...base,
			encounterId: "v" + String.fromCharCode(60) + "x" + String.fromCharCode(38) + "y",
		});
		assert.ok(esc_res.success, esc_res.success ? "" : String(esc_res.error));
		const esc = esc_res.xml;
		const lt = "&" + "lt;";
		const amp = "&" + "amp;";
		assert.ok(
			esc.includes('extension="v' + lt + "x" + amp + 'y"'),
			"encounterId must be XML-escaped in encompassingEncounter",
		);
	});

	test("DEFECT #88: setId is stable document SET; ClinicalDocument/id is version instance", () => {
		const visitDate = new Date("2024-07-10T14:00:00.000Z");
		const base: EgiszCdaParams = {
			patientId: "pat-88",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.777",
			clinicName: "ООО Стоматология",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K04.0",
			diagnosisText: "Пульпит",
			visitDate,
			documentId: "doc-version-2",
			documentSetId: "visit-set-stable",
			documentVersion: 2,
		};

		const xml_res = generateDentalCdaXml(base);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		/* ClinicalDocument/id = this version instance */
		assert.ok(
			xml.includes(
				`<id root="1.2.643.5.1.13.13.12.2.777" extension="doc-version-2"/>`,
			),
			"ClinicalDocument/id extension is documentId (version instance)",
		);
		/* setId = stable SET across revise */
		assert.ok(
			xml.includes(
				`<setId root="1.2.643.5.1.13.13.12.2.777" extension="visit-set-stable"/>`,
			),
			"setId extension must be documentSetId (stable SET key)",
		);
		assert.ok(
			xml.includes('<versionNumber value="2"/>'),
			"versionNumber tracks diary revise",
		);
		/* setId must not silently equal documentId when documentSetId is set */
		const setIdLine = xml
			.split("\n")
			.find((l) => l.includes("<setId "));
		assert.ok(setIdLine && setIdLine.includes('extension="visit-set-stable"'));
		assert.ok(setIdLine && !setIdLine.includes('extension="doc-version-2"'));

		/* v1 and v2 share setId, differ on id */
		const v1_res = generateDentalCdaXml({
			...base,
			documentId: "doc-version-1",
			documentVersion: 1,
		});
		assert.ok(v1_res.success, v1_res.success ? "" : String(v1_res.error));
		const v1 = v1_res.xml;
		const v2_res = generateDentalCdaXml({
			...base,
			documentId: "doc-version-2",
			documentVersion: 2,
		});
		assert.ok(v2_res.success, v2_res.success ? "" : String(v2_res.error));
		const v2 = v2_res.xml;
		assert.ok(v1.includes('extension="visit-set-stable"'));
		assert.ok(v2.includes('extension="visit-set-stable"'));
		assert.ok(v1.includes('extension="doc-version-1"'));
		assert.ok(v2.includes('extension="doc-version-2"'));
		assert.ok(v1.includes('<versionNumber value="1"/>'));
		assert.ok(v2.includes('<versionNumber value="2"/>'));

		/* blank documentSetId → fall back to documentId */
		const fb_res = generateDentalCdaXml({
			...base,
			documentSetId: "   ",
		});
		assert.ok(fb_res.success, fb_res.success ? "" : String(fb_res.error));
		const fb = fb_res.xml;
		const fbSet = fb.split("\n").find((l) => l.includes("<setId "));
		assert.ok(
			fbSet && fbSet.includes('extension="doc-version-2"'),
			"blank documentSetId falls back to documentId",
		);

		/* omitted documentSetId → same fallback */
		const { documentSetId: _omit, ...noSet } = base;
		const omitted_res = generateDentalCdaXml(noSet);
		assert.ok(omitted_res.success, omitted_res.success ? "" : String(omitted_res.error));
		const omitted = omitted_res.xml;
		const omSet = omitted.split("\n").find((l) => l.includes("<setId "));
		assert.ok(
			omSet && omSet.includes('extension="doc-version-2"'),
			"missing documentSetId falls back to documentId",
		);

		/* documentSetId XML-escaped */
		const esc_res = generateDentalCdaXml({
			...base,
			documentSetId:
				"s" +
				String.fromCharCode(60) +
				"x" +
				String.fromCharCode(38) +
				"y",
		});
		assert.ok(esc_res.success, esc_res.success ? "" : String(esc_res.error));
		const esc = esc_res.xml;
		const lt = "&" + "lt;";
		const amp = "&" + "amp;";
		assert.ok(
			esc.includes('<setId root="1.2.643.5.1.13.13.12.2.777" extension="s' + lt + "x" + amp + 'y"/>'),
			"documentSetId must be XML-escaped in setId",
		);
	});

	test("DEFECT #90: relatedDocument RPLC points at prior ClinicalDocument/id", () => {
		const visitDate = new Date("2024-08-01T11:00:00.000Z");
		const base: EgiszCdaParams = {
			patientId: "pat-90",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.555",
			clinicName: "ООО Стоматология",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K04.0",
			diagnosisText: "Пульпит",
			visitDate,
			documentId: "visit-abc-v2",
			documentSetId: "visit-abc",
			documentVersion: 2,
			replacesDocumentId: "visit-abc-v1",
		};

		const xml_res = generateDentalCdaXml(base);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(
			xml.includes('<relatedDocument typeCode="RPLC">'),
			"revised CDA must emit relatedDocument typeCode=RPLC",
		);
		assert.ok(xml.includes("<parentDocument>"));
		assert.ok(
			xml.includes(
				`<id root="1.2.643.5.1.13.13.12.2.555" extension="visit-abc-v1"/>`,
			),
			"parentDocument/id must be prior version ClinicalDocument/id",
		);
		assert.ok(
			xml.includes(
				`<setId root="1.2.643.5.1.13.13.12.2.555" extension="visit-abc"/>`,
			),
			"parentDocument/setId must match stable document SET",
		);
		/* parent versionNumber = current - 1 */
		const parentBlock = xml.slice(
			xml.indexOf("<parentDocument>"),
			xml.indexOf("</parentDocument>"),
		);
		assert.ok(
			parentBlock.includes('<versionNumber value="1"/>'),
			"parentDocument versionNumber is prior version (N-1)",
		);
		assert.ok(
			xml.includes('<versionNumber value="2"/>'),
			"current document versionNumber remains N",
		);

		/* v1 / no replacesDocumentId → no relatedDocument */
		const v1_res = generateDentalCdaXml({
			...base,
			documentId: "visit-abc-v1",
			documentVersion: 1,
			replacesDocumentId: undefined,
		});
		assert.ok(v1_res.success, v1_res.success ? "" : String(v1_res.error));
		const v1 = v1_res.xml;
		assert.ok(
			!v1.includes("<relatedDocument"),
			"v1 without replacesDocumentId must not emit relatedDocument",
		);

		/* blank replacesDocumentId → omit */
		const blank_res = generateDentalCdaXml({
			...base,
			replacesDocumentId: "   ",
		});
		assert.ok(blank_res.success, blank_res.success ? "" : String(blank_res.error));
		const blank = blank_res.xml;
		assert.ok(
			!blank.includes("<relatedDocument"),
			"blank replacesDocumentId must not emit relatedDocument",
		);

		/* replacesDocumentId XML-escaped */
		const esc_res = generateDentalCdaXml({
			...base,
			replacesDocumentId:
				"p" +
				String.fromCharCode(60) +
				"x" +
				String.fromCharCode(38) +
				"y",
		});
		assert.ok(esc_res.success, esc_res.success ? "" : String(esc_res.error));
		const esc = esc_res.xml;
		const lt = "&" + "lt;";
		const amp = "&" + "amp;";
		assert.ok(
			esc.includes('extension="p' + lt + "x" + amp + 'y"'),
			"replacesDocumentId must be XML-escaped in parentDocument/id",
		);
	});

	test("DEFECT #91: encompassingEncounter has AMB code and responsibleParty (doctor)", () => {
		const visitDate = new Date("2024-09-01T10:00:00.000Z");
		const params: EgiszCdaParams = {
			patientId: "pat-91",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.111",
			clinicName: "ООО Стоматология Тест",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "111-222-333 44",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate,
			documentId: "doc-91",
			encounterId: "visit-91",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const encStart = xml.indexOf("<encompassingEncounter>");
		const encEnd = xml.indexOf("</encompassingEncounter>");
		assert.ok(encStart > 0 && encEnd > encStart);
		const enc = xml.slice(encStart, encEnd);

		assert.ok(
			enc.includes(
				'code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461"',
			),
			"encompassingEncounter must declare AMB ambulatory encounter code",
		);
		assert.ok(
			enc.includes('displayName="Амбулаторная помощь"'),
			"AMB displayName must be present",
		);
		assert.ok(
			enc.includes("<responsibleParty>"),
			"encompassingEncounter must include responsibleParty",
		);
		assert.ok(enc.includes("<assignedEntity>"));
		assert.ok(
			enc.includes('root="1.2.643.100.3" extension="111-222-333 44"'),
			"responsibleParty assignedEntity id must carry doctor SNILS",
		);
		assert.ok(
			enc.includes("<family>Петров</family>"),
			"responsibleParty must include treating physician family name",
		);
		assert.ok(enc.includes("<given>Петр</given>"));
		assert.ok(enc.includes("<given>Сергеевич</given>"));
		assert.ok(
			enc.includes('displayName="Врач-стоматолог"'),
			"responsibleParty should surface doctorPosition when provided",
		);
		assert.ok(
			enc.includes("<name>ООО Стоматология Тест</name>"),
			"responsibleParty representedOrganization uses clinicName",
		);

		/* without doctorSnils → id nullFlavor NI (same pattern as assignedAuthor) */
		const noSnils_res = generateDentalCdaXml({
			...params,
			doctorSnils: undefined,
			doctorPosition: undefined,
			doctorName: { first: "Анна", last: "Сидорова" },
		});
		assert.ok(noSnils_res.success, noSnils_res.success ? "" : String(noSnils_res.error));
		const noSnils = noSnils_res.xml;
		const nsEnc = noSnils.slice(
			noSnils.indexOf("<encompassingEncounter>"),
			noSnils.indexOf("</encompassingEncounter>"),
		);
		assert.ok(nsEnc.includes('<id nullFlavor="NI"/>'));
		assert.ok(nsEnc.includes("<family>Сидорова</family>"));
		assert.ok(nsEnc.includes("<given>Анна</given>"));
		assert.ok(nsEnc.includes('code="AMB"'));
		assert.ok(nsEnc.includes("<responsibleParty>"));
	});

	test("DEFECT #92: encompassingEncounter/location healthCareFacility (clinic)", () => {
		const visitDate = new Date("2024-10-01T12:00:00.000Z");
		const params: EgiszCdaParams = {
			patientId: "pat-92",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.222",
			clinicName: "ООО Клиника Локация",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate,
			documentId: "doc-92",
			encounterId: "visit-92",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const enc = xml.slice(
			xml.indexOf("<encompassingEncounter>"),
			xml.indexOf("</encompassingEncounter>"),
		);

		assert.ok(
			enc.includes("<location>"),
			"encompassingEncounter must include location",
		);
		assert.ok(
			enc.includes("<healthCareFacility>"),
			"location must wrap healthCareFacility",
		);
		assert.ok(
			enc.includes(
				`<id root="1.2.643.5.1.13.13.12.2.222" extension="1.2.643.5.1.13.13.12.2.222"/>`,
			),
			"healthCareFacility id uses clinicOid root+extension",
		);
		assert.ok(
			enc.includes("<name>ООО Клиника Локация</name>"),
			"facility location name is clinicName",
		);
		assert.ok(
			enc.includes("<serviceProviderOrganization>"),
			"healthCareFacility must include serviceProviderOrganization",
		);

		/* missing clinicOid → default root + extension unknown */
		const noOid_res = generateDentalCdaXml({
			...params,
			clinicOid: undefined,
			clinicName: "Clinic <X> & Co",
		});
		assert.ok(noOid_res.success, noOid_res.success ? "" : String(noOid_res.error));
		const noOid = noOid_res.xml;
		const noEnc = noOid.slice(
			noOid.indexOf("<encompassingEncounter>"),
			noOid.indexOf("</encompassingEncounter>"),
		);
		assert.ok(
			noEnc.includes(`<id nullFlavor="NI"/>`),
			"missing clinicOid must emit nullFlavor NI (no invented extension)",
		);
		assert.ok(
			noEnc.includes(
				"<name>Clinic " +
					"&" +
					"lt;X" +
					"&" +
					"gt; " +
					"&" +
					"amp; Co</name>",
			),
			"clinicName in location must be XML-escaped",
		);
		assert.ok(noEnc.includes("<healthCareFacility>"));
		assert.ok(noEnc.includes("<serviceProviderOrganization>"));
	});

	test("DEFECT #93: documentationOf/serviceEvent/performer (treating physician)", () => {
		const visitDate = new Date("2024-11-01T09:30:00.000Z");
		const params: EgiszCdaParams = {
			patientId: "pat-93",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.333",
			clinicName: "ООО Клиника Performer",
			doctorName: { first: "Петр", last: "Петров", middle: "Иванович" },
			doctorSnils: "555-666-777 88",
			doctorPosition: "Врач-стоматолог-терапевт",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate,
			documentId: "doc-93",
			encounterId: "visit-93",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const docOfStart = xml.indexOf("<documentationOf>");
		const docOfEnd = xml.indexOf("</documentationOf>");
		assert.ok(docOfStart > 0 && docOfEnd > docOfStart);
		const docOf = xml.slice(docOfStart, docOfEnd);

		assert.ok(
			docOf.includes('<serviceEvent classCode="PCPR">'),
			"documentationOf must wrap serviceEvent PCPR",
		);
		assert.ok(
			docOf.includes('<performer typeCode="PRF">'),
			"serviceEvent must include performer typeCode=PRF",
		);
		assert.ok(docOf.includes("<assignedEntity>"));
		assert.ok(
			docOf.includes('root="1.2.643.100.3" extension="555-666-777 88"'),
			"performer assignedEntity id must carry doctor SNILS",
		);
		assert.ok(
			docOf.includes("<family>Петров</family>"),
			"performer must include treating physician family name",
		);
		assert.ok(docOf.includes("<given>Петр</given>"));
		assert.ok(docOf.includes("<given>Иванович</given>"));
		assert.ok(
			docOf.includes('displayName="Врач-стоматолог-терапевт"'),
			"performer should surface doctorPosition when provided",
		);
		assert.ok(
			docOf.includes("<name>ООО Клиника Performer</name>"),
			"performer representedOrganization uses clinicName",
		);

		/* without doctorSnils → id nullFlavor NI */
		const noSnils_res = generateDentalCdaXml({
			...params,
			doctorSnils: undefined,
			doctorPosition: undefined,
			doctorName: { first: "Анна", last: "Сидорова" },
		});
		assert.ok(noSnils_res.success, noSnils_res.success ? "" : String(noSnils_res.error));
		const noSnils = noSnils_res.xml;
		const nsDoc = noSnils.slice(
			noSnils.indexOf("<documentationOf>"),
			noSnils.indexOf("</documentationOf>"),
		);
		assert.ok(nsDoc.includes('<performer typeCode="PRF">'));
		assert.ok(nsDoc.includes('<id nullFlavor="NI"/>'));
		assert.ok(nsDoc.includes("<family>Сидорова</family>"));
		assert.ok(nsDoc.includes("<given>Анна</given>"));
	});

	test("DEFECT #94: patientRole carries local MRN (patientId) plus optional SNILS", () => {
		const visitDate = new Date("2024-12-01T08:00:00.000Z");
		const withBoth: EgiszCdaParams = {
			patientId: "pat-mrn-001",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.444",
			clinicName: "ООО Клиника MRN",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate,
			documentId: "doc-94",
		};

		const xml_res = generateDentalCdaXml(withBoth);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const role = xml.slice(
			xml.indexOf("<patientRole>"),
			xml.indexOf("</patientRole>"),
		);
		assert.ok(
			role.includes(
				`<id root="1.2.643.5.1.13.13.12.2.444" extension="pat-mrn-001"/>`,
			),
			"patientRole must emit local MRN id (clinicOid + patientId)",
		);
		assert.ok(
			role.includes(
				`<id root="1.2.643.100.3" extension="123-456-789 00"/>`,
			),
			"patientRole must still emit SNILS when present",
		);
		/* MRN before SNILS */
		const mrnIdx = role.indexOf('extension="pat-mrn-001"');
		const snilsIdx = role.indexOf('root="1.2.643.100.3"');
		assert.ok(mrnIdx >= 0 && snilsIdx > mrnIdx);

		/* no SNILS → MRN only, no nullFlavor NI for missing SNILS */
		const noSnils_res = generateDentalCdaXml({
			...withBoth,
			patientSnils: "   ",
		});
		assert.ok(noSnils_res.success, noSnils_res.success ? "" : String(noSnils_res.error));
		const noSnils = noSnils_res.xml;
		const nsRole = noSnils.slice(
			noSnils.indexOf("<patientRole>"),
			noSnils.indexOf("</patientRole>"),
		);
		assert.ok(
			nsRole.includes(
				`<id root="1.2.643.5.1.13.13.12.2.444" extension="pat-mrn-001"/>`,
			),
		);
		assert.ok(
			!nsRole.includes('root="1.2.643.100.3"'),
			"blank SNILS must not emit empty SNILS id",
		);
		/* DEFECT #98: addr/telecom may use nullFlavor NI; forbid empty SNILS id only */
		assert.ok(
			!nsRole.includes('extension=""'),
			"when MRN present, do not emit empty-extension id placeholder for missing SNILS",
		);

		/* missing clinicOid → default MO root */
		const noOid_res = generateDentalCdaXml({
			...withBoth,
			clinicOid: undefined,
			patientId: "p" + String.fromCharCode(60) + "x" + String.fromCharCode(38) + "y",
		});
		assert.ok(noOid_res.success, noOid_res.success ? "" : String(noOid_res.error));
		const noOid = noOid_res.xml;
		const noRole = noOid.slice(
			noOid.indexOf("<patientRole>"),
			noOid.indexOf("</patientRole>"),
		);
		const lt = "&" + "lt;";
		const amp = "&" + "amp;";
		assert.ok(
			noRole.includes(
				`root="1.2.643.5.1.13.13.12.2" extension="p` + lt + "x" + amp + 'y"',
			),
			"missing clinicOid uses default root; patientId XML-escaped",
		);
	});

	test("DEFECT #95: authenticator present with doctor name, signatureCode S, document time", () => {
		const documentTime = new Date("2024-05-15T14:30:00.000Z");
		const pad = (n: number) => n.toString().padStart(2, "0");
		const expectedClock =
			`${documentTime.getFullYear()}${pad(documentTime.getMonth() + 1)}${pad(documentTime.getDate())}` +
			`${pad(documentTime.getHours())}${pad(documentTime.getMinutes())}${pad(documentTime.getSeconds())}`;

		const params: EgiszCdaParams = {
			patientId: "pat-95",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.555",
			clinicName: "ООО Клиника Auth",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "999-888-777 66",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2024-05-15T10:00:00.000Z"),
			documentId: "doc-95",
			documentTime,
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(
			xml.includes("<authenticator>"),
			"CDA must include authenticator after legalAuthenticator",
		);
		const authStart = xml.indexOf("<authenticator>");
		const authEnd = xml.indexOf("</authenticator>");
		assert.ok(authStart > 0 && authEnd > authStart);
		const auth = xml.slice(authStart, authEnd);

		assert.ok(
			auth.includes(`<time value="${expectedClock}"/>`),
			"authenticator time must match documentTime clock",
		);
		assert.ok(
			auth.includes('<signatureCode code="S"/>'),
			"authenticator must carry signatureCode S",
		);
		assert.ok(
			auth.includes('root="1.2.643.100.3" extension="999-888-777 66"'),
			"authenticator assignedEntity id must carry doctor SNILS",
		);
		assert.ok(auth.includes("<family>Петров</family>"));
		assert.ok(auth.includes("<given>Петр</given>"));
		assert.ok(auth.includes("<given>Сергеевич</given>"));
		assert.ok(
			auth.includes('displayName="Врач-стоматолог"'),
			"authenticator should surface doctorPosition",
		);
		assert.ok(
			auth.includes("<name>ООО Клиника Auth</name>"),
			"authenticator representedOrganization uses clinicName",
		);

		/* authenticator after legalAuthenticator */
		const legalIdx = xml.indexOf("</legalAuthenticator>");
		assert.ok(legalIdx > 0 && authStart > legalIdx);

		/* without doctorSnils → nullFlavor NI */
		const noSnils_res = generateDentalCdaXml({
			...params,
			doctorSnils: undefined,
			doctorPosition: undefined,
			doctorName: { first: "Анна", last: "Сидорова" },
		});
		assert.ok(noSnils_res.success, noSnils_res.success ? "" : String(noSnils_res.error));
		const noSnils = noSnils_res.xml;
		const nsAuth = noSnils.slice(
			noSnils.indexOf("<authenticator>"),
			noSnils.indexOf("</authenticator>"),
		);
		assert.ok(nsAuth.includes('<id nullFlavor="NI"/>'));
		assert.ok(nsAuth.includes("<family>Сидорова</family>"));
		assert.ok(nsAuth.includes('<signatureCode code="S"/>'));
	});

	test("DEFECT #96: informationRecipient addresses clinic MO for REMD registration", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-96",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.666",
			clinicName: "ООО Клиника Recipient",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2024-12-15T10:00:00.000Z"),
			documentId: "doc-96",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(
			xml.includes("<informationRecipient>"),
			"CDA must include informationRecipient after custodian",
		);
		const irStart = xml.indexOf("<informationRecipient>");
		const irEnd = xml.indexOf("</informationRecipient>");
		assert.ok(irStart > 0 && irEnd > irStart);
		const ir = xml.slice(irStart, irEnd);

		assert.ok(ir.includes("<intendedRecipient>"));
		assert.ok(ir.includes("<receivedOrganization>"));
		assert.ok(
			ir.includes(
				`root="1.2.643.5.1.13.13.12.2" extension="1.2.643.5.1.13.13.12.2.666"`,
			),
			"receivedOrganization id uses MO registry root + clinicOid extension",
		);
		assert.ok(
			ir.includes("<name>ООО Клиника Recipient</name>"),
			"receivedOrganization name is clinicName",
		);

		/* after custodian, before legalAuthenticator */
		const custEnd = xml.indexOf("</custodian>");
		const legalStart = xml.indexOf("<legalAuthenticator>");
		assert.ok(custEnd > 0 && irStart > custEnd);
		assert.ok(legalStart > 0 && irEnd < legalStart);

		/* missing clinicOid → nullFlavor NI */
		const noOid_res = generateDentalCdaXml({
			...params,
			clinicOid: undefined,
			clinicName: "Clinic " + String.fromCharCode(60) + "X" + String.fromCharCode(38) + "Y",
		});
		assert.ok(noOid_res.success, noOid_res.success ? "" : String(noOid_res.error));
		const noOid = noOid_res.xml;
		const noIr = noOid.slice(
			noOid.indexOf("<informationRecipient>"),
			noOid.indexOf("</informationRecipient>"),
		);
		assert.ok(noIr.includes('<id nullFlavor="NI"/>'));
		const lt = "&" + "lt;";
		const amp = "&" + "amp;";
		assert.ok(
			noIr.includes("<name>Clinic " + lt + "X" + amp + "Y</name>"),
			"clinicName in informationRecipient must be XML-escaped",
		);
	});

	test("DEFECT #97: patient languageCommunication ru-RU with preferenceInd", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-97",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.777",
			clinicName: "ООО Клиника Lang",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-01-10T10:00:00.000Z"),
			documentId: "doc-97",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const patientBlock = xml.slice(
			xml.indexOf("<patient>"),
			xml.indexOf("</patient>"),
		);
		assert.ok(
			patientBlock.includes("<languageCommunication>"),
			"patient must include languageCommunication",
		);
		assert.ok(
			patientBlock.includes('<languageCode code="ru-RU"/>'),
			"languageCode must be ru-RU for RF ambulatory dentistry",
		);
		assert.ok(
			patientBlock.includes('<preferenceInd value="true"/>'),
			"preferenceInd true marks primary communication language",
		);
		/* after birthTime */
		const birthIdx = patientBlock.indexOf("<birthTime");
		const langIdx = patientBlock.indexOf("<languageCommunication>");
		assert.ok(birthIdx >= 0 && langIdx > birthIdx);
	});

	test("DEFECT #98: patientRole addr and telecom nullFlavor NI (no invented contact)", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-98",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.888",
			clinicName: "ООО Клиника Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-02-01T10:00:00.000Z"),
			documentId: "doc-98",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const role = xml.slice(
			xml.indexOf("<patientRole>"),
			xml.indexOf("</patientRole>"),
		);
		assert.ok(
			role.includes('<addr nullFlavor="NI"/>'),
			"patientRole must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			role.includes('<telecom nullFlavor="NI"/>'),
			"patientRole must emit telecom nullFlavor=NI when contact unknown",
		);
		/* no invented street/phone */
		assert.ok(!role.includes("<streetAddressLine"));
		assert.ok(!role.includes("tel:"));
		/* order: ids → addr → telecom → patient */
		const addrIdx = role.indexOf("<addr ");
		const telIdx = role.indexOf("<telecom ");
		const patientIdx = role.indexOf("<patient>");
		assert.ok(addrIdx > 0 && telIdx > addrIdx && patientIdx > telIdx);
	});

	test("DEFECT #99: assignedAuthor addr and telecom nullFlavor NI (no invented contact)", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-99",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.999",
			clinicName: "ООО Клиника Author Contact",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "111-222-333 44",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-03-01T10:00:00.000Z"),
			documentId: "doc-99",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const authorEnd = "</assignedAuthor>";
		const author = xml.slice(
			xml.indexOf("<assignedAuthor>"),
			xml.indexOf(authorEnd) + authorEnd.length,
		);
		assert.ok(
			author.includes('<addr nullFlavor="NI"/>'),
			"assignedAuthor must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			author.includes('<telecom nullFlavor="NI"/>'),
			"assignedAuthor must emit telecom nullFlavor=NI when contact unknown",
		);
		/* no invented street/phone under author */
		assert.ok(!author.includes("<streetAddressLine"));
		assert.ok(!author.includes("tel:"));
		/* order: id → (code) → addr → telecom → assignedPerson */
		const idIdx = author.indexOf("<id ");
		const addrIdx = author.indexOf("<addr ");
		const telIdx = author.indexOf("<telecom ");
		const personIdx = author.indexOf("<assignedPerson>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				personIdx > telIdx,
			"assignedAuthor order: id → addr → telecom → assignedPerson",
		);
		/* still carries person + org (prior defects) */
		assert.ok(author.includes("<family>Петров</family>"));
		assert.ok(author.includes("<representedOrganization>"));
	});

	test("DEFECT #100: legalAuthenticator assignedEntity addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-100",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.100",
			clinicName: "ООО Клиника Legal Contact",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "111-222-333 44",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-04-01T10:00:00.000Z"),
			documentId: "doc-100",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const laEnd = "</legalAuthenticator>";
		const la = xml.slice(
			xml.indexOf("<legalAuthenticator>"),
			xml.indexOf(laEnd) + laEnd.length,
		);
		assert.ok(
			la.includes('<addr nullFlavor="NI"/>'),
			"legalAuthenticator assignedEntity must emit addr nullFlavor=NI",
		);
		assert.ok(
			la.includes('<telecom nullFlavor="NI"/>'),
			"legalAuthenticator assignedEntity must emit telecom nullFlavor=NI",
		);
		assert.ok(!la.includes("<streetAddressLine"));
		assert.ok(!la.includes("tel:"));
		const idIdx = la.indexOf("<id ");
		const addrIdx = la.indexOf("<addr ");
		const telIdx = la.indexOf("<telecom ");
		const personIdx = la.indexOf("<assignedPerson>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				personIdx > telIdx,
			"legalAuthenticator order: id → addr → telecom → assignedPerson",
		);
		assert.ok(la.includes("<family>Петров</family>"));
		assert.ok(la.includes('<signatureCode code="S"/>'));
	});

	test("DEFECT #101: authenticator assignedEntity addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-101",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.101",
			clinicName: "ООО Клиника Auth Contact",
			doctorName: { first: "Петр", last: "Петров", middle: "Сергеевич" },
			doctorSnils: "111-222-333 44",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-05-01T10:00:00.000Z"),
			documentId: "doc-101",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const authEnd = "</authenticator>";
		const auth = xml.slice(
			xml.indexOf("<authenticator>"),
			xml.indexOf(authEnd) + authEnd.length,
		);
		assert.ok(
			auth.includes('<addr nullFlavor="NI"/>'),
			"authenticator assignedEntity must emit addr nullFlavor=NI",
		);
		assert.ok(
			auth.includes('<telecom nullFlavor="NI"/>'),
			"authenticator assignedEntity must emit telecom nullFlavor=NI",
		);
		assert.ok(!auth.includes("<streetAddressLine"));
		assert.ok(!auth.includes("tel:"));
		const idIdx = auth.indexOf("<id ");
		const addrIdx = auth.indexOf("<addr ");
		const telIdx = auth.indexOf("<telecom ");
		const personIdx = auth.indexOf("<assignedPerson>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				personIdx > telIdx,
			"authenticator order: id → addr → telecom → assignedPerson",
		);
		assert.ok(auth.includes("<family>Петров</family>"));
		assert.ok(auth.includes('<signatureCode code="S"/>'));
	});

	test("DEFECT #102: custodian representedCustodianOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-102",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.102",
			clinicName: "ООО Клиника Custodian Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-06-01T10:00:00.000Z"),
			documentId: "doc-102",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const custEnd = "</custodian>";
		const cust = xml.slice(
			xml.indexOf("<custodian>"),
			xml.indexOf(custEnd) + custEnd.length,
		);
		assert.ok(
			cust.includes("<representedCustodianOrganization>"),
			"custodian must wrap representedCustodianOrganization",
		);
		assert.ok(
			cust.includes('<addr nullFlavor="NI"/>'),
			"custodian org must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			cust.includes('<telecom nullFlavor="NI"/>'),
			"custodian org must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!cust.includes("<streetAddressLine"));
		assert.ok(!cust.includes("tel:"));
		/* order: id → addr → telecom → name */
		const idIdx = cust.indexOf("<id ");
		const addrIdx = cust.indexOf("<addr ");
		const telIdx = cust.indexOf("<telecom ");
		const nameIdx = cust.indexOf("<name>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				nameIdx > telIdx,
			"custodian org order: id → addr → telecom → name",
		);
		assert.ok(cust.includes("<name>ООО Клиника Custodian Contact</name>"));
	});

	test("DEFECT #103: informationRecipient receivedOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-103",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.103",
			clinicName: "ООО Клиника Recipient Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-103",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const irEnd = "</informationRecipient>";
		const ir = xml.slice(
			xml.indexOf("<informationRecipient>"),
			xml.indexOf(irEnd) + irEnd.length,
		);
		assert.ok(
			ir.includes("<receivedOrganization>"),
			"informationRecipient must wrap receivedOrganization",
		);
		assert.ok(
			ir.includes('<addr nullFlavor="NI"/>'),
			"receivedOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			ir.includes('<telecom nullFlavor="NI"/>'),
			"receivedOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!ir.includes("<streetAddressLine"));
		assert.ok(!ir.includes("tel:"));
		/* order: id → addr → telecom → name */
		const idIdx = ir.indexOf("<id ");
		const addrIdx = ir.indexOf("<addr ");
		const telIdx = ir.indexOf("<telecom ");
		const nameIdx = ir.indexOf("<name>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				nameIdx > telIdx,
			"receivedOrganization order: id → addr → telecom → name",
		);
		assert.ok(ir.includes("<name>ООО Клиника Recipient Contact</name>"));
	});






	test("DEFECT #104: serviceEvent performer assignedEntity addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-104",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.104",
			clinicName: "ООО Клиника Performer Contact",
			doctorName: { first: "Петр", last: "Петров" },
			doctorSnils: "987-654-321 00",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-104",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const perfEnd = "</performer>";
		const perfStart = xml.indexOf('<performer typeCode="PRF">');
		const perf = xml.slice(perfStart, xml.indexOf(perfEnd, perfStart) + perfEnd.length);
		assert.ok(perfStart >= 0, "serviceEvent must include performer");
		assert.ok(
			perf.includes('<addr nullFlavor="NI"/>'),
			"performer assignedEntity must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			perf.includes('<telecom nullFlavor="NI"/>'),
			"performer assignedEntity must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!perf.includes("<streetAddressLine"));
		assert.ok(!perf.includes("tel:"));
		/* order: id → (optional code) → addr → telecom → assignedPerson */
		const idIdx = perf.indexOf("<id ");
		const addrIdx = perf.indexOf("<addr ");
		const telIdx = perf.indexOf("<telecom ");
		const personIdx = perf.indexOf("<assignedPerson>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				personIdx > telIdx,
			"performer assignedEntity order: id → addr → telecom → assignedPerson",
		);
		assert.ok(perf.includes("<family>Петров</family>"));
		assert.ok(perf.includes("<name>ООО Клиника Performer Contact</name>"));
	});


	test("DEFECT #105: encompassingEncounter responsibleParty assignedEntity addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-105",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.105",
			clinicName: "ООО Клиника Responsible Contact",
			doctorName: { first: "Петр", last: "Петров" },
			doctorSnils: "987-654-321 00",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-105",
			encounterId: "enc-105",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const rpEnd = "</responsibleParty>";
		const rpStart = xml.indexOf("<responsibleParty>");
		const rp = xml.slice(rpStart, xml.indexOf(rpEnd, rpStart) + rpEnd.length);
		assert.ok(rpStart >= 0, "encompassingEncounter must include responsibleParty");
		assert.ok(
			rp.includes('<addr nullFlavor="NI"/>'),
			"responsibleParty assignedEntity must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			rp.includes('<telecom nullFlavor="NI"/>'),
			"responsibleParty assignedEntity must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!rp.includes("<streetAddressLine"));
		assert.ok(!rp.includes("tel:"));
		/* order: id → (optional code) → addr → telecom → assignedPerson */
		const idIdx = rp.indexOf("<id ");
		const addrIdx = rp.indexOf("<addr ");
		const telIdx = rp.indexOf("<telecom ");
		const personIdx = rp.indexOf("<assignedPerson>");
		assert.ok(
			idIdx >= 0 &&
				addrIdx > idIdx &&
				telIdx > addrIdx &&
				personIdx > telIdx,
			"responsibleParty assignedEntity order: id → addr → telecom → assignedPerson",
		);
		assert.ok(rp.includes("<family>Петров</family>"));
		assert.ok(rp.includes("<name>ООО Клиника Responsible Contact</name>"));
	});


	test("DEFECT #106: assignedAuthor representedOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-106",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.106",
			clinicName: "ООО Клиника Author Org Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-106",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const aaEnd = "</assignedAuthor>";
		const aaStart = xml.indexOf("<assignedAuthor>");
		const aa = xml.slice(aaStart, xml.indexOf(aaEnd, aaStart) + aaEnd.length);
		const roStart = aa.indexOf("<representedOrganization>");
		const roEnd = "</representedOrganization>";
		assert.ok(roStart >= 0, "assignedAuthor must include representedOrganization");
		const ro = aa.slice(roStart, aa.indexOf(roEnd, roStart) + roEnd.length);
		assert.ok(
			ro.includes('<addr nullFlavor="NI"/>'),
			"representedOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			ro.includes('<telecom nullFlavor="NI"/>'),
			"representedOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!ro.includes("<streetAddressLine"));
		assert.ok(!ro.includes("tel:"));
		/* order: addr → telecom → name (ignore XML comments) */
		const roNoComments = ro.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = roNoComments.indexOf("<addr ");
		const telIdx = roNoComments.indexOf("<telecom ");
		const nameIdx = roNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && telIdx > addrIdx && nameIdx > telIdx,
			"representedOrganization order: addr → telecom → name",
		);
		assert.ok(ro.includes("<name>ООО Клиника Author Org Contact</name>"));
	});


	test("DEFECT #107: legalAuthenticator representedOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-107",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.107",
			clinicName: "ООО Клиника Legal Org Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-107",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const laEnd = "</legalAuthenticator>";
		const laStart = xml.indexOf("<legalAuthenticator>");
		const la = xml.slice(laStart, xml.indexOf(laEnd, laStart) + laEnd.length);
		const roStart = la.indexOf("<representedOrganization>");
		const roEnd = "</representedOrganization>";
		assert.ok(roStart >= 0, "legalAuthenticator must include representedOrganization");
		const ro = la.slice(roStart, la.indexOf(roEnd, roStart) + roEnd.length);
		assert.ok(
			ro.includes('<addr nullFlavor="NI"/>'),
			"representedOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			ro.includes('<telecom nullFlavor="NI"/>'),
			"representedOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!ro.includes("<streetAddressLine"));
		assert.ok(!ro.includes("tel:"));
		/* order: addr → telecom → name (ignore XML comments) */
		const roNoComments = ro.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = roNoComments.indexOf("<addr ");
		const telIdx = roNoComments.indexOf("<telecom ");
		const nameIdx = roNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && telIdx > addrIdx && nameIdx > telIdx,
			"representedOrganization order: addr → telecom → name",
		);
		assert.ok(ro.includes("<name>ООО Клиника Legal Org Contact</name>"));
	});

	test("DEFECT #108: authenticator representedOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-108",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.108",
			clinicName: "ООО Клиника Auth Org Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-108",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const authEnd = "</authenticator>";
		const authStart = xml.indexOf("<authenticator>");
		const auth = xml.slice(authStart, xml.indexOf(authEnd, authStart) + authEnd.length);
		const roStart = auth.indexOf("<representedOrganization>");
		const roEnd = "</representedOrganization>";
		assert.ok(roStart >= 0, "authenticator must include representedOrganization");
		const ro = auth.slice(roStart, auth.indexOf(roEnd, roStart) + roEnd.length);
		assert.ok(
			ro.includes('<addr nullFlavor="NI"/>'),
			"representedOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			ro.includes('<telecom nullFlavor="NI"/>'),
			"representedOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!ro.includes("<streetAddressLine"));
		assert.ok(!ro.includes("tel:"));
		/* order: addr → telecom → name (ignore XML comments) */
		const roNoComments = ro.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = roNoComments.indexOf("<addr ");
		const telIdx = roNoComments.indexOf("<telecom ");
		const nameIdx = roNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && telIdx > addrIdx && nameIdx > telIdx,
			"representedOrganization order: addr → telecom → name",
		);
		assert.ok(ro.includes("<name>ООО Клиника Auth Org Contact</name>"));
	});

	test("DEFECT #109: serviceEvent performer representedOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-109",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.109",
			clinicName: "ООО Клиника Performer Org Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-109",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const perfEnd = "</performer>";
		const perfStart = xml.indexOf('<performer typeCode="PRF">');
		const perf = xml.slice(perfStart, xml.indexOf(perfEnd, perfStart) + perfEnd.length);
		const roStart = perf.indexOf("<representedOrganization>");
		const roEnd = "</representedOrganization>";
		assert.ok(roStart >= 0, "performer must include representedOrganization");
		const ro = perf.slice(roStart, perf.indexOf(roEnd, roStart) + roEnd.length);
		assert.ok(
			ro.includes('<addr nullFlavor="NI"/>'),
			"representedOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			ro.includes('<telecom nullFlavor="NI"/>'),
			"representedOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!ro.includes("<streetAddressLine"));
		assert.ok(!ro.includes("tel:"));
		/* order: addr → telecom → name (ignore XML comments) */
		const roNoComments = ro.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = roNoComments.indexOf("<addr ");
		const telIdx = roNoComments.indexOf("<telecom ");
		const nameIdx = roNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && telIdx > addrIdx && nameIdx > telIdx,
			"representedOrganization order: addr → telecom → name",
		);
		assert.ok(ro.includes("<name>ООО Клиника Performer Org Contact</name>"));
	});

	test("DEFECT #110: responsibleParty representedOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-110",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.110",
			clinicName: "ООО Клиника Responsible Org Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-110",
			encounterId: "enc-110",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const rpEnd = "</responsibleParty>";
		const rpStart = xml.indexOf("<responsibleParty>");
		const rp = xml.slice(rpStart, xml.indexOf(rpEnd, rpStart) + rpEnd.length);
		const roStart = rp.indexOf("<representedOrganization>");
		const roEnd = "</representedOrganization>";
		assert.ok(roStart >= 0, "responsibleParty must include representedOrganization");
		const ro = rp.slice(roStart, rp.indexOf(roEnd, roStart) + roEnd.length);
		assert.ok(
			ro.includes('<addr nullFlavor="NI"/>'),
			"representedOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			ro.includes('<telecom nullFlavor="NI"/>'),
			"representedOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!ro.includes("<streetAddressLine"));
		assert.ok(!ro.includes("tel:"));
		/* order: addr → telecom → name (ignore XML comments) */
		const roNoComments = ro.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = roNoComments.indexOf("<addr ");
		const telIdx = roNoComments.indexOf("<telecom ");
		const nameIdx = roNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && telIdx > addrIdx && nameIdx > telIdx,
			"representedOrganization order: addr → telecom → name",
		);
		assert.ok(ro.includes("<name>ООО Клиника Responsible Org Contact</name>"));
	});

	test("DEFECT #111: serviceProviderOrganization addr and telecom nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-111",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.111",
			clinicName: "ООО Клиника Provider Org Contact",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-111",
			encounterId: "enc-111",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const spoEnd = "</serviceProviderOrganization>";
		const spoStart = xml.indexOf("<serviceProviderOrganization>");
		assert.ok(spoStart >= 0, "healthCareFacility must include serviceProviderOrganization");
		const spo = xml.slice(spoStart, xml.indexOf(spoEnd, spoStart) + spoEnd.length);
		assert.ok(
			spo.includes('<addr nullFlavor="NI"/>'),
			"serviceProviderOrganization must emit addr nullFlavor=NI when contact unknown",
		);
		assert.ok(
			spo.includes('<telecom nullFlavor="NI"/>'),
			"serviceProviderOrganization must emit telecom nullFlavor=NI when contact unknown",
		);
		assert.ok(!spo.includes("<streetAddressLine"));
		assert.ok(!spo.includes("tel:"));
		/* order: addr → telecom → name (ignore XML comments) */
		const spoNoComments = spo.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = spoNoComments.indexOf("<addr ");
		const telIdx = spoNoComments.indexOf("<telecom ");
		const nameIdx = spoNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && telIdx > addrIdx && nameIdx > telIdx,
			"serviceProviderOrganization order: addr → telecom → name",
		);
		assert.ok(spo.includes("<name>ООО Клиника Provider Org Contact</name>"));
	});

	test("DEFECT #112: healthCareFacility location addr nullFlavor NI", () => {
		const params: EgiszCdaParams = {
			patientId: "pat-112",
			patientName: { first: "Иван", last: "Иванов" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.112",
			clinicName: "ООО Клиника Facility Location",
			doctorName: { first: "Петр", last: "Петров" },
			icd10Code: "K02.1",
			diagnosisText: "Кариес",
			visitDate: new Date("2025-07-01T10:00:00.000Z"),
			documentId: "doc-112",
			encounterId: "enc-112",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		const hcfEnd = "</healthCareFacility>";
		const hcfStart = xml.indexOf("<healthCareFacility>");
		assert.ok(hcfStart >= 0, "encompassingEncounter must include healthCareFacility");
		const hcf = xml.slice(hcfStart, xml.indexOf(hcfEnd, hcfStart) + hcfEnd.length);
		/* inner place location (not outer encompassingEncounter/location) */
		const placeOpen = hcf.indexOf("<location>");
		const placeClose = "</location>";
		assert.ok(placeOpen >= 0, "healthCareFacility must include place location");
		const place = hcf.slice(placeOpen, hcf.indexOf(placeClose, placeOpen) + placeClose.length);
		assert.ok(
			place.includes('<addr nullFlavor="NI"/>'),
			"facility location must emit addr nullFlavor=NI when street unknown",
		);
		assert.ok(!place.includes("<streetAddressLine"));
		assert.ok(!place.includes("tel:"));
		/* order: addr → name (ignore XML comments) */
		const placeNoComments = place.replace(/<!--[\s\S]*?-->/g, "");
		const addrIdx = placeNoComments.indexOf("<addr ");
		const nameIdx = placeNoComments.indexOf("<name>");
		assert.ok(
			addrIdx >= 0 && nameIdx > addrIdx,
			"facility location order: addr → name",
		);
		assert.ok(place.includes("<name>ООО Клиника Facility Location</name>"));
	});


	test("generateDentalCdaXml escapes XML special characters in free text", () => {


















		const params: EgiszCdaParams = {
			patientId: "pat-esc",
			patientName: { first: "A<B", last: "C&D", middle: 'E"F' },
			patientSnils: "12<3&4'",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicName: "Clinic <Main> & Co",
			doctorName: { first: "Doc<", last: "Tor&" },
			doctorSnils: "98>76&'",
			icd10Code: "K02.<1>",
			diagnosisText: 'Diag <x> & "y"\'',
			anamnesis: 'Pain <2> & "sharp"\'',
			objectiveStatus: "Status <O> & x",
			complications: "Comp <c> & d",
			comorbidities: "Comorb <m> & n",
			instrumentTrayBarcode: "TRAY<1>&2",
			treatmentDescription: "Treat <t> & u",
			visitDate: new Date("2024-05-15T10:00:00.000Z"),
			documentId: "doc<001>&'",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;
		assert.ok(xml.includes("&lt;"));
		assert.ok(xml.includes("&gt;"));
		assert.ok(xml.includes("&amp;"));
		assert.ok(xml.includes("&quot;"));
		assert.ok(xml.includes("&apos;"));
		// Raw special chars must not appear unescaped in clinical free text
		assert.ok(!xml.includes("<paragraph>Pain <2>"));
		assert.ok(xml.includes("<paragraph>Pain &lt;2&gt; &amp; &quot;sharp&quot;&apos;</paragraph>"));
		assert.ok(xml.includes('displayName="Diag &lt;x&gt; &amp; &quot;y&quot;&apos;"'));
		assert.ok(xml.includes("<family>C&amp;D</family>"));
		assert.ok(xml.includes("<name>Clinic &lt;Main&gt; &amp; Co</name>"));
		assert.ok(xml.includes("<paragraph>Status &lt;O&gt; &amp; x</paragraph>"));
		assert.ok(xml.includes("<paragraph>Comp &lt;c&gt; &amp; d</paragraph>"));
		assert.ok(xml.includes("<paragraph>Comorb &lt;m&gt; &amp; n</paragraph>"));
		assert.ok(xml.includes("<paragraph>Treat &lt;t&gt; &amp; u</paragraph>"));
		assert.ok(xml.includes("Штрихкод: TRAY&lt;1&gt;&amp;2"));
		assert.ok(xml.includes('code="46264-8"'));
	});
	/*
	 * Real-data path (HAMMER MANDATE — no nullFlavor spam): when the DB supplies
	 * patient / clinic / doctor contact, the generator must emit the real
	 * <addr>/<telecom> and NOT nullFlavor="NI".
	 */
	test("emits real patient/clinic/doctor addr+telecom when contact data present", (t) => {
		t.mock.timers.enable({ apis: ["Date"] });
		t.mock.timers.setTime(new Date("2024-05-15T12:00:00.000Z").getTime());

		const params: EgiszCdaParams = {
			patientId: "pat-123",
			patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			patientAddress: "г. Москва, ул. Тверская, д. 1",
			patientPhone: "+7 495 123-45-67",
			patientEmail: "ivan@example.ru",
			clinicOid: "1.2.643.5.1.13.13.12.2.888",
			clinicName: "ООО Стоматология",
			clinicAddress: "г. Москва, ул. Клиническая, д. 10",
			clinicPhone: "+7 495 000-11-22",
			clinicEmail: "clinic@example.ru",
			clinicLegalAddress: "г. Москва, юр. адрес, д. 5",
			doctorName: { first: "Петр", last: "Петров", middle: "Петрович" },
			doctorSnils: "987-654-321 00",
			doctorPosition: "Врач-стоматолог",
			doctorPhone: "+7 495 555-66-77",
			doctorEmail: "doctor@example.ru",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			anamnesis: "Жалобы на боли от сладкого",
			treatmentDescription: "Препарирование, пломба",
			visitDate: new Date("2024-05-15T10:00:00.000Z"),
			documentId: "doc-real",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;

		assert.ok(
			xml.includes('<streetAddressLine>г. Москва, ул. Тверская, д. 1</streetAddressLine>'),
			"patient addr must be real",
		);
		assert.ok(xml.includes('<telecom value="tel:+7 495 123-45-67"/>'), "patient phone must be real");
		assert.ok(xml.includes('<telecom value="mailto:ivan@example.ru"/>'), "patient email must be real");

		assert.ok(
			xml.includes('<streetAddressLine>г. Москва, ул. Клиническая, д. 10</streetAddressLine>'),
			"clinic addr must be real",
		);
		assert.ok(xml.includes('<telecom value="tel:+7 495 000-11-22"/>'), "clinic phone must be real");
		assert.ok(xml.includes('<telecom value="mailto:clinic@example.ru"/>'), "clinic email must be real");

		assert.ok(xml.includes('<telecom value="tel:+7 495 555-66-77"/>'), "doctor phone must be real");
		assert.ok(xml.includes('<telecom value="mailto:doctor@example.ru"/>'), "doctor email must be real");

		assert.ok(!xml.includes('<addr nullFlavor="NI"/>'), "must not emit nullFlavor addr when contact data present");
		assert.ok(!xml.includes('<telecom nullFlavor="NI"/>'), "must not emit nullFlavor telecom when contact data present");
	});

	/*
	 * Fallback path (no invented data): when the DB supplies NO contact values,
	 * the generator must still emit a valid (nullFlavor="NI") addr/telecom —
	 * never fabricate a street or phone.
	 */
	test("emits nullFlavor addr/telecom when no contact data present", (t) => {
		t.mock.timers.enable({ apis: ["Date"] });
		t.mock.timers.setTime(new Date("2024-05-15T12:00:00.000Z").getTime());

		const params: EgiszCdaParams = {
			patientId: "pat-123",
			patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
			patientSnils: "123-456-789 00",
			patientBirthDate: "1980-01-01T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.888",
			clinicName: "ООО Стоматология",
			doctorName: { first: "Петр", last: "Петров", middle: "Петрович" },
			doctorSnils: "987-654-321 00",
			doctorPosition: "Врач-стоматолог",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			visitDate: new Date("2024-05-15T10:00:00.000Z"),
			documentId: "doc-none",
		};

		const xml_res = generateDentalCdaXml(params);
		assert.ok(xml_res.success, xml_res.success ? "" : String(xml_res.error));
		const xml = xml_res.xml;

		assert.ok(xml.includes('<addr nullFlavor="NI"/>'), "must emit nullFlavor addr when no contact data");
		assert.ok(xml.includes('<telecom nullFlavor="NI"/>'), "must emit nullFlavor telecom when no contact data");
	});
});
