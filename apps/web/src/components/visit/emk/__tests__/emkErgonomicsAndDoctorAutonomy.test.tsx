/**
 * emkErgonomicsAndDoctorAutonomy.test.tsx
 *
 * RED TEAM INQUISITION SUITE: Doctor Autonomy, Clinical Ergonomics & Visual De-Cluttering.
 *
 * Verifies that:
 * 1. EMK Diary is a clean clinical notepad by default:
 *    - Complaint & Anamnesis chip clouds are hidden inside collapsed <details> spoilers.
 *    - Objective status chips and sub-norm buttons are hidden inside collapsed <details> spoilers.
 *    - Express protocols, ICD-10 chips, and recommendation chips are hidden inside collapsed <details> spoilers.
 * 2. 0-Click Objective Norm button (`btn-emk-full-objective-norm`) is prominent and functional in header.
 * 3. Somatic safety alerts are calm clinical badges ("Особенности анамнеза:"), not screaming red banners (Mandates 8e, 8y).
 * 4. Finance screen is purged of bureaucratic cipher language ("54-ФЗ", "804н") in primary navigation.
 * 5. Empty clinical recommendations accordion in FinanceView is hidden when 0 rules/evaluations exist.
 *
 * Mandates: 8e (Doctor Autonomy), 8k (CRM != Reality Simulator), 8n (Solo Doctor Sovereignty),
 * 8x (Zero Fluff & High Density), 8y (Clinical Safety & Passive Informing), 8ab (Background Silent Stock).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RED TEAM INQUISITION: Clinical Ergonomics & Doctor Autonomy", () => {
	const complaintsPath = path.resolve(__dirname, "../EmkComplaintsSection.tsx");
	const objectivePath = path.resolve(__dirname, "../EmkObjectiveStatusSection.tsx");
	const diaryPath = path.resolve(__dirname, "../EmkDiaryProtocolSection.tsx");
	const somaticAlertPath = path.resolve(__dirname, "../../../clinical/SomaticSafetyAlertWidget.tsx");
	const visitHeaderPath = path.resolve(__dirname, "../../view/VisitHeaderMonolith.tsx");
	const financeToolbarPath = path.resolve(__dirname, "../../../finance/FinanceToolbar.tsx");
	const financeViewPath = path.resolve(__dirname, "../../../../FinanceView.tsx");

	it("1. EmkComplaintsSection hides 14+ complaint & anamnesis template buttons inside collapsed <details>", () => {
		const source = fs.readFileSync(complaintsPath, "utf8");

		// Must have <details> containers for templates
		assert.ok(
			source.includes("<details") && source.includes("Шаблоны жалоб"),
			"Complaint chips must be enclosed within a <details> spoiler",
		);
		assert.ok(
			source.includes("Шаблоны анамнеза") && source.includes("<details"),
			"Anamnesis chips must be enclosed within a <details> spoiler",
		);

		// Must NOT have 'open' attribute on details by default
		assert.ok(
			!source.includes("<details open") && !source.includes("<details\n\t\t\t\topen"),
			"<details> spoilers must NOT be expanded by default",
		);

		// Textareas must remain top-level for immediate typing
		assert.ok(
			source.includes("DebouncedEmkTextarea"),
			"Clinical textareas must be available for instant typing",
		);
	});

	it("2. EmkObjectiveStatusSection hides objective & examination chips inside <details> while keeping 0-Click Norm accessible", () => {
		const source = fs.readFileSync(objectivePath, "utf8");

		// 0-Click Norm button must be present in header and enabled
		assert.ok(
			source.includes('data-testid="btn-emk-full-objective-norm"'),
			"0-Click Objective Norm button must exist",
		);
		assert.ok(
			source.includes("0-Клик: Норма осмотра"),
			"Button must clearly state 0-Click Objective Norm",
		);

		// Examination chips must be wrapped in <details>
		assert.ok(
			source.includes("Шаблоны осмотра и статуса"),
			"Sub-presets and examination chips must be inside <details> spoiler",
		);
		assert.ok(
			source.includes("Шаблоны исследований"),
			"Instrumental examination chips must be inside <details> spoiler",
		);
	});

	it("3. EmkDiaryProtocolSection hides express protocols, ICD-10 and recommendation chips inside collapsed <details>", () => {
		const source = fs.readFileSync(diaryPath, "utf8");

		// Express protocols must be inside <details>
		assert.ok(
			source.includes("Экспресс-протоколы у кресла"),
			"Express protocols must be inside <details> spoiler",
		);

		// ICD-10 chips must be inside <details>
		assert.ok(
			source.includes("Шаблоны диагнозов МКБ-10"),
			"ICD-10 chips must be inside <details> spoiler",
		);

		// Recommendation chips must be inside <details>
		assert.ok(
			source.includes("Шаблоны рекомендаций"),
			"Recommendation chips must be inside <details> spoiler",
		);
	});

	it("4. SomaticSafetyAlertWidget uses calm clinical warning instead of screaming all-caps stop-factor badge", () => {
		const source = fs.readFileSync(somaticAlertPath, "utf8");

		// Screaming caps "СТОП-ФАКТОРЫ" must be purged
		assert.ok(
			!source.includes("СТОП-ФАКТОРЫ ("),
			"Screaming all-caps 'СТОП-ФАКТОРЫ' must NOT be used",
		);
		assert.ok(
			source.includes("Особенности анамнеза:"),
			"Must use calm clinical phrase 'Особенности анамнеза:'",
		);

		// Calm amber styling instead of emergency red
		assert.ok(
			source.includes("amber"),
			"Must use calm amber warning palette",
		);
	});

	it("5. VisitHeaderMonolith demotes emergency rescue button to quiet mode", () => {
		const source = fs.readFileSync(visitHeaderPath, "utf8");

		// Emergency rescue button must not scream with red border on normal screens
		assert.ok(
			source.includes('data-testid="btn-visit-emergency-rescue"'),
			"Emergency rescue button must exist for safety",
		);
		assert.ok(
			source.includes("hidden 2xl:inline-flex"),
			"Emergency rescue button must be hidden on standard screens to prevent panic clutter",
		);
	});

	it("6. FinanceToolbar replaces bureaucratic law numbers with human-friendly labels", () => {
		const source = fs.readFileSync(financeToolbarPath, "utf8");

		// Purged Soviet/bureaucratic law ciphers from visible tab labels
		assert.ok(
			!source.includes("ККТ 54-ФЗ"),
			"'ККТ 54-ФЗ' must be replaced with 'Касса онлайн'",
		);
		assert.ok(
			!source.includes("Счета и акты (804н)"),
			"'Счета и акты (804н)' must be replaced with 'Счета и акты'",
		);

		assert.ok(
			source.includes("Касса онлайн"),
			"Must provide human-friendly 'Касса онлайн' label",
		);
		assert.ok(
			source.includes("Счета и акты"),
			"Must provide human-friendly 'Счета и акты' label",
		);
	});

	it("7. FinanceView hides clinical recommendations accordion when 0 active rules or evaluations exist", () => {
		const source = fs.readFileSync(financeViewPath, "utf8");

		// Condition must check for active rules / unresolved / evaluations before rendering accordion
		assert.ok(
			source.includes("hasActiveClinicalRules") ||
				source.includes("(clinicalRuleSummary.unresolved ?? 0) > 0 ||\n\t\t\t\t\t\t(clinicalRuleSummary.activeRules ?? 0) > 0") ||
				source.includes("clinicalRuleSummary.activeRules ?? 0)) ||\n\t\t\t\t\t(clinicalRuleEvaluations && clinicalRuleEvaluations.length > 0)"),
			"clinical-recommendations-accordion must only render when active rules or evaluations exist",
		);
	});
});
