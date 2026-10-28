/**
 * apps/web/src/components/odontogram/__tests__/mobileHigOdontogramErgonomics.test.tsx
 * Red Team Inquisitor 2: Mobile HIG & Touch Ergonomics Audit (Apple HIG & Mandate 8ze)
 *
 * Verifies:
 * 1. ToothActionMobileSheet renders all 17 clinical states without truncation
 * 2. 4 Clinical Category Grouped Cards (Therapy, Endo, Orthopedics, Surgery)
 * 3. ToothActionSurfacesAccordion 5x2 grid eliminating horizontal scroll (0px drift)
 * 4. ToothQuickStatusSheet Apple HIG drawer with >=52px touch rows & 1-click norm
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ToothActionMobileSheet } from "../ToothActionMobileSheet";
import { ToothActionSurfacesAccordion } from "../ToothActionSurfacesAccordion";
import { TOOTH_STATE_ACTIONS } from "../odontogramModuleConstants";
import { ToothQuickStatusSheet } from "../../visit/mobileChairside/ToothQuickStatusSheet";
import { TOOTH_STATUS_OPTIONS } from "../../visit/mobileChairside/types";

describe("Red Team Inquisitor 2: Mobile HIG & Touch Ergonomics (Apple HIG & Mandate 8ze)", () => {
	describe("1. ToothActionMobileSheet — All 17 Clinical States & Grouped Inset Cards", () => {
		it("renders all 17 clinical states across 4 disciplines without truncation", () => {
			const html = renderToString(
				<ToothActionMobileSheet
					menuConfig={{ toothNumber: 16, x: 100, y: 100 }}
					onClose={() => {}}
					selectedTeeth={[16]}
					activeSurfaces={[]}
					setActiveSurfaces={() => {}}
					onApplyToothState={() => {}}
					onOpenContextDrawer={() => {}}
					onOpenHistory={() => {}}
					onOpenEndo={() => {}}
					onOneClickLabOrder={() => {}}
					teethData={[]}
				/>,
			);

			// Check title
			assert.ok(html.includes("Зуб #16"), "Must render tooth title");

			// Check all 4 discipline headings
			assert.ok(html.includes("Терапия и гигиена"), "Must include therapy heading");
			assert.ok(html.includes("Эндодонтия и корни"), "Must include endo heading");
			assert.ok(html.includes("Ортопедия и микропротезирование"), "Must include orthopedics heading");
			assert.ok(html.includes("Хирургия и имплантация"), "Must include surgery heading");

			// Verify all 17 clinical states are present with interactive buttons
			assert.equal(TOOTH_STATE_ACTIONS.length, 17, "Must contain exactly 17 clinical actions");
			for (const action of TOOTH_STATE_ACTIONS) {
				assert.ok(
					html.includes(`data-testid="mobile-action-${action.state}"`),
					`Must render testid for ${action.state}`,
				);
				assert.ok(
					html.includes(action.label),
					`Must render label for ${action.state}`,
				);
			}

			// Verify touch targets >= 48px
			assert.ok(html.includes("min-h-[48px]"), "Actions must enforce >=48px touch targets");
		});

		it("renders 1-click physiological norm in natural thumb zone footer", () => {
			const html = renderToString(
				<ToothActionMobileSheet
					menuConfig={{ toothNumber: 21, x: 100, y: 100 }}
					onClose={() => {}}
					selectedTeeth={[21]}
					activeSurfaces={[]}
					setActiveSurfaces={() => {}}
					onApplyToothState={() => {}}
					onOpenContextDrawer={() => {}}
					onOpenHistory={() => {}}
					onOpenEndo={() => {}}
					onOneClickLabOrder={() => {}}
					teethData={[]}
				/>,
			);

			assert.ok(
				html.includes('data-testid="mobile-sheet-healthy-norm-btn"'),
				"Must include 1-click norm button in footer",
			);
			assert.ok(
				html.includes("✓ Интактный (Норма)"),
				"Must include physiological norm label",
			);
			assert.ok(
				html.includes("h-[50px]") || html.includes("min-h-[50px]"),
				"Footer buttons must enforce Apple HIG thumb height",
			);
		});
	});

	describe("2. ToothActionSurfacesAccordion — 5x2 Grid & 0px Horizontal Drift", () => {
		it("renders all 10 surface chips in a responsive grid without horizontal scroll", () => {
			const html = renderToString(
				<ToothActionSurfacesAccordion
					activeSurfaces={["O"]}
					setActiveSurfaces={() => {}}
				/>,
			);

			const chips = ["MOD", "MO", "OD", "O", "M", "D", "V", "L", "К", "А"];
			for (const chip of chips) {
				assert.ok(
					html.includes(`data-testid="odontogram-module-surf-${chip}"`),
					`Must include surface chip ${chip}`,
				);
			}

			// Verify touch targets >= 44px
			assert.ok(html.includes("min-h-[44px]"), "Surface chips must enforce >=44px height");
			assert.ok(html.includes("min-w-[44px]"), "Surface chips must enforce >=44px width");
			assert.ok(html.includes("grid-cols-5"), "Must use 5x2 grid instead of horizontal scroll");
			assert.ok(!html.includes("overflow-x-auto"), "Must eliminate horizontal drift");
		});
	});

	describe("3. ToothQuickStatusSheet — Native Apple Bottom Sheet & All 17 States", () => {
		it("renders all 17 clinical states grouped in Apple Health list style with >=52px rows", () => {
			const html = renderToString(
				<ToothQuickStatusSheet
					isOpen={true}
					toothNumber="36"
					currentStatus="Healthy"
					onClose={() => {}}
					onSelectStatus={() => {}}
				/>,
			);

			assert.ok(html.includes("Зуб 36: Клинический статус"), "Must render tooth title in sheet");

			// Verify all 17 statuses in TOOTH_STATUS_OPTIONS
			assert.equal(TOOTH_STATUS_OPTIONS.length, 17, "Must contain all 17 clinical status options");
			for (const opt of TOOTH_STATUS_OPTIONS) {
				assert.ok(
					html.includes(`data-testid="mobile-tooth-quick-status-sheet-item-${opt.id}"`),
					`Must render item for ${opt.id}`,
				);
				assert.ok(html.includes(opt.label), `Must render label for ${opt.id}`);
			}

			// Verify list rows >= 52px (Apple HIG touch target)
			assert.ok(html.includes("min-h-[52px]"), "List items must enforce >=52px height");
		});

		it("renders 1-click norm in footer", () => {
			const html = renderToString(
				<ToothQuickStatusSheet
					isOpen={true}
					toothNumber="46"
					currentStatus="Caries"
					onClose={() => {}}
					onSelectStatus={() => {}}
				/>,
			);

			assert.ok(
				html.includes('data-testid="mobile-tooth-quick-status-sheet-healthy-norm-btn"'),
				"Must include norm button in sheet footer",
			);
			assert.ok(html.includes("✓ Здоров / Интактный (Норма)"), "Must include norm text");
		});
	});
});
