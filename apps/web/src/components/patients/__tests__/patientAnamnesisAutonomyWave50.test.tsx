import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientAnamnesisModal } from "../PatientAnamnesisModal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("3. PatientAnamnesisModal UI Presets & Toggles", () => {
	const anamnesisModalPath = path.resolve(__dirname, "../PatientAnamnesisModal.tsx");
	const anamnesisModalSource = fs.readFileSync(anamnesisModalPath, "utf8");

	it("3.1. contains all 3 allergy preset buttons in source code with exact testids and min-h-[44px] sm:min-h-[32px]", () => {
		assert.ok(anamnesisModalSource.includes('data-testid="preset-allergy-penicillin"'));
		assert.ok(anamnesisModalSource.includes('data-testid="preset-allergy-nsaid"'));
		assert.ok(anamnesisModalSource.includes('data-testid="preset-allergy-latex"'));

		assert.ok(anamnesisModalSource.includes('applyPreset("allergy_penicillin")'));
		assert.ok(anamnesisModalSource.includes('applyPreset("allergy_nsaid")'));
		assert.ok(anamnesisModalSource.includes('applyPreset("allergy_latex")'));

		assert.ok(
			anamnesisModalSource.includes(
				"min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300",
			),
		);
	});

	it("3.2. contains interactive toggle for hasNsaidAllergy in block 1 (Critical Stop Factors)", () => {
		assert.ok(anamnesisModalSource.includes('data-testid="toggle-nsaid-allergy"'));
		assert.ok(anamnesisModalSource.includes('updateField("hasNsaidAllergy", !profile.hasNsaidAllergy)'));
		assert.ok(anamnesisModalSource.includes("Аллергия на НПВП (Аспирин, Кеторол, Ибупрофен)"));
	});

	it("3.3. renders PatientAnamnesisModal and outputs preset buttons and toggle in HTML", () => {
		const html = renderToString(
			React.createElement(PatientAnamnesisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "test-pat-50",
				patientName: "Смирнова Елена Дмитриевна",
			}),
		);

		assert.ok(html.includes('data-testid="preset-allergy-penicillin"'));
		assert.ok(html.includes("+ Пенициллины"));
		assert.ok(html.includes('data-testid="preset-allergy-nsaid"'));
		assert.ok(html.includes("+ НПВП / Аспирин"));
		assert.ok(html.includes('data-testid="preset-allergy-latex"'));
		assert.ok(html.includes("+ Латекс"));

		assert.ok(html.includes('data-testid="toggle-nsaid-allergy"'));
		assert.ok(html.includes("Аллергия на НПВП (Аспирин, Кеторол, Ибупрофен)"));
	});

	it("3.4. applies allergy presets in applyPreset implementation", () => {
		assert.ok(anamnesisModalSource.includes('case "allergy_penicillin":'));
		assert.ok(anamnesisModalSource.includes("hasPenicillinAllergy: true"));
		assert.ok(anamnesisModalSource.includes('case "allergy_nsaid":'));
		assert.ok(anamnesisModalSource.includes("hasNsaidAllergy: true"));
		assert.ok(anamnesisModalSource.includes('case "allergy_latex":'));
		assert.ok(anamnesisModalSource.includes("hasLatexAllergy: true"));
	});
});
