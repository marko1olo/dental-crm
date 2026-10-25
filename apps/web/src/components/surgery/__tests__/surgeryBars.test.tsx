/**
 * surgeryBars.test.tsx — Тесты панелей экстракции, синус-лифтинга и имплантации (Мандаты 8e, 8x, 8z).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

describe("Surgery Clinical Bars (Extraction, Sinus/GBR, Implants)", () => {
	it("1. renders VisitSurgeryExtractionBar with 1-click uncomplicated norm and chips", async () => {
		const { VisitSurgeryExtractionBar } = await import("../../visit/surgery/VisitSurgeryExtractionBar");
		const html = renderToString(
			<VisitSurgeryExtractionBar
				effectiveTooth={38}
				patientName="Иванов Петр"
				doctorName="Др. Соколов"
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-extraction-bar"));
		assert.ok(html.includes("btn-uncomplicated-extraction-norm"));
		assert.ok(html.includes("btn-copy-post-op-memo"));
		assert.ok(html.includes("btn-extraction-complexity-simple"));
		assert.ok(html.includes("btn-extraction-complexity-complex"));
		assert.ok(html.includes("btn-extraction-complexity-impacted_dystopic"));
		assert.ok(html.includes("btn-hemostasis-alvogyl"));
		assert.ok(html.includes("btn-hemostasis-hemostatic_sponge"));
		assert.ok(html.includes("btn-hemostasis-vicryl_suture"));
		assert.ok(html.includes("btn-hemostasis-tampon"));
	});

	it("2. renders VisitSurgerySinusGbrBar with graft selection and membrane options", async () => {
		const { VisitSurgerySinusGbrBar } = await import("../../visit/surgery/VisitSurgerySinusGbrBar");
		const html = renderToString(
			<VisitSurgerySinusGbrBar
				effectiveTooth={16}
				isClosedSinus={false}
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-sinus-gbr-bar"));
		assert.ok(html.includes("btn-uncomplicated-gbr-norm"));
		assert.ok(html.includes("Bio-Oss 0.5г"));
		assert.ok(html.includes("Cerabone"));
		assert.ok(html.includes("SureOss"));
		assert.ok(html.includes("Аутокость"));
		assert.ok(html.includes("Bio-Gide 25×25"));
		assert.ok(html.includes("Jason"));
		assert.ok(html.includes("Cytoplast"));
		assert.ok(html.includes("btn-toggle-titanium-pins"));
	});

	it("3. renders VisitSurgeryImplantBar with extended brands", async () => {
		const { VisitSurgeryImplantBar } = await import("../../visit/surgery/VisitSurgeryImplantBar");
		const html = renderToString(
			<VisitSurgeryImplantBar
				implantBrand="Dentium"
				setImplantBrand={() => {}}
				implantDiameter={4.0}
				setImplantDiameter={() => {}}
				implantLength={10.0}
				setImplantLength={() => {}}
				implantTorque={35}
				setImplantTorque={() => {}}
				implantIsq={72}
				setImplantIsq={() => {}}
				implantCap="fdm"
				setImplantCap={() => {}}
				implantSuture="Prolene 4-0"
				setImplantSuture={() => {}}
				onApplyPreset={() => {}}
			/>,
		);

		assert.ok(html.includes("btn-preset-standard-implant-tab"));
		assert.ok(html.includes("btn-implant-system-Dentium"));
		assert.ok(html.includes("btn-implant-system-Osstem"));
		assert.ok(html.includes("btn-implant-system-Straumann"));
	});
});
