import assert from "node:assert/strict";
import test from "node:test";
import {
	CLINICAL_CONSENT_PRESETS,
	STOMX_ALL_49_DOCUMENTS_REGISTRY,
	STOMX_LEGAL_CONSENTS_CATALOG,
	STOMX_SPECIALIZED_CONSENT_PRESETS,
	generateStomxConsentHtml,
	getAllStomx49Documents,
	getStomxDocumentRegistryItem,
	getStomxTemplateMetadata,
	renderStomxTemplateText,
	resolveStomxVariableToken,
	type ProcedureSpecificConsentProcedure,
	type StomxVariableContext,
} from "../index.js";

test("STOMX_SPECIALIZED_CONSENT_PRESETS contains all 22 specialized procedures with authentic clinical text", () => {
	const specializedProcedures: ProcedureSpecificConsentProcedure[] = [
		"veneers",
		"implantation",
		"sinus_lifting",
		"sedation",
		"surgery_extraction",
		"fixed_prosthetics",
		"removable_prosthetics",
		"deep_caries",
		"superficial_medium_caries",
		"pulpitis_endodontics",
		"periodontology",
		"professional_hygiene",
		"teeth_whitening",
		"orthodontics",
		"minor_general",
		"xray_cbct",
		"photoprotocol",
		"egisz_refusal",
		"medical_intervention_refusal",
		"warranty_policy",
		"warranty_passport",
		"somatic_health_questionnaire",
	];

	assert.equal(specializedProcedures.length, 22, "Must have exactly 22 specialized procedures");

	for (const proc of specializedProcedures) {
		const preset = STOMX_SPECIALIZED_CONSENT_PRESETS[proc];
		assert.ok(preset, `Preset for ${proc} must exist in STOMX_SPECIALIZED_CONSENT_PRESETS`);
		assert.equal(preset.procedureType, proc);
		assert.ok(preset.procedureName.trim().length > 3, `procedureName for ${proc} must be non-empty`);
		assert.ok(preset.diagnosisOrIndication.trim().length > 5, `diagnosisOrIndication for ${proc} must be non-empty`);
		assert.ok(Array.isArray(preset.patientSpecificRiskFactors) && preset.patientSpecificRiskFactors.length >= 1, `patientSpecificRiskFactors for ${proc} must have >= 1 items`);
		assert.ok(Array.isArray(preset.procedureSpecificRisks) && preset.procedureSpecificRisks.length >= 1, `procedureSpecificRisks for ${proc} must have >= 1 items`);
		assert.ok(Array.isArray(preset.alternatives) && preset.alternatives.length >= 1, `alternatives for ${proc} must have >= 1 items`);
		assert.ok(Array.isArray(preset.aftercareAndLimits) && preset.aftercareAndLimits.length >= 1, `aftercareAndLimits for ${proc} must have >= 1 items`);

		// Also check that CLINICAL_CONSENT_PRESETS contains this preset
		const sharedPreset = CLINICAL_CONSENT_PRESETS[proc];
		assert.ok(sharedPreset, `Preset for ${proc} must be present in CLINICAL_CONSENT_PRESETS`);
		assert.equal(sharedPreset.procedureName, preset.procedureName);
	}
});

