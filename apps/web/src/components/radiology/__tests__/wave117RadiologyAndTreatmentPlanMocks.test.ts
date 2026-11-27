import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DirectRvgCaptureModal } from "../DirectRvgCaptureModal";
import { HotFolderIntakeModal } from "../HotFolderIntakeModal";
import { CbctVolume3DViewport } from "../mpr/CbctVolume3DViewport";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

describe("Wave 117: Eradication of Synthetic Demo Names in Production Radiology Render", () => {
	it("isDemoShowcaseMode() defaults to false in headless/production test runtime", () => {
		assert.strictEqual(isDemoShowcaseMode(), false);
	});

	it("DirectRvgCaptureModal renders without synthetic placeholder names when patientName/doctorName omitted", () => {
		const html = renderToStaticMarkup(
			React.createElement(DirectRvgCaptureModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html.includes("Смирнова Екатерина Васильевна"), false);
		assert.strictEqual(html.includes("Смирнов Алексей Петрович"), false);
	});

	it("HotFolderIntakeModal renders without synthetic placeholder names", () => {
		const html = renderToStaticMarkup(
			React.createElement(HotFolderIntakeModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html.includes("Смирнова Екатерина Васильевна"), false);
		assert.strictEqual(html.includes("Смирнов Алексей Петрович"), false);
	});

	it("CbctVolume3DViewport renders without synthetic patient names", () => {
		const html = renderToStaticMarkup(
			React.createElement(CbctVolume3DViewport, {
				volume: null,
				forceHibernated: true,
			}),
		);
		assert.strictEqual(html.includes("Иванов И.И."), false);
		assert.strictEqual(html.includes("Смирнова Е. В."), false);
	});
});
