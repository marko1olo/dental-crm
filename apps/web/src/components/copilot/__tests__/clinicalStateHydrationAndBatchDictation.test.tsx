/**
 * clinicalStateHydrationAndBatchDictation.test.tsx — Red Team тестирование
 * реактивной гидратации клинического состояния, пакетного осмотра и диктовки.
 * Мандаты 8e (автономия врача), 8am (1 Primary CTA), 8wy (честный продакшн).
 */

import React from "react";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { CopilotVisitClinicalDigest, normalizeToothStateKey } from "../CopilotVisitClinicalDigest";
import { handleClinicalSpeechOrText } from "../copilotDictationHandler";
import { useVisitStore } from "../../../store/visitStore";
import { saveStoredTeethData, clearStoredTeethData, loadStoredTeethData } from "../../odontogram/odontogramStorage";

describe("Red Team: Clinical State Hydration & Batch Dictation Suite", () => {
	const testPatientId = "pat-batch-101";

	beforeEach(() => {
		useVisitStore.setState({
			visitToothStateByCode: {},
			visitToothRecordsByCode: {},
			activeToothNumber: null,
		});
		clearStoredTeethData(testPatientId);
	});

	it("1. normalizeToothStateKey correctly maps Cyrillic and Latin states", () => {
		assert.equal(normalizeToothStateKey("Caries"), "caries");
		assert.equal(normalizeToothStateKey("кариес"), "caries");
		assert.equal(normalizeToothStateKey("Pulpitis"), "pulpitis");
		assert.equal(normalizeToothStateKey("пульпит"), "pulpitis");
		assert.equal(normalizeToothStateKey("Periodontitis"), "periodontitis");
		assert.equal(normalizeToothStateKey("коронка"), "crown");
		assert.equal(normalizeToothStateKey("имплант"), "implant");
		assert.equal(normalizeToothStateKey("удален"), "missing");
		assert.equal(normalizeToothStateKey("дефект пломбы"), "defective_restoration");
		assert.equal(normalizeToothStateKey("пломба"), "done");
	});

	it("2. Hydrates batch findings (>= 2 teeth) from persistent storage and renders Primary CTA", () => {
		saveStoredTeethData(
			testPatientId,
			[
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 36, state: "Pulpitis" },
				{ toothNumber: 47, state: "Defective_Restoration" },
			],
			true,
		);

		const html = renderToString(
			<CopilotVisitClinicalDigest
				patientId={testPatientId}
				onSendMessage={() => {}}
			/>,
		);

		assert.ok(html.includes("copilot-visit-digest-batch"), "Должен отображаться батч-дайджест");
		assert.ok(html.includes("Результаты осмотра визита"), "Должен быть заголовок результатов осмотра");
		assert.ok(html.includes("На одонтограмме отмечено <!-- -->3<!-- --> зуба(ов)"), "Должно быть указано 3 зуба");
		assert.ok(html.includes(">16<"), "Должен присутствовать зуб 16");
		assert.ok(html.includes(">36<"), "Должен присутствовать зуб 36");
		assert.ok(html.includes(">47<"), "Должен присутствовать зуб 47");
		assert.ok(html.includes("K02.1"), "Должен быть код K02.1");
		assert.ok(html.includes("K04.0"), "Должен быть код K04.0");
		assert.ok(html.includes("Оформить приём по всем зубам (SOAP + Смета)"), "Должна быть Primary CTA кнопка");
		assert.ok(!html.includes("disabled"), "Кнопки не должны быть disabled");
	});

	it("3. Single tooth finding renders targeted protocol and single CTA", () => {
		useVisitStore.setState({
			visitToothStateByCode: { "36": "caries" },
			visitToothRecordsByCode: {
				"36": {
					toothNumber: 36,
					state: "caries",
					diagnosis: "Кариес дентина",
					diagnosisIcd10: "K02.1",
					treatmentPlan: "Препарирование полости, пломбирование нанокомпозитом",
				},
			},
			activeToothNumber: 36,
		});

		const html = renderToString(
			<CopilotVisitClinicalDigest
				activeTooth={36}
				onSendMessage={() => {}}
			/>,
		);

		assert.ok(html.includes("copilot-visit-digest-single"), "Должен отображаться одиночный дайджест");
		assert.ok(html.includes("K02.1"), "Должен быть код K02.1");
		assert.ok(
			html.includes("Оформить зуб") && html.includes("36") && html.includes("(SOAP + Смета)"),
			"Должна быть кнопка для зуба 36",
		);
		assert.ok(!html.includes("disabled"), "Кнопки не должны быть disabled");
	});

	it("4. Empty state is hidden when showEmptyStateIfNoFindings is false", () => {
		const html = renderToString(
			<CopilotVisitClinicalDigest
				onSendMessage={() => {}}
				showEmptyStateIfNoFindings={false}
			/>,
		);
		assert.equal(html, "");
	});

	it("5. Dictation handler processes speech, updates visit store, and persists patient odontogram", () => {
		const dictation = "36 глубокий кариес, анестезия септанест, биодентин, пломба эстелайт а3, зуб 16 кариес в план";
		const res = handleClinicalSpeechOrText(dictation, testPatientId, 36);

		assert.ok(res.intent.detectedTeeth.includes(36), "Зуб 36 должен быть обнаружен");
		assert.ok(res.intent.detectedTeeth.includes(16), "Зуб 16 должен быть обнаружен");

		const visitStates = useVisitStore.getState().visitToothStateByCode;
		assert.equal(visitStates["36"], "caries");
		assert.equal(visitStates["16"], "caries");

		const stored = loadStoredTeethData(testPatientId);
		assert.ok(stored, "Одонтограмма пациента должна быть сохранена");
		assert.ok(stored?.some((t) => t.toothNumber === 36), "Зуб 36 должен быть в сохраненной одонтограмме");
		assert.ok(stored?.some((t) => t.toothNumber === 16), "Зуб 16 должен быть в сохраненной одонтограмме");
	});

	it("6. Dictation handler with trustLevel: 'supervised' defers mutation and returns pendingAction with execute callback", () => {
		const dictation = "46 глубокий кариес дентина";
		const res = handleClinicalSpeechOrText(dictation, testPatientId, 46, { trustLevel: "supervised" });

		assert.equal(res.appliedImmediately, false, "В режиме supervised мутация НЕ должна применяться сразу");
		assert.ok(res.pendingAction, "Должно быть возвращено отложенное действие pendingAction");
		assert.equal(res.pendingAction?.toolName, "crm.updateToothStatus");
		assert.ok(res.pendingAction?.description.includes("46"));

		// Проверяем, что в store изменения ЕЩЕ не записались
		const beforeStates = useVisitStore.getState().visitToothStateByCode;
		assert.equal(beforeStates["46"], undefined, "До подтверждения врача статус зуба 46 не должен меняться");

		// Врач нажимает Primary CTA «Применить в карту»
		res.pendingAction?.execute();

		// После выполнения execute изменения применились
		const afterStates = useVisitStore.getState().visitToothStateByCode;
		assert.equal(afterStates["46"], "caries", "После execute статус зуба 46 должен стать caries");
	});

	it("7. Dictation handler with trustLevel: 'autonomous' applies immediately", () => {
		const dictation = "24 пульпит, анестезия";
		const res = handleClinicalSpeechOrText(dictation, testPatientId, 24, { trustLevel: "autonomous" });

		assert.equal(res.appliedImmediately, true, "В режиме autonomous действие применяется мгновенно");
		assert.equal(res.pendingAction, undefined, "В режиме autonomous отложенное действие не блокирует интерфейс");

		const visitStates = useVisitStore.getState().visitToothStateByCode;
		assert.equal(visitStates["24"], "pulpitis", "Статус зуба 24 должен быть зафиксирован как pulpitis");
	});
});
