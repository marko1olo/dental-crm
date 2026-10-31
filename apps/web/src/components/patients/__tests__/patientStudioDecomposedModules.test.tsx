import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PatientStudioModal,
	usePatientStudioState,
	PatientStudioHeader,
	PatientExpressRegistrationForm,
	PatientFamilyWalletSection,
	PatientProfileDetailView,
	PatientStudioFooterActions,
} from "../index";
import { DEMO_PATIENT_CATALOG, DEMO_FAMILY_GROUPS } from "../patientCatalogData";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Patient Studio Decomposed Modules Suite (Mandates 8b, 8e, 8n, 8am)", () => {
	it("1. [Мандат 8b] Все модули директории studioModal строго <= 250 строк", () => {
		const studioDir = path.resolve(__dirname, "../studioModal");
		const files = [
			"usePatientStudioState.ts",
			"PatientStudioHeader.tsx",
			"PatientExpressRegistrationForm.tsx",
			"PatientFamilyWalletSection.tsx",
			"PatientProfileDetailView.tsx",
			"PatientStudioFooterActions.tsx",
			"index.ts",
		];

		for (const file of files) {
			const fullPath = path.join(studioDir, file);
			assert.ok(fs.existsSync(fullPath), `Файл ${file} обязан существовать`);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 250,
				`Файл ${file} превышает Sweet Spot <= 250 строк: ${lines} строк`,
			);
		}

		// Фасад PatientStudioModal.tsx
		const facadePath = path.resolve(__dirname, "../PatientStudioModal.tsx");
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 200,
			`Фасад PatientStudioModal.tsx обязан быть <= 200 строк, сейчас ${facadeLines} строк`,
		);
	});

	it("2. [PatientStudioHeader] Рендерит заголовок, поиск и вкладки без сокращений", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioHeader
				mode="view"
				currentPatient={DEMO_PATIENT_CATALOG[0]}
				activeTab="profile"
				onSelectTab={() => {}}
				searchQuery=""
				onSearchChange={() => {}}
				filteredPatients={DEMO_PATIENT_CATALOG}
				onSelectPatient={() => {}}
				onStartCreate={() => {}}
				onCancelCreate={() => {}}
				onClose={() => {}}
			/>,
		);

		assert.ok(markup.includes("Анкета"), "Должен содержать вкладку 'Анкета'");
		assert.ok(markup.includes("Семейный баланс"), "Должен содержать вкладку 'Семейный баланс'");
		assert.ok(markup.includes("История"), "Должен содержать вкладку 'История'");
		assert.ok(markup.includes("Поиск пациента..."), "Должен содержать плейсхолдер поиска");
		assert.ok(markup.includes(DEMO_PATIENT_CATALOG[0].fullName), "Должен содержать имя текущего пациента");
	});

	it("3. [PatientExpressRegistrationForm] Содержит обязательные поля, 1-клик норму и переключатель категорий", () => {
		const markup = renderToStaticMarkup(
			<PatientExpressRegistrationForm
				draftName="Тестов Тест"
				onDraftNameChange={() => {}}
				draftPhone="+7 (999) 111-22-33"
				onDraftPhoneChange={() => {}}
				draftBirthDate="1990-01-01"
				onDraftBirthDateChange={() => {}}
				draftCategory="vip"
				onDraftCategoryChange={() => {}}
				draftIsSomaticNorm={true}
				onDraftIsSomaticNormChange={() => {}}
				draftNotes="Срочно"
				onDraftNotesChange={() => {}}
				draftPassportSeries=""
				onDraftPassportSeriesChange={() => {}}
				draftPassportNumber=""
				onDraftPassportNumberChange={() => {}}
				draftSnils=""
				onDraftSnilsChange={() => {}}
				showDocFields={false}
				onToggleDocFields={() => {}}
				guidanceMessage={null}
				nameInputRef={{ current: null }}
				phoneInputRef={{ current: null }}
			/>,
		);

		assert.ok(markup.includes('data-testid="express-patient-name-input"'), "Инпут имени");
		assert.ok(markup.includes('data-testid="express-patient-phone-input"'), "Инпут телефона");
		assert.ok(markup.includes("✓ Соматически здоров"), "1-клик норма по Мандату 8e");
		assert.ok(markup.includes("VIP"), "Категория VIP");
		assert.ok(markup.includes("Первичный"), "Категория Первичный");
		assert.ok(markup.includes("Постоянный"), "Категория Постоянный");
		assert.ok(markup.includes("Паспорт и СНИЛС (строго опционально"), "Сворачиваемые документы");
	});

	it("4. [PatientFamilyWalletSection] Отображает общий баланс семьи и участников", () => {
		const markup = renderToStaticMarkup(
			<PatientFamilyWalletSection
				currentPatient={DEMO_PATIENT_CATALOG[1]} // Ребенок с долгом
				currentFamily={DEMO_FAMILY_GROUPS[0]}
				onPayDebtFromRelative={() => {}}
			/>,
		);

		assert.ok(markup.includes('data-testid="patient-family-balance-section"'));
		assert.ok(markup.includes("Общий баланс семьи"));
		assert.ok(markup.includes("Иванова Елена Николаевна"));
		assert.ok(markup.includes("Иванов Артем Алексеевич"));
		// Проверка кнопки списания
		assert.ok(markup.includes('data-testid="pay-from-relative-fm-001"'));
	});

	it("5. [PatientStudioFooterActions] Ровно 1 Primary CTA, disabled={false}", () => {
		const markup = renderToStaticMarkup(
			<PatientStudioFooterActions
				mode="create"
				onSave={() => {}}
			/>,
		);

		assert.ok(markup.includes('data-testid="patient-studio-primary-cta"'));
		assert.ok(!markup.includes('disabled=""') && !markup.includes("disabled "), "Кнопка не должна быть disabled");
		assert.ok(markup.includes("Зарегистрировать пациента"));
	});
});
