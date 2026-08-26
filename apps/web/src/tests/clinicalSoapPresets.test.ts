import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type ClinicalSoapPreset,
	CLINICAL_PRESETS,
	CLINICAL_SOAP_PRESETS,
	TOP_EXPRESS_PRESET_IDS,
	applyClinicalPresetToVisitNote,
	calculatePresetMaterialsCost,
	formatSoapFromPreset,
	generateMaterialsDeductionReceipt,
	getPresetById,
	getPresetsByCategory,
	getPresetsByIcd10,
	searchPresets,
	validateSoapPreset,
} from "../components/visit/clinicalSoapPresets";

describe("clinicalSoapPresets — Практичный клинический справочник Формы 043/у по МКБ-10", () => {
	// ── ТЕСТ 1: Полнота справочника и минимальное количество пресетов ──
	it("1. Каталог CLINICAL_SOAP_PRESETS содержит не менее 15 клинических протоколов", () => {
		assert.ok(Array.isArray(CLINICAL_SOAP_PRESETS), "CLINICAL_SOAP_PRESETS должен быть массивом");
		assert.ok(
			CLINICAL_SOAP_PRESETS.length >= 15,
			`Ожидалось >= 15 пресетов, фактически: ${CLINICAL_SOAP_PRESETS.length}`,
		);
	});

	// ── ТЕСТ 2: Обязательное присутствие 4 потоковых диагнозов МКБ-10 ──
	it("2. Присутствуют 4 обязательных потоковых диагноза: K02.1, K04.0, K05.3, K01.1", () => {
		const caries = CLINICAL_SOAP_PRESETS.find((p) => p.icd10 === "K02.1" && p.id === "caries_medium");
		const pulpitis = CLINICAL_SOAP_PRESETS.find((p) => p.icd10 === "K04.0" && p.id === "pulpitis_acute");
		const perio = CLINICAL_SOAP_PRESETS.find((p) => p.icd10 === "K05.3" && p.id === "perio_srp_curettage");
		const surgery = CLINICAL_SOAP_PRESETS.find((p) => p.icd10 === "K01.1" && p.id === "surgery_extraction_simple");

		assert.ok(caries, "Должен присутствовать пресет кариеса дентина K02.1");
		assert.ok(pulpitis, "Должен присутствовать пресет острого пульпита K04.0");
		assert.ok(perio, "Должен присутствовать пресет хронического пародонтита K05.3");
		assert.ok(surgery, "Должен присутствовать пресет удаления ретинированного зуба K01.1");
	});

	// ── ТЕСТ 3: Валидация протокола K02.1 Кариес дентина (OptiBond FL + Estelite + 0.35г) ──
	it("3. Протокол K02.1 (Кариес дентина): OptiBond FL, Estelite 0.35г, услуга A16.07.002.001", () => {
		const preset = getPresetById("caries_medium");
		assert.ok(preset, "Пресет caries_medium должен быть найден");

		assert.equal(preset.icd10, "K02.1");
		assert.equal(preset.service804n?.code804n, "A16.07.002.001");
		assert.ok(preset.complaint.includes("сладкого/холодного"), "Жалобы должны содержать температурные боли");
		assert.ok(preset.statusLocalis.includes("плащевой дентин") || preset.statusLocalis.includes("средних слоев"), "Status Localis должен описывать средний дентин");
		assert.ok(preset.treatmentDescription.includes("OptiBond FL"), "Лечение должно включать адгезив OptiBond FL");
		assert.ok(preset.treatmentDescription.includes("Estelite Sigma Quick"), "Лечение должно включать композит Estelite Sigma Quick");

		const compositeDeduction = preset.materialsToDeduct?.find((m) => m.category === "composite" && m.name.includes("Estelite"));
		assert.ok(compositeDeduction, "Должно быть списание композита Estelite");
		assert.equal(compositeDeduction.quantity, 0.35, "Норма списания композита должна быть 0.35 г");
		assert.equal(compositeDeduction.unit, "г");
	});

	// ── ТЕСТ 4: Валидация протокола K04.0 Острый пульпит (ProTaper + AH Plus + Гуттаперча) ──
	it("4. Протокол K04.0 (Острый пульпит): ProTaper, NaOCl 3%, AH Plus, гуттаперча, услуга A16.07.008.001", () => {
		const preset = getPresetById("pulpitis_acute");
		assert.ok(preset, "Пресет pulpitis_acute должен быть найден");

		assert.equal(preset.icd10, "K04.0");
		assert.equal(preset.service804n?.code804n, "A16.07.008.001");
		assert.ok(preset.complaint.includes("ночные"), "Жалобы должны содержать ночные боли");
		assert.ok(preset.treatmentDescription.includes("ProTaper"), "Лечение должно включать мехобработку ProTaper");
		assert.ok(preset.treatmentDescription.includes("NaOCl"), "Лечение должно включать ирригацию гипохлоритом NaOCl");
		assert.ok(preset.treatmentDescription.includes("AH Plus"), "Лечение должно включать эпоксидный силер AH Plus");

		const ahPlus = preset.materialsToDeduct?.find((m) => m.name.includes("AH Plus"));
		assert.ok(ahPlus, "Должно быть списание силера AH Plus");
		assert.equal(ahPlus.quantity, 0.1, "Норма списания AH Plus 0.1 г");
	});

	// ── ТЕСТ 5: Валидация протокола K05.3 Хронический пародонтит (УЗ + AirFlow глицин + Хлоргексидин) ──
	it("5. Протокол K05.3 (Хронический пародонтит): УЗ + AirFlow глицин 25г + Хлоргексидин 0.05%, услуга A16.07.051", () => {
		const preset = getPresetById("perio_srp_curettage");
		assert.ok(preset, "Пресет perio_srp_curettage должен быть найден");

		assert.equal(preset.icd10, "K05.3");
		assert.equal(preset.service804n?.code804n, "A16.07.051");
		assert.ok(preset.complaint.includes("кровоточивость"), "Жалобы должны содержать кровоточивость десен");
		assert.ok(preset.treatmentDescription.includes("AirFlow") || preset.treatmentDescription.includes("Air-Flow"), "Лечение должно включать AirFlow");
		assert.ok(preset.treatmentDescription.includes("глицин"), "Лечение должно содержать порошок глицина");
		assert.ok(preset.treatmentDescription.includes("хлоргексидин"), "Лечение должно содержать хлоргексидин");

		const glycine = preset.materialsToDeduct?.find((m) => m.name.includes("глицин") || m.name.includes("Air-Flow"));
		assert.ok(glycine, "Должно быть списание порошка Air-Flow глицин");
		assert.equal(glycine.quantity, 25, "Норма списания порошка 25 г");
	});

	// ── ТЕСТ 6: Валидация протокола K01.1 Ретинированный зуб / Удаление (Элеватор + Альвожель/Губка) ──
	it("6. Протокол K01.1 (Удаление / Ретенция): Анестезия, элеватор, альвожель/губка, услуга A16.07.001.001", () => {
		const preset = getPresetById("surgery_extraction_simple");
		assert.ok(preset, "Пресет surgery_extraction_simple должен быть найден");

		assert.equal(preset.icd10, "K01.1");
		assert.equal(preset.service804n?.code804n, "A16.07.001.001");
		assert.ok(preset.treatmentDescription.includes("элеватор"), "Лечение должно включать работу элеватором");
		assert.ok(preset.treatmentDescription.includes("Альвожель") || preset.treatmentDescription.includes("Альвостаз") || preset.treatmentDescription.includes("губк"), "Лечение должно включать местный гемостаз губкой/альвожелем");

		const sponge = preset.materialsToDeduct?.find((m) => m.name.includes("Альвостаз") || m.name.includes("Альвожель") || m.name.includes("губка"));
		assert.ok(sponge, "Должно быть списание гемостатической губки Альвожель/Альвостаз");
		assert.equal(sponge.quantity, 1, "Количество 1 шт.");
	});

	// ── ТЕСТ 7: Полная валидация всех 100% пресетов каталога валидатором validateSoapPreset ──
	it("7. Валидатор validateSoapPreset подтверждает корректность каждого пресета каталога (0 ошибок)", () => {
		for (const preset of CLINICAL_SOAP_PRESETS) {
			const validation = validateSoapPreset(preset);
			assert.ok(
				validation.isValid,
				`Пресет «${preset.id}» не прошел валидацию: ${validation.errors.join(", ")}`,
			);
			assert.equal(validation.errors.length, 0);
		}
	});

	// ── ТЕСТ 8: getPresetsByCategory фильтрует категории корректно ──
	it("8. getPresetsByCategory возвращает списки пресетов по заданным медицинским профилям", () => {
		const therapy = getPresetsByCategory("therapy");
		const surgery = getPresetsByCategory("surgery");
		const orthopedics = getPresetsByCategory("orthopedics");
		const hygiene = getPresetsByCategory("hygiene");
		const periodontology = getPresetsByCategory("periodontology");
		const all = getPresetsByCategory("all");

		assert.ok(therapy.length > 0, "Категория терапия не должна быть пустой");
		assert.ok(surgery.length > 0, "Категория хирургия не должна быть пустой");
		assert.ok(orthopedics.length > 0, "Категория ортопедия не должна быть пустой");
		assert.ok(hygiene.length > 0, "Категория гигиена не должна быть пустой");
		assert.ok(periodontology.length > 0, "Категория пародонтология не должна быть пустой");
		assert.equal(all.length, CLINICAL_SOAP_PRESETS.length, "Категория all должна возвращать весь каталог");
	});

	// ── ТЕСТ 9: getPresetsByIcd10 находит пресеты по коду МКБ-10 ──
	it("9. getPresetsByIcd10 фильтрует пресеты по началу кода МКБ-10", () => {
		const cariesList = getPresetsByIcd10("K02");
		assert.ok(cariesList.length >= 3, "Должно быть найдено >= 3 пресетов кариеса (K02.1, K02.0, K02.2)");
		assert.ok(cariesList.every((p) => p.icd10.startsWith("K02")));

		const pulpitisList = getPresetsByIcd10("K04");
		assert.ok(pulpitisList.length >= 2, "Должно быть найдено >= 2 пресетов эндодонтии (K04.0, K04.5)");
	});

	// ── ТЕСТ 10: Умный поиск searchPresets по коду, названию, услуге и материалу ──
	it("10. searchPresets осуществляет точный полнотекстовый поиск по МКБ, названиям, услугам и материалам", () => {
		const searchByCode = searchPresets("K02.1");
		assert.ok(searchByCode.length >= 1, "Поиск по K02.1 должен найти пресеты");

		const searchByMaterial = searchPresets("Estelite");
		assert.ok(searchByMaterial.length >= 1, "Поиск по материалу Estelite должен найти пресеты со списанием Estelite");

		const searchByServiceCode = searchPresets("A16.07.008.001");
		assert.ok(searchByServiceCode.length >= 1, "Поиск по коду услуги 804н должен найти пресет пульпита");

		const searchByWord = searchPresets("удаление");
		assert.ok(searchByWord.length >= 1, "Поиск по слову 'удаление' должен найти хирургические пресеты");
	});

	// ── ТЕСТ 11: formatSoapFromPreset форматирует полные данные SOAP дневника ──
	it("11. formatSoapFromPreset формирует дневник Form 043/u с учетом выбранного зуба FDI и строк 804н", () => {
		const preset = getPresetById("caries_medium")!;
		const formatted = formatSoapFromPreset(preset, 26);

		assert.ok(formatted.complaint.length > 0, "Жалобы должны быть заполнены");
		assert.ok(formatted.anamnesis.length > 0, "Анамнез должен быть заполнен");
		assert.ok(formatted.objectiveStatus.startsWith("Зуб 26:"), "Status Localis должен содержать префикс зуба 26");
		assert.ok(formatted.diagnosis.includes("Зуб 26"), "Диагноз должен содержать номер зуба 26");
		assert.ok(formatted.treatmentPlan.includes("A16.07.002.001"), "План лечения должен содержать код услуги 804н");
		assert.ok(formatted.treatmentPlan.includes("Списание со склада (Норма 804н):"), "План лечения должен содержать ведомость списания");
		assert.ok(formatted.materialsToDeduct.length > 0, "Материалы к списанию должны быть возвращены");
	});

	// ── ТЕСТ 12: applyClinicalPresetToVisitNote в режиме clean_replace ──
	it("12. applyClinicalPresetToVisitNote (clean_replace) полностью заменяет поля формы визита", () => {
		const initialForm = {
			complaint: "Старые жалобы",
			anamnesis: "Старый анамнез",
			objectiveStatus: "Старый статус",
			diagnosis: "Старый диагноз",
			treatmentPlan: "Старый план",
		};

		const preset = getPresetById("caries_medium")!;
		const updatedForm = applyClinicalPresetToVisitNote(initialForm, preset, {
			targetTooth: 36,
			mode: "clean_replace",
		});

		assert.notEqual(updatedForm.complaint, initialForm.complaint);
		assert.ok(updatedForm.objectiveStatus.includes("Зуб 36:"));
		assert.ok(updatedForm.diagnosis.includes("K02.1"));
		assert.ok(updatedForm.treatmentPlan.includes("OptiBond FL"));
	});

	// ── ТЕСТ 13: applyClinicalPresetToVisitNote в режиме smart_append ──
	it("13. applyClinicalPresetToVisitNote (smart_append) аккуратно дополняет существующий дневник", () => {
		const initialForm = {
			complaint: "Первичные жалобы",
			anamnesis: "Аллергии нет",
			objectiveStatus: "Прикус нормальный",
			diagnosis: "K02.1 Кариес зуба 16",
			treatmentPlan: "Консультация проведена",
		};

		const preset = getPresetById("surgery_extraction_simple")!;
		const updatedForm = applyClinicalPresetToVisitNote(initialForm, preset, {
			targetTooth: 48,
			mode: "smart_append",
		});

		assert.ok(updatedForm.complaint.startsWith("Первичные жалобы"), "Должны сохраниться первичные жалобы");
		assert.ok(updatedForm.objectiveStatus.includes("Прикус нормальный"), "Должен сохраниться старый статус");
		assert.ok(updatedForm.objectiveStatus.includes("Зуб 48:"), "Должен добавиться статус зуба 48");
		assert.ok(updatedForm.diagnosis.includes("K02.1") && updatedForm.diagnosis.includes("K01.1"), "Оба диагноза должны присутствовать");
	});

	// ── ТЕСТ 14: calculatePresetMaterialsCost рассчитывает себестоимость материалов ──
	it("14. calculatePresetMaterialsCost рассчитывает нормативную себестоимость в рублях", () => {
		const preset = getPresetById("caries_medium")!;
		const cost = calculatePresetMaterialsCost(preset);

		assert.ok(cost > 0, `Себестоимость материалов должна быть больше 0, фактически: ${cost}`);
		// 0.35 * 1450 = 507.5 + 0.1 * 1950 = 195 + 0.2 * 180 = 36 + 115 + 220 + 2*35 = 70 => ~1143.5
		assert.ok(cost > 800 && cost < 2000, `Ожидаемый диапазон себестоимости [800..2000], фактически: ${cost}`);
	});

	// ── ТЕСТ 15: generateMaterialsDeductionReceipt генерирует ведомость списания ──
	it("15. generateMaterialsDeductionReceipt генерирует структурированный документ М-11 / 0504230", () => {
		const preset = getPresetById("caries_medium")!;
		const receipt = generateMaterialsDeductionReceipt(preset, 16);

		assert.ok(receipt.includes("ВЕДОМОСТЬ СПИСАНИЯ МАТЕРИАЛОВ"), "Ведомость должна иметь заголовок");
		assert.ok(receipt.includes("Зуб FDI #16"), "Ведомость должна содержать номер зуба");
		assert.ok(receipt.includes("Estelite Sigma Quick: 0.35 г"), "Ведомость должна содержать строку композита");
		assert.ok(receipt.includes("Нормативная себестоимость материалов:"), "Ведомость должна содержать итоговую стоимость");
	});

	// ── ТЕСТ 16: Гарантийные обязательства на композитные пломбы ──
	it("16. Композитные терапевтические протоколы содержат гарантию 24 мес. и срок службы 36 мес.", () => {
		const caries = getPresetById("caries_medium")!;
		const cariesDeep = getPresetById("caries_deep")!;
		const restoration = getPresetById("filling_restoration")!;

		assert.equal(caries.warrantyMonths, 24, "Гарантийный срок 24 мес.");
		assert.equal(caries.serviceLifeMonths, 36, "Срок службы 36 мес.");
		assert.equal(cariesDeep.warrantyMonths, 24);
		assert.equal(restoration.warrantyMonths, 24);
	});

	// ── ТЕСТ 17: ТОП-5 экспресс-сценариев TOP_EXPRESS_PRESET_IDS ──
	it("17. TOP_EXPRESS_PRESET_IDS содержит 5 эталонных экспресс-сценариев", () => {
		assert.equal(TOP_EXPRESS_PRESET_IDS.length, 5);
		assert.deepEqual(TOP_EXPRESS_PRESET_IDS, [
			"hygiene_complex",
			"caries_medium",
			"pulpitis_acute",
			"perio_srp_curettage",
			"surgery_extraction_simple",
		]);
	});

	// ── ТЕСТ 18: Обратная совместимость CLINICAL_PRESETS ──
	it("18. CLINICAL_PRESETS является алиасом CLINICAL_SOAP_PRESETS для обратной совместимости", () => {
		assert.equal(CLINICAL_PRESETS, CLINICAL_SOAP_PRESETS);
		assert.ok(CLINICAL_PRESETS.length >= 15);
	});
});