test("Clinical specifics for key dental procedures match StomX standards and Russian statutory regulations", () => {
	// 1. Veneers (StomX #58)
	const veneers = STOMX_SPECIALIZED_CONSENT_PRESETS.veneers;
	assert.ok(veneers);
	assert.ok(veneers.procedureName.toLowerCase().includes("винир"));
	assert.ok(veneers.procedureSpecificRisks.some((r) => r.toLowerCase().includes("дебондинг") || r.toLowerCase().includes("скол") || r.toLowerCase().includes("препарирован")));
	assert.ok(veneers.aftercareAndLimits.some((l) => l.toLowerCase().includes("капп") || l.toLowerCase().includes("откусыва") || l.toLowerCase().includes("травм")));

	// 2. Implantation (StomX #60)
	const implant = STOMX_SPECIALIZED_CONSENT_PRESETS.implantation;
	assert.ok(implant);
	assert.ok(implant.procedureName.toLowerCase().includes("имплантат") || implant.procedureName.toLowerCase().includes("имплантация"));
	assert.ok(implant.procedureSpecificRisks.some((r) => r.toLowerCase().includes("периимплантит") || r.toLowerCase().includes("остеоинтеграц") || r.toLowerCase().includes("отторжен")));
	assert.ok(implant.aftercareAndLimits.some((l) => l.toLowerCase().includes("курение") || l.toLowerCase().includes("бани") || l.toLowerCase().includes("нагрузк")));

	// 3. Sinus lifting (StomX #73)
	const sinus = STOMX_SPECIALIZED_CONSENT_PRESETS.sinus_lifting;
	assert.ok(sinus);
	assert.ok(sinus.procedureName.toLowerCase().includes("синус-лифтинг"));
	assert.ok(sinus.procedureSpecificRisks.some((r) => r.toLowerCase().includes("шнейдера") || r.toLowerCase().includes("перфорация") || r.toLowerCase().includes("гайморит")));
	assert.ok(sinus.aftercareAndLimits.some((l) => l.toLowerCase().includes("чихать") || l.toLowerCase().includes("авиаперелет") || l.toLowerCase().includes("сморкаться")));

	// 4. Sedation (StomX #72)
	const sedation = STOMX_SPECIALIZED_CONSENT_PRESETS.sedation;
	assert.ok(sedation);
	assert.ok(sedation.procedureName.toLowerCase().includes("седация") || sedation.procedureName.toLowerCase().includes("закс"));
	assert.ok(sedation.aftercareAndLimits.some((l) => l.toLowerCase().includes("транспортн") || l.toLowerCase().includes("сопровожден") || l.toLowerCase().includes("восстановлен")));

	// 5. Tooth extraction (StomX #76)
	const extraction = STOMX_SPECIALIZED_CONSENT_PRESETS.surgery_extraction;
	assert.ok(extraction);
	assert.ok(extraction.procedureSpecificRisks.some((r) => r.toLowerCase().includes("альвеолит") || r.toLowerCase().includes("сгуст") || r.toLowerCase().includes("парестезия")));

	// 6. Endodontics (StomX #70, #79)
	const endo = STOMX_SPECIALIZED_CONSENT_PRESETS.pulpitis_endodontics;
	assert.ok(endo);
	assert.ok(endo.procedureSpecificRisks.some((r) => r.toLowerCase().includes("облитерация") || r.toLowerCase().includes("отлом") || r.toLowerCase().includes("перфорация") || r.toLowerCase().includes("выведение")));

	// 7. Minor patient (StomX #64)
	const minor = STOMX_SPECIALIZED_CONSENT_PRESETS.minor_general;
	assert.ok(minor);
	assert.ok(minor.diagnosisOrIndication.toLowerCase().includes("представитель") || minor.diagnosisOrIndication.toLowerCase().includes("несовершеннолетн"));

	// 8. EGISZ refusal (StomX #80)
	const egisz = STOMX_SPECIALIZED_CONSENT_PRESETS.egisz_refusal;
	assert.ok(egisz);
	assert.ok(egisz.diagnosisOrIndication.includes("323-ФЗ") || egisz.diagnosisOrIndication.includes("ЕГИСЗ") || egisz.procedureName.includes("ЕГИСЗ"));

	// 9. Medical intervention refusal (StomX #81)
	const refusal = STOMX_SPECIALIZED_CONSENT_PRESETS.medical_intervention_refusal;
	assert.ok(refusal);
	assert.ok(refusal.procedureSpecificRisks.some((r) => r.toLowerCase().includes("прогрессирование") || r.toLowerCase().includes("осложнен") || r.toLowerCase().includes("сепсис") || r.toLowerCase().includes("потеря")));

	// 10. Warranty policy (StomX #82)
	const warranty = STOMX_SPECIALIZED_CONSENT_PRESETS.warranty_policy;
	assert.ok(warranty);
	assert.ok(warranty.procedureName.toLowerCase().includes("гаранти"));

	// 11. Warranty passport (StomX #54)
	const passport = STOMX_SPECIALIZED_CONSENT_PRESETS.warranty_passport;
	assert.ok(passport);
	assert.ok(passport.procedureName.toLowerCase().includes("гарантийный паспорт"));
	assert.ok(passport.patientSpecificRiskFactors.some((r) => r.toLowerCase().includes("гигиен") || r.toLowerCase().includes("бруксизм")));
	assert.ok(passport.aftercareAndLimits.some((l) => l.toLowerCase().includes("6 месяцев") || l.toLowerCase().includes("осмотр")));

	// 12. Somatic health questionnaire (StomX #53)
	const health = STOMX_SPECIALIZED_CONSENT_PRESETS.somatic_health_questionnaire;
	assert.ok(health);
	assert.ok(health.procedureName.toLowerCase().includes("анкета общего состояния"));
	assert.ok(health.patientSpecificRiskFactors.some((r) => r.toLowerCase().includes("антикоагулянт") || r.toLowerCase().includes("бисфосфонат") || r.toLowerCase().includes("диабет")));
});

