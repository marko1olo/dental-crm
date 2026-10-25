import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { synthesizeOrthodonticProtocolText } from "../orthoProtocolSynthesis";
import { cephAiInferenceService } from "../cephAiInferenceService";

describe("Red Team Ortho SOAP Transfer & Ceph Autonomy (Mandates 8e, 8x)", () => {
	it("synthesizes structured SOAP orthodontic visit notes without bureaucratic numbers", () => {
		const protocol = synthesizeOrthodonticProtocolText({
			patientName: "Иванова Мария",
			notes: "Плановая смена дуг на верхнем и нижнем зубном ряду",
			angleClass: "class_1",
			anbClass: "class_1",
			anbAngle: 2.0,
			sagittalAnomaly: "norm",
			sagittalGapMm: 2,
			verticalAnomaly: "norm",
			transversalAnomaly: "norm",
			tmjStatus: "norm",
			isPhotoProtocolCompleted: true,
			bracketSlot: "0.022",
			bracketSystem: "damon_q2",
			archwireMaterial: "NiTi",
			archwireSection: ".016",
			targetArch: "both",
			elasticScheme: "class_ii",
			elasticSize: "rabbit_3_16",
			elasticWear: "22 часа/сутки",
			selectedActions: ["wire_change"],
			selectedTeeth: [16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26],
			powerChainSpan: "13-23",
			powerChainType: "short",
			activePreset: null,
			activeAttachmentPreset: null,
			alignerSetIssued: null,
			plateActivationTurns: 0,
			torquePreset: "damon_std",
			angulationPreset: "norm",
			isSplitArchAligners: false,
			alignerStep: 0,
			alignerTotal: 0,
			alignerStepUpper: 0,
			alignerTotalUpper: 0,
			alignerStepLower: 0,
			alignerTotalLower: 0,
			alignerProgressPercent: 0,
			nextAlignerDateStr: "22.11.2026",
			alignerDaysPerStep: 14,
		});

		assert.ok(protocol.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА"));
		assert.ok(protocol.includes("1. ЖАЛОБЫ"));
		assert.ok(protocol.includes("2. ОБЪЕКТИВНЫЙ СТАТУС"));
		assert.ok(protocol.includes("3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ"));
		assert.ok(protocol.includes("4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ"));
		assert.ok(protocol.includes("Прикус (классификация Энгля): I класс по Энглю"));
		assert.ok(protocol.includes("NiTi"));
		assert.ok(protocol.includes(".016"));
		assert.ok(protocol.includes("Межчелюстные эластики"));
		assert.ok(!protocol.includes("Приказ 804н"), "Must not leak raw order numbers");
		assert.ok(!protocol.includes("Форма 043/у"), "Must not leak raw 043/u order numbers");
	});

	it("runs cephalometric inference instantly without WebGPU crash or tab hang", async () => {
		const startTime = Date.now();
		const result = await cephAiInferenceService.runInference("sample_test_path.png", {
			targetImageWidth: 1200,
			targetImageHeight: 896,
		});
		const duration = Date.now() - startTime;
		assert.ok(result.landmarks, "Result must contain landmarks");
		assert.ok(Object.keys(result.landmarks).length > 0, "Landmarks must be non-empty");
		assert.ok(duration < 1000, `Inference took ${duration}ms, must finish under 1000ms`);
	});
});
