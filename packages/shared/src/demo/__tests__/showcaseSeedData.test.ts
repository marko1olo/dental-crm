import assert from "node:assert/strict";
import test from "node:test";
import {
	SHOWCASE_DOCTORS,
	SHOWCASE_PATIENTS,
	SHOWCASE_IMPLANT_ESTIMATE,
	SHOWCASE_PRESCRIPTION_PRESET,
	SHOWCASE_COPILOT_TASKS,
} from "../showcaseSeedData.js";
import {
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
} from "../demoConstants.js";

test("showcaseSeedData has high-fidelity clinical and marketing seed entities", () => {
	assert.ok(SHOWCASE_DOCTORS.length >= 4, "Должно быть не менее 4 врачей");
	const surgeon = SHOWCASE_DOCTORS.find((d) => d.specialization.includes("Хирург"));
	assert.ok(surgeon, "Хирург-имплантолог должен присутствовать");
	assert.ok(surgeon.avatarUrl.startsWith("http"), "Аватар хирурга должен быть заполнен");

	assert.equal(SHOWCASE_PATIENTS.length, 4, "Должно быть ровно 4 канонических пациента");
	assert.equal(SHOWCASE_PATIENTS[0]?.id, DEMO_PATIENT_1_ID);
	assert.equal(SHOWCASE_PATIENTS[0]?.fullName, "Смирнова Анна Сергеевна");
	assert.equal(SHOWCASE_PATIENTS[1]?.id, DEMO_PATIENT_2_ID);
	assert.equal(SHOWCASE_PATIENTS[1]?.fullName, "Воронов Дмитрий Игоревич");
	assert.equal(SHOWCASE_PATIENTS[2]?.id, DEMO_PATIENT_3_ID);
	assert.equal(SHOWCASE_PATIENTS[2]?.fullName, "Ковалева Елена Павловна");
	assert.equal(SHOWCASE_PATIENTS[3]?.id, DEMO_PATIENT_4_ID);
	assert.equal(SHOWCASE_PATIENTS[3]?.fullName, "Кузнецов Михаил Викторович");

	assert.equal(SHOWCASE_IMPLANT_ESTIMATE.patientId, DEMO_PATIENT_4_ID);
	assert.equal(SHOWCASE_IMPLANT_ESTIMATE.patientName, "Кузнецов Михаил Викторович");
	assert.ok(SHOWCASE_IMPLANT_ESTIMATE.items.length >= 3, "Смета на имплантацию должна содержать >= 3 позиций");
	assert.equal(SHOWCASE_IMPLANT_ESTIMATE.netTotalRub, 90000, "Чистая сумма сметы 90 000 руб");
	assert.ok(SHOWCASE_IMPLANT_ESTIMATE.items.every((it) => it.toothNumber === 46));

	assert.ok(SHOWCASE_PRESCRIPTION_PRESET.medications.length >= 2, "Рецептурный комплект содержит >= 2 препаратов");
	assert.ok(SHOWCASE_COPILOT_TASKS.length >= 2, "Задачи Copilot должны содержать рекаллы и сметы");
	assert.equal(SHOWCASE_COPILOT_TASKS[0]?.patientName, "Смирнова Анна Сергеевна");
	assert.equal(SHOWCASE_COPILOT_TASKS[1]?.patientName, "Кузнецов Михаил Викторович");
});