test("STOMX_LEGAL_CONSENTS_CATALOG contains all 23+ templates including SanPiN radiation sheet and warranty passport", () => {
	assert.ok(STOMX_LEGAL_CONSENTS_CATALOG.length >= 23, "Catalog must have at least 23 templates");

	const expectedStomxIds = [58, 60, 73, 72, 76, 63, 74, 59, 61, 70, 68, 69, 67, 65, 64, 71, 77, 80, 81, 82, 15, 54, 53];
	for (const stomxId of expectedStomxIds) {
		const found = STOMX_LEGAL_CONSENTS_CATALOG.find((t) => t.id === stomxId);
		assert.ok(found, `Template with StomX ID #${stomxId} must exist in catalog`);
		assert.ok(found.name.length > 5);
		assert.ok(found.systemAlias.length > 2);
		assert.ok(found.category.length > 2);
	}

	// StomX #15: X-Ray Dose Sheet per SanPiN 2.6.1.1192-03
	const xraySheet = getStomxTemplateMetadata(15);
	assert.ok(xraySheet, "Template #15 must be retrievable by ID");
	assert.equal(xraySheet?.id, 15);
	assert.ok(xraySheet?.name.includes("дозовых нагрузок"));
	assert.ok(xraySheet?.statutoryBasis.includes("СанПиН 2.6.1.1192-03"));

	// StomX #80: EGISZ refusal per 323-FZ art. 13
	const egiszMeta = getStomxTemplateMetadata("egisz_refusal");
	assert.ok(egiszMeta, "Template #80 must be retrievable by alias");
	assert.equal(egiszMeta?.id, 80);
	assert.ok(egiszMeta?.statutoryBasis.includes("323-ФЗ"));

	// StomX #82: Warranty policy
	const warrantyMeta = getStomxTemplateMetadata("warranty_policy");
	assert.ok(warrantyMeta, "Warranty policy must be retrievable by alias");
	assert.equal(warrantyMeta?.id, 82);
	assert.ok(warrantyMeta?.statutoryBasis.includes("2300-1"));

	// StomX #54: Warranty passport
	const passportMeta = getStomxTemplateMetadata(54);
	assert.ok(passportMeta, "Template #54 must be retrievable by ID");
	assert.equal(passportMeta?.id, 54);
	assert.ok(passportMeta?.name.includes("Гарантийный паспорт"));

	// StomX #53: Health questionnaire
	const healthMeta = getStomxTemplateMetadata(53);
	assert.ok(healthMeta, "Template #53 must be retrievable by ID");
	assert.equal(healthMeta?.id, 53);
	assert.ok(healthMeta?.name.includes("Анкета общего состояния здоровья"));
});

test("STOMX_ALL_49_DOCUMENTS_REGISTRY accounts for 100% of authentic StomX templates", () => {
	const allDocs = getAllStomx49Documents();
	assert.equal(allDocs.length, 49, "Registry must contain exactly 49 documents from StomX");

	const uniqueIds = new Set(allDocs.map((d) => d.id));
	assert.equal(uniqueIds.size, 49, "All 49 document IDs must be strictly unique");

	for (const doc of allDocs) {
		assert.ok(doc.id > 0, `Document ID must be positive: ${doc.id}`);
		assert.ok(doc.name.trim().length > 3, `Document #${doc.id} must have a non-empty name`);
		assert.ok(doc.statutoryBasis.trim().length > 3, `Document #${doc.id} must have a statutoryBasis`);
		assert.ok(doc.targetDenteModule.trim().length > 1, `Document #${doc.id} must map to a DENTE module`);
	}

	// Verify retrieval by ID and by name
	const doc54 = getStomxDocumentRegistryItem(54);
	assert.ok(doc54);
	assert.equal(doc54?.id, 54);
	assert.ok(doc54?.name.includes("Гарантийный паспорт"));

	const doc80 = getStomxDocumentRegistryItem("ЕГИСЗ");
	assert.ok(doc80);
	assert.equal(doc80?.id, 80);

	const doc81 = getStomxDocumentRegistryItem(81);
	assert.ok(doc81);
	assert.equal(doc81?.id, 81);
	assert.ok(doc81?.name.includes("Отказ от лечения") || doc81?.name.includes("медицинского вмешательства"));
});

