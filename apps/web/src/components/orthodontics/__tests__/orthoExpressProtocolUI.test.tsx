import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthodonticVisitProtocolWidget } from "../OrthodonticVisitProtocolWidget";
import { OrthoDiagnosticsSection } from "../OrthoDiagnosticsSection";
import { ArchwireSelector, ARCHWIRE_MATERIALS } from "../orthodonticVisitProtocol/ArchwireSelector";
import { ElasticTractionMatrix } from "../orthodonticVisitProtocol/ElasticTractionMatrix";

describe("Red Team Ortho Express Protocol UI & Ergonomics (Mandates 8e, 8am)", () => {
	it("renders exactly ONE Primary CTA button for committing the orthodontic protocol", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientName="Тестов Тест Тестович"
			/>,
		);

		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""), "Bottom commit button must be rendered");
		assert.ok(
			html.includes("Зафиксировать ортодонтический протокол"),
			"Primary CTA button must say 'Зафиксировать ортодонтический протокол'",
		);
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
});
