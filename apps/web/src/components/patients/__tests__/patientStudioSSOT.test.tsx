/**
 * patientStudioSSOT.test.tsx — Исчерпывающий Red Team тест-сьют для канонической студии
 * картотеки пациентов, 10-секундного экспресс-чекина и семейного баланса DENTE CRM (SSOT).
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и администратора): кнопки сохранения НИКОГДА не disabled.
 * - Мандат 8n (Семейный баланс родственников в 1 клик).
 * - Мандат 8am (Ровно ОДНА Primary CTA кнопка #0d9488 на видимый экран).
 * - Apple HIG (390×844): сенсорный минимум >= 44x44px, drag handle, 0px horizontal scroll.
 * - Мандат 8ap (Целочисленные копейки balanceKopecks, 0 float-ошибок).
 * - Мандат 8b / 8zi (Архитектурный Sweet Spot и консолидация).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	validateExpressPatientRegistration,
	normalizePhoneNumber,
	formatPhoneDisplay,
	formatKopecksToRub,
	calculateFamilyBalanceKopecks,
	transferFamilyBalance,
	findPatientDuplicates,
	DEMO_PATIENT_CATALOG,
	DEMO_FAMILY_GROUPS,
	PATIENT_CATEGORIES_CATALOG,
	FAMILY_ROLE_LABELS,
	type PatientCatalogItem,
	type FamilyMember,
} from "../patientCatalogData";
import { PatientStudioModal } from "../PatientStudioModal";
import { DirectPatientStudioLauncher } from "../DirectPatientStudioLauncher";
import { DirectPatientLauncher } from "../DirectPatientLauncher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Patient Studio SSOT, 10-Second Intake & Family Wallet Suite (Mandates 8e, 8n, 8am, 8ap, Apple HIG)", () => {
	it("1. [Мандат 8e] Экспресс-регистрация за 10 секунд требует ТОЛЬКО ФИО и Телефон (паспорт и СНИЛС не требуются)", () => {
		const minimalDraft = {
			fullName: "Кузнецов Дмитрий",
			phone: "+7 (926) 111-22-33",
		};
		const result = validateExpressPatientRegistration(minimalDraft);
		assert.equal(result.isValid, true);
		assert.equal(result.errorField, undefined);
		assert.equal(result.guidanceMessage, undefined);
	});

	it("2. [Мандат 8e] Валидация экспресс-регистрации мягко подсказывает ошибку при нехватке имени или телефона", () => {
		const invalidName = validateExpressPatientRegistration({ fullName: "А", phone: "+7 (926) 111-22-33" });
		assert.equal(invalidName.isValid, false);
		assert.equal(invalidName.errorField, "fullName");
		assert.ok(invalidName.guidanceMessage?.includes("не менее 2 символов"));

		const invalidPhone = validateExpressPatientRegistration({ fullName: "Кузнецов Дмитрий", phone: "12345" });
		assert.equal(invalidPhone.isValid, false);
		assert.equal(invalidPhone.errorField, "phone");
		assert.ok(invalidPhone.guidanceMessage?.includes("не менее 10 цифр"));
	});

	it("3. [Мандат 8e & 8am] PatientStudioModal в режиме создания: Primary CTA НИКОГДА не disabled, ровно 1 Primary CTA", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioModal isOpen={true} onClose={() => {}} initialMode="create" />,
		);

		assert.ok(markup.includes('data-testid="patient-studio-modal"'));
		assert.ok(markup.includes('data-testid="patient-express-registration-form"'));
		assert.ok(markup.includes('data-testid="patient-studio-primary-cta"'));

		// Кнопка сохранения НЕ содержит disabled
		assert.ok(!markup.includes('disabled=""') && !markup.includes("disabled "), "Primary CTA не должна быть disabled!");

		// Ровно 1 Primary CTA кнопка bg-[var(--teal)]
		const primaryCtaMatches = markup.match(/class="[^"]*bg-\[var\(--teal\)\](?![\w/])[^"]*"/g);
		assert.equal(primaryCtaMatches?.length, 1, "Ровно 1 Primary CTA кнопка на видимый экран!");
	});

	it("4. [Мандат 8e & 8am] PatientStudioModal в режиме просмотра: Primary CTA кликабельна, отображаются баланс и табы", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioModal isOpen={true} onClose={() => {}} initialMode="view" initialPatientId="pat-001" />,
		);

		assert.ok(markup.includes('data-testid="patient-studio-modal"'));
		assert.ok(markup.includes('data-testid="patient-studio-detail-view"'));
		assert.ok(markup.includes('data-testid="patient-studio-balance"'));
		assert.ok(markup.includes("Иванова Елена Николаевна"));
		assert.ok(markup.includes("15 400 ₽"));

		// Primary CTA кнопка кликабельна
		assert.ok(markup.includes('data-testid="patient-studio-primary-cta"'));
		assert.ok(!markup.includes('disabled=""') && !markup.includes("disabled "), "Primary CTA не должна быть disabled!");
	});

	it("5. [Мандат 8ap] Целочисленные копейки: 0 float-ошибок при конвертации и форматировании", () => {
		assert.equal(formatKopecksToRub(0), "0 ₽");
		assert.equal(formatKopecksToRub(1540000), "15 400 ₽");
		assert.equal(formatKopecksToRub(-320000), "-3 200 ₽");
		assert.equal(formatKopecksToRub(4500000), "45 000 ₽");

		// Проверка отсутствия float-дрейфа: 1540000 + (-320000) = 1220000 ровно
		const sum = 1540000 + -320000;
		assert.equal(sum, 1220000);
		assert.equal(formatKopecksToRub(sum), "12 200 ₽");
	});

	it("6. [Нормализация телефона] Поддерживает все форматы РФ (+7, 8, без кода)", () => {
		assert.equal(normalizePhoneNumber("+7 (916) 123-45-67"), "79161234567");
		assert.equal(normalizePhoneNumber("8 (916) 123-45-67"), "79161234567");
		assert.equal(normalizePhoneNumber("9161234567"), "79161234567");
		assert.equal(normalizePhoneNumber("+79161234567"), "79161234567");

		assert.equal(formatPhoneDisplay("79161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay(""), "—");
	});

	it("7. [Мандат 8e] Соматическая норма в 1 клик по умолчанию установлена в true", () => {
		const defaultPatient = DEMO_PATIENT_CATALOG[0];
		assert.equal(defaultPatient.isSomaticNorm, true);

		// Проверка рендеринга бейджа нормы
		const markup = renderToStaticMarkup(
			<PatientStudioModal isOpen={true} onClose={() => {}} initialMode="view" initialPatientId="pat-001" />,
		);
		assert.ok(markup.includes("Соматически здоров") || markup.includes("Норма"));
	});

	it("8. [Мандат 8n] Расчет общего семейного баланса родственников", () => {
		const family = DEMO_FAMILY_GROUPS[0];
		const balance = calculateFamilyBalanceKopecks(family.members);
		// Мать: 15 400 руб (1540000), Ребёнок: -3 200 руб (-320000) -> Итого: 12 200 руб (1220000)
		assert.equal(balance, 1220000);
		assert.equal(formatKopecksToRub(balance), "12 200 ₽");
	});

	it("9. [Мандат 8n] Списание долга ребенка с аванса матери в 1 клик без бюрократии", () => {
		const family = DEMO_FAMILY_GROUPS[0];
		const res = transferFamilyBalance({
			fromMemberId: "fm-001",
			toMemberId: "fm-002",
			amountKopecks: 320000,
			members: family.members,
		});

		assert.equal(res.success, true);
		assert.ok(res.message.includes("Иванова Елена Николаевна"));

		const updatedMother = res.updatedMembers.find((m) => m.id === "fm-001");
		const updatedChild = res.updatedMembers.find((m) => m.id === "fm-002");

		assert.equal(updatedMother?.balanceKopecks, 1220000); // 15 400 - 3 200 = 12 200 руб
		assert.equal(updatedChild?.balanceKopecks, 0);       // -3 200 + 3 200 = 0 руб (долг закрыт)
	});

	it("10. [Мандат 8n] Валидация семейного трансфера: отказ при неположительной сумме", () => {
		const family = DEMO_FAMILY_GROUPS[0];
		const res = transferFamilyBalance({
			fromMemberId: "fm-001",
			toMemberId: "fm-002",
			amountKopecks: 0,
			members: family.members,
		});
		assert.equal(res.success, false);
		assert.ok(res.message.includes("больше 0"));
	});

	it("11. [Дедупликация пациентов] Поиск дубликатов по телефону и полному имени", () => {
		const dupesByPhone = findPatientDuplicates(DEMO_PATIENT_CATALOG, { phone: "+7 (916) 123-45-67" });
		assert.ok(dupesByPhone.length >= 2, "Должен найти всех членов семьи с общим телефоном");

		const dupesByName = findPatientDuplicates(DEMO_PATIENT_CATALOG, { fullName: "Ковалева Анна Сергеевна" });
		assert.equal(dupesByName.length, 1);
		assert.equal(dupesByName[0].id, "pat-004");
	});

	it("12. [Apple HIG Mobile] Нативный Bottom Sheet, Drag Handle, сенсорный минимум >= 44px и 0px overflow-x", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioModal isOpen={true} onClose={() => {}} initialMode="create" />,
		);

		// Мобильный drag handle iOS (36x5px / w-9 h-1)
		assert.ok(markup.includes("w-9 h-1 bg-[var(--line-strong)] rounded-full"), "Должен быть тактильный Drag Handle для iOS");

		// Скругление верхней части шторки
		assert.ok(markup.includes("rounded-t-[24px]"), "Шторка обязана иметь rounded-t-[24px]");

		// Сенсорные зоны >= 44px
		assert.ok(markup.includes("min-h-[44px]"), "Интерактивные элементы обязаны иметь min-h-[44px]");

		// 0px горизонтального скролла
		assert.ok(markup.includes("overflow-x-clip"), "Обязательна защита от горизонтального скролла overflow-x-clip");
	});

	it("13. [DirectPatientStudioLauncher] Автономный лаунчер корректно монтируется и экспортируется", () => {
		assert.ok(typeof DirectPatientStudioLauncher === "function" || typeof DirectPatientStudioLauncher === "object");
		assert.ok(typeof DirectPatientLauncher === "function" || typeof DirectPatientLauncher === "object");

		// При отсутствии активных хэшей лаунчер не рендерит модалку
		const markup = renderToStaticMarkup(<DirectPatientStudioLauncher />);
		assert.equal(markup, "");
	});

	it("14. [Каталог категорий и ролей] Проверка констант PATIENT_CATEGORIES_CATALOG и FAMILY_ROLE_LABELS", () => {
		assert.equal(PATIENT_CATEGORIES_CATALOG.primary.labelRu, "Первичный");
		assert.equal(PATIENT_CATEGORIES_CATALOG.regular.labelRu, "Постоянный");
		assert.equal(PATIENT_CATEGORIES_CATALOG.vip.labelRu, "VIP");
		assert.equal(PATIENT_CATEGORIES_CATALOG.debtor.labelRu, "Должник");
		assert.equal(PATIENT_CATEGORIES_CATALOG.blacklist.labelRu, "В стоп-листе");

		assert.equal(FAMILY_ROLE_LABELS.mother, "Мать");
		assert.equal(FAMILY_ROLE_LABELS.father, "Отец");
		assert.equal(FAMILY_ROLE_LABELS.child, "Ребёнок");
		assert.equal(FAMILY_ROLE_LABELS.spouse, "Супруг / Супруга");
	});

	it("15. [Мандат 8b / 8zi Sweet Spot] Архитектурная метрика: канонический файл PatientStudioModal.tsx <= 480 строк", () => {
		const filePath = path.resolve(__dirname, "../PatientStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 400 && lines <= 480,
			`PatientStudioModal.tsx обязан быть в Sweet Spot 400-480 строк, сейчас ${lines} строк`,
		);

		const launcherPath = path.resolve(__dirname, "../DirectPatientStudioLauncher.tsx");
		const launcherLines = fs.readFileSync(launcherPath, "utf8").split("\n").length;
		assert.ok(
			launcherLines >= 50 && launcherLines <= 85,
			`DirectPatientStudioLauncher.tsx обязан быть в Sweet Spot 60-80 строк, сейчас ${launcherLines} строк`,
		);

		const dataPath = path.resolve(__dirname, "../patientCatalogData.ts");
		const dataLines = fs.readFileSync(dataPath, "utf8").split("\n").length;
		assert.ok(
			dataLines >= 300 && dataLines <= 380,
			`patientCatalogData.ts обязан быть в Sweet Spot 300-380 строк, сейчас ${dataLines} строк`,
		);
	});
});
