import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	OrthopedicsChairsidePanel,
	STANDARD_ZTL_ORDER_PRESETS,
	VITA_3D_MASTER_SHADE_GROUPS,
} from "../OrthopedicsChairsidePanel";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	VITA_SHADE_GROUPS,
} from "../orthopedicProtocols";

describe("OrthopedicsChairsidePanel — EMR & Chairside Autonomy (Mandates 8d, 8e, 8i, 8k, 8n)", () => {
	it("renders OrthopedicsChairsidePanel with panel title and stage 3 binding", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes("Ортопедия у кресла (043/у · Этап 3 · ЗТЛ)"), "Must render panel header");
		assert.ok(html.includes("1-клик протоколы · Приказ 804н · Автономия врача (Мандат 8e)"), "Must state Mandate 8e autonomy");
		assert.ok(html.includes('data-testid="orthopedics-chairside-panel"'), "Must contain root testid");
	});

	it("renders all 4 canonical orthopedic protocols with 1-click action buttons", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.strictEqual(ORTHOPEDIC_CANONICAL_PROTOCOLS.length, 4, "Must contain exactly 4 protocols");
		for (const proto of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
			assert.ok(html.includes(proto.shortLabel), `Must render label for ${proto.shortLabel}`);
			assert.ok(html.includes(proto.defaultIcd10), `Must render ICD-10 for ${proto.defaultIcd10}`);
			assert.ok(html.includes(`data-testid="apply-ortho-protocol-${proto.id}"`), `Must render apply button for ${proto.id}`);
		}
	});

	it("renders 1-click ZTL order presets with authentic dental materials", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.strictEqual(STANDARD_ZTL_ORDER_PRESETS.length, 4, "Must export 4 ZTL presets");
		for (const preset of STANDARD_ZTL_ORDER_PRESETS) {
			assert.ok(html.includes(preset.name), `Must render preset name ${preset.name}`);
			assert.ok(html.includes(preset.badge), `Must render preset badge ${preset.badge}`);
			assert.ok(html.includes(`data-testid="ztl-preset-${preset.id}"`), `Must render testid for ${preset.id}`);
		}
	});

	it("renders VITA Classical and VITA 3D-Master shade systems tabs", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="vita-classical-tab"'), "Must render VITA Classical tab");
		assert.ok(html.includes('data-testid="vita-3d-master-tab"'), "Must render VITA 3D-Master tab");
		assert.ok(html.includes("VITA Classical"), "Must contain text VITA Classical");
		assert.ok(html.includes("VITA 3D-Master"), "Must contain text VITA 3D-Master");

		// Default shade Classical A2
		assert.ok(html.includes('data-testid="vita-shade-A2"'), "Must render A2 shade button");
		assert.ok(html.includes('data-testid="vita-shade-BL1"'), "Must render Bleach BL1 shade button");
	});

	it("renders Doctor Clinical Override button for advance < 50% without modal gates (Mandate 8e)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(
			html.includes('data-testid="doctor-clinical-override-toggle"'),
			"Must render doctor clinical override toggle",
		);
		assert.ok(
			html.includes("Клинический оверрайд (Аванс &lt; 50%)") || html.includes("Клинический оверрайд"),
			"Must display override button text",
		);
		assert.ok(
			html.includes('data-testid="direct-send-lab-order-btn"'),
			"Must render 1-click send to ZTL button",
		);
	});

	it("enforces touch target ergonomics with min-h-[48px] on interactive buttons", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		// Verify touch target class min-h-[48px] is applied to key buttons
		assert.ok(html.includes("min-h-[48px]"), "All buttons must enforce min-h-[48px]");
	});

	it("strictly complies with Mandate 8d p. 7 (Zero cartoon emojis in clinical documents/panels)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(html), "OrthopedicsChairsidePanel must contain 0 cartoon emojis");
	});
});
