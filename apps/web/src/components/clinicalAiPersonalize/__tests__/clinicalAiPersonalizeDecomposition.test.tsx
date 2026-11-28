/**
 * clinicalAiPersonalizeDecomposition.test.tsx (6G Live SUT)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ClinicalAiPersonalizePanel } from "../../../ClinicalAiPersonalizePanel";
import {
	AiPersonalizeFooter,
	AiPersonalizePreview,
	AiProtocolPromptEditor,
	DoctorVoiceStyleCard,
	buildTreatmentPlanPayload,
	inferCareTopic,
	lineTotal,
	loadDoctorAiPersonalizeSettings,
	moneyLine,
	resetDoctorAiPersonalizeSettings,
	saveDoctorAiPersonalizeSettings,
	DEFAULT_DOCTOR_VOICE_SETTINGS,
	DEFAULT_PROMPT_SETTINGS,
	STANDARD_PROTOCOL_TEMPLATES,
} from "../index";

describe("ClinicalAiPersonalizePanel Safe Decomposition (6G Live SUT)", () => {
	it("Gate 1 & Gate 2: moneyLine formatting, protocol templates, and doctor settings persistence behave deterministically", () => {
		assert.ok(moneyLine(5000).includes("5"));
		assert.ok(moneyLine(5000).includes("₽"));
		assert.ok(STANDARD_PROTOCOL_TEMPLATES.length >= 3);

		const initial = loadDoctorAiPersonalizeSettings();
		assert.equal(initial.voice.tone, DEFAULT_DOCTOR_VOICE_SETTINGS.tone);

		const saved = saveDoctorAiPersonalizeSettings({
			voice: { ...DEFAULT_DOCTOR_VOICE_SETTINGS, highlightAllergies: false },
			prompt: DEFAULT_PROMPT_SETTINGS,
		});
		assert.equal(saved.voice.highlightAllergies, false);

		const reset = resetDoctorAiPersonalizeSettings();
		assert.equal(reset.voice.highlightAllergies, DEFAULT_DOCTOR_VOICE_SETTINGS.highlightAllergies);
	});

	it("Gate 3 & Gate 5: renders empty state without patientId with canonical test-anchor and zero emojis", () => {
		const html = renderToStaticMarkup(<ClinicalAiPersonalizePanel patientId={null} />);
		assert.ok(
			html.includes('data-testid="clinical-ai-personalize-panel"'),
			"Must include data-testid='clinical-ai-personalize-panel'",
		);
		assert.ok(html.includes("Пациенту простым языком"), "Must include heading");
		assert.ok(html.includes("Выберите пациента"), "Must prompt to select patient");
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false);
	});

	it("Gate 3: renders DoctorVoiceStyleCard with all test-anchors and autonomy badges", () => {
		const html = renderToStaticMarkup(
			<DoctorVoiceStyleCard
				settings={DEFAULT_DOCTOR_VOICE_SETTINGS}
				onChange={() => {}}
			/>,
		);
		assert.ok(html.includes('data-testid="doctor-voice-style-card"'));
		assert.ok(html.includes('data-testid="conciseness-select"'));
		assert.ok(html.includes('data-testid="xray-detail-select"'));
		assert.ok(html.includes('data-testid="mkb10-mode-select"'));
		assert.ok(html.includes('data-testid="tone-select"'));
		assert.ok(html.includes('data-testid="highlight-allergies-checkbox"'));
		assert.ok(html.includes('data-testid="auto-complaints-checkbox"'));
		assert.ok(html.includes("Автономия врача"));
	});

	it("Gate 3: renders AiProtocolPromptEditor with template selector and custom vocab", () => {
		const html = renderToStaticMarkup(
			<AiProtocolPromptEditor
				promptSettings={DEFAULT_PROMPT_SETTINGS}
				onChange={() => {}}
			/>,
		);
		assert.ok(html.includes('data-testid="ai-protocol-prompt-editor"'));
		assert.ok(html.includes('data-testid="protocol-template-select"'));
		assert.ok(html.includes('data-testid="system-instructions-textarea"'));
		assert.ok(html.includes('data-testid="clinical-triggers-input"'));
		assert.ok(html.includes('data-testid="custom-vocabulary-input"'));
		assert.ok(html.includes("Терапия: Лечение кариеса"));
	});

	it("Gate 3: renders AiPersonalizePreview with sample clinical case and test-anchor", () => {
		const html = renderToStaticMarkup(
			<AiPersonalizePreview
				doctorVoice={DEFAULT_DOCTOR_VOICE_SETTINGS}
				planResult={null}
				postResult={null}
				copied={null}
				onCopy={() => {}}
			/>,
		);
		assert.ok(html.includes('data-testid="ai-personalize-preview"'));
		assert.ok(html.includes("Тестовый клинический случай"));
		assert.ok(html.includes("Зуб 2.6"));
	});

	it("Gate 3: renders AiPersonalizeFooter with non-blocking buttons and zero dev-jargon", () => {
		const html = renderToStaticMarkup(
			<AiPersonalizeFooter
				planLoading={false}
				postLoading={false}
				onRunPlan={() => {}}
				onRunPost={() => {}}
				onSaveSettings={() => {}}
				onResetSettings={() => {}}
			/>,
		);
		assert.ok(html.includes('data-testid="ai-personalize-plan-btn"'));
		assert.ok(html.includes('data-testid="ai-personalize-post-btn"'));
		assert.ok(html.includes('data-testid="ai-save-style-btn"'));
		assert.ok(html.includes('data-testid="ai-reset-style-btn"'));
		assert.ok(html.includes("Объяснить план пациенту"));
		assert.ok(html.includes("Памятка после приёма"));
		assert.ok(html.includes("Сохранить стиль"));
		assert.ok(html.includes("Сброс к эталону клинических рекомендаций"));
		assert.equal(html.includes('disabled=""'), false);
	});

	it("calculates lineTotal safely without multiplying negative or invalid quantities", () => {
		assert.equal(lineTotal({ unitPriceRub: 1000, quantity: 2, discountRub: 200 }), 1800);
		assert.equal(lineTotal({ unitPriceRub: 1000, quantity: 0, discountRub: 0 }), 0);
		assert.equal(lineTotal({ unitPriceRub: 1000, quantity: -1, discountRub: 0 }), 0);
		assert.equal(lineTotal({ unitPriceRub: 1000, quantity: 1.5, discountRub: 0 }), 0);
	});

	it("classifies post-visit care topics accurately from procedure descriptions", () => {
		assert.equal(inferCareTopic([], "Профессиональная гигиена и Air Flow"), "hygiene");
		assert.equal(inferCareTopic([], "Сложное удаление зуба 3.8"), "extraction");
		assert.equal(inferCareTopic([], "Дентальная имплантация верхней челюсти"), "implantation");
		assert.equal(inferCareTopic([], "Эндодонтическое лечение каналов"), "endo");
		assert.equal(inferCareTopic([], "Неизвестная процедура"), "other");
	});

	it("builds compliant treatment plan payload and returns structured error when no procedures exist", () => {
		const payload = buildTreatmentPlanPayload({
			items: [
				{
					snapshotServiceName: "Лечение глубокого кариеса",
					toothCode: "1.6",
					unitPriceRub: 5000,
					quantity: 1,
					status: "planned",
				},
			],
			scenarios: [],
			complaint: "Боль от холодного",
			diagnosis: "К02.1 Кариес дентина",
			treatmentPlanText: null,
			doctorFullName: "Иванов И.И.",
		});

		assert.equal("error" in payload, false, "Should not return error for valid items");
		if ("error" in payload) {
			assert.fail("Unexpected error payload");
		}
		assert.equal(payload.clinicalReason, "Боль от холодного");
		assert.equal(payload.teethOrArea, "1.6");
		assert.equal(payload.estimatedTotalRub, 5000);

		const emptyPayload = buildTreatmentPlanPayload({
			items: [],
			scenarios: [],
			complaint: "",
			diagnosis: "",
			treatmentPlanText: null,
			doctorFullName: "Иванов И.И.",
		});
		assert.equal("error" in emptyPayload, true);
	});
});
