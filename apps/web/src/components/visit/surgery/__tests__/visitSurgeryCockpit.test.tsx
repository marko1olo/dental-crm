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
		assert.ok(html.includes("btn-quick-standard-implantation"), "Must have 1-click express implant preset button");
		assert.ok(html.includes("btn-quick-surgery-surgery_apicoectomy"), "Must have apicoectomy norm button");
	});

	it("3. VisitSurgeryProtocolTab renders 1-click implant presets and apicoectomy norm", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={21}
				patientName="Иванова А. П."
			/>,
		);

		assert.ok(html.includes("btn-preset-standard-implant-tab"), "Must have standard implant preset button");
		assert.ok(html.includes("btn-surgery-norm-surgery_apicoectomy"), "Must have apicoectomy norm button");
		assert.ok(html.includes("btn-implant-system-Dentium"), "Must have Dentium selector");
		assert.ok(html.includes("btn-implant-system-Straumann"), "Must have Straumann selector");
		assert.ok(html.includes("btn-implant-torque-35"), "Must have 35 N/cm selector");
		assert.ok(html.includes("btn-implant-cap-fdm"), "Must have FDM selector");
	});

	it("4. buildStandardImplantationProtocolText produces compliant clinical Form 043/u text", async () => {
		const { buildStandardImplantationProtocolText } = await import("../../../surgery/surgeryProtocols");
		const text = buildStandardImplantationProtocolText({
			toothFdi: 36,
			brand: "Dentium",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isq: 72,
			capType: "fdm",
			sutureMaterial: "Prolene 4-0",
			postOpXray: true,
		});

		assert.ok(text.includes("зуба FDI #36"), "Must include tooth FDI");
		assert.ok(text.includes("Dentium"), "Must include brand");
		assert.ok(text.includes("35 Н/см"), "Must include torque 35 N/cm");
		assert.ok(text.includes("ISQ 72"), "Must include ISQ 72");
		assert.ok(text.includes("формирователь десны (ФДМ)"), "Must include FDM");
		assert.ok(text.includes("Prolene 4-0"), "Must include suture Prolene 4-0");
		assert.ok(text.includes("контрольный прицельный радиовизиографический снимок"), "Must include X-ray control");
	});
});
