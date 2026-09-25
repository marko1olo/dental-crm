/**
 * apps/web/src/components/clinical/__tests__/SomaticSafetyAlertWidget.test.tsx
 *
 * Exhaustive Unit Tests for SomaticSafetyAlertWidget.tsx.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (0-click physiological norm by default, 0 disabled buttons).
 * - Mandate 8i: Ambulatory Dental Context (Strictly 5 real dental stop-factors:
 *   1. Local anesthetics & antibiotics allergy
 *   2. Cardiovascular / adrenaline ban
 *   3. Anticoagulants / bleeding risk
 *   4. Bisphosphonates / osteonecrosis MRONJ
 *   5. Diabetes & pregnancy)
 * - Mandate 8k: Friction-Killer Law (Zero-click norm, quiet green status by default).
 * - Mandate 8s: Anti-Bloat & Single Canonical Engine (@dental/shared).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { SomaticSafetyAlertWidget } from "../SomaticSafetyAlertWidget";

// Mandate 8d item 7 cartoon emoji regex
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("SomaticSafetyAlertWidget (Mandates 8e, 8i, 8k, 8s, 8d)", () => {
	// =========================================================================================================
	// 1. 0-КЛИК «СОМАТИЧЕСКИ ЗДОРОВ / НОРМА» ПО УМОЛЧАНИЮ (СПОКОЙНЫЙ ЗЕЛЕНЫЙ СТАТУС БЕЗ ШУМА)
	// =========================================================================================================
	describe("1. 0-Click 'Соматически здоров / норма' Default Ergonomics", () => {
		it("renders calm green 1-click norm button when patient has no inputs (null/undefined)", () => {
			const htmlNull = renderToString(<SomaticSafetyAlertWidget patient={null} />);
			assert.ok(htmlNull.includes('data-testid="btn-somatic-norm-one-click"'));
			assert.ok(htmlNull.includes("Соматически здоров / норма"));
			assert.ok(htmlNull.includes("text-emerald-700"));
			assert.ok(!htmlNull.includes("somatic-safety-alert-badge"));
			assert.ok(!htmlNull.includes("somatic-safety-alert-popover"));

			const htmlUndef = renderToString(<SomaticSafetyAlertWidget patient={undefined} />);
			assert.ok(htmlUndef.includes('data-testid="btn-somatic-norm-one-click"'));
			assert.ok(htmlUndef.includes("text-emerald-700"));
			assert.ok(!htmlUndef.includes("somatic-safety-alert-badge"));
		});

		it("renders calm green norm when patient anamnesis is explicit negation (отрицает, норма, —)", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget patient="Соматически здоров. Аллергоанамнез не отягощен." />,
			);
			assert.ok(html.includes('data-testid="btn-somatic-norm-one-click"'));
			assert.ok(html.includes("text-emerald-700"));
			assert.ok(!html.includes("somatic-safety-alert-badge"));
		});
	});

	// =========================================================================================================
	// 2. 5 РЕАЛЬНЫХ СТОМАТОЛОГИЧЕСКИХ СТОП-ФАКТОРОВ
	// =========================================================================================================
	describe("2. 5 Core Dental Stop-Factors Alerts", () => {
		// Стоп-фактор 1: Аллергия на анестетики (Артикаин, Лидокаин) и антибиотики
		it("Stop 1: renders red alert badge for Articaine allergy", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget patient={{ hasArticaineAllergy: true }} />,
			);
			assert.ok(html.includes('data-testid="somatic-safety-alert-badge"'));
			assert.ok(html.includes('data-testid="visit-focus-allergy-alert"'));
			assert.ok(html.includes("АЛЛЕРГИЯ"));
			assert.ok(html.includes("Артикаин"));
		});

		// Стоп-фактор 2: Кардио / запрет адреналина (криз, инфаркт < 6 мес)
		it("Stop 2: renders red alert badge for hypertensive crisis with adrenaline ban", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget patient={{ hasHypertensiveCrisisHistory: true }} />,
			);
			assert.ok(html.includes('data-testid="somatic-safety-alert-badge"'));
			assert.ok(html.includes('data-testid="visit-focus-cvd-alert"'));
			assert.ok(html.includes("ССЗ"));
			assert.ok(html.includes("ЗАПРЕТ АДРЕНАЛИНА 1:100 000"));
		});

		// Стоп-фактор 3: Антикоагулянты / риск кровотечения
		it("Stop 3: renders red alert badge for Warfarin / Anticoagulants with bleeding risk", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget
					patient={{ takesAnticoagulants: true, anticoagulantName: "Варфарин" }}
				/>,
			);
			assert.ok(html.includes('data-testid="somatic-safety-alert-badge"'));
			assert.ok(html.includes('data-testid="visit-focus-anticoagulant-alert"'));
			assert.ok(html.includes("РИСК КРОВОТЕЧЕНИЯ"));
			assert.ok(html.includes("Варфарин"));
		});

		// Стоп-фактор 4: Бисфосфонаты / риск остеонекроза MRONJ
		it("Stop 4: renders red alert badge for Zometa / Bisphosphonates with MRONJ risk", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget
					patient={{ takesBisphosphonates: true, bisphosphonateName: "Зомета" }}
				/>,
			);
			assert.ok(html.includes('data-testid="somatic-safety-alert-badge"'));
			assert.ok(html.includes('data-testid="visit-focus-bisphosphonates-alert"'));
			assert.ok(html.includes("ОСТЕОНЕКРОЗА ЧЕЛЮСТИ"));
			assert.ok(html.includes("MRONJ"));
		});

		// Стоп-фактор 5: Диабет декомпенсированный / Беременность (щадящая анестезия)
		it("Stop 5A: renders alert badge for decompensated diabetes", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget patient={{ isDiabetesDecompensated: true }} />,
			);
			assert.ok(html.includes('data-testid="somatic-safety-alert-badge"'));
			assert.ok(html.includes('data-testid="visit-focus-diabetes-alert"'));
			assert.ok(html.includes("ДЕКОМПЕНСИРОВАННЫЙ"));
		});

		it("Stop 5B: renders alert badge for pregnancy trimester 1 with gentle anesthesia", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget patient={{ pregnancyTrimester: "trimester_1" }} />,
			);
			assert.ok(html.includes('data-testid="somatic-safety-alert-badge"'));
			assert.ok(html.includes('data-testid="visit-focus-pregnancy-alert"'));
			assert.ok(html.includes("Беременность (1 триместр"));
		});
	});

	// =========================================================================================================
	// 3. ДОКТОРСКАЯ АВТОНОМИЯ: СНЯТИЕ СТОП-ФАКТОРОВ В 1 КЛИК
	// =========================================================================================================
	describe("3. Doctor Autonomy Confirmation", () => {
		it("clears alerts when doctor explicitly confirmed norm via isSomaticNormConfirmed", () => {
			const html = renderToString(
				<SomaticSafetyAlertWidget
					patient={{
						hasArticaineAllergy: true,
						isSomaticNormConfirmed: true,
					}}
				/>,
			);
			assert.ok(html.includes('data-testid="btn-somatic-norm-one-click"'));
			assert.ok(!html.includes('data-testid="somatic-safety-alert-badge"'));
		});
	});

	// =========================================================================================================
	// 4. СВЯТОСТЬ МЕДИЦИНСКИХ ЗАПИСЕЙ (НОЛЬ ЭМОДЗИ — МАНДАТ 8d п. 7)
	// =========================================================================================================
	describe("4. Sanctity of Medical Records (Zero Cartoon Emojis)", () => {
		it("contains zero cartoon emojis across all rendered states", () => {
			const states = [
				<SomaticSafetyAlertWidget key="1" patient={null} />,
				<SomaticSafetyAlertWidget key="2" patient={{ hasArticaineAllergy: true }} />,
				<SomaticSafetyAlertWidget key="3" patient={{ hasHypertensiveCrisisHistory: true }} />,
				<SomaticSafetyAlertWidget key="4" patient={{ takesAnticoagulants: true }} />,
				<SomaticSafetyAlertWidget key="5" patient={{ takesBisphosphonates: true }} />,
				<SomaticSafetyAlertWidget key="6" patient={{ pregnancyTrimester: "trimester_3" }} />,
			];

			for (const state of states) {
				const html = renderToString(state);
				assert.strictEqual(hasCartoonEmojis(html), false);
			}
		});
	});
});
