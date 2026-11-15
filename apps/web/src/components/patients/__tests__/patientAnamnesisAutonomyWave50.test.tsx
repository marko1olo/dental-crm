import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { AllergyChipsGrid } from "../tabs/generalInfo/AllergyChipsGrid.js";
import { SomaticAnamnesisCard } from "../../clinical/SomaticAnamnesisCard.js";
import type { PatientClinicalSafetyProfile } from "../safetyMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("3. Somatic Anamnesis & Allergy Presets / Toggles (Canonical SSOT)", () => {
	const allergyGridPath = path.resolve(
		__dirname,
		"../tabs/generalInfo/AllergyChipsGrid.tsx",
	);
	const allergyGridSource = fs.readFileSync(allergyGridPath, "utf8");

	it("3.1. contains all 3 allergy preset buttons in source code with exact testids and min-h-[44px] sm:min-h-[32px]", () => {
		assert.ok(allergyGridSource.includes('data-testid="toggle-allergy-penicillin"'));
		assert.ok(allergyGridSource.includes('data-testid="toggle-allergy-nsaid"'));
		assert.ok(allergyGridSource.includes('data-testid="toggle-allergy-latex"'));

		assert.ok(allergyGridSource.includes('onToggleAllergy("hasPenicillinAllergy")'));
		assert.ok(allergyGridSource.includes('onToggleAllergy("hasNsaidAllergy")'));
		assert.ok(allergyGridSource.includes('onToggleAllergy("hasLatexAllergy")'));

		assert.ok(allergyGridSource.includes("min-h-[44px] sm:min-h-[32px]"));
	});

	it("3.2. contains interactive toggle for hasNsaidAllergy in AllergyChipsGrid", () => {
		assert.ok(allergyGridSource.includes('data-testid="toggle-allergy-nsaid"'));
		assert.ok(allergyGridSource.includes("НПВП / Аспирин"));
	});

	it("3.3. renders AllergyChipsGrid and outputs allergy toggle buttons in HTML", () => {
		const testProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
			hasPenicillinAllergy: false,
			hasLatexAllergy: false,
		};
		const html = renderToString(
			React.createElement(AllergyChipsGrid, {
				currentProfile: testProfile,
				disabled: false,
				onToggleAllergy: () => {},
				variant: "full",
			}),
		);

		assert.ok(html.includes('data-testid="toggle-allergy-penicillin"'));
		assert.ok(html.includes("Пенициллины"));
		assert.ok(html.includes('data-testid="toggle-allergy-nsaid"'));
		assert.ok(html.includes("НПВП / Аспирин"));
		assert.ok(html.includes('data-testid="toggle-allergy-latex"'));
		assert.ok(html.includes("Латекс"));
	});

	it("3.4. renders SomaticAnamnesisCard with canonical testid and physiological norm CTA", () => {
		const html = renderToString(
			React.createElement(SomaticAnamnesisCard, {
				patientId: "test-pat-50",
				patientName: "Смирнова Елена Дмитриевна",
			}),
		);

		assert.ok(html.includes('data-testid="somatic-anamnesis-card"'));
		assert.ok(html.includes('data-testid="mark-somatic-norm-btn"'));
		assert.ok(html.includes("Соматически здоров / норма"));
	});
});
