import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { VisitSurgeryProtocolTab } from "../VisitSurgeryProtocolTab";
import { SurgeryVisitCockpit } from "../SurgeryVisitCockpit";

describe("Visit Surgery Protocol & Cockpit (Visit Scope)", () => {
	it("1. VisitSurgeryProtocolTab renders with active tooth, 1-click norms and actions", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={46}
				patientName="Петров В. С."
				doctorName="Др. Соколов"
			/>,
		);

		assert.ok(html.includes("visit-surgery-protocol-tab"), "Must render container");
		assert.ok(html.includes("Хирургический протокол"), "Must show title");
		assert.ok(html.includes("46"), "Must display active tooth FDI 46");
		assert.ok(html.includes("btn-toggle-visit-sterile-mode"), "Must have sterile mode button");
		assert.ok(html.includes("btn-open-implant-passport-modal"), "Must have implant passport button");
		assert.ok(html.includes("btn-surgery-norm-surgery_implant_standard"), "Must have implant norm button");
		assert.ok(html.includes("btn-surgery-norm-surgery_extraction_simple"), "Must have extraction norm button");
		assert.ok(html.includes("btn-apply-to-visit-diary"), "Must have apply to diary button");
	});

	it("2. SurgeryVisitCockpit renders compact hot-path controls", () => {
		const html = renderToString(
			<SurgeryVisitCockpit
				activeTooth={36}
				patientName="Петров В. С."
			/>,
		);

		assert.ok(html.includes("surgery-visit-cockpit"), "Must render compact container");
		assert.ok(html.includes("36"), "Must show active tooth #36");
		assert.ok(html.includes("btn-cockpit-passport"), "Must have passport button");
		assert.ok(html.includes("btn-cockpit-full"), "Must have full cockpit button");
		assert.ok(html.includes("btn-quick-surgery-surgery_implant_standard"), "Must have quick implant button");
	});
});
