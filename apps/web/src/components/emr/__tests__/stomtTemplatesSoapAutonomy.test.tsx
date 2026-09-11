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
import {
	VisitSoapEditor,
	resolveProtocolFromTemplate,
} from "../VisitSoapEditor";

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

	it("5. VisitSoapEditor renders with 1-click button [Шаблоны 043/у (448)], norm button and FDI tooth selector", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 46,
				initialValues: {
					complaint: "Боль при накусывании на зуб 46",
					anamnesis: "Соматически здоров",
					objectiveStatus: "Зуб 46: кариозная полость",
					diagnosis: "K04.4 Острый апикальный периодонтит",
					treatmentPlan: "Механическая и медикаментозная обработка корневых каналов",
					recommendations: "Покой, контрольный рентген-снимок",
					icd10: "K04.4",
				},
				isTemplatesOpen: false,
			}),
		);

		// Заголовок и селектор
		assert.ok(html.includes("Форма 043/у • SOAP"), "Рендерится заголовок Форма 043/у");
		assert.ok(html.includes("soap-select-tooth"), "Рендерится селектор зуба");
		assert.ok(html.includes("46 зуб"), "Выбран 46 зуб");

		// Кнопка шаблонов 448
		assert.ok(html.includes("btn-open-stomt-templates"), "Присутствует data-testid='btn-open-stomt-templates'");
		assert.ok(html.includes("Шаблоны 043/у (448)"), "Кнопка содержит текст 'Шаблоны 043/у (448)'");

		// Норма в 1 клик (Мандат 8e)
		assert.ok(html.includes("btn-soap-physio-norm"), "Присутствует кнопка 1-клик нормы");
		assert.ok(html.includes("Норма"), "Кнопка содержит текст 'Норма'");

		// Значения полей
		assert.ok(html.includes("Боль при накусывании на зуб 46"), "Отображаются жалобы");
		assert.ok(html.includes("K04.4"), "Отображается код МКБ-10");
	});

	it("6. VisitSoapEditor renders drawer with all 5 specialties, 448 count and search bar", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 16,
				isTemplatesOpen: true,
			}),
		);

		// Заголовок панели
		assert.ok(
			html.includes("Клинические протоколы StomX (448 шаблонов 043/у)"),
			"Заголовок панели отражает 448 шаблонов 043/у",
		);

		// Фильтр 'Все протоколы (448)'
		assert.ok(html.includes("Все протоколы (448)"), "Присутствует кнопка 'Все протоколы (448)'");

		// 5 специальностей
		assert.ok(html.includes("Терапия"), "Фильтр Терапия присутствует");
		assert.ok(html.includes("Ортопедия"), "Фильтр Ортопедия присутствует");
		assert.ok(html.includes("Хирургия"), "Фильтр Хирургия присутствует");
		assert.ok(html.includes("Имплантация"), "Фильтр Имплантация присутствует");
		assert.ok(html.includes("Пародонтология"), "Фильтр Пародонтология присутствует");

		// Действия
		assert.ok(html.includes("Заполнить (1 клик)"), "Присутствует кнопка 'Заполнить (1 клик)'");
		assert.ok(html.includes("+ Добавить"), "Присутствует кнопка '+ Добавить'");
		assert.ok(html.includes("Поиск по диагнозу, протоколу"), "Присутствует поисковая строка");
	});

	it("7. Mandate 8e & Ergonomics: no disabled buttons when locked, revision audit button present, zero raw emojis", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 21,
				isLocked: true,
				isTemplatesOpen: false,
			}),
		);

		// Мандат 8e: кнопки никогда не disabled
		assert.ok(!html.includes('disabled=""') && !html.includes("disabled "), "Кнопки не заблокированы disabled");
		assert.ok(html.includes("btn-soap-enable-correction"), "Присутствует кнопка внесения исправления ('Исправленному верить')");

		// Ноль эмодзи (строго векторная графика Lucide)
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "В разметке нет сырых эмодзи, только иконки Lucide");
	});
});
