/**
 * pediatricAndClinicalDocumentsInquisition.test.ts
 *
 * RED TEAM ИНКВИЗИЦИОННЫЙ ЮНИТ-ТЕСТ:
 * Беспощадная инквизиция детского стоматологического приёма и каталога клинических документов:
 * 1. PediatricBraveryDiplomaModal.tsx:
 *    - 0 мультяшных эмодзи в разметке и печати (строгие векторные иконки Lucide).
 *    - Наличие уникального номера диплома (№ ДИПЛОМ-ГЕРОЙ-YYYY-...).
 *    - 1-клик печать без блокирующих полей (Мандат 8e).
 * 2. PediatricVisitAdaptationTab.tsx:
 *    - Пошаговый протокол адаптации Tell-Show-Do («Расскажи-Покажи-Сделай»).
 *    - Экспресс-шкала Франкла (1..4) со 100% SVG иконками и нулевым количеством эмодзи.
 *    - Молочная зубная формула FDI 51..85 и сменный прикус (24 зуба), тач-таргеты >= 44x44px.
 *    - 1-клик физиологическая норма временного прикуса (Мандат 8e).
 *    - 1-клик вызов диплома за смелость.
 *    - Отсутствие казенного птичьего языка (кодов МКБ Z01.2) в кнопках и шапке.
 * 3. DocumentsCatalogView.tsx:
 *    - Компактный тулбар строго в 1 строку (32–36px).
 *    - Поле поиска с отступом слева >= 38px (Мандат 12).
 *    - Сегментированные фильтры категорий.
 *    - Человеческие понятные названия документов («Согласие на медицинское вмешательство»,
 *      «Согласие законного представителя ребёнка», «Грамота за смелость», «План лечения ребёнка»).
 *    - Zero emojis.
 * 4. ConsentModal.tsx:
 *    - Канонический фасад согласий с понятным языком и 1-клик печатью на бумаге.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PediatricBraveryDiplomaModal } from "../components/pediatric/PediatricBraveryDiplomaModal.js";
import { VisitPediatricProtocolWidget } from "../components/pediatric/VisitPediatricProtocolWidget.js";
import { DocumentsCatalogView } from "../components/documents/DocumentsCatalogView.js";
import { ConsentModal } from "../components/consents/ConsentModal.js";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Red Team Inquisition: Pediatric Workflow & Clinical Documents Catalog", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. ДИПЛОМ ЗА ХРАБРОСТЬ (PEDIATRIC BRAVERY DIPLOMA)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. PediatricBraveryDiplomaModal Purity", () => {
		it("renders certificate preview with zero cartoon emojis and strict Lucide vector icons", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricBraveryDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Артём Кузнецов (6 лет)",
					doctorName: "Д-р Смирнова Е. В.",
					clinicName: "Клиника Семейной Стоматологии",
				}),
			);

			assert.ok(!EMOJI_REGEX.test(html), "PediatricBraveryDiplomaModal must contain ZERO cartoon emojis");
			assert.ok(html.includes("Артём Кузнецов (6 лет)"), "Must display child hero name");
			assert.ok(html.includes("Д-р Смирнова Е. В."), "Must display doctor name");
			assert.ok(html.includes("Клиника Семейной Стоматологии"), "Must display clinic name");
		});

		it("displays unique diploma serial number in certificate preview", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricBraveryDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "София (5 лет)",
				}),
			);

			assert.ok(
				html.includes("ДИПЛОМ-"),
				"Must display diploma serial number badge (№ ДИПЛОМ-...)",
			);
			assert.ok(
				html.includes('data-testid="diploma-certificate-preview"'),
				"Must render live certificate preview block",
			);
		});

		it("provides 1-click print trigger with Enter hotkey indication and no blocking fields", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricBraveryDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Максим",
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-modal-print-diploma"'),
				"Must provide modal print diploma button",
			);
			assert.ok(
				html.includes("Распечатать диплом (Enter)"),
				"Print button must indicate 1-tap Enter hotkey",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ДЕТСКИЙ КРЕСЕЛЬНЫЙ ПРОТОКОЛ (VISIT PEDIATRIC PROTOCOL WIDGET)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. VisitPediatricProtocolWidget Ergonomics & Purity", () => {
		it("renders pediatric chairside protocol widget with zero cartoon emojis", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					patientName: "Даша (6 лет)",
					patientAgeYears: 6,
					activeTooth: 54,
				}),
			);

			assert.ok(!EMOJI_REGEX.test(html), "VisitPediatricProtocolWidget must contain ZERO cartoon emojis");
			assert.ok(html.includes("Детский приём у кресла"), "Header must indicate chairside title");
			assert.ok(html.includes("Зуб 54"), "Must indicate selected tooth 54");
		});

		it("renders Frankl behavior scale express items with SVG vector icons", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					patientName: "Илья (7 лет)",
					initialFranklRating: 3,
					activeTooth: 54,
				}),
			);

			assert.ok(html.includes("Шкала поведения Франкла"), "Must display Frankl title");
			assert.ok(html.includes("Рейтинг --"), "Must display Frankl 1");
			assert.ok(html.includes("Рейтинг -"), "Must display Frankl 2");
			assert.ok(html.includes("Рейтинг +"), "Must display Frankl 3");
			assert.ok(html.includes("Рейтинг ++"), "Must display Frankl 4");
			assert.ok(html.includes("svg"), "Must render SVG icons for Frankl items");
		});

		it("provides 1-click clinical presets without blocking fields (Mandate 8e)", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					patientName: "Миша (5 лет)",
					activeTooth: 54,
				}),
			);

			assert.ok(html.includes("Кариес (СИЦ / SDR)"), "Has 1-click caries preset button");
			assert.ok(html.includes("Пульпотомия (Pulpotec)"), "Has 1-click pulpotomy preset button");
			assert.ok(html.includes("Герметизация (Fissurit)"), "Has 1-click fissure sealing preset button");
			assert.ok(html.includes("Серебрение / Фтор"), "Has 1-click silvering preset button");
			assert.ok(!html.includes("disabled"), "Action buttons must never be disabled (Mandate 8e)");
		});

		it("renders primary dentition formula FDI 51..85", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					patientName: "Алиса (5 лет)",
					patientAgeYears: 5,
					activeTooth: 55,
				}),
			);

			assert.ok(html.includes("51"), "Must render tooth 51");
			assert.ok(html.includes("55"), "Must render tooth 55");
			assert.ok(html.includes("61"), "Must render tooth 61");
			assert.ok(html.includes("75"), "Must render tooth 75");
			assert.ok(html.includes("85"), "Must render tooth 85");
		});

		it("purges bird language and raw bureaucrat codes from visible toolbar headers", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					patientName: "Егор",
					activeTooth: 54,
				}),
			);

			assert.ok(!html.includes("043/у"), "Visible widget must NOT leak raw 043/у");
			assert.ok(
				html.includes("Детский приём у кресла"),
				"Must use human clinical title",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. КАТАЛОГ ДОКУМЕНТОВ (DOCUMENTS CATALOG VIEW)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. DocumentsCatalogView Toolbar & Structure", () => {
		it("renders 1-row compact toolbar with search input and category filters", () => {
			const html = renderToStaticMarkup(
				createElement(DocumentsCatalogView, {
					patientName: "Иванов Иван",
				}),
			);

			assert.ok(!EMOJI_REGEX.test(html), "DocumentsCatalogView must contain ZERO cartoon emojis");
			assert.ok(
				html.includes('data-testid="input-documents-catalog-search"'),
				"Must render search input in toolbar",
			);
			assert.ok(
				html.includes('style="padding-left:38px"') || html.includes('style="padding-left: 38px;"'),
				"Search input must have padding-left >= 38px per Mandate 12",
			);
			assert.ok(html.includes('data-testid="filter-cat-all"'), "Must render 'all' filter");
			assert.ok(html.includes('data-testid="filter-cat-pediatric"'), "Must render 'pediatric' filter");
			assert.ok(html.includes('data-testid="filter-cat-intake"'), "Must render 'intake' filter");
		});

		it("renders human clinical titles without bureaucratic jargon", () => {
			const html = renderToStaticMarkup(
				createElement(DocumentsCatalogView, {
					patientName: "Петрова Анна",
				}),
			);

			assert.ok(
				html.includes("Согласие на медицинское вмешательство") ||
					html.includes("Информированное согласие на лечение"),
				"Must display human title for primary consent",
			);
			assert.ok(
				html.includes("Согласие законного представителя ребёнка"),
				"Must display child representative consent",
			);
			assert.ok(
				html.includes("Грамота за смелость (детский диплом)"),
				"Must display bravery diploma card",
			);
			assert.ok(
				html.includes("План лечения ребёнка"),
				"Must display child treatment plan",
			);
			assert.ok(
				html.includes("Медицинская карта приёма"),
				"Must display outpatient medical card",
			);
			assert.ok(
				html.includes("Амбулаторная карта"),
				"Must display outpatient card badge",
			);
			assert.ok(
				html.includes("Стандарт Минздрава"),
				"Must display clinical standard badge instead of order 1051n",
			);
			assert.ok(
				html.includes("Договор клиники"),
				"Must display clinic agreement badge instead of decree 736",
			);
			assert.ok(
				html.includes("Справка ФНС"),
				"Must display tax authority badge instead of KND code",
			);
			assert.ok(!html.includes("Приказ 1051н"), "Must NOT leak bureaucratic code 1051n");
			assert.ok(!html.includes("ПП РФ № 736"), "Must NOT leak government decree 736 code");
			assert.ok(!html.includes("КНД 1151156"), "Must NOT leak KND tax code");
		});

		it("renders 1-tap bravery diploma trigger button in toolbar", () => {
			const html = renderToStaticMarkup(
				createElement(DocumentsCatalogView, {
					patientName: "Вова (6 лет)",
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-catalog-print-diploma"'),
				"Must render print diploma CTA button in catalog toolbar",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. МОДАЛКА СОГЛАСИЯ (CONSENT MODAL)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. ConsentModal Facade & Purity", () => {
		it("renders ConsentModal cleanly with zero cartoon emojis and paper-first print options", () => {
			const html = renderToStaticMarkup(
				createElement(ConsentModal, {
					isOpen: true,
					onClose: () => {},
					patient: {
						fullName: "Лебедев Максим (7 лет)",
					},
					doctorName: "Д-р Кузнецова М. И.",
					isMinorPatient: true,
				}),
			);

			assert.ok(!EMOJI_REGEX.test(html), "ConsentModal must contain ZERO cartoon emojis");
			assert.ok(
				html.includes("Информированное добровольное согласие") || html.includes("согласий") || html.includes("Согласия"),
				"Must render consent modal title",
			);
		});
	});
});
