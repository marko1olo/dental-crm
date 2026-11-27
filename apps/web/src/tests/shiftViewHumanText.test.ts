import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientCockpitEmpty } from "../shiftViewModules/PatientCockpitEmpty";
import { PatientCockpitInfoCard } from "../shiftViewModules/PatientCockpitInfoCard";
import { PatientCockpitInsightPanel } from "../shiftViewModules/PatientCockpitInsightPanel";
import {
	getAppointmentCabinetName,
	type CockpitPatient,
	type CockpitPatientInsight,
} from "../shiftViewModules/shiftViewTypes";
import {
	buildOfflineVisitDraftFromTranscript,
	patientInsightRiskLabels,
	recommendedActionPriorityLabels,
	visitSaveReceiptText,
} from "../appHelpers/appointmentHelpers";

describe("ShiftView & PatientCockpit: live Russian clinical language & rendering", () => {
	it("PatientCockpitEmpty renders human Russian empty-state prompts without dev jargon", () => {
		const html = renderToStaticMarkup(React.createElement(PatientCockpitEmpty));
		assert.ok(html.includes("Пациент не выбран"));
		assert.ok(html.includes("Выбрать пациента"));
		assert.ok(html.includes("Открыть записи"));
		assert.equal(/undefined|null|NaN|043\/у/i.test(html), false);
	});

	it("PatientCockpitInfoCard renders full patient demographics and tabular phone formatting", () => {
		const patient: CockpitPatient = {
			id: "pat-123456-abc",
			fullName: "Смирнов Алексей Петрович",
			birthDate: "1988-04-12",
			phone: "+79991234567",
			notes: "Аллергии не выявлены",
		};
		const html = renderToStaticMarkup(
			React.createElement(PatientCockpitInfoCard, { activePatient: patient }),
		);
		assert.ok(html.includes("Смирнов Алексей Петрович"));
		assert.ok(html.includes("карта № pat-12"));
		assert.ok(html.includes("Дата рождения:"));
		assert.ok(html.includes("Телефон:"));
		assert.ok(html.includes("Аллергии не выявлены"));
		assert.ok(html.includes("tabular-nums"));
	});

	it("PatientCockpitInsightPanel maps riskLevel to Russian clinical labels (срочно/контроль/спокойно)", () => {
		const insightHigh: CockpitPatientInsight = {
			patientId: "pat-1",
			riskLevel: "high",
			nextBestAction: "Связаться по оплате и плану лечения",
			balanceDueRub: 12500,
			openTasks: 2,
			missingDocumentKinds: ["consent_intervention"],
			recallDueAt: "2026-12-01T10:00:00.000Z",
		};
		const htmlHigh = renderToStaticMarkup(
			React.createElement(PatientCockpitInsightPanel, { activePatientInsight: insightHigh }),
		);
		assert.ok(htmlHigh.includes(patientInsightRiskLabels.high));
		assert.ok(htmlHigh.includes("Связаться по оплате и плану лечения"));
		assert.ok(htmlHigh.includes("Долг"));
		assert.ok(htmlHigh.includes("на связь"));
		assert.ok(htmlHigh.includes("не хватает"));
		assert.equal(htmlHigh.includes("043/у"), false);

		assert.strictEqual(patientInsightRiskLabels.low, "спокойно");
		assert.strictEqual(patientInsightRiskLabels.watch, "контроль");
		assert.strictEqual(patientInsightRiskLabels.high, "срочно");
		assert.strictEqual(recommendedActionPriorityLabels.routine, "план");
		assert.strictEqual(recommendedActionPriorityLabels.important, "важно");
	});

	it("visitSaveReceiptText, buildOfflineVisitDraftFromTranscript, and getAppointmentCabinetName behave cleanly", () => {
		const duplicateText = visitSaveReceiptText({
			status: "duplicate",
			serverRevision: 7,
			savedAt: "2026-11-27T10:00:00.000Z",
		});
		assert.ok(duplicateText.includes("дубль не создан"));
		assert.ok(duplicateText.includes("7"));

		const warningText = visitSaveReceiptText({
			status: "accepted",
			serverRevision: 8,
			savedAt: "2026-11-27T10:05:00.000Z",
			warning: "Частичный черновик сохранён",
		});
		assert.ok(warningText.includes("Частичный черновик сохранён"));

		const savedText = visitSaveReceiptText({
			status: "accepted",
			serverRevision: 9,
			savedAt: "2026-11-27T10:10:00.000Z",
		});
		assert.ok(savedText.includes("Сервер подтвердил сохранение"));
		assert.ok(savedText.includes("версия карты 9"));

		const draft = buildOfflineVisitDraftFromTranscript(
			"Пациент жалуется на боль в зубе 36 от холодного.",
			"therapist",
		);
		assert.ok(draft.complaint || draft.objectiveStatus || draft.treatmentPlan);

		assert.strictEqual(getAppointmentCabinetName(null), "Кабинет №1");
		assert.strictEqual(getAppointmentCabinetName({ cabinetName: "  Хирургия №2  " }), "Хирургия №2");
		assert.strictEqual(getAppointmentCabinetName({ room: "Ортопедия" }), "Ортопедия");
	});
});
