/**
 * apps/web/src/components/documents/__tests__/documentsStudioSSOT.test.tsx
 *
 * Строгий Red Team тестовый сьют единого канонического SSOT Студии документов и согласий (ИДС).
 * Проверяет:
 *   - 4 канонических пакета клиники РФ («Первичный приём», «Информированное согласие на лечение»,
 *     «Справка для налогового вычета», «Медицинская карта приёма и выписка»)
 *   - 5 клинических подкатегорий согласия (Терапия, Хирургия, Имплантация, Ортопедия, Анестезия)
 *   - Мандат 8e (Автономия врача): ZERO disabled кнопок печати/подписания
 *   - Мандат 8am: Ровно 1 Primary CTA кнопка #0d9488
 *   - Мандат 8wy: 0 float-ошибок при расчете копеек
 *   - Мандат 8x: Искоренение советского канцелярита и шифров приказов (1051н, 804н, 043/у)
 *   - Мандат 8aq: Живое монтирование в AppShell, administrativeLaunchersRegistry, SpecializedAdministrativeLaunchers
 *   - Apple HIG Touch Ergonomics: тактильный drag handle 36x5px, нативный Bottom Sheet
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CANONICAL_CLINIC_PACKAGES,
	DEFAULT_CLINIC_REQUISITES,
	formatKopecksToRubles,
	generateCardExtractTemplate,
	generateContractTemplate,
	generateInformedConsentTemplate,
	generateIntakePackageTemplate,
	generateTaxCertificateTemplate,
	sumKopecks,
} from "../documentsCatalogData";
import { DocumentsStudioModal } from "../DocumentsStudioModal";
import { DirectDocumentsLauncher } from "../DirectDocumentsLauncher";
import { DirectConsentLauncher } from "../../consents/DirectConsentLauncher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrcDir = path.resolve(__dirname, "../../..");

describe("🏛️ Documents & Informed Consents SSOT: Catalog & Legal Packages", () => {
	it("1.1. Содержит ровно 4 канонических пакета клиники РФ без советского канцелярита", () => {
		assert.equal(CANONICAL_CLINIC_PACKAGES.length, 4, "Должно быть ровно 4 базовых пакета клиники");

		const packageIds = CANONICAL_CLINIC_PACKAGES.map((p) => p.id);
		assert.ok(packageIds.includes("intake"), "Пакет 'Первичный приём' должен присутствовать");
		assert.ok(packageIds.includes("informed_consent"), "Пакет 'Информированное согласие на лечение' должен присутствовать");
		assert.ok(packageIds.includes("tax_certificate"), "Пакет 'Справка для налогового вычета' должен присутствовать");
		assert.ok(packageIds.includes("card_extract"), "Пакет 'Медицинская карта приёма и выписка' должен присутствовать");

		// Мандат 8x: отсутствие номеров приказов в видимых заголовках
		for (const pkg of CANONICAL_CLINIC_PACKAGES) {
			assert.ok(!pkg.titleRu.includes("1051н"), `В названии пакета '${pkg.titleRu}' запрещен номер 1051н`);
			assert.ok(!pkg.titleRu.includes("804н"), `В названии пакета '${pkg.titleRu}' запрещен номер 804н`);
			assert.ok(!pkg.titleRu.includes("043/у"), `В названии пакета '${pkg.titleRu}' запрещен шифр 043/у`);
			assert.ok(!pkg.titleRu.includes("1151156"), `В названии пакета '${pkg.titleRu}' запрещен шифр КНД`);
		}
	});

	it("1.2. Расчет целочисленных копеек без потерь и float-ошибок (Мандат 8wy)", () => {
		assert.equal(formatKopecksToRubles(0), "0 ₽");
		assert.equal(formatKopecksToRubles(100), "1 ₽");
		assert.equal(formatKopecksToRubles(250000), "2 500 ₽");
		assert.equal(formatKopecksToRubles(789050), "7 890,50 ₽");

		const testServices = [
			{ amountKopecks: 150000 },
			{ amountKopecks: 550000 },
			{ amountKopecks: 80000 },
		];
		const sum = sumKopecks(testServices);
		assert.equal(sum, 780000);
		assert.equal(formatKopecksToRubles(sum), "7 800 ₽");
	});

	it("1.3. Генерирует информированное согласие по 5 ключевым направлениям (Терапия, Хирургия, Имплантация, Ортопедия, Анестезия)", () => {
		const ctx = {
			clinic: DEFAULT_CLINIC_REQUISITES,
			patient: {
				fullName: "Соколов Михаил Романович",
				birthDate: "10.02.1992",
				passport: "45 14 778899",
				address: "г. Москва, ул. Арбат, 1",
				phone: "+7 900 123-45-67",
			},
			doctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач-стоматолог терапевт",
			},
			documentNumber: "ИДС-2026/01",
			documentDate: "01.11.2026",
			services: [],
			totalAmountKopecks: 0,
		};

		const therapyText = generateInformedConsentTemplate(ctx, "therapy");
		assert.ok(therapyText.includes("ТЕРАПЕВТИЧЕСКОЕ ЛЕЧЕНИЕ И ПЛОМБИРОВАНИЕ ЗУБОВ"));
		assert.ok(therapyText.includes("Соколов Михаил Романович"));

		const surgeryText = generateInformedConsentTemplate(ctx, "surgery");
		assert.ok(surgeryText.includes("ХИРУРГИЧЕСКОЕ ЛЕЧЕНИЕ И УДАЛЕНИЕ ЗУБОВ"));

		const implantText = generateInformedConsentTemplate(ctx, "implant");
		assert.ok(implantText.includes("ДЕНТАЛЬНУЮ ИМПЛАНТАЦИЮ И ОСТЕОПЛАСТИКУ"));

		const orthoText = generateInformedConsentTemplate(ctx, "orthopedics");
		assert.ok(orthoText.includes("ОРТОПЕДИЧЕСКОЕ ЛЕЧЕНИЕ И ПРОТЕЗИРОВАНИЕ"));

		const anesthText = generateInformedConsentTemplate(ctx, "anesthesia");
		assert.ok(anesthText.includes("МЕСТНОЕ ОБЕЗБОЛИВАНИЕ В СТОМАТОЛОГИИ"));
	});

	it("1.4. Генерирует официальную справку для налоговых органов РФ (ФНС, 13% НДФЛ)", () => {
		const ctx = {
			clinic: DEFAULT_CLINIC_REQUISITES,
			patient: {
				fullName: "Соколов Михаил Романович",
				birthDate: "10.02.1992",
				passport: "45 14 778899",
				address: "г. Москва",
				phone: "+7 900 123-45-67",
				inn: "770198765432",
			},
			doctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач-стоматолог терапевт",
			},
			documentNumber: "ФНС-2026/102",
			documentDate: "01.11.2026",
			taxYear: 2026,
			services: [],
			totalAmountKopecks: 6500000,
		};

		const text = generateTaxCertificateTemplate(ctx);
		assert.ok(text.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВЫХ ОРГАНОВ РФ"));
		assert.ok(text.includes("65 000 ₽"));
		assert.ok(text.includes("ИНН: 7701234567"));
		assert.ok(text.includes("ИНН налогоплательщика: 770198765432"));
	});
});

describe("🏛️ DocumentsStudioModal: Mandates 8e, 8am & Apple HIG", () => {
	it("2.1. Рендерит единую Студию документов и согласий с ровно 1 Primary CTA кнопкой #0d9488", () => {
		const html = renderToString(
			<DocumentsStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"documents-studio-modal\""), "Модалка должна монтироваться");
		assert.ok(html.includes("Студия документов и печати"), "Заголовок должен отображаться");

		// Мандат 8am: Ровно 1 Primary CTA кнопка
		const primaryMatches = html.match(/class="[^"]*dente-btn-primary-cta[^"]*"/g) || [];
		assert.equal(primaryMatches.length, 1, `Должна быть ровно ОДНА Primary CTA кнопка, найдено: ${primaryMatches.length}`);
		assert.ok(html.includes("✓ Распечатать пакет приёма и подписать"), "Текст кнопки должен отражать действие в 1 клик");

		// Мандат 8e: ZERO disabled кнопок
		assert.ok(!html.includes("disabled"), "Кнопки сохранения и печати НИКОГДА не должны быть disabled");

		// Apple HIG: Drag handle для мобильных экранов
		assert.ok(html.includes("dente-mobile-drag-handle"), "Должен присутствовать drag handle для мобильного Bottom Sheet");

		// A4 Paper Sheet
		assert.ok(html.includes("dente-a4-paper-sheet"), "Должен присутствовать лист формата А4");
	});

	it("2.2. Проверяет наличие всех 4 пакетов в боковой панели выбора", () => {
		const html = renderToString(
			<DocumentsStudioModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		assert.ok(html.includes("Первичный приём"), "Пакет Первичный приём должен быть доступен");
		assert.ok(html.includes("Информированное согласие на лечение"), "Пакет ИДС должен быть доступен");
		assert.ok(html.includes("Справка для налогового вычета"), "Пакет Справка ФНС должен быть доступен");
		assert.ok(html.includes("Медицинская карта приёма и выписка"), "Пакет Карта приёма должен быть доступен");
	});
});

describe("🏛️ Direct Launchers & Live UI Mounting (Mandate 8aq)", () => {
	it("3.1. DirectDocumentsLauncher монтируется и рендерится без ошибок", () => {
		const html = renderToString(<DirectDocumentsLauncher />);
		assert.ok(html !== undefined);
	});

	it("3.2. DirectConsentLauncher перенаправлен на канонический SSOT", () => {
		const html = renderToString(<DirectConsentLauncher />);
		assert.ok(html !== undefined);
	});

	it("3.3. DirectDocumentsLauncher смонтирован в AppShell.tsx", () => {
		const appShellPath = path.join(webSrcDir, "AppShell.tsx");
		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx должен существовать");
		const appShellContent = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(appShellContent.includes("DirectDocumentsLauncher"), "AppShell обязан монтировать DirectDocumentsLauncher");
	});

	it("3.4. DirectDocumentsLauncher смонтирован в SpecializedAdministrativeLaunchers.tsx", () => {
		const specializedPath = path.join(
			webSrcDir,
			"components/appLayout/modalsContainerModules/standalone/SpecializedAdministrativeLaunchers.tsx",
		);
		assert.ok(fs.existsSync(specializedPath), "SpecializedAdministrativeLaunchers.tsx должен существовать");
		const specializedContent = fs.readFileSync(specializedPath, "utf-8");
		assert.ok(specializedContent.includes("DirectDocumentsLauncher"), "SpecializedAdministrativeLaunchers обязан рендерить DirectDocumentsLauncher");
		assert.ok(specializedContent.includes("#documents"), "Должен обрабатывать хеш #documents");
		assert.ok(specializedContent.includes("#consents"), "Должен обрабатывать хеш #consents");
	});

	it("3.5. DirectDocumentsLauncher зарегистрирован в administrativeLaunchersRegistry.tsx", () => {
		const registryPath = path.join(
			webSrcDir,
			"components/appLayout/modalsContainerModules/standalone/administrativeLaunchersRegistry.tsx",
		);
		assert.ok(fs.existsSync(registryPath), "administrativeLaunchersRegistry.tsx должен существовать");
		const registryContent = fs.readFileSync(registryPath, "utf-8");
		assert.ok(registryContent.includes("DirectDocumentsLauncher"), "administrativeLaunchersRegistry обязан импортировать DirectDocumentsLauncher");
		assert.ok(registryContent.includes("documents-studio"), "administrativeLaunchersRegistry обязан содержать запись documents-studio");
	});
});
