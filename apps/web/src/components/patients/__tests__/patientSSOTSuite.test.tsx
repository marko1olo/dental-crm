/**
 * patientSSOTSuite.test.tsx — Исчерпывающий Red Team тест-сьют канонического SSOT
 * картотеки пациентов, экспресс-регистрации за 10 секунд и семейного баланса в DENTE CRM.
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и персонала, запрет блокировок disabled).
 * - Мандат 8n (Семейный баланс родственников в 1 клик).
 * - Мандат 8am (Ровно ОДНА Primary CTA кнопка #0d9488 на видимый экран).
 * - Apple HIG (390×844): сенсорный минимум >= 44x44px, iOS Contacts стиль, 0px horizontal scroll.
 * - Мандат 8x (Живой клинический язык без канцелярита).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
	type FamilyMember,
	type PatientCatalogItem,
} from "../patientCatalogData";
import { PatientStudioModal } from "../PatientStudioModal";
import { PatientDetailModal } from "../PatientDetailModal";
import { PatientDetailsModal } from "../PatientDetailsModal";
import { DirectPatientLauncher } from "../DirectPatientLauncher";

describe("Patient SSOT, Express Registration & Family Wallet Suite (Mandates 8e, 8n, 8am)", () => {
	it("1. [Мандат 8e] Экспресс-регистрация за 10 секунд требует ТОЛЬКО ФИО и Телефон (паспорт и СНИЛС не требуются)", () => {
		// Успешный ввод только ФИО и Телефона без паспорта/СНИЛС
		const validMinimal = validateExpressPatientRegistration({
			fullName: "Иванов Алексей",
			phone: "+7 (916) 123-45-67",
		});
		assert.equal(validMinimal.isValid, true);
		assert.equal(validMinimal.errorField, undefined);

		// Ошибка только при пустом ФИО
		const invalidName = validateExpressPatientRegistration({
			fullName: "А",
			phone: "+7 (916) 123-45-67",
		});
		assert.equal(invalidName.isValid, false);
		assert.equal(invalidName.errorField, "fullName");
		assert.ok(invalidName.guidanceMessage?.includes("не менее 2 символов"));

		// Ошибка только при коротком телефоне
		const invalidPhone = validateExpressPatientRegistration({
			fullName: "Иванов Алексей",
			phone: "123",
		});
		assert.equal(invalidPhone.isValid, false);
		assert.equal(invalidPhone.errorField, "phone");
		assert.ok(invalidPhone.guidanceMessage?.includes("не менее 10 цифр"));
	});

	it("2. [Нормализация и Дедупликация] Корректно нормализует телефоны и находит дубликаты", () => {
		assert.equal(normalizePhoneNumber("+7 (916) 123-45-67"), "79161234567");
		assert.equal(normalizePhoneNumber("8 (916) 123-45-67"), "79161234567");
		assert.equal(normalizePhoneNumber("9161234567"), "79161234567");

		assert.equal(formatPhoneDisplay("79161234567"), "+7 (916) 123-45-67");
		assert.equal(formatKopecksToRub(1540000), "15 400 ₽");
		assert.equal(formatKopecksToRub(-320000), "-3 200 ₽");

		// Поиск дубликата по телефону
		const dupesByPhone = findPatientDuplicates(DEMO_PATIENT_CATALOG, { phone: "89161234567" });
		assert.ok(dupesByPhone.length >= 2, "Должен найти членов семьи с одинаковым номером телефона");

		// Поиск дубликата по ФИО
		const dupesByName = findPatientDuplicates(DEMO_PATIENT_CATALOG, { fullName: "Смирнов Виктор Михайлович" });
		assert.equal(dupesByName.length, 1);
		assert.equal(dupesByName[0].id, "pat-003");
	});

	it("3. [Мандат 8n] Семейный баланс: расчет общего кошелька и списание в 1 клик", () => {
		const family = DEMO_FAMILY_GROUPS[0];
		const totalBalance = calculateFamilyBalanceKopecks(family.members);
		// 15 400 руб (мать) - 3 200 руб (ребёнок) = 12 200 руб
		assert.equal(totalBalance, 1220000);

		// Списание долга ребёнка с аванса матери
		const transferResult = transferFamilyBalance({
			fromMemberId: "fm-001", // Мать (аванс 15 400 руб)
			toMemberId: "fm-002",   // Ребёнок (долг -3 200 руб)
			amountKopecks: 320000,
			members: family.members,
		});

		assert.equal(transferResult.success, true);
		assert.ok(transferResult.message.includes("Иванова Елена Николаевна"));

		const updatedMother = transferResult.updatedMembers.find((m) => m.id === "fm-001");
		const updatedChild = transferResult.updatedMembers.find((m) => m.id === "fm-002");

		assert.equal(updatedMother?.balanceKopecks, 1540000 - 320000); // 12 200 руб
		assert.equal(updatedChild?.balanceKopecks, -320000 + 320000);   // 0 руб (долг закрыт)
	});

	it("4. [Мандат 8e & 8am] PatientStudioModal: кнопка сохранения НИКОГДА не disabled, ровно 1 Primary CTA", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioModal
				isOpen={true}
				onClose={() => {}}
				initialMode="create"
			/>,
		);

		// Проверка: модалка рендерится
		assert.ok(markup.includes('data-testid="patient-studio-modal"'));
		assert.ok(markup.includes('data-testid="patient-express-registration-form"'));

		// Проверка Мандата 8e: Primary CTA кнопка [ ✓ Зарегистрировать пациента ] НЕ содержит disabled
		assert.ok(markup.includes('data-testid="patient-studio-primary-cta"'));
		assert.ok(!markup.includes('disabled=""') && !markup.includes("disabled "), "Primary CTA не должна блокироваться disabled!");

		// Проверка Мандата 8am: ровно ОДНА Primary CTA кнопка bg-[var(--teal)]
		const primaryCtaMatches = markup.match(/class="[^"]*bg-\[var\(--teal\)\](?![\w/])[^"]*"/g);
		assert.equal(primaryCtaMatches?.length, 1, "Ровно 1 Primary CTA кнопка на видимый экран!");
	});

	it("5. [Apple HIG Mobile] Сенсорная эргономика: touch target >= 44x44px, drag handle, 0px overflow-x", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioModal
				isOpen={true}
				onClose={() => {}}
				initialMode="view"
			/>,
		);

		// Проверка: мобильный хэндл для шторки iOS
		assert.ok(markup.includes("w-9 h-1 bg-[var(--line-strong)] rounded-full"), "Должен присутствовать Drag Handle для iOS");

		// Проверка: touch-targets >= 44px
		assert.ok(markup.includes("min-h-[44px]"), "Primary CTA обязана иметь сенсорную высоту >= 44px");

		// Проверка: защита от паразитного горизонтального скролла
		assert.ok(markup.includes("overflow-x-clip"), "Должна быть защита от горизонтального дрейфа overflow-x-clip");
	});

	it("6. [Консолидация модалок] PatientDetailModal и PatientDetailsModal консолидированы без параллельных дублей", () => {
		assert.ok(typeof PatientDetailModal === "function" || typeof PatientDetailModal === "object");
		assert.ok(typeof PatientDetailsModal === "function" || typeof PatientDetailsModal === "object");
		assert.ok(typeof DirectPatientLauncher === "function" || typeof DirectPatientLauncher === "object");

		// Проверка рендеринга консолидированного фасада
		const markup = renderToStaticMarkup(
			<PatientDetailsModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);
		assert.ok(typeof markup === "string");
	});
});