test("resolveStomxVariableToken handles StomX variable tokens with clean fallback", () => {
	const context: StomxVariableContext = {
		patient: {
			fullName: "Иванов Иван Иванович",
			birthDate: "15.04.1985",
			phone: "+7 (999) 123-45-67",
			passportSeries: "4510",
			passportNumber: "123456",
			address: "г. Москва, ул. Ленина, д. 10, кв. 5",
			snils: "123-456-789 00",
		},
		clinic: {
			name: "ООО Стоматология ДЕНТЕ",
			inn: "7701234567",
			ogrn: "1157746123456",
			actualAddress: "г. Москва, ул. Тверская, д. 1",
			licenseNumber: "ЛО41-01137-77/00123456",
			phone: "+7 (495) 123-45-67",
		},
		doctor: {
			fullName: "Петрова Анна Сергеевна",
			specialty: "Врач-стоматолог-терапевт",
		},
		visit: {
			date: "10.09.2026",
			time: "14:30",
		},
		contract: {
			number: "Д-2026/09-42",
			date: "10.09.2026",
		},
	};

	// 1. Known tokens with data
	assert.equal(resolveStomxVariableToken("Пациент.ФИО", context), "Иванов Иван Иванович");
	assert.equal(resolveStomxVariableToken("Пациент.ДатаРождения", context), "15.04.1985");
	assert.equal(resolveStomxVariableToken("Пациент.Паспорт", context), "4510 123456");
	assert.equal(resolveStomxVariableToken("Пациент.Адрес", context), "г. Москва, ул. Ленина, д. 10, кв. 5");
	assert.equal(resolveStomxVariableToken("Пациент.СНИЛС", context), "123-456-789 00");
	assert.equal(resolveStomxVariableToken("Клиника.Название", context), "ООО Стоматология ДЕНТЕ");
	assert.equal(resolveStomxVariableToken("Клиника.ИНН", context), "7701234567");
	assert.equal(resolveStomxVariableToken("Клиника.Лицензия", context), "ЛО41-01137-77/00123456");
	assert.equal(resolveStomxVariableToken("Врач.ФИО", context), "Петрова Анна Сергеевна");
	assert.equal(resolveStomxVariableToken("Врач.Специальность", context), "Врач-стоматолог-терапевт");
	assert.equal(resolveStomxVariableToken("Прием.Дата", context), "10.09.2026");
	assert.equal(resolveStomxVariableToken("Договор.Номер", context), "Д-2026/09-42");

	// 2. Empty context fallback: Mandate 8e clean underline without blocking print
	const emptyContext: StomxVariableContext = {};
	assert.equal(resolveStomxVariableToken("Пациент.ФИО", emptyContext), "«____________________»");
	assert.equal(resolveStomxVariableToken("Пациент.Паспорт", emptyContext), "«____________________»");
	assert.equal(resolveStomxVariableToken("Врач.ФИО", emptyContext), "«____________________»");
	assert.equal(resolveStomxVariableToken("Договор.Номер", emptyContext), "«____________________»");
});

test("renderStomxTemplateText replaces tokens in all formats: [Токен], {{Токен}}, ${Токен}", () => {
	const context: StomxVariableContext = {
		patient: { fullName: "Смирнов Алексей Викторович" },
		doctor: { fullName: "Сидоров Иван Васильевич" },
		clinic: { name: "Стоматология ДЕНТЕ" },
	};

	// 1. Bracket format [Токен]
	const template1 = "Я, пациент [Пациент.ФИО], даю согласие врачу [Врач.ФИО] в клинике [Клиника.Название].";
	const rendered1 = renderStomxTemplateText(template1, context);
	assert.equal(
		rendered1,
		"Я, пациент Смирнов Алексей Викторович, даю согласие врачу Сидоров Иван Васильевич в клинике Стоматология ДЕНТЕ.",
	);

	// 2. Mustache format {{Токен}}
	const template2 = "Пациент: {{Пациент.ФИО}}, Клиника: {{Клиника.Название}}";
	const rendered2 = renderStomxTemplateText(template2, context);
	assert.equal(rendered2, "Пациент: Смирнов Алексей Викторович, Клиника: Стоматология ДЕНТЕ");

	// 3. Dollar format ${Токен}
	const template3 = "Лечащий врач: ${Врач.ФИО}";
	const rendered3 = renderStomxTemplateText(template3, context);
	assert.equal(rendered3, "Лечащий врач: Сидоров Иван Васильевич");

	// 4. Missing variables fallback to underline
	const templateEmpty = "Пациент: [Пациент.ФИО], Паспорт: [Пациент.Паспорт], Дата: [Прием.Дата]";
	const renderedEmpty = renderStomxTemplateText(templateEmpty, {});
	assert.equal(renderedEmpty, "Пациент: «____________________», Паспорт: «____________________», Дата: «____________________»");
});

