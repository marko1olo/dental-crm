import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCephalometrics,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	generateForm043OrthodonticProtocolText,
} from "../cephalometricMath";

describe("Orthodontic TRG Clinical Protocol Synthesis & Reset", () => {
	it("generates comprehensive orthodontic clinical protocol ready for 1-click chart insertion", () => {
		const analysis = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET);
		const protocolText = generateForm043OrthodonticProtocolText(analysis, {
			patientName: "Барабаш Сергей Владимирович",
			doctorName: "Д-р Смирнова Е. А.",
		});

		assert.ok(protocolText.includes("Медицинская карта пациента"));
		assert.ok(protocolText.includes("Барабаш Сергей Владимирович"));
		assert.ok(protocolText.includes("Steiner"));
		assert.ok(protocolText.includes("Tweed"));
		assert.ok(protocolText.includes("SNA:"));
		assert.ok(protocolText.includes("SNB:"));
		assert.ok(protocolText.includes("ANB:"));
		assert.ok(protocolText.includes("ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):"));
	});

	it("gracefully clears all landmarks when reset is triggered, returning to pristine manual state", () => {
		const emptyAnalysis = calculateCephalometrics({});
		assert.equal(emptyAnalysis.placedCount, 0);
		assert.equal(emptyAnalysis.isComplete, false);
		assert.equal(emptyAnalysis.completionPercentage, 0);
		assert.equal(emptyAnalysis.diagnosis.skeletalClass, "Undefined");
		assert.ok(emptyAnalysis.diagnosis.summaryRu.includes("расставьте все анатомические реперные точки"));
	});
});
