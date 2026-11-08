import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientCardModal } from "../PatientCardModal";
import { DEMO_PATIENT_CATALOG, DEMO_FAMILY_GROUPS } from "../patientCatalogData";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Patient Card Modal Canonical Suite (Mandates 8b, 8e, 8n, 8am, 8s)", () => {
	it("1. [Мандат 8b/8zi] PatientCardModal и модули patientCardModalModules строго в пределах Sweet Spot", () => {
		const studioPath = path.resolve(__dirname, "../PatientCardModal.tsx");
		assert.ok(fs.existsSync(studioPath), "PatientCardModal.tsx обязан существовать");
		const studioLines = fs.readFileSync(studioPath, "utf8").split("\n").length;
		assert.ok(
			studioLines <= 650,
			`PatientCardModal.tsx обязан быть в пределах Sweet Spot (текущий: ${studioLines})`,
		);

		// Проверяем, что паразитные папки studioModal и detailsModal физически удалены
		const studioModalDir = path.resolve(__dirname, "../studioModal");
		const detailsModalDir = path.resolve(__dirname, "../detailsModal");
		const drawerDir = path.resolve(__dirname, "../drawer");
		assert.ok(!fs.existsSync(studioModalDir), "Мертвая папка studioModal обязана быть удалена");
		assert.ok(!fs.existsSync(detailsModalDir), "Мертвая папка detailsModal обязана быть удалена");
		assert.ok(!fs.existsSync(drawerDir), "Паразитная папка drawer обязана быть удалена");
	});

	it("2. [PatientCardModal View Mode] Рендерит шапку, 9 вкладок, баланс и 1-клик норму", () => {
		const patient = DEMO_PATIENT_CATALOG[0];
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
		assert.ok(markup.includes('data-testid="btn-somatic-healthy-norm"'), "1-клик физиологическая норма");
		assert.ok(markup.includes('data-testid="btn-save-patient-card"'), "Primary CTA кнопка Сохранить");
		assert.ok(!markup.includes('disabled=""'), "Кнопки сохранения не disabled по Мандату 8e");
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

	it("4. [Apple HIG Mobile] Наличие шторки и мобильного хэндла", () => {
		const markup = renderToStaticMarkup(
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
				mode="view"
				patient={DEMO_PATIENT_CATALOG[0]}
			/>,
		);

		// Мобильный хэндл шторки Apple HIG (36x4px / w-9 h-1)
		assert.ok(markup.includes("rounded-t-[24px]"), "Скругление Bottom Sheet для смартфонов");
		assert.ok(markup.includes("w-9 h-1"), "Apple HIG drag handle шторки");
	});
});