test("generateStomxConsentHtml generates clean A4 HTML with 0 emojis and compliant legal blocks", () => {
	const html = generateStomxConsentHtml({
		templateIdOrAlias: "veneers",
		context: {
			patient: {
				fullName: "Кузнецова Мария Петровна",
				birthDate: "20.10.1992",
				passportSeries: "4612",
				passportNumber: "987654",
			},
			clinic: {
				name: "ООО ДЕНТЕ ПРЕМИУМ",
				licenseNumber: "ЛО41-01137-77/00554433",
			},
			doctor: {
				fullName: "Соколов Дмитрий Андреевич",
				specialty: "Врач-стоматолог-ортопед",
			},
			visit: {
				date: "10.09.2026",
			},
		},
		toothOrArea: "11, 12, 21, 22",
	});

	// Check legal compliance
	assert.ok(html.includes("323-ФЗ"), "Must reference 323-FZ");
	assert.ok(html.includes("1051н"), "Must reference Order 1051n");
	assert.ok(html.includes("736"), "Must reference Decree 736");
	assert.ok(html.includes("Кузнецова Мария Петровна"), "Must include patient name");
	assert.ok(html.includes("ООО ДЕНТЕ ПРЕМИУМ"), "Must include clinic name");
	assert.ok(html.includes("Соколов Дмитрий Андреевич"), "Must include doctor name");
	assert.ok(html.includes("11, 12, 21, 22"), "Must include treatment area");
	assert.ok(html.toLowerCase().includes("винир"), "Must mention veneers");

	// Mandate 8d item 7: 0 cartoon emojis in medical and statutory forms
	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
	assert.ok(!emojiRegex.test(html), "HTML document must contain ZERO cartoon emojis (Mandate 8d #7)");

	// Print styling
	assert.ok(html.includes("@page"), "HTML must include @page print media queries");
	assert.ok(html.includes("A4"), "HTML must target A4 print dimensions");
});

test("SanPiN 2.6.1.1192-03 Radiation Dose Sheet template #15 integrates correctly", () => {
	const html = generateStomxConsentHtml({
		templateIdOrAlias: 15,
		context: {
			patient: {
				fullName: "Смирнов Алексей Викторович",
				birthDate: "05.08.1980",
			},
			clinic: {
				name: "Стоматология ДЕНТЕ",
			},
		},
	});

	assert.ok(html.includes("СанПиН 2.6.1.1192-03"), "Must reference SanPiN 2.6.1.1192-03");
	assert.ok(html.includes("Лист учета дозовых нагрузок") || html.includes("ДОЗОВЫХ НАГРУЗОК"));
	assert.ok(html.includes("Смирнов Алексей Викторович"));
});

