import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectWorkstationEnvironment,
	getHumanToolMeta,
	isClinicalProtocol,
	isWorkstationTool,
	parseSoapSectionsFromText,
} from "../dentalAgentCockpitLogic.js";

describe("DentalAgentCockpit Clinical Logic & Workstation Tools", () => {
	it("should detect clinical protocol text correctly", () => {
		const nonClinical = "Привет, как дела?";
		assert.equal(isClinicalProtocol(nonClinical), false);

		const clinicalText =
			"Жалобы: Ноющие боли в области зуба 4.6 при приеме холодной пищи. " +
			"Анамнез: Появились 3 дня назад. " +
			"Объективно: Глубокая кариозная полость на жевательной поверхности. " +
			"Диагноз: K02.1 Кариес дентина. " +
			"Лечение: Препарирование, светоотверждаемый композит. Рекомендации: Наблюдение.";

		assert.equal(isClinicalProtocol(clinicalText), true);
	});

	it("should parse SOAP sections from clinical response text", () => {
		const clinicalText =
			"Жалобы: Боль при накусывании на зуб 3.5.\n" +
			"Анамнез: Ранее лечен по поводу пульпита 2 года назад.\n" +
			"Объективно: Перкуссия слабоположительная, пломба с дефектом прилегания.\n" +
			"Диагноз: K04.5 Хронический апикальный периодонтит зуба 3.5.\n" +
			"Лечение: Распломбировка корневого канала, антисептическая обработка, временная обтурация гидроксидом кальция.\n" +
			"Рекомендации: Явка через 14 дней, щадящая диета.";

		const parsed = parseSoapSectionsFromText(clinicalText);

		assert.ok(parsed.complaint?.includes("Боль при накусывании на зуб 3.5"));
		assert.ok(parsed.anamnesis?.includes("Ранее лечен по поводу пульпита"));
		assert.ok(parsed.objectiveStatus?.includes("Перкуссия слабоположительная"));
		assert.ok(parsed.diagnosis?.includes("K04.5"));
		assert.ok(parsed.treatmentPlan?.includes("Распломбировка корневого канала"));
		assert.ok(parsed.recommendations?.includes("Явка через 14 дней"));
	});

	it("should fallback gracefully if structured headers are missing", () => {
		const unstructuredText =
			"Проведена инфильтрационная анестезия 4% раствором артикаина с адреналином 1:200 000 (1.7 мл). " +
			"Выполнено иссечение капюшона лазером. Гемостаз стабилен.";

		const parsed = parseSoapSectionsFromText(unstructuredText);

		assert.ok(parsed.objectiveStatus?.includes("инфильтрационная анестезия"));
	});

	it("should identify workstation tools and map their human labels", () => {
		assert.equal(isWorkstationTool("launch_workstation_app"), true);
		assert.equal(isWorkstationTool("open_patient_dropzone_folder"), true);
		assert.equal(isWorkstationTool("capture_workstation_screen"), true);
		assert.equal(isWorkstationTool("getPatientEmk043u"), false);

		const metaPc = getHumanToolMeta("launch_workstation_app");
		assert.equal(metaPc.isWorkstation, true);
		assert.ok(metaPc.title.includes("[🖥️ ПК]"));

		const metaEmk = getHumanToolMeta("getPatientEmk043u");
		assert.equal(metaEmk.isWorkstation, false);
		assert.equal(metaEmk.title, "Анализ ЭМК и зубной формулы");
	});

	it("should detect workstation environment safely", () => {
		// In pure node environment without window, should return false
		assert.equal(detectWorkstationEnvironment(), false);
	});
});
