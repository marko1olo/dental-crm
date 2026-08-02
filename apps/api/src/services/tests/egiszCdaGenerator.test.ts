import assert from "node:assert";
import { test, describe } from "node:test";
import { generateDentalCdaXml, type EgiszCdaParams } from "../egiszCdaGenerator.js";

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

		const xml = generateDentalCdaXml(params);
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
		const revised = generateDentalCdaXml({ ...params, documentVersion: 3 });
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

		const xml = generateDentalCdaXml(params);
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

		const xml = generateDentalCdaXml(params);
		t.assert.snapshot(xml);

        params.patientGender = "other"; // Test other gender
        const xmlOther = generateDentalCdaXml(params);
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

		const withSign = generateDentalCdaXml({ ...base, documentTime: lockedAt });
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
		const withoutSign = generateDentalCdaXml(base);
		assert.ok(
			withoutSign.includes(`<effectiveTime value="${expectedNow}"/>`),
			"without documentTime, ClinicalDocument effectiveTime falls back to now",
		);
		assert.ok(
			withoutSign.includes(`<time value="${expectedNow}"/>`),
			"without documentTime, author/time falls back to now",
		);
		// Invalid Date must not stick — fall back to now
		const invalid = generateDentalCdaXml({
			...base,
			documentTime: new Date("not-a-date"),
		});
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
		const xml = generateDentalCdaXml({
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

		const unknown = generateDentalCdaXml(base);
		assert.ok(
			unknown.includes('<administrativeGenderCode nullFlavor="UNK"/>'),
			"null gender must emit administrativeGenderCode nullFlavor=UNK",
		);
		assert.ok(
			!unknown.includes('administrativeGenderCode code="0"'),
			"must never invent gender code 0",
		);

		const other = generateDentalCdaXml({
			...base,
			patientGender: "other",
		});
		assert.ok(
			other.includes('<administrativeGenderCode nullFlavor="UNK"/>'),
			"other gender must emit nullFlavor=UNK (not invent code 0 or 3 without NSI mapping)",
		);
		assert.ok(
			!other.includes('administrativeGenderCode code="0"'),
			"other gender must not invent code 0",
		);

		const male = generateDentalCdaXml({
			...base,
			patientGender: "male",
		});
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

		const female = generateDentalCdaXml({
			...base,
			patientGender: "female",
		});
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

		const missing = generateDentalCdaXml(base);
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

		const invalid = generateDentalCdaXml({
			...base,
			patientBirthDate: "not-a-date",
		});
		assert.ok(
			invalid.includes('<birthTime nullFlavor="UNK"/>'),
			"invalid DOB must emit birthTime nullFlavor=UNK",
		);
		assert.ok(!invalid.includes("19000101"), "invalid DOB must not invent 19000101");

		const real = generateDentalCdaXml({
			...base,
			patientBirthDate: "1980-05-15T00:00:00.000Z",
		});
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
	 * DEFECT #79: patientRole/id must not emit empty SNILS extension="" when
	 * patientSnils is blank/missing. REMD rejects empty II.extension.
	 */
	test("DEFECT #79: patientRole id nullFlavor NI without patientSnils; SNILS when present", () => {

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

		const blank = generateDentalCdaXml(base);
		const roleBlank = blank.slice(
			blank.indexOf("<patientRole>"),
			blank.indexOf("</patientRole>") + "</patientRole>".length,
		);
		assert.ok(
			roleBlank.includes('<id nullFlavor="NI"/>'),
			"patientRole must emit id nullFlavor=NI when patientSnils blank",
		);
		assert.ok(
			!roleBlank.includes('extension=""'),
			"patientRole must not emit empty extension attribute",
		);
		assert.ok(
			!roleBlank.includes('root="1.2.643.100.3"'),
			"patientRole must not emit SNILS root when patientSnils blank",
		);

		const whitespace = generateDentalCdaXml({
			...base,
			patientSnils: "   ",
		});
		const roleWs = whitespace.slice(
			whitespace.indexOf("<patientRole>"),
			whitespace.indexOf("</patientRole>") + "</patientRole>".length,
		);
		assert.ok(
			roleWs.includes('<id nullFlavor="NI"/>'),
			"whitespace-only patientSnils must emit nullFlavor NI",
		);

		const withSnils = generateDentalCdaXml({
			...base,
			patientSnils: "123-456-789 00",
		});
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
		const evil = generateDentalCdaXml({
			...base,
			patientSnils: evilSnils,
		});
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

		const withoutOid = generateDentalCdaXml(base);
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

		const withOid = generateDentalCdaXml({
			...base,
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1",
		});
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
		const evil = generateDentalCdaXml({
			...base,
			clinicOid: evilOid,
		});
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

		const xml = generateDentalCdaXml({
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
		const xml = generateDentalCdaXml({
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
		const minimal = generateDentalCdaXml({
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

		const withoutSnils = generateDentalCdaXml(base);
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
		const withSnils = generateDentalCdaXml({
			...base,
			doctorSnils: "111-222-333 44",
		});
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
		const blankSnils = generateDentalCdaXml({
			...base,
			doctorSnils: "   ",
		});
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

		const withTooth = generateDentalCdaXml({
			...base,
			diagnosisTooth: "36",
		});
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

		const withoutTooth = generateDentalCdaXml(base);
		assert.ok(
			!withoutTooth.includes("targetSiteCode"),
			"targetSiteCode must be omitted when diagnosisTooth absent",
		);
		assert.ok(
			!withoutTooth.includes("· зуб"),
			"human-readable tooth suffix must be omitted when diagnosisTooth absent",
		);

		// Blank/whitespace tooth must not emit empty targetSiteCode
		const blankTooth = generateDentalCdaXml({
			...base,
			diagnosisTooth: "   ",
		});
		assert.ok(
			!blankTooth.includes("targetSiteCode"),
			"whitespace-only diagnosisTooth must not emit targetSiteCode",
		);

		// XML special chars in tooth must be escaped
		const evilTooth = generateDentalCdaXml({
			...base,
			diagnosisTooth: "3" + String.fromCharCode(60) + "6" + String.fromCharCode(62) + String.fromCharCode(38) + "x",
		});
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

		const xml = generateDentalCdaXml(params);
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
		const noOid = generateDentalCdaXml({
			...params,
			clinicOid: undefined,
			documentId: "doc" + String.fromCharCode(60) + "enc" + String.fromCharCode(62) + String.fromCharCode(38) + "x",
		});
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

		const xml = generateDentalCdaXml(params);
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
});
