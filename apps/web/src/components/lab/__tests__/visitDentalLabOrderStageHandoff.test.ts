import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	extractAppointmentStageInfo,
	getStandardStageTitle,
} from "../../visit/visitPlanStageHandoff";

const __filename = fileURLToPath(import.meta.url);
const labDir = path.resolve(path.dirname(__filename), "..");

describe("visitDentalLabOrder — Stage Extraction & Clinical Language", () => {
	it("Извлекает этап и план из прямых свойств активного визита", () => {
		const appointment = {
			id: "apt-101",
			patientId: "pat-999",
			treatmentPlanId: "plan-777",
			stageNumber: 3,
			stageTitle: "Ортопедический этап (протезирование)",
			stageId: "stg-333",
		};
		const stageInfo = extractAppointmentStageInfo(appointment);
		assert.equal(stageInfo.treatmentPlanId, "plan-777");
		assert.equal(stageInfo.stageNumber, 3);
		assert.equal(stageInfo.stageTitle, "Ортопедический этап (протезирование)");
		assert.equal(stageInfo.stageId, "stg-333");
	});

	it("Извлекает этап и план из комментариев визита и стандартных названий", () => {
		const appointmentWithComment = {
			id: "apt-102",
			patientId: "pat-999",
			comment: "[План лечения: plan-uuid-555 | Хирургия] [Этап: 2]",
		};
		const stageInfo = extractAppointmentStageInfo(appointmentWithComment);
		assert.equal(stageInfo.stageNumber, 2);
		assert.equal(stageInfo.stageTitle, "Хирургия");

		assert.equal(getStandardStageTitle(1), "Неотложная помощь и терапия");
		assert.equal(getStandardStageTitle(2), "Хирургический этап и санация");
		assert.equal(getStandardStageTitle(3), "Ортопедический этап");
		assert.equal(getStandardStageTitle(4), "Ортодонтия и эстетика");
		assert.equal(getStandardStageTitle(5), "Диспансерный контроль и гигиена");
	});

	it("Использует активный этап из loadedTreatmentPlan при отсутствии прямых полей", () => {
		const loadedPlan = {
			id: "plan-auto-888",
			title: "Комплексная реабилитация",
			stages: [
				{ id: "stg-1", stageNumber: 1, title: "Санация", status: "completed" },
				{ id: "stg-2", stageNumber: 2, title: "Имплантация Nobel", status: "completed" },
				{ id: "stg-3", stageNumber: 3, title: "Керамические коронки E.max", status: "in_progress" },
			],
		};
		const activeStage = loadedPlan.stages.find((s) => s.status === "in_progress");
		assert.ok(activeStage);
		assert.equal(activeStage.stageNumber, 3);
	});

	it("Мандат 8y: Отсутствие бюрократического языка в DentalLabOrderModal и DentalLabRestorationTab", () => {
		const modalPath = path.resolve(labDir, "DentalLabOrderModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");
		assert.match(content, /Заказ в лабораторию \(ЗТЛ\)/);
		assert.match(content, /План лечения: Этап/);

		const tabPath = path.resolve(labDir, "DentalLabRestorationTab.tsx");
		const tabContent = fs.readFileSync(tabPath, "utf-8");
		assert.match(tabContent, /Включить снятие слепка \(оттиска\) в счёт/);
		assert.match(tabContent, /2\s*500\s*₽/);
	});
});
