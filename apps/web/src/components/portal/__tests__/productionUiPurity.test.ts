/**
 * Production UI Purity & Dev Leaks Purge Unit Tests (Wave 106 -> Part 6G Real SUT SSR)
 * (Supreme Law: THE HAMMER, Mandate 8p, Mandate 8d)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicBookingPage } from "../../../pages/PublicBookingPage";
import { PatientCabinetModal } from "../patientCabinet/PatientCabinetModal";
import { ChairsideSurgeryHubModal } from "../../surgery/ChairsideSurgeryHubModal";
import { MdlpScanningModal } from "../../mdlp/MdlpScanningModal";
import { SeniorNurseDisposalActModal } from "../../mdlp/SeniorNurseDisposalActModal";

const FORBIDDEN_DEV_PHRASES = [
	"Тестовый код: 7788",
	"Тестовый код:",
	"7788 для тестового",
	'placeholder="7788"',
	"Тест задержки накладной",
	"btn-toggle-overdraft-test",
	"Снять овердрафт",
	"Тест связи",
	"Тестовые образцы",
	"mdlp-crpt-test-btn",
	"mdlp-sample-strip",
	"Тест ПКУ",
	"+ Ультракаин форте",
	"+ Скандонест",
	"быстрым тестом выше",
] as const;

describe("Production UI Purity & Dev Leaks Purge (Wave 106 — Real SSR Renders)", () => {
	it("1. PublicBookingPage renders without 7788 test code exposures", () => {
		const html = renderToStaticMarkup(
			React.createElement(PublicBookingPage, { organizationId: "org-test-1" }),
		);
		assert.ok(html.length > 0);
		for (const phrase of FORBIDDEN_DEV_PHRASES) {
			assert.equal(html.includes(phrase), false, `PublicBookingPage must not expose '${phrase}'`);
		}
	});

	it("2. PatientCabinetModal renders without 7788 test code hints", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientCabinetModal, { isOpen: true, onClose: () => {} }),
		);
		assert.ok(html.length > 0);
		for (const phrase of FORBIDDEN_DEV_PHRASES) {
			assert.equal(html.includes(phrase), false, `PatientCabinetModal must not expose '${phrase}'`);
		}
	});

	it("3. ChairsideSurgeryHubModal renders without debug overdraft toggle button", () => {
		const html = renderToStaticMarkup(
			React.createElement(ChairsideSurgeryHubModal, {
				isOpen: true,
				onClose: () => {},
				inventoryOverdraftActive: false,
			}),
		);
		assert.ok(html.length > 0);
		for (const phrase of FORBIDDEN_DEV_PHRASES) {
			assert.equal(html.includes(phrase), false, `ChairsideSurgeryHubModal must not expose '${phrase}'`);
		}
	});

	it("4. MdlpScanningModal renders clean scanner instruction without 'Тест связи' or sample chips", () => {
		const html = renderToStaticMarkup(
			React.createElement(MdlpScanningModal, { isOpen: true, onClose: () => {} }),
		);
		assert.ok(html.includes("Поднесите 2D-сканер к коду DataMatrix на упаковке"));
		for (const phrase of FORBIDDEN_DEV_PHRASES) {
			assert.equal(html.includes(phrase), false, `MdlpScanningModal must not expose '${phrase}'`);
		}
	});

	it("5. SeniorNurseDisposalActModal renders clean empty state without 'Тест ПКУ' or demo drug chips", () => {
		const html = renderToStaticMarkup(
			React.createElement(SeniorNurseDisposalActModal, {
				isOpen: true,
				onClose: () => {},
				items: [],
			}),
		);
		assert.ok(html.length > 0);
		for (const phrase of FORBIDDEN_DEV_PHRASES) {
			assert.equal(html.includes(phrase), false, `SeniorNurseDisposalActModal must not expose '${phrase}'`);
		}
	});
});
