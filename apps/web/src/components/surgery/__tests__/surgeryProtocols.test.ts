import assert from "node:assert/strict";

const { describe, it } = await (async () => {
	try {
		// @ts-ignore
		return await import("vitest");
	} catch {
		return await import("node:test");
	}
})();
import {
	DENTAL_IMPLANTATION_NORM_TEXT,
	SIMPLE_EXTRACTION_NORM_TEXT,
	ATYPICAL_EXTRACTION_NORM_TEXT,
	SINUS_LIFT_GBR_NORM_TEXT,
	PERICORONITIS_NORM_TEXT,
	COMPLEX_EXTRACTION_NORM_TEXT,
	PERIOSTOTOMY_NORM_TEXT,
	SURGICAL_OPERATION_NORMS,
	evaluateWarehouseOverdraft,
	buildSurgicalDiaryEntry,
} from "../surgeryProtocols";
import {
	CLINICAL_SOAP_PRESETS,
	getPresetById,
	validateSoapPreset,
} from "../../visit/clinicalSoapPresets";

describe("Surgical Protocols & 1-Click Operation Norms (DENTE CRM)", () => {
	it("1. Dental Implantation 1-click norm matches canonical text and 35 N·см torque", () => {
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("первичная торк-стабильность 35 Н·см") ||
				DENTAL_IMPLANTATION_NORM_TEXT.includes("первичная торк-стабильность 35 Н/см"),
			"Must contain 35 N*cm torque specification",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл"),
			"Must contain 1.7 ml articaine anesthesia",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Ушивание раны шовным материалом ПГА 4-0"),
			"Must contain PGA 4-0 suture material",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Гемостаз полный. Рекомендации даны."),
			"Must contain complete hemostasis and post-op recommendations",
		);
	});

	it("2. Surgical Operation Norms catalog has all canonical procedures with ICD-10", () => {
		const ids = SURGICAL_OPERATION_NORMS.map((n) => n.id);
		assert.ok(ids.includes("surgery_implant_standard"), "Must include implant standard norm");
		assert.ok(ids.includes("surgery_extraction_simple"), "Must include simple extraction norm");
		assert.ok(ids.includes("surgery_extraction_atypical"), "Must include atypical wisdom tooth norm");
		assert.ok(ids.includes("surgery_sinus_lift_gbr"), "Must include sinus-lift/GBR norm");
		assert.ok(ids.includes("surgery_pericoronitis"), "Must include pericoronitis norm");
		assert.ok(ids.includes("surgery_extraction_complex"), "Must include complex extraction norm");
		assert.ok(ids.includes("surgery_periostotomy"), "Must include emergency periostotomy norm");

		for (const norm of SURGICAL_OPERATION_NORMS) {
			assert.ok(norm.icd10.length > 0, `Norm ${norm.id} must have valid ICD-10 code`);
			assert.ok(norm.standardProtocolTextRu.length > 50, `Norm ${norm.id} must have complete clinical text`);
			assert.ok(norm.requiredMaterials.length > 0, `Norm ${norm.id} must declare required materials`);
		}
	});

	it("2a. Complex tooth extraction norm (surgery_extraction_complex) has full clinical protocol & materials", () => {
		const norm = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_extraction_complex");
		assert.ok(norm, "surgery_extraction_complex must be present in SURGICAL_OPERATION_NORMS");
		assert.equal(norm.title, "Сложное удаление зуба с разъединением корней и ушиванием");
		assert.equal(norm.shortBadge, "Сложн. удаление");
		assert.equal(norm.category, "extraction");
		assert.equal(norm.icd10, "K04.7");
		assert.equal(norm.icd10Label, "Периапикальный абсцесс без свища / Дистопия");
		assert.equal(norm.standardProtocolTextRu, COMPLEX_EXTRACTION_NORM_TEXT);

		// Clinical protocol details
		assert.ok(COMPLEX_EXTRACTION_NORM_TEXT.includes("Инфильтрационная и проводниковая анестезия"));
		assert.ok(COMPLEX_EXTRACTION_NORM_TEXT.includes("Сепарация корней бором с водяным охлаждением"));
		assert.ok(COMPLEX_EXTRACTION_NORM_TEXT.includes("Люксация элеватором"));
		assert.ok(COMPLEX_EXTRACTION_NORM_TEXT.includes("кюретаж"));
		assert.ok(COMPLEX_EXTRACTION_NORM_TEXT.includes("Альвожил"));
		assert.ok(COMPLEX_EXTRACTION_NORM_TEXT.includes("Викрил 4-0"));

		// Materials: Артикаин 1:100000 (2 шт), Шовный материал Викрил 4-0 (1 шт), Губка Альвожил (1 шт), Марлевые тампоны (2 шт)
		const mats = norm.requiredMaterials;
		const articaine = mats.find((m) => m.name.includes("Артикаин 1:100000"));
		assert.ok(articaine, "Must have Articaine");
		assert.equal(articaine.quantity, 2);

		const suture = mats.find((m) => m.name.includes("Викрил 4-0"));
		assert.ok(suture, "Must have Vicryl 4-0 suture");
		assert.equal(suture.quantity, 1);

		const sponge = mats.find((m) => m.name.includes("Альвожил"));
		assert.ok(sponge, "Must have Alvogyl sponge");
		assert.equal(sponge.quantity, 1);

		const tampons = mats.find((m) => m.name.includes("Марлевые тампоны"));
		assert.ok(tampons, "Must have gauze tampons");
		assert.equal(tampons.quantity, 2);
	});

	it("2b. Periostotomy emergency norm (surgery_periostotomy) has incision, drainage & materials", () => {
		const norm = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_periostotomy");
		assert.ok(norm, "surgery_periostotomy must be present in SURGICAL_OPERATION_NORMS");
		assert.equal(norm.title, "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием");
		assert.equal(norm.shortBadge, "Периостотомия");
		assert.equal(norm.category, "emergency");
		assert.equal(norm.icd10, "K10.2");
		assert.equal(norm.icd10Label, "Воспалительные заболевания челюстей (острый гнойный периостит)");
		assert.equal(norm.standardProtocolTextRu, PERIOSTOTOMY_NORM_TEXT);

		// Protocol clinical details
		assert.ok(PERIOSTOTOMY_NORM_TEXT.includes("Инфильтрационная анестезия по переходной складке"));
		assert.ok(PERIOSTOTOMY_NORM_TEXT.includes("Разрез слизистой и надкостницы длиной 1.5–2 см"));
		assert.ok(PERIOSTOTOMY_NORM_TEXT.includes("распатором"));
		assert.ok(PERIOSTOTOMY_NORM_TEXT.includes("эвакуация гнойного экссудата"));
		assert.ok(PERIOSTOTOMY_NORM_TEXT.includes("0.05% хлоргексидином"));
		assert.ok(PERIOSTOTOMY_NORM_TEXT.includes("дренаж"));

		// Materials: Артикаин 1:100000 (1 шт), Дренаж резиновый ленточный (1 шт), Хлоргексидин 0.05% (50 мл), Стерильные марлевые салфетки (2 шт)
		const mats = norm.requiredMaterials;
		const articaine = mats.find((m) => m.name.includes("Артикаин 1:100000"));
		assert.ok(articaine, "Must have Articaine 1:100000");
		assert.equal(articaine.quantity, 1);

		const drain = mats.find((m) => m.name.includes("Дренаж резиновый ленточный"));
		assert.ok(drain, "Must have rubber ribbon drain");
		assert.equal(drain.quantity, 1);

		const chlorhexidine = mats.find((m) => m.name.includes("Хлоргексидин 0.05%"));
		assert.ok(chlorhexidine, "Must have chlorhexidine");
		assert.equal(chlorhexidine.quantity, 50);

		const wipes = mats.find((m) => m.name.includes("Стерильные марлевые салфетки"));
		assert.ok(wipes, "Must have sterile gauze wipes");
		assert.equal(wipes.quantity, 2);
	});

	it("2c. clinicalSoapPresets includes surgery_periostotomy with 804n A16.07.011, 2100 Rub and drainage care", () => {
		const preset = getPresetById("surgery_periostotomy");
		assert.ok(preset, "Preset surgery_periostotomy must exist in CLINICAL_SOAP_PRESETS");
		assert.equal(preset.icd10, "K10.2");
		assert.equal(preset.category, "surgery");
		assert.ok(preset.service804n, "Must have 804n service");
		assert.equal(preset.service804n.code804n, "A16.07.011");
		assert.equal(preset.service804n.basePriceRub, 2100);
		assert.ok(preset.service804n.title.includes("периостотомия"));

		// Recommendations check: drainage care and next day appointment
		assert.ok(preset.recommendations?.includes("Дренаж самостоятельно не извлекать"));
		assert.ok(preset.recommendations?.includes("следующий день"));

		// Form 043/u validator check
		const validation = validateSoapPreset(preset);
		assert.equal(validation.isValid, true, `Preset must be valid: ${validation.errors.join(", ")}`);
	});

	it("3. Soft warehouse overdraft NEVER blocks surgery (canProceed is always true)", () => {
		const materials = [
			{ name: "Имплантат Osstem TS III", isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 4-0", isWarehouseCritical: false },
		];

		// Case A: Warehouse normal
		const normalStatus = evaluateWarehouseOverdraft(materials, false);
		assert.equal(normalStatus.hasOverdraft, false);
		assert.equal(normalStatus.canProceed, true);

		// Case B: Supplier invoice delayed (задержка оприходования накладной)
		const delayedStatus = evaluateWarehouseOverdraft(materials, true);
		assert.equal(delayedStatus.hasOverdraft, true);
		assert.equal(delayedStatus.canProceed, true, "CRITICAL: Operation MUST NOT be blocked!");
		assert.ok(delayedStatus.detailsRu.includes("мягкий овердрафт"));
		assert.ok(delayedStatus.pendingItems.includes("Имплантат Osstem TS III"));
	});

	it("4. buildSurgicalDiaryEntry creates complete Form 043/u record without loss", () => {
		const diary = buildSurgicalDiaryEntry({
			patientName: "Смирнов А. В.",
			patientId: "PAT-2026-99",
			doctorName: "Др. Харитонов",
			toothFdi: 46,
			protocolText: DENTAL_IMPLANTATION_NORM_TEXT,
			recommendations: "Холод 15 минут, Нимесил при болях.",
			implantDetails: {
				brand: "Osstem TS III",
				diameterMm: 4.0,
				lengthMm: 10.0,
				torqueNcm: 35,
				lot: "LOT-88124",
			},
		});

		assert.ok(diary.includes("Зуб FDI #46"));
		assert.ok(diary.includes("Osstem TS III"));
		assert.ok(diary.includes("35 Н·см") || diary.includes("35 Н/см"));
		assert.ok(diary.includes("LOT-88124"));
		assert.ok(diary.includes("ХОД ОПЕРАЦИИ:"));
		assert.ok(diary.includes("Холод 15 минут"));
	});

	it("5. 5 canonical outpatient surgery protocols have correct 804n codes and clinical content (Mandates 8e, 8i)", () => {
		// 1. Simple extraction: A16.07.001
		const simpleExt = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_extraction_simple");
		assert.ok(simpleExt, "surgery_extraction_simple must exist");
		assert.equal(simpleExt.code804n, "A16.07.001");
		assert.ok(simpleExt.standardProtocolTextRu.includes("щипцы"), "Must mention forceps");
		assert.ok(simpleExt.standardProtocolTextRu.includes("элеватор"), "Must mention elevator");
		assert.ok(simpleExt.standardProtocolTextRu.includes("кюретаж"), "Must mention curettage");
		assert.ok(
			simpleExt.standardProtocolTextRu.includes("Альвожиль") ||
			simpleExt.standardProtocolTextRu.includes("губка"),
			"Must mention Alvogyl or hemostatic sponge",
		);

		// 2. Complex extraction: A16.07.002
		const complexExt = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_extraction_complex");
		assert.ok(complexExt, "surgery_extraction_complex must exist");
		assert.equal(complexExt.code804n, "A16.07.002");
		assert.ok(complexExt.standardProtocolTextRu.includes("Lindemann"), "Must mention Lindemann bur");
		assert.ok(complexExt.standardProtocolTextRu.toLowerCase().includes("люксация"), "Must mention luxation");
		assert.ok(complexExt.standardProtocolTextRu.includes("Викрил 4-0"), "Must mention Vicryl 4-0");

		// 3. Atypical / impacted wisdom tooth extraction: A16.07.024
		const atypicalExt = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_extraction_atypical");
		assert.ok(atypicalExt, "surgery_extraction_atypical must exist");
		assert.equal(atypicalExt.code804n, "A16.07.024");
		assert.ok(atypicalExt.standardProtocolTextRu.includes("выкраивание"), "Must mention flap incision");
		assert.ok(atypicalExt.standardProtocolTextRu.includes("сепарация"), "Must mention separation");
		assert.ok(atypicalExt.standardProtocolTextRu.includes("ушивание раны"), "Must mention wound suturing");

		// 4. Emergency periostotomy: A16.07.011
		const periost = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_periostotomy");
		assert.ok(periost, "surgery_periostotomy must exist");
		assert.equal(periost.code804n, "A16.07.011");
		assert.ok(periost.standardProtocolTextRu.includes("переходной складке"), "Must mention mucobuccal fold incision");
		assert.ok(periost.standardProtocolTextRu.includes("эвакуация гнойного экссудата"), "Must mention pus evacuation");
		assert.ok(periost.standardProtocolTextRu.includes("дренаж"), "Must mention drainage");

		// 5. Dental implantation: A16.07.054
		const implant = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_implant_standard");
		assert.ok(implant, "surgery_implant_standard must exist");
		assert.equal(implant.code804n, "A16.07.054");
		assert.ok(
			implant.standardProtocolTextRu.includes("35 Н·см") ||
				implant.standardProtocolTextRu.includes("35 Н/см"),
			"Must mention 35 N*cm torque",
		);
		assert.ok(
			implant.standardProtocolTextRu.includes("формирователь десны") ||
			implant.standardProtocolTextRu.includes("винт-заглушка"),
			"Must mention healing abutment or cover screw",
		);
	});

	it("6. Suture material and hemostatic sponge warehouse delays NEVER block surgery (canProceed: true under Mandate 8e)", () => {
		const surgicalMaterials = [
			{ name: "Шовный материал Викрил 4-0", isWarehouseCritical: false },
			{ name: "Губка Альвожил", isWarehouseCritical: false },
			{ name: "Артикаин 1:100000", isWarehouseCritical: false },
		];

		// Overdraft with delayed suture and sponge
		const overdraftStatus = evaluateWarehouseOverdraft(
			surgicalMaterials,
			false,
			["Шовный материал Викрил 4-0", "Губка Альвожил"],
		);

		assert.equal(overdraftStatus.hasOverdraft, true);
		assert.equal(overdraftStatus.canProceed, true, "Mandate 8e: Operation CANNOT be blocked!");
		assert.ok(overdraftStatus.pendingItems.includes("Шовный материал Викрил 4-0"));
		assert.ok(overdraftStatus.pendingItems.includes("Губка Альвожил"));
		assert.ok(overdraftStatus.detailsRu.includes("Операция не блокируется"));
	});

	it("7. Zero emojis in all surgical protocol texts and diary records for Form 043/u (Deadly Sin #7)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

		for (const norm of SURGICAL_OPERATION_NORMS) {
			assert.equal(
				emojiRegex.test(norm.standardProtocolTextRu),
				false,
				`Norm ${norm.id} standardProtocolTextRu contains forbidden emojis`,
			);
			assert.equal(
				emojiRegex.test(norm.title),
				false,
				`Norm ${norm.id} title contains forbidden emojis`,
			);
			assert.equal(
				emojiRegex.test(norm.postOpRecommendationsRu),
				false,
				`Norm ${norm.id} postOpRecommendationsRu contains forbidden emojis`,
			);
		}

		const diary = buildSurgicalDiaryEntry({
			patientName: "Петров П. П.",
			toothFdi: 36,
			protocolText: SIMPLE_EXTRACTION_NORM_TEXT,
			recommendations: "Марлевый тампон сплюнуть через 20 минут.",
		});

		assert.equal(
			emojiRegex.test(diary),
			false,
			"Form 043/u diary entry contains forbidden emojis",
		);
	});
});
