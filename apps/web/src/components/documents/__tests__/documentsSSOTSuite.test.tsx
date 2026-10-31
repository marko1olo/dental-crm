/**
 * apps/web/src/components/documents/__tests__/documentsSSOTSuite.test.tsx
 *
 * Канонический Red Team тестовый сьют единого SSOT документооборота DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-практика), 8am (1 Primary CTA #0d9488),
 * 8x (Живой русский клинический язык), 8wy (Целочисленные копейки), Apple HIG.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DEFAULT_CLINIC_REQUISITES,
	formatKopecksToRubles,
	generateActTemplate,
	generateCardExtractTemplate,
	generateContractTemplate,
	generateTaxCertificateTemplate,
	getDocumentsCatalogData,
	sumKopecks,
} from "../documentsCatalogData";
import { DocumentsStudioModal } from "../DocumentsStudioModal";
import { DirectDocumentsLauncher } from "../DirectDocumentsLauncher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("🏛️ Documents SSOT Suite: Catalog Data, Legal Templates & Integer Kopecks", () => {
	it("проверяет расчет целочисленных копеек без потерь и float-артефактов", () => {
		assert.equal(formatKopecksToRubles(0), "0 ₽");
		assert.equal(formatKopecksToRubles(100), "1 ₽");
		assert.equal(formatKopecksToRubles(150000), "1 500 ₽");
		assert.equal(formatKopecksToRubles(550050), "5 500,50 ₽");
		assert.equal(formatKopecksToRubles(123456789), "1 234 567,89 ₽");

		const items = [
			{ amountKopecks: 150000 },
			{ amountKopecks: 550000 },
			{ amountKopecks: 80000 },
		];
		const total = sumKopecks(items);
		assert.equal(total, 780000);
		assert.equal(formatKopecksToRubles(total), "7 800 ₽");
	});

	it("гарантирует zero-emoji и чистый клинический русский язык в каталоге бланков", () => {
		const catalog = getDocumentsCatalogData();
		assert.ok(catalog.length >= 10, "Каталог должен содержать основные формы");

		for (const item of catalog) {
			assert.ok(!EMOJI_REGEX.test(item.titleRu), `Заголовок ${item.titleRu} не должен содержать эмодзи`);
			assert.ok(!EMOJI_REGEX.test(item.badgeRu), `Бейдж ${item.badgeRu} не должен содержать эмодзи`);
			assert.ok(!EMOJI_REGEX.test(item.descriptionRu), `Описание ${item.descriptionRu} не должно содержать эмодзи`);

			// Мандат 8x: никаких советских приказов в названиях
			assert.ok(!item.titleRu.includes("043/у"), `В названии "${item.titleRu}" запрещён советский шифр 043/у`);
			assert.ok(!item.titleRu.includes("804н"), `В названии "${item.titleRu}" запрещён номер приказа 804н`);
			assert.ok(!item.titleRu.includes("54-ФЗ"), `В названии "${item.titleRu}" запрещён номер 54-ФЗ`);
		}
	});

	it("генерирует канонический договор платных медуслуг РФ с реквизитами клиники и пациента", () => {
		const ctx = {
			clinic: DEFAULT_CLINIC_REQUISITES,
			patient: {
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "20.10.1990",
				passport: "4515 998877",
				address: "г. Москва, ул. Арбат, 10",
				phone: "+7 999 111-22-33",
			},
			doctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач-стоматолог терапевт",
			},
			documentNumber: "ДОГ-2026/001",
			documentDate: "31.10.2026",
			services: [],
			totalAmountKopecks: 1200000,
		};

		const text = generateContractTemplate(ctx);
		assert.ok(text.includes("ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ № ДОГ-2026/001"));
		assert.ok(text.includes(DEFAULT_CLINIC_REQUISITES.name));
		assert.ok(text.includes("Кузнецов Дмитрий Сергеевич"));
		assert.ok(text.includes("12 000 ₽"));
		assert.ok(text.includes("Смирнова Елена Сергеевна"));
		assert.ok(!EMOJI_REGEX.test(text), "Договор не должен содержать эмодзи");
	});

	it("генерирует финансовый акт выполненных работ с детализацией услуг в рублях", () => {
		const ctx = {
			clinic: DEFAULT_CLINIC_REQUISITES,
			patient: {
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "20.10.1990",
				passport: "4515 998877",
				address: "г. Москва",
				phone: "+7 999 111-22-33",
			},
			doctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач-стоматолог терапевт",
			},
			documentNumber: "АКТ-2026/001",
			documentDate: "31.10.2026",
			services: [
				{
					id: "s1",
					title: "Лечение кариеса 4.6",
					quantity: 1,
					priceKopecks: 600000,
					amountKopecks: 600000,
				},
			],
			totalAmountKopecks: 600000,
		};

		const text = generateActTemplate(ctx);
		assert.ok(text.includes("АКТ ВЫПОЛНЕННЫХ УСЛУГ К ДОГОВОРУ № АКТ-2026/001"));
		assert.ok(text.includes("Лечение кариеса 4.6"));
		assert.ok(text.includes("6 000 ₽"));
		assert.ok(text.includes("Претензий по объёму, срокам и качеству оказанных медицинских услуг Пациент к клинике не имеет"));
	});

	it("генерирует справку об оплате медицинских услуг для ФНС (13% НДФЛ)", () => {
		const ctx = {
			clinic: DEFAULT_CLINIC_REQUISITES,
			patient: {
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "20.10.1990",
				passport: "4515 998877",
				address: "г. Москва",
				phone: "+7 999 111-22-33",
				inn: "771234567890",
			},
			doctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач-стоматолог терапевт",
			},
			documentNumber: "ФНС-2026/55",
			documentDate: "31.10.2026",
			taxYear: 2026,
			services: [],
			totalAmountKopecks: 4500000,
		};

		const text = generateTaxCertificateTemplate(ctx);
		assert.ok(text.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВЫХ ОРГАНОВ РФ"));
		assert.ok(text.includes("2026 год"));
		assert.ok(text.includes("ИНН: 7701234567"));
		assert.ok(text.includes("45 000 ₽"));
		assert.ok(text.includes("Код услуги 1 (обычное лечение): 45 000 ₽"));
	});

	it("генерирует выписку из медицинской карты приёма", () => {
		const ctx = {
			clinic: DEFAULT_CLINIC_REQUISITES,
			patient: {
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "20.10.1990",
				passport: "4515 998877",
				address: "г. Москва",
				phone: "+7 999 111-22-33",
			},
			doctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач-стоматолог терапевт",
			},
			documentNumber: "ВЫП-12",
			documentDate: "31.10.2026",
			services: [
				{
					id: "s1",
					title: "Пломбирование зуба световой композит",
					quantity: 1,
					priceKopecks: 500000,
					amountKopecks: 500000,
				},
			],
			totalAmountKopecks: 500000,
			diagnosisRu: "К02.1 Кариес дентина 4.6",
		};

		const text = generateCardExtractTemplate(ctx);
		assert.ok(text.includes("ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПРИЁМА"));
		assert.ok(text.includes("К02.1 Кариес дентина 4.6"));
		assert.ok(text.includes("Пломбирование зуба световой композит"));
	});
});

describe("🏛️ Documents Studio Modal & UI Architecture (Mandates 8am, 8e, Apple HIG)", () => {
	it("рендерит DocumentsStudioModal с ровно одной Primary CTA кнопкой #0d9488", () => {
		const html = renderToString(
			<DocumentsStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Проверка наличия модалки и бэкдропа
		assert.ok(html.includes("data-testid=\"documents-studio-modal\""), "Модалка должна монтироваться с data-testid");
		assert.ok(html.includes("Студия документов и печати"), "Заголовок должен отображаться");

		// Мандат 8am: Ровно ОДНА Primary CTA кнопка
		const primaryMatches = html.match(/class="[^"]*dente-btn-primary-cta[^"]*"/g) || [];
		assert.equal(primaryMatches.length, 1, `Должна быть ровно ОДНА Primary CTA кнопка, найдено: ${primaryMatches.length}`);
		assert.ok(html.includes("Распечатать пакет приёма"), "Primary CTA должна называться 'Распечатать пакет приёма'");

		// Мандат 8e: Кнопки не должны быть disabled
		assert.ok(!html.includes("disabled"), "Кнопки сохранения/печати не должны быть disabled");

		// Apple HIG: Drag handle для сенсорных экранов
		assert.ok(html.includes("dente-mobile-drag-handle"), "Должен присутствовать drag handle для мобильного Bottom Sheet");

		// A4 Paper Canvas
		assert.ok(html.includes("dente-a4-paper"), "Должен присутствовать A4 холст листа");
	});

	it("рендерит DirectDocumentsLauncher без крашей", () => {
		const html = renderToString(<DirectDocumentsLauncher />);
		// Лаунчер монтируется в дереве, если URL не совпадает — возвращает null или контент
		assert.ok(html !== undefined);
	});

	it("проверяет CSS файл на токены, Primary CTA #0d9488 и стили печати @media print", () => {
		const cssPath = path.resolve(__dirname, "../documents.css");
		assert.ok(fs.existsSync(cssPath), "Файл documents.css должен существовать");

		const cssContent = fs.readFileSync(cssPath, "utf-8");
		assert.ok(cssContent.includes("#0d9488"), "CSS должен содержать акцентный цвет Primary CTA #0d9488");
		assert.ok(cssContent.includes("@media print"), "CSS должен содержать правила @media print для A4");
		assert.ok(cssContent.includes("size: A4 portrait"), "CSS должен настраивать размер страницы A4 portrait");
		assert.ok(cssContent.includes("var(--paper"), "CSS должен использовать design tokens var(--paper)");
		assert.ok(cssContent.includes("var(--ink"), "CSS должен использовать design tokens var(--ink)");
		assert.ok(cssContent.includes("var(--line"), "CSS должен использовать design tokens var(--line)");
		assert.ok(cssContent.includes("dente-mobile-drag-handle"), "CSS должен содержать стили для мобильного drag handle");
	});
});
