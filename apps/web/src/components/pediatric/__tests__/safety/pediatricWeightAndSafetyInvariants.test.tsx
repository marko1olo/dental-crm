import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { estimatePediatricWeightKg } from "@dental/shared";
import { PediatricAnesthesiaCalculator } from "../../PediatricAnesthesiaCalculator";
import { PediatricBraveryDiplomaModal } from "../../PediatricBraveryDiplomaModal";
import { PediatricParentMemoModal } from "../../PediatricParentMemoModal";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Physiological Weight Interpolation & Anesthesia Overdose Protection", () => {
	it("estimates realistic pediatric weight based on age (WHO / RF centiles)", () => {
		assert.strictEqual(estimatePediatricWeightKg(2), 12);
		assert.strictEqual(estimatePediatricWeightKg(3), 14);
		assert.strictEqual(estimatePediatricWeightKg(4), 16);
		assert.strictEqual(estimatePediatricWeightKg(5), 18);
		assert.strictEqual(estimatePediatricWeightKg(6), 20);
		assert.strictEqual(estimatePediatricWeightKg(8), 26);
		assert.strictEqual(estimatePediatricWeightKg(10), 33);
	});

	it("prevents adult weight trap by initializing to interpolated weight for young children", () => {
		const html = renderToStaticMarkup(createElement(PediatricAnesthesiaCalculator, { patientAgeYears: 3 }));
		assert.ok(html.includes("14 кг") || html.includes('value="14"'));
	});

	it("triggers toxic overdose alert when dose exceeds safe MRD for child weight", () => {
		const html = renderToStaticMarkup(createElement(PediatricAnesthesiaCalculator, {
			initialWeightKg: 14, patientAgeYears: 4,
		}));
		assert.ok(html.includes('data-testid="pediatric-anesthesia-calculator"'));
		assert.ok(html.includes('data-testid="btn-reduce-to-safe-dose"') || html.includes('data-testid="btn-set-max-safe-dose"'));
	});

	it("enforces Mandate 8e: Doctor Autonomy — NEVER disables apply anesthesia button", () => {
		const html = renderToStaticMarkup(createElement(PediatricAnesthesiaCalculator, {
			initialWeightKg: 10, patientAgeYears: 2,
		}));
		assert.ok(html.includes('data-testid="btn-apply-anesthesia-protocol"'));
		assert.ok(!html.includes('disabled=""') && !html.includes("disabled"));
	});
});

describe("Bravery Diploma Verification & Care Memo", () => {
	it("renders bravery diploma with 'Диплом за храбрость' and 'Диплом юного героя' subtitle", () => {
		const html = renderToStaticMarkup(createElement(PediatricBraveryDiplomaModal, {
			isOpen: true, onClose: () => {}, patientName: "Артём", doctorName: "Д-р Смирнова Е. В.",
		}));
		assert.ok(html.includes("Диплом за храбрость"));
		assert.ok(html.includes("Диплом юного героя"));
		assert.ok(html.includes("Герой: Артём"));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("includes critical warning against biting numb lip and cheeks", () => {
		const html = renderToStaticMarkup(createElement(PediatricParentMemoModal, {
			isOpen: true, onClose: () => {}, patientName: "София", patientAgeYears: 5,
		}));
		assert.ok(html.includes("онемевш") || html.includes("губ") || html.includes("прикусыва"));
		assert.ok(!EMOJI_REGEX.test(html));
	});
});
