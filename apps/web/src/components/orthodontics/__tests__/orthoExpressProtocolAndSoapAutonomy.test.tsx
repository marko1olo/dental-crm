import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthodonticVisitProtocolWidget } from "../OrthodonticVisitProtocolWidget";
import { OrthoDiagnosticsSection } from "../OrthoDiagnosticsSection";
import { ArchwireSelector, ARCHWIRE_MATERIALS } from "../orthodonticVisitProtocol/ArchwireSelector";
import { ElasticTractionMatrix, ELASTIC_SCHEMES } from "../orthodonticVisitProtocol/ElasticTractionMatrix";
import { synthesizeOrthodonticProtocolText } from "../orthoProtocolSynthesis";
import { cephAiInferenceService } from "../cephAiInferenceService";

describe("Red Team Ortho Express Protocol, Zero-Simulators & SOAP Transfer (Mandates 8e, 8am, 8x)", () => {
	it("renders exactly ONE Primary CTA button for committing the orthodontic protocol", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientName="Тестов Тест Тестович"
			/>,
		);

		// Must contain the dedicated commit button with correct title & text
		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""), "Bottom commit button must be rendered");
		assert.ok(
			html.includes("Зафиксировать ортодонтический протокол"),
			"Primary CTA button must say 'Зафиксировать ортодонтический протокол'",
		);

		// Header button must be secondary, not competing with primary CTA
		assert.ok(html.includes("data-testid=\"apply-to-form-043-btn\""), "Header quick action must be rendered");
	});

	it("renders 1-click Angle skeletal class options (I, II/1, II/2, III) and bite pathology norm", () => {
		const html = renderToString(
			<OrthoDiagnosticsSection
				angleClass="class_1"
				setAngleClass={() => {}}
				onSetAngleClassNorm={() => {}}
				sagittalAnomaly="norm"
				setSagittalAnomaly={() => {}}
				sagittalGapMm={2}
				setSagittalGapMm={() => {}}
				verticalAnomaly="norm"
				setVerticalAnomaly={() => {}}
				transversalAnomaly="norm"
				setTransversalAnomaly={() => {}}
				onSetOcclusionNorm={() => {}}
				tmjStatus="norm"
				setTmjStatus={() => {}}
				onSetTmjNorm={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"angle-class-norm-1click-btn\""), "1-click Angle norm button must exist");
		assert.ok(html.includes("data-testid=\"angle-class-class_1-btn\""), "Angle Class I button must exist");
		assert.ok(html.includes("data-testid=\"angle-class-class_2_div_1-btn\""), "Angle Class II/1 button must exist");
		assert.ok(html.includes("data-testid=\"angle-class-class_2_div_2-btn\""), "Angle Class II/2 button must exist");
		assert.ok(html.includes("data-testid=\"angle-class-class_3-btn\""), "Angle Class III button must exist");

		assert.ok(html.includes("data-testid=\"occlusion-norm-1click-btn\""), "1-click Occlusion norm button must exist");
		assert.ok(html.includes("data-testid=\"tmj-norm-1click-btn\""), "1-click TMJ norm button must exist");
	});

	it("renders workhorse archwires and elastics traction matrix without disabled buttons", () => {
		const archwireHtml = renderToString(
			<ArchwireSelector
				archwireMaterial="NiTi"
				setArchwireMaterial={() => {}}
				archwireSection=".016"
				setArchwireSection={() => {}}
				onSelectWorkhorseArchwire={() => {}}
				torquePreset="damon_std"
				setTorquePreset={() => {}}
				angulationPreset="norm"
				setAngulationPreset={() => {}}
			/>,
		);

		assert.ok(archwireHtml.includes("data-testid=\"ortho-workhorse-wires-strip\""), "Workhorse wires must exist");
		for (const mat of ARCHWIRE_MATERIALS) {
			assert.ok(archwireHtml.includes(mat.badge), `Archwire material ${mat.badge} must be present`);
		}

		const elasticsHtml = renderToString(
			<ElasticTractionMatrix
				elasticScheme="none"
				setElasticScheme={() => {}}
				elasticSize="fox_3_16"
				setElasticSize={() => {}}
			/>,
		);

		assert.ok(elasticsHtml.includes("data-testid=\"quick-elastics-chips\""), "1-click elastics chips must exist");
		assert.ok(elasticsHtml.includes("data-testid=\"quick-elastic-class_ii-btn\""), "Class II chip must exist");
		assert.ok(elasticsHtml.includes("data-testid=\"quick-elastic-class_iii-btn\""), "Class III chip must exist");
		assert.ok(elasticsHtml.includes("data-testid=\"quick-elastic-vertical_box-btn\""), "Vertical box chip must exist");
	});

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

		// Must have clear SOAP structure
		assert.ok(protocol.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА"));
		assert.ok(protocol.includes("1. ЖАЛОБЫ"));
		assert.ok(protocol.includes("2. ОБЪЕКТИВНЫЙ СТАТУС"));
		assert.ok(protocol.includes("3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ"));
		assert.ok(protocol.includes("4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ"));

		// Must include clinical orthodontic findings
		assert.ok(protocol.includes("Прикус (классификация Энгля): I класс по Энглю"));
		assert.ok(protocol.includes("NiTi"));
		assert.ok(protocol.includes(".016"));
		assert.ok(protocol.includes("Межчелюстные эластики"));

		// Mandate 8x: living Russian clinical language without raw bureaucratic law codes in note
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
		assert.ok(duration < 100, `Inference should be instant (<100ms), took ${duration}ms`);
		assert.ok(result.landmarks);
		assert.equal(Object.keys(result.landmarks).length, 16);
		assert.ok(result.landmarks.S);
		assert.ok(result.landmarks.N);
		assert.ok(result.landmarks.A);
		assert.ok(result.landmarks.B);
	});
});