test("RED TEAM INQUISITOR: informedConsentEngine strictly prevents fake mock signatures and enforces authentic verification", async () => {
	const {
		isConsentVectorSignatureEmpty,
		validateConsentSigningInput,
		generateSmsPepSignatureSvg,
		generatePaperVerifiedSignatureSvg,
		createConsentAuditRecord,
		calculateSha256,
	} = await import("../clinical/informedConsentEngine.js");

	// 1. Zero Fake Signatures: Blank tablet strokes are strictly rejected
	assert.equal(isConsentVectorSignatureEmpty([]), true, "Empty stroke array must be empty");
	assert.equal(isConsentVectorSignatureEmpty([{ points: [{ x: 10, y: 10, time: 100 }] }]), true, "1-point doodle below threshold must be empty");

	const emptyTabletValidation = validateConsentSigningInput({
		method: "tablet_stylus",
		tabletStrokes: [],
	});
	assert.equal(emptyTabletValidation.valid, false, "Blank tablet signature must fail validation");
	assert.ok(emptyTabletValidation.error?.includes("отсутствует") || emptyTabletValidation.error?.includes("стилус"));

	// 2. Real Vector Strokes pass validation
	const validStrokes = [
		{
			points: [
				{ x: 10, y: 10, time: 100 },
				{ x: 20, y: 15, time: 120 },
				{ x: 30, y: 25, time: 140 },
				{ x: 40, y: 40, time: 160 },
				{ x: 50, y: 60, time: 180 },
			],
		},
	];
	assert.equal(isConsentVectorSignatureEmpty(validStrokes), false);
	const validTabletValidation = validateConsentSigningInput({
		method: "tablet_stylus",
		tabletStrokes: validStrokes,
	});
	assert.equal(validTabletValidation.valid, true);

	// 3. SMS OTP: Must be exactly 4 digits, fake/short codes rejected
	const shortSmsValidation = validateConsentSigningInput({
		method: "sms_otp",
		smsOtpCode: "12",
	});
	assert.equal(shortSmsValidation.valid, false);
	assert.ok(shortSmsValidation.error?.includes("4-значн") || shortSmsValidation.error?.includes("4 цифр"));

	const validSmsValidation = validateConsentSigningInput({
		method: "sms_otp",
		smsOtpCode: "5821",
	});
	assert.equal(validSmsValidation.valid, true);

	// SMS PEP SVG stamp contains 63-FZ and patient phone
	const smsSvg = generateSmsPepSignatureSvg({
		patientFullName: "Иванов Иван Иванович",
		phoneMasked: "+7 (999) ***-45-67",
		timestampIso: "2026-10-04T12:00:00.000Z",
		integrityHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		clinicName: "ООО ДЕНТЕ",
	});
	assert.ok(smsSvg.includes("63-ФЗ"), "SMS SVG must cite 63-FZ");
	assert.ok(smsSvg.includes("ПЭП"), "SMS SVG must mention PEP");
	assert.ok(smsSvg.includes("+7 (999) ***-45-67"), "SMS SVG must include masked phone");

	// 4. Paper Physical: Rejects unconfirmed without scan
	const unconfirmedPaper = validateConsentSigningInput({
		method: "paper_physical",
		paperOriginalStored: false,
	});
	assert.equal(unconfirmedPaper.valid, false);
	assert.ok(unconfirmedPaper.error?.includes("скан") || unconfirmedPaper.error?.includes("карту"));

	const confirmedPaper = validateConsentSigningInput({
		method: "paper_physical",
		paperOriginalStored: true,
	});
	assert.equal(confirmedPaper.valid, true);

	const paperWithScan = validateConsentSigningInput({
		method: "paper_physical",
		paperOriginalStored: false,
		scanFileName: "scan_consent_043u.pdf",
		scanFileSizeBytes: 1024 * 350,
	});
	assert.equal(paperWithScan.valid, true);

	const paperSvg = generatePaperVerifiedSignatureSvg({
		date: "04.10.2026",
		clinicName: "ООО ДЕНТЕ",
		patientFullName: "Иванов Иван Иванович",
		scanFileName: "scan_consent_043u.pdf",
		scanFileSizeBytes: 1024 * 350,
	});
	assert.ok(paperSvg.includes("scan_consent_043u.pdf"));
	assert.ok(paperSvg.includes("323-ФЗ"));
	assert.ok(paperSvg.includes("043/у"));

	// 5. Audit Trail & Anti-Backdating Invariant
	const auditRecord = createConsentAuditRecord({
		documentCode: "CONSENT_INSPECTION_1051N",
		patientId: "patient-123",
		patientFullName: "Иванов Иван Иванович",
		verificationMethod: "tablet_stylus",
		documentText: "Информированное добровольное согласие на медицинское вмешательство...",
		clientTimestampIso: "2026-10-04T10:00:00.000Z",
		serverTimestampIso: "2026-10-04T10:00:05.000Z",
		strokes: validStrokes,
	});

	assert.equal(auditRecord.isBackdated, false);
	assert.equal(auditRecord.documentCode, "CONSENT_INSPECTION_1051N");
	assert.equal(auditRecord.verificationMethod, "tablet_stylus");
	assert.ok(auditRecord.integrityHash.length === 64, "Must produce valid 64-char SHA-256 hash");

	// Backdating detection: difference > 300 seconds
	const backdatedRecord = createConsentAuditRecord({
		documentCode: "CONSENT_INSPECTION_1051N",
		patientId: "patient-123",
		patientFullName: "Иванов Иван Иванович",
		verificationMethod: "tablet_stylus",
		documentText: "Текст документа...",
		clientTimestampIso: "2026-10-01T10:00:00.000Z",
		serverTimestampIso: "2026-10-04T10:00:00.000Z",
	});
	assert.equal(backdatedRecord.isBackdated, true, "Signatures older than 300s drift must be flagged as backdated");
	assert.ok(backdatedRecord.auditNotes?.some((n: string) => n.includes("задним числом")));
});

