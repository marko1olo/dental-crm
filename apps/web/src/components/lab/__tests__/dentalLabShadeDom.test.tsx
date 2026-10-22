import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabShadeSelector } from "../DentalLabShadeSelector";

describe("Dental Lab 3D Shade — DOM Rendering", () => {
	it("8. DentalLabShadeSelector component renders all VITA systems and 3-zone stratification in DOM", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		let root: Root | null = null;
		await act(async () => {
			root = createRoot(container as any);
			root.render(
				<DentalLabShadeSelector
					shadeSystem="classical"
					setShadeSystem={() => {}}
					shadeClassical="A2"
					setShadeClassical={() => {}}
					shade3dMaster="2M2"
					setShade3dMaster={() => {}}
					shadeBleach="0M1"
					setShadeBleach={() => {}}
					shadeCervical="A3"
					setShadeCervical={() => {}}
					shadeBody="A2"
					setShadeBody={() => {}}
					shadeIncisal="A1"
					setShadeIncisal={() => {}}
					shadeStump="ND2"
					setShadeStump={() => {}}
					translucency="HT"
					setTranslucency={() => {}}
					mamelons={true}
					setMamelons={() => {}}
					calcifications={false}
					setCalcifications={() => {}}
					setAttachedImageUrl={() => {}}
				/>,
			);
		});

		assert.ok(findNodeByTestId(container, "shade-system-classical-btn"));
		assert.ok(findNodeByTestId(container, "shade-system-3dmaster-btn"));
		assert.ok(findNodeByTestId(container, "shade-system-bleach-btn"));

		assert.ok(findNodeByTestId(container, "vita-classical-group-A"));
		assert.ok(findNodeByTestId(container, "vita-classical-group-B"));
		assert.ok(findNodeByTestId(container, "vita-classical-group-C"));
		assert.ok(findNodeByTestId(container, "vita-classical-group-D"));

		assert.ok(findNodeByTestId(container, "3zone-stratification-container"));

		assert.ok(findNodeByTestId(container, "stump-shade-container"));
		assert.ok(findNodeByTestId(container, "stump-shade-ND1"));
		assert.ok(findNodeByTestId(container, "stump-shade-ND2"));
		assert.ok(findNodeByTestId(container, "stump-shade-ND9"));

		assert.ok(findNodeByTestId(container, "translucency-HT"));
		assert.ok(findNodeByTestId(container, "mamelons-checkbox"));
		assert.ok(findNodeByTestId(container, "calcifications-checkbox"));

		assert.ok(findNodeByTestId(container, "shade-selector-file-input"));
		assert.ok(findNodeByTestId(container, "shade-selector-sample-photo-btn"));

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});
});
