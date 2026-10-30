/**
 * toothClinicalProtocolBilling.test.tsx
 *
 * Targeted Unit & Integration Test Suite for:
 * 1-Click Chairside Clinical Treatment Protocol & Visit Billing
 * (VisitClinicalToothTabs.tsx -> useVisitStore.ts -> Chairside Billing)
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (1-click batch protocol addition without bureaucratic friction).
 * - Mandate 8k: CRM != Reality Simulator (Express clinical packages directly into visit billing).
 * - Mandate 8d: Touch-First & Ergonomics (>= 38px desktop, >= 44px touch targets).
 * - Mandate 8d: Zero Cartoon Emojis (Strictly Lucide vector icons).
 * - Anti-Bird-Language Invariant: Zero dev-jargon or regulatory codes in user-facing button labels.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	VisitClinicalToothTabs,
	TOOTH_CLINICAL_PROTOCOLS,
	type ToothClinicalProtocol,
} from "../view/VisitClinicalToothTabs";
import { useVisitStore } from "../../../store/visitStore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

// Bird-language detector: strict ban on dev-jargon and regulatory codes in UI
const BIRD_LANGUAGE_REGEX =
	/(?:мандат|мандеит|ффд\s*1\.2|ккт\s*54|54-фз|804н\s*в\s*счет|1-клик\s*допуск|без\s*\d+\s*чекбокс)/i;

describe("Clinical Treatment Protocols & Tooth Billing Integration", () => {
	it("TOOTH_CLINICAL_PROTOCOLS dictionary contains all 4 primary clinical pathologies", () => {
		assert.ok(TOOTH_CLINICAL_PROTOCOLS.caries, "Caries protocol must exist");
		assert.ok(TOOTH_CLINICAL_PROTOCOLS.pulpitis, "Pulpitis protocol must exist");
		assert.ok(
			TOOTH_CLINICAL_PROTOCOLS.extraction,
			"Extraction protocol must exist",
		);
		assert.ok(TOOTH_CLINICAL_PROTOCOLS.hygiene, "Hygiene protocol must exist");
	});

	it("Caries protocol (K02.1) has correct 804n services and totals 6 700 ₽", () => {
		const proto = TOOTH_CLINICAL_PROTOCOLS.caries;
		assert.equal(proto.key, "caries");
		assert.equal(proto.diagnosisCode, "K02.1");
		assert.equal(proto.toothState, "done");
		assert.equal(proto.services.length, 3);
		assert.equal(proto.totalPriceRub, 6700);

		const codes = proto.services.map((s) => s.code804n);
		assert.deepEqual(codes, [
			"A16.07.004",
			"A16.07.002",
			"A16.07.002.001",
		]);

		const sum = proto.services.reduce((acc, s) => acc + s.priceRub, 0);
		assert.equal(sum, 6700);
	});

	it("Pulpitis protocol (K04.0) has correct 804n services and totals 12 700 ₽", () => {
		const proto = TOOTH_CLINICAL_PROTOCOLS.pulpitis;
		assert.equal(proto.key, "pulpitis");
		assert.equal(proto.diagnosisCode, "K04.0");
		assert.equal(proto.toothState, "treatment");
		assert.equal(proto.services.length, 4);
		assert.equal(proto.totalPriceRub, 12700);

		const codes = proto.services.map((s) => s.code804n);
		assert.deepEqual(codes, [
			"A16.07.004",
			"A16.07.030",
			"A16.07.008",
			"A16.07.002.001",
		]);

		const sum = proto.services.reduce((acc, s) => acc + s.priceRub, 0);
		assert.equal(sum, 12700);
	});

	it("Extraction protocol (K08.1) has correct 804n services and totals 5 500 ₽", () => {
		const proto = TOOTH_CLINICAL_PROTOCOLS.extraction;
		assert.equal(proto.key, "extraction");
		assert.equal(proto.diagnosisCode, "K08.1");
		assert.equal(proto.toothState, "missing");
		assert.equal(proto.services.length, 3);
		assert.equal(proto.totalPriceRub, 5500);

		const codes = proto.services.map((s) => s.code804n);
		assert.deepEqual(codes, [
			"A16.07.004",
			"A16.07.001",
			"A16.07.001.002",
		]);

		const sum = proto.services.reduce((acc, s) => acc + s.priceRub, 0);
		assert.equal(sum, 5500);
	});

	it("Hygiene protocol (K05.3) has correct 804n services and totals 7 800 ₽", () => {
		const proto = TOOTH_CLINICAL_PROTOCOLS.hygiene;
		assert.equal(proto.key, "hygiene");
		assert.equal(proto.diagnosisCode, "K05.3");
		assert.equal(proto.toothState, "done");
		assert.equal(proto.services.length, 3);
		assert.equal(proto.totalPriceRub, 7800);

		const codes = proto.services.map((s) => s.code804n);
		assert.deepEqual(codes, [
			"A16.07.051",
			"A16.07.020",
			"A16.07.053",
		]);

		const sum = proto.services.reduce((acc, s) => acc + s.priceRub, 0);
		assert.equal(sum, 7800);
	});

	it("All protocols have zero cartoon emojis and zero regulatory bird-language in titles", () => {
		for (const [key, proto] of Object.entries(TOOTH_CLINICAL_PROTOCOLS)) {
			assert.ok(!hasCartoonEmojis(proto.title), `Protocol ${key} title has emojis`);
			assert.ok(
				!hasCartoonEmojis(proto.diagnosisText),
				`Protocol ${key} diagnosisText has emojis`,
			);
			assert.ok(
				!BIRD_LANGUAGE_REGEX.test(proto.title),
				`Protocol ${key} title has bird-language`,
			);
			for (const svc of proto.services) {
				assert.ok(!hasCartoonEmojis(svc.name), `Service ${svc.name} has emojis`);
				assert.ok(
					!BIRD_LANGUAGE_REGEX.test(svc.name),
					`Service ${svc.name} has bird-language`,
				);
			}
		}
	});

	it("renders clinical protocol card and 1-click add button in diagnosis tab", () => {
		const mockProps = {
			activeTab: "diagnosis" as const,
			selectedToothForMenu: { code: "16" },
			code: "16",
			state: "watch",
			materialCategory: null,
			setMaterialCategory: () => {},
			selectedSurfaces: ["O", "M"],
			handleSelectDiagnosis: () => {},
			appendToEMKField: () => {},
			closeClinicalModal: () => {},
			setEndoModalToothNumber: () => {},
			setEndoModalToothState: () => {},
			setIsEndoModalOpen: () => {},
			setLabOrderModalToothNumber: () => {},
			setIsLabOrderModalOpen: () => {},
		};

		const html = renderToStaticMarkup(React.createElement(VisitClinicalToothTabs, mockProps));

		// Check protocol card container
		assert.ok(
			html.includes('data-testid="clinical-treatment-protocol-card"'),
			"Protocol card must render in diagnosis tab",
		);

		// Check 1-click CTA button
		assert.ok(
			html.includes('data-testid="btn-add-clinical-protocol-to-billing"'),
			"1-click add protocol button must render",
		);
		assert.ok(
			html.includes("+ Добавить протокол лечения в счет визита"),
			"Button must have exact clinical text",
		);

		// Check selector buttons
		assert.ok(
			html.includes('data-testid="protocol-select-caries"'),
			"Caries selector button must render",
		);
		assert.ok(
			html.includes('data-testid="protocol-select-pulpitis"'),
			"Pulpitis selector button must render",
		);
		assert.ok(
			html.includes('data-testid="protocol-select-extraction"'),
			"Extraction selector button must render",
		);
		assert.ok(
			html.includes('data-testid="protocol-select-hygiene"'),
			"Hygiene selector button must render",
		);

		// Check default protocol (caries) price badge
		const expectedPriceText =
			TOOTH_CLINICAL_PROTOCOLS.caries.totalPriceRub.toLocaleString("ru-RU");
		assert.ok(
			html.includes(expectedPriceText) || html.includes("6 700"),
			`Caries price (${expectedPriceText}) must render`,
		);
	});

	it("renders quick-add buttons in therapy, endo, and surgery tabs", () => {
		const baseProps = {
			selectedToothForMenu: { code: "25" },
			code: "25",
			state: "treatment",
			materialCategory: null,
			setMaterialCategory: () => {},
			selectedSurfaces: [],
			handleSelectDiagnosis: () => {},
			appendToEMKField: () => {},
			closeClinicalModal: () => {},
			setEndoModalToothNumber: () => {},
			setEndoModalToothState: () => {},
			setIsEndoModalOpen: () => {},
			setLabOrderModalToothNumber: () => {},
			setIsLabOrderModalOpen: () => {},
		};

		// Therapy tab
		const therapyHtml = renderToStaticMarkup(
			React.createElement(VisitClinicalToothTabs, {
				...baseProps,
				activeTab: "therapy",
			}),
		);
		assert.ok(
			therapyHtml.includes('data-testid="quick-add-protocol-caries"'),
			"Therapy tab must have quick caries protocol button",
		);

		// Endo tab
		const endoHtml = renderToStaticMarkup(
			React.createElement(VisitClinicalToothTabs, {
				...baseProps,
				activeTab: "endo",
			}),
		);
		assert.ok(
			endoHtml.includes('data-testid="quick-add-protocol-pulpitis"'),
			"Endo tab must have quick pulpitis protocol button",
		);

		// Surgery tab
		const surgeryHtml = renderToStaticMarkup(
			React.createElement(VisitClinicalToothTabs, {
				...baseProps,
				activeTab: "surgery",
			}),
		);
		assert.ok(
			surgeryHtml.includes('data-testid="quick-add-protocol-extraction"'),
			"Surgery tab must have quick extraction protocol button",
		);
	});

	it("batch dispatches protocol services to useVisitStore with tooth binding", () => {
		// Reset store
		useVisitStore.setState({ completedServices: [] });

		const initialServices = useVisitStore.getState().completedServices;
		assert.equal(initialServices.length, 0);

		// Simulate adding Pulpitis protocol for tooth 46
		const toothCode = "46";
		const toothNum = 46;
		const proto = TOOTH_CLINICAL_PROTOCOLS.pulpitis;

		for (const svc of proto.services) {
			useVisitStore.getState().addCompletedService({
				serviceId: `${svc.serviceId}-${toothCode}`,
				code804n: svc.code804n,
				name: svc.name,
				priceRub: svc.priceRub,
				priceKopecks: svc.priceRub * 100,
				quantity: 1,
				category: svc.category,
				toothNumber: toothNum,
				toothCode: toothCode,
			});
		}

		useVisitStore.getState().applyServicesToToothState({
			toothNumber: toothNum,
			toothCode: toothCode,
			services: proto.services.map((svc) => ({
				code804n: svc.code804n,
				title: svc.name,
				price: svc.priceRub,
				toothNumber: toothNum,
				toothCode: toothCode,
			})),
		});

		const updatedServices = useVisitStore.getState().completedServices;
		assert.equal(updatedServices.length, 4, "Store must contain 4 services");

		// Verify tooth binding
		for (const svc of updatedServices) {
			assert.equal(svc.toothCode, "46");
			assert.equal(svc.toothNumber, 46);
			assert.ok(svc.priceRub > 0);
			assert.ok(svc.code804n.startsWith("A16"));
		}

		const totalSum = updatedServices.reduce((sum, s) => sum + s.priceRub, 0);
		assert.equal(totalSum, 12700, "Total sum must equal 12 700 ₽");
	});

	it("CSS file contains required design-tokenized rules and touch target definitions", () => {
		const cssPath = path.resolve(
			__dirname,
			"../../../styles/VisitView.css",
		);
		const css = fs.readFileSync(cssPath, "utf-8");

		assert.ok(
			css.includes("._ccm-protocol-card"),
			"VisitView.css must include ._ccm-protocol-card",
		);
		assert.ok(
			css.includes("._ccm-protocol-add-btn"),
			"VisitView.css must include ._ccm-protocol-add-btn",
		);
		assert.ok(
			css.includes("min-height: 38px") || css.includes("min-height: 44px"),
			"VisitView.css must specify ergonomic button height",
		);
		assert.ok(
			css.includes("._ccm-protocol-selector"),
			"VisitView.css must include ._ccm-protocol-selector",
		);
		assert.ok(
			css.includes("._ccm-protocol-total-badge"),
			"VisitView.css must include ._ccm-protocol-total-badge",
		);
	});
});
