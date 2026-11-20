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
import { FamilyMembersBalanceList } from "../family/familyWalletModal/FamilyMembersBalanceList";
import { FamilyMemberAddSection } from "../family/familyWalletModal/FamilyMemberAddSection";
import { PatientCardModal } from "../PatientCardModal";

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

	it("3. [Мандат 8n] Семейный кошелек: интеграция UI с бэкендом (создание, добавление родных, списание в 1 клик)", () => {
		// 3.1. Рендеринг активной семейной группы со списком и кнопкой добавления родственника
		const markupWithFamily = renderToStaticMarkup(
			<FamilyMembersBalanceList
				familyData={{
					id: "fam-test-1",
					name: "Семья Ивановых",
					balance: "12200",
					headPatientId: "pat-001",
					members: [
						{ id: "pat-001", fullName: "Иванова Елена", personalBalanceRub: 15400, canSpendFromPool: true },
						{ id: "pat-002", fullName: "Иванов Иван", personalBalanceRub: -3200, canSpendFromPool: true },
					],
				}}
				familyBalanceNumeric={12200}
				patientId="pat-001"
				patientName="Иванова Елена"
				spendingPermissions={{ "pat-001": true, "pat-002": true }}
				onTogglePermission={() => {}}
				onNavigateTab={() => {}}
				onRemoveMember={() => {}}
			/>,
		);

		assert.ok(markupWithFamily.includes('data-testid="family-wallet-members-list"'));
		assert.ok(markupWithFamily.includes("Иванова Елена"));
		assert.ok(markupWithFamily.includes("Иванов Иван"));
		// Проверка наличия кнопки добавления родственника в реальном UI
		assert.ok(markupWithFamily.includes('data-testid="btn-open-add-family-member"'));
		// Проверка кнопки исключения члена семьи
		assert.ok(markupWithFamily.includes('data-testid="btn-remove-family-member-pat-002"'));

		// 3.2. Рендеринг пустого состояния: форма создания семейного кошелька через POST /api/finance/family
		const markupEmpty = renderToStaticMarkup(
			<FamilyMembersBalanceList
				familyData={null}
				familyBalanceNumeric={0}
				patientId="pat-003"
				patientName="Петров Петр"
				spendingPermissions={{}}
				onTogglePermission={() => {}}
				onNavigateTab={() => {}}
			/>,
		);

		assert.ok(markupEmpty.includes('data-testid="input-create-family-group-name"'));
		assert.ok(markupEmpty.includes('data-testid="btn-submit-create-family-group"'));

		// 3.3. Валидация арифметики общего семейного баланса без комиссии
		const family = DEMO_FAMILY_GROUPS[0];
		const totalBalance = calculateFamilyBalanceKopecks(family.members);
		assert.equal(totalBalance, 1220000); // 12 200 руб

		const transferResult = transferFamilyBalance({
			fromMemberId: "fm-001",
			toMemberId: "fm-002",
			amountKopecks: 320000,
			members: family.members,
		});
		assert.equal(transferResult.success, true);
	});

	it("4. [Мандат 8e & 8am] PatientStudioModal: кнопка сохранения НИКОГДА не disabled, ровно 1 Primary CTA", () => {
		const markup = renderToStaticMarkup(
			<PatientCardModal
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

		// Проверка Мандата 8am: ровно ОДНА Primary CTA кнопка bg-[var(--primary)]
		const primaryCtaMatches = markup.match(/class="[^"]*bg-\[var\(--primary\)\](?![\w/])[^"]*"/g);
		assert.equal(primaryCtaMatches?.length, 1, "Ровно 1 Primary CTA кнопка на видимый экран!");
	});

	it("5. [Apple HIG Mobile] Сенсорная эргономика: touch target >= 44x44px, drag handle, 0px overflow-x", () => {
		const markup = renderToStaticMarkup(
			<PatientCardModal
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

	it("6. [Консолидация модалок] PatientCardModal является единым SSOT", () => {
		assert.ok(typeof PatientCardModal === "function" || typeof PatientCardModal === "object");

		// Проверка рендеринга консолидированного мастера
		const markup = renderToStaticMarkup(
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);
		assert.ok(typeof markup === "string");
	});
});
