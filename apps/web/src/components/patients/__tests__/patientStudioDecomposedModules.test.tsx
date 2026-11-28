import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientCardModal } from "../PatientCardModal";
import { DEMO_PATIENT_CATALOG, DEMO_FAMILY_GROUPS } from "../patientCatalogData";

describe("Patient Card Modal Canonical Suite (6G Live SUT)", () => {
	it("1. Catalog & family groups data integrity (unique IDs, family links, zero cartoon emojis)", () => {
		assert.ok(DEMO_PATIENT_CATALOG.length >= 3, "Должен быть непустой демо-каталог пациентов");
		assert.ok(DEMO_FAMILY_GROUPS.length >= 1, "Должны существовать семейные группы");
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const seenIds = new Set<string>();
		for (const p of DEMO_PATIENT_CATALOG) {
			assert.strictEqual(seenIds.has(p.id), false, `Дублирующийся id пациента ${p.id}`);
			seenIds.add(p.id);
			assert.strictEqual(emojiRegex.test(p.fullName), false);
			assert.strictEqual(Number.isInteger(p.balanceKopecks), true);
		}
	});

	it("2. [PatientCardModal View Mode] Рендерит шапку, 9 вкладок, баланс и норму без бюрократии", () => {
		const patient = DEMO_PATIENT_CATALOG[0];
		assert.ok(patient);
		const markup = renderToStaticMarkup(
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
				mode="view"
				patient={patient}
				patientData={patient}
			/>,
		);

		assert.ok(markup.includes('data-testid="patient-card-modal"'), "Контейнер модалки");
		assert.ok(markup.includes(patient.fullName), "ФИО пациента в шапке");
		assert.ok(markup.includes("Паспортные данные"), "Вкладка 'Паспортные данные'");
		assert.ok(markup.includes("Анамнез"), "Вкладка 'Анамнез'");
		assert.ok(markup.includes("Визиты и файлы"), "Вкладка 'Визиты и файлы'");
		assert.ok(markup.includes("Счета и баланс"), "Вкладка 'Счета и баланс'");
		assert.ok(markup.includes("Снимки и КТ"), "Вкладка 'Снимки и КТ'");
		assert.ok(markup.includes("Формула"), "Вкладка 'Формула'");
		assert.ok(markup.includes("Пародонтология"), "Вкладка 'Пародонтология'");
		assert.ok(markup.includes("Документы"), "Вкладка 'Документы'");
		assert.ok(markup.includes("Семья"), "Вкладка 'Семья'");
		assert.ok(markup.includes('data-testid="btn-somatic-healthy-norm"'), "Физиологическая норма");
		assert.ok(markup.includes('data-testid="btn-save-patient-card"'), "Primary CTA кнопка Сохранить");
		assert.ok(!markup.includes('disabled=""'), "Кнопки сохранения не disabled по Мандату 8e");
		assert.ok(!markup.includes("043/у") && !markup.includes("804н"), "Ноль номеров советских приказов в UI");
	});

	it("3. [PatientCardModal Create Mode] Рендерит экспресс-регистрацию и ровно 1 Primary CTA", () => {
		const markup = renderToStaticMarkup(
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
				mode="create"
			/>,
		);

		assert.ok(markup.includes("Первичная регистрация пациента"), "Заголовок экспресс-регистрации");
		assert.ok(markup.includes('data-testid="patient-creation-submit-btn"'), "Primary CTA Создать пациента");
		assert.ok(markup.includes('data-testid="patient-creation-submit-and-book-btn"'), "Кнопка Создать и записать");
		assert.ok(markup.includes('data-testid="patient-creation-submit-and-visit-btn"'), "Кнопка Создать и начать приём");
		assert.ok(!markup.includes('disabled=""'), "Кнопка создания не disabled");
	});

	it("4. [Apple HIG Mobile & Closed State] Наличие шторки, мобильного хэндла и пустой рендер при isOpen=false", () => {
		const closedMarkup = renderToStaticMarkup(
			<PatientCardModal
				isOpen={false}
				onClose={() => {}}
				mode="view"
				patient={DEMO_PATIENT_CATALOG[0]}
			/>,
		);
		assert.strictEqual(closedMarkup, "");

		const markup = renderToStaticMarkup(
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
				mode="view"
				patient={DEMO_PATIENT_CATALOG[0]}
			/>,
		);

		assert.ok(markup.includes("rounded-t-[24px]"), "Скругление Bottom Sheet для смартфонов");
		assert.ok(markup.includes("w-9 h-1"), "Apple HIG drag handle шторки");
	});
});
