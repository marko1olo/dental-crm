import assert from "node:assert/strict";
import test from "node:test";
import {
	CLINICAL_CONSENT_PRESETS,
	STOMX_LEGAL_CONSENTS_CATALOG,
	STOMX_SPECIALIZED_CONSENT_PRESETS,
	generateStomxConsentHtml,
	getStomxTemplateMetadata,
	renderStomxTemplateText,
	resolveStomxVariableToken,
	type ProcedureSpecificConsentProcedure,
	type StomxVariableContext,
} from "../index.js";

test("STOMX_SPECIALIZED_CONSENT_PRESETS contains all 20 specialized procedures with authentic clinical text", () => {
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
	];

	assert.equal(specializedProcedures.length, 20, "Must have exactly 20 specialized procedures");

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
});

test("STOMX_LEGAL_CONSENTS_CATALOG contains all 21 templates including SanPiN radiation sheet", () => {
	assert.equal(STOMX_LEGAL_CONSENTS_CATALOG.length, 21, "Catalog must have exactly 21 templates");

	const expectedStomxIds = [58, 60, 73, 72, 76, 63, 74, 59, 61, 70, 68, 69, 67, 65, 64, 71, 77, 80, 81, 82, 15];
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
