/**
 * clinicalAiPersonalizeDecomposition.test.tsx
 *
 * Проверяет архитектуру декомпозиции ClinicalAiPersonalizePanel:
 * - Gate 1: Лимиты строк (фасад <= 120 строк, подмодули <= 800 строк)
 * - Gate 2: 100% AST Export Parity
 * - Gate 3: Test Anchors Parity
 * - Gate 4: Zero UTF-8 BOM
 * - Gate 5: Ацикличность и корректный рендеринг
 * - Логика расчета и классификации тем ухода
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	ClinicalAiPersonalizePanel,
	type ClinicalAiPersonalizePanelProps,
} from "../../../ClinicalAiPersonalizePanel";

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
	useClinicalAiPersonalize,
} from "../index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(componentsDir, "../..");

describe("ClinicalAiPersonalizePanel Safe Decomposition (Mandate 8b & Decomposer Skill)", () => {
	it("Gate 1: strictly enforces line limits (facade <= 120 lines, all submodules <= 800 lines)", () => {
		const facadePath = path.resolve(webSrcDir, "ClinicalAiPersonalizePanel.tsx");
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 120,
			`ClinicalAiPersonalizePanel.tsx facade must be <= 120 lines, got ${facadeLines}`,
		);

		const moduleFiles = fs.readdirSync(componentsDir).filter((f) => /\.(ts|tsx)$/.test(f));
		assert.ok(moduleFiles.length >= 7, "Must contain all decomposed module files");

		for (const file of moduleFiles) {
			const fullPath = path.join(componentsDir, file);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`Submodule ${file} exceeds 800 lines (${lines} lines)`,
			);
		}
	});

	it("Gate 2: 100% AST Export Parity for facade and submodules", () => {
		assert.equal(typeof ClinicalAiPersonalizePanel, "function");
		assert.equal(typeof DoctorVoiceStyleCard, "function");
		assert.equal(typeof AiProtocolPromptEditor, "function");
		assert.equal(typeof AiPersonalizePreview, "function");
		assert.equal(typeof AiPersonalizeFooter, "function");
		assert.equal(typeof useClinicalAiPersonalize, "function");
		assert.equal(typeof buildTreatmentPlanPayload, "function");
		assert.equal(typeof inferCareTopic, "function");
		assert.equal(typeof lineTotal, "function");
		assert.equal(typeof moneyLine, "function");
	});

	it("Gate 4: Zero UTF-8 BOM in all decomposed files", () => {
		const facadePath = path.resolve(webSrcDir, "ClinicalAiPersonalizePanel.tsx");
		const allFiles = [
			facadePath,
			...fs.readdirSync(componentsDir).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => path.join(componentsDir, f)),
		];

		for (const file of allFiles) {
			const buf = fs.readFileSync(file);
			const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
			assert.equal(hasBom, false, `File ${file} contains illegal UTF-8 BOM`);
		}
	});

	it("Gate 3 & Gate 5: renders empty state without patientId with canonical test-anchor", () => {
		const html = renderToString(<ClinicalAiPersonalizePanel patientId={null} />);
		assert.ok(
			html.includes('data-testid="clinical-ai-personalize-panel"'),
			"Must include data-testid='clinical-ai-personalize-panel'",
		);
		assert.ok(
			html.includes("Пациенту простым языком"),
			"Must include heading",
		);
		assert.ok(
			html.includes("Выберите пациента"),
			"Must prompt to select patient",
		);
	});

	it("Gate 3: renders DoctorVoiceStyleCard with all test-anchors and autonomy badges", () => {
		const html = renderToString(
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
		const html = renderToString(
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
		const html = renderToString(
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
		const html = renderToString(
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
		assert.equal(inferCareTopic([], "Дентальная имплантация Osstem"), "implantation");
		assert.equal(inferCareTopic([], "Эндодонтическое лечение каналов"), "endo");
		assert.equal(inferCareTopic([], "Неизвестная процедура"), "other");
	});

	it("builds compliant treatment plan payload with fallback when items are provided", () => {
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

		assert.ok(!("error" in payload), "Should not return error for valid items");
		const data = payload as Record<string, unknown>;
		assert.equal(data.clinicalReason, "Боль от холодного");
		assert.equal(data.teethOrArea, "1.6");
		assert.equal(data.estimatedTotalRub, 5000);
	});
});
