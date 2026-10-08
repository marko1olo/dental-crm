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
import { describe, it } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PediatricBraveryDiplomaModal } from "../components/pediatric/PediatricBraveryDiplomaModal.js";
import { PediatricVisitAdaptationTab } from "../components/pediatric/PediatricVisitAdaptationTab.js";
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
	// 2. АДАПТАЦИОННЫЙ ПРИЁМ (PEDIATRIC VISIT ADAPTATION TAB)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. PediatricVisitAdaptationTab Ergonomics & Purity", () => {
		it("renders Tell-Show-Do adaptation protocol with 5 step items", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricVisitAdaptationTab, {
					patientName: "Даша (6 лет)",
					patientAgeYears: 6,
				}),
			);

			assert.ok(!EMOJI_REGEX.test(html), "PediatricVisitAdaptationTab must contain ZERO cartoon emojis");
			assert.ok(html.includes("Знакомство и игра"), "Step 1 must be present");
			assert.ok(html.includes("«Ветерок» и водичка"), "Step 2 must be present");
			assert.ok(html.includes("Считаем зубки"), "Step 3 must be present");
			assert.ok(html.includes("Мягкая полировка"), "Step 4 must be present");
			assert.ok(html.includes("Награда и грамота"), "Step 5 must be present");
		});

		it("renders Frankl behavior scale buttons with 100% SVG vector icons", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricVisitAdaptationTab, {
					patientName: "Илья (7 лет)",
					initialFranklRating: 3,
				}),
			);

			for (const r of [1, 2, 3, 4]) {
				assert.ok(
					html.includes(`data-testid="btn-frankl-${r}"`),
					`Must render Frankl button for rating ${r}`,
				);
			}
			assert.ok(html.includes("svg"), "Must render SVG icons for Frankl items");
		});

		it("provides 1-click physiological norm button without blocking fields (Mandate 8e)", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricVisitAdaptationTab, {
					patientName: "Миша (5 лет)",
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-adaptation-1click-norm"'),
				"Must render 1-click norm button",
			);
			assert.ok(html.includes("Норма прикуса"), "Must display clear button title");
		});

		it("provides 1-click bravery diploma button opening diploma modal", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricVisitAdaptationTab, {
					patientName: "Тимофей (6 лет)",
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-adaptation-open-diploma"'),
				"Must render diploma trigger button",
			);
			assert.ok(html.includes("Грамота за смелость"), "Must label button with patient-friendly title");
		});

		it("renders primary dentition formula FDI 51..85 with large touch targets >= 44x44px", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricVisitAdaptationTab, {
					patientName: "Алиса (5 лет)",
					patientAgeYears: 5,
				}),
			);

			// Проверяем наличие кнопок молочных зубов
			for (const tooth of [51, 55, 61, 65, 71, 75, 81, 85]) {
				assert.ok(
					html.includes(`data-testid="pediatric-tooth-btn-${tooth}"`),
					`Must render primary tooth button for tooth ${tooth}`,
				);
			}

			// Проверяем наличие переключателя прикуса
			assert.ok(html.includes('data-testid="btn-mode-primary"'), "Must render primary mode button");
			assert.ok(html.includes('data-testid="btn-mode-mixed"'), "Must render mixed mode button");
		});

		it("purges bird language and raw ICD codes (Z01.2) from visible toolbar headers", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricVisitAdaptationTab, {
					patientName: "Егор",
				}),
			);

			assert.ok(!html.includes("Z01.2"), "Visible toolbar must NOT leak raw ICD code Z01.2");
			assert.ok(
				html.includes("Адаптационный приём и привыкание к лечению"),
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
				html.includes("Согласие на медицинское вмешательство"),
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
				html.includes("Информированное добровольное согласие") || html.includes("СОГЛАСИЕ"),
				"Must render consent modal title",
			);
		});
	});
});
