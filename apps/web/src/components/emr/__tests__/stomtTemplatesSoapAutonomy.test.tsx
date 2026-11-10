import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	STOMX_SPECIALTIES,
	populateOutpatientTemplateText,
	searchAll448Templates,
} from "@dental/shared";
import { resolveProtocolFromTemplate } from "../clinicalDiaryMath.js";
import { RecordNewDiaryInlineForm } from "../record/tabs/RecordNewDiaryInlineForm.js";
import { RecordDiariesTab } from "../record/tabs/RecordDiariesTab.js";
import { DEFAULT_MEDICAL_RECORD_DATA } from "../defaults/recordDefaultSchema.js";

describe("Wave 108: StomX 448 Templates & 1-Tap SOAP Integrator Suite", () => {
	it("1. Verifies completeness of STOMX_ALL_448_TEMPLATES_INDEX (exactly 448 clinical templates)", () => {
		assert.equal(
			STOMX_ALL_448_TEMPLATES_INDEX.length,
			448,
			`Ожидалось ровно 448 клинических шаблонов StomX, получено ${STOMX_ALL_448_TEMPLATES_INDEX.length}`,
		);

		const specialties = new Set(STOMX_ALL_448_TEMPLATES_INDEX.map((t) => t.specialty));
		assert.ok(specialties.has("therapy"), "Реестр содержит шаблоны по терапии");
		assert.ok(specialties.has("orthopedics"), "Реестр содержит шаблоны по ортопедии");
		assert.ok(specialties.has("surgery"), "Реестр содержит шаблоны по хирургии");
		assert.ok(specialties.has("implantology"), "Реестр содержит шаблоны по имплантологии");
		assert.ok(specialties.has("periodontics"), "Реестр содержит шаблоны по пародонтологии");

		const totalBySpecialties =
			STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => t.specialty === "therapy").length +
			STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => t.specialty === "orthopedics").length +
			STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => t.specialty === "surgery").length +
			STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => t.specialty === "implantology").length +
			STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => t.specialty === "periodontics").length;

		assert.equal(totalBySpecialties, 448, "Сумма шаблонов по 5 специальностям равна 448");
	});

	it("2. resolveProtocolFromTemplate: resolves key protocol or synthesizes compliant SOAP protocol", () => {
		// Ключевой протокол
		const keyTpl = STOMX_ALL_448_TEMPLATES_INDEX.find((t) => t.id === 5); // Пульпит острый очаговый
		assert.ok(keyTpl, "Шаблон с id=5 должен существовать");
		const resolvedKey = resolveProtocolFromTemplate(keyTpl);
		assert.ok(resolvedKey.complaint.length > 0, "Жалобы должны быть заполнены");
		assert.ok(resolvedKey.treatmentProtocol.length > 0, "Протокол лечения должен быть заполнен");

		// Синтезированный протокол
		const sampleTpl = STOMX_ALL_448_TEMPLATES_INDEX[100];
		assert.ok(sampleTpl, "Шаблон с индексом 100 должен существовать");
		const resolvedSample = resolveProtocolFromTemplate(sampleTpl);
		assert.equal(resolvedSample.mkbCode, sampleTpl.mkbCode);
		assert.equal(resolvedSample.specialty, sampleTpl.specialty);
		assert.ok(resolvedSample.complaint.includes(sampleTpl.name), "Жалобы содержат название шаблона");
		assert.ok(resolvedSample.objectiveStatus.includes(sampleTpl.name), "Статус содержит название шаблона");
		assert.ok(resolvedSample.treatmentProtocol.includes(sampleTpl.name), "Лечение содержит название шаблона");
	});

	it("3. populateOutpatientTemplateText: substitutes active tooth without raw '__' placeholders", () => {
		const rawTreatment =
			"Препарирование кариозной полости в __ зубе. Антисептическая обработка полости __ зуба 2% раствором хлоргексидина. Пломбирование светоотверждаемым композитом в __ зубе.";
		const populated = populateOutpatientTemplateText(rawTreatment, {
			toothNumber: 36,
		});

		assert.ok(populated.includes("в 36 зубе"), "Заменен плейсхолдер 'в __ зубе' на 'в 36 зубе'");
		assert.ok(populated.includes("полости 36 зуба"), "Заменен плейсхолдер 'полости __ зуба'");
		assert.ok(!populated.includes("__"), "Никаких сырых подчеркиваний '__' не осталось");
	});

	it("4. searchAll448Templates: filters cleanly across specialty and query", () => {
		const all = searchAll448Templates("");
		assert.equal(all.length, 448, "Пустой поиск возвращает все 448 шаблонов");

		const therapy = searchAll448Templates("", "therapy");
		assert.ok(therapy.length > 100, "Терапия содержит >100 шаблонов");
		assert.ok(therapy.every((t) => t.specialty === "therapy"), "Все шаблоны фильтра - терапия");

		const caries = searchAll448Templates("кариес");
		assert.ok(caries.length > 0, "Поиск по 'кариес' находит шаблоны");
		assert.ok(
			caries.some((t) => t.name.toLowerCase().includes("кариес") || t.categoryName.toLowerCase().includes("кариес")),
			"Найдены шаблоны со словом кариес",
		);

		const mkbK04 = searchAll448Templates("K04");
		assert.ok(mkbK04.length > 0, "Поиск по коду МКБ K04 находит шаблоны пульпита/периодонтита");
	});

	it("5. RecordNewDiaryInlineForm renders with 1-click norm button, FDI tooth selector, and SOAP fields", () => {
		const html = renderToStaticMarkup(
			createElement(RecordNewDiaryInlineForm, {
				selectedTooth: "46",
				setSelectedTooth: () => {},
				commonTeeth: [16, 26, 36, 46, 11, 21, 14, 24],
				subjective: "Боль при накусывании на зуб 46",
				setSubjective: () => {},
				objective: "Зуб 46: кариозная полость",
				setObjective: () => {},
				diagnosisText: "K04.4 Острый апикальный периодонтит",
				setDiagnosisText: () => {},
				icd10Code: "K04.4",
				setIcd10Code: () => {},
				protocol: "Механическая и медикаментозная обработка корневых каналов",
				setProtocol: () => {},
				onApplyNorm: () => {},
				onClear: () => {},
				onSave: () => {},
			}),
		);

		// Заголовок и селектор
		assert.ok(html.includes("input-inline-diary-tooth"), "Рендерится селектор зуба");
		assert.ok(html.includes('value="46"'), "Выбран 46 зуб");

		// Физиологическая норма / Интактные зубы (Мандаты 8e, 8zg)
		assert.ok(html.includes("btn-inline-diary-norm"), "Присутствует кнопка нормы");
		assert.ok(html.includes("Интактный ряд") || html.includes("Интактные зубы"), "Кнопка содержит текст 'Интактный ряд'");

		// Значения полей
		assert.ok(html.includes("Боль при накусывании на зуб 46"), "Отображаются жалобы");
		assert.ok(html.includes("K04.4"), "Отображается код МКБ-10");
		assert.ok(html.includes("btn-save-inline-diary"), "Присутствует вторичная кнопка сохранения дневника");
	});

	it("6. RecordDiariesTab renders header, quick add toggle, StAR protocol synthesizer button and diary list", () => {
		const defaultData = {
			...DEFAULT_MEDICAL_RECORD_DATA,
			visitDiaries: [
				{
					id: "diary_1",
					entryDate: "2026-11-10",
					entryTime: "10:00",
					toothNumber: "16",
					doctorFullName: "Тестов Т.Т.",
					doctorSpecialty: "Стоматолог-терапевт",
					subjectiveComplaints: "Жалоб нет",
					objectiveStatusLocalis: "Слизистая бледно-розовая",
					assessmentDiagnosisText: "Клинический осмотр",
					assessmentIcd10Code: "Z01.2",
					procedureProtocol: "Проведен осмотр",
				},
			],
		};

		const html = renderToStaticMarkup(
			createElement(RecordDiariesTab, {
				formData: defaultData,
				onOpenInternalProtocolGenerator: () => {},
			}),
		);

		// Заголовок
		assert.ok(html.includes("4. Дневники визитов (Медицинская карта приёма)"), "Рендерится заголовок");

		// Быстрая форма и генератор СтАР
		assert.ok(html.includes("btn-toggle-inline-diary-form"), "Присутствует кнопка быстрого переключения формы");
		assert.ok(html.includes("btn-emr-synthesize-diary"), "Присутствует кнопка протоколов СтАР");

		// Запись визита
		assert.ok(html.includes("Зуб FDI № 16"), "Отображается номер зуба FDI");
		assert.ok(html.includes("btn-revise-diary-0"), "Присутствует кнопка внесения исправления («Исправить»)");
	});

	it("7. Mandate 8e & Ergonomics: no disabled buttons, revision audit button present, zero raw emojis", () => {
		const defaultData = {
			...DEFAULT_MEDICAL_RECORD_DATA,
			visitDiaries: [
				{
					id: "diary_2",
					entryDate: "2026-11-10",
					entryTime: "11:00",
					toothNumber: "21",
					doctorFullName: "Тестов Т.Т.",
					doctorSpecialty: "Стоматолог-терапевт",
					subjectiveComplaints: "Жалоб нет",
					objectiveStatusLocalis: "Status Localis без патологии",
					assessmentDiagnosisText: "Осмотр",
					assessmentIcd10Code: "Z01.2",
					procedureProtocol: "Проведен осмотр",
				},
			],
		};

		const html = renderToStaticMarkup(
			createElement(RecordDiariesTab, {
				formData: defaultData,
				onOpenInternalProtocolGenerator: () => {},
			}),
		);

		// Мандат 8e: кнопки никогда не disabled
		assert.ok(!html.includes('disabled=""') && !html.includes("disabled "), "Кнопки не заблокированы disabled");
		assert.ok(html.includes("btn-revise-diary-0"), "Присутствует кнопка внесения исправления ('Исправить')");

		// Ноль эмодзи (строго векторная графика Lucide)
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "В разметке нет сырых эмодзи, только иконки Lucide");
	});
});
