import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	IntraoralScan3DViewerModal,
	build3DViewerIframeSrc,
} from "../IntraoralScan3DViewerModal.js";

describe("IntraoralScan3DViewerModal Component Specs", () => {
	test("IntraoralScan3DViewerModal is a valid React functional component", () => {
		assert.equal(typeof IntraoralScan3DViewerModal, "function");
	});

	test("build3DViewerIframeSrc returns default /viewer3d.html when no modelUrl is passed", () => {
		assert.equal(build3DViewerIframeSrc(), "/viewer3d.html");
	});

	test("build3DViewerIframeSrc correctly encodes modelUrl and format", () => {
		const src = build3DViewerIframeSrc("https://clinic.example.com/scans/arch.stl", "stl");
		assert.equal(
			src,
			"/viewer3d.html?model=https%3A%2F%2Fclinic.example.com%2Fscans%2Farch.stl&ext=stl",
		);
	});

	test("IntraoralScan3DViewerModal renders empty string when isOpen is false", () => {
		const html = renderToString(
			React.createElement(IntraoralScan3DViewerModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	test("IntraoralScan3DViewerModal renders dialog, patient badge and iframe when isOpen is true", () => {
		const html = renderToString(
			React.createElement(IntraoralScan3DViewerModal, {
				isOpen: true,
				onClose: () => {},
				modelUrl: "https://clinic.example.com/scans/mandible.ply",
				modelFormat: "ply",
				patientName: "Кузнецов А.В.",
			}),
		);
		assert.ok(html.includes('role="dialog"'));
		assert.ok(html.includes("Кузнецов А.В."));
		assert.ok(html.includes("viewer3d.html"));
		assert.ok(html.includes("ext=ply"));
	});
});
