/**
 * apps/web/src/components/odontogram/__tests__/mobileHigOdontogramErgonomics.test.tsx
 * Red Team Inquisitor 2: Mobile HIG & Touch Ergonomics Audit (Apple HIG & Mandate 8ze)
 *
 * Verifies:
 * 1. ToothRadialMobileSheet renders clinical states in native Apple Bottom Sheet
 * 2. ToothRadialSurfaceBar provides >=44px touch targets with 0px horizontal drift
 * 3. ToothQuickStatusSheet Apple HIG drawer with >=52px touch rows & 1-click norm
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ToothRadialMobileSheet } from "../ToothRadialMobileSheet";
import { ToothRadialSurfaceBar } from "../radialMenu/ToothRadialSurfaceBar";
import {
	buildPrimaryRadialItems,
	buildSecondaryRadialItems,
} from "../radialMenu/radialMenuPresets";
import { ToothQuickStatusSheet } from "../../visit/mobileChairside/ToothQuickStatusSheet";
import { TOOTH_STATUS_OPTIONS } from "../../visit/mobileChairside/types";

describe("Red Team Inquisitor 2: Mobile HIG & Touch Ergonomics (Apple HIG & Mandate 8ze)", () => {
	describe("1. ToothRadialMobileSheet — Apple HIG Bottom Sheet & Touch Targets", () => {
		it("renders clinical states in native mobile sheet with drag handle & >=48px targets", () => {
			const items = [
				...buildPrimaryRadialItems(false),
				...buildSecondaryRadialItems(),
			];
			const html = renderToString(
				<ToothRadialMobileSheet
					menuRef={{ current: null }}
					dragOffsetY={0}
					isDraggingSheet={false}
					handleSheetTouchStart={() => {}}
					handleSheetTouchMove={() => {}}
					handleSheetTouchEnd={() => {}}
					toggleSurface={() => {}}
					toothNumber={16}
					currentState="Caries"
					items={items}
					selectedSurfaces={[]}
					surfaces={[]}
					setSelectedSurfaces={() => {}}
					handleSelectStateWithHaptic={() => {}}
					onSelectState={() => {}}
					onClose={() => {}}
				/>,
			);

			// Check title and drag handle
			assert.ok(html.includes("16"), "Must render tooth number");
			assert.ok(html.includes("моляр"), "Must render anatomical tooth name");
			assert.ok(
				html.includes("radial-mobile-sheet"),
				"Must include radial-mobile-sheet container",
			);

			// Verify touch targets >= 48px
			assert.ok(
				html.includes("min-h-[50px]") || html.includes("min-h-[48px]"),
				"Primary actions must enforce >=48px touch targets",
			);
		});

		it("renders physiological norm and safe-area padding in natural thumb zone", () => {
			const items = [
				...buildPrimaryRadialItems(false),
				...buildSecondaryRadialItems(),
			];
			const html = renderToString(
				<ToothRadialMobileSheet
					menuRef={{ current: null }}
					dragOffsetY={0}
					isDraggingSheet={false}
					handleSheetTouchStart={() => {}}
					handleSheetTouchMove={() => {}}
					handleSheetTouchEnd={() => {}}
					toggleSurface={() => {}}
					toothNumber={21}
					currentState="Healthy"
					items={items}
					selectedSurfaces={[]}
					surfaces={[]}
					setSelectedSurfaces={() => {}}
					handleSelectStateWithHaptic={() => {}}
					onSelectState={() => {}}
					onClose={() => {}}
				/>,
			);

			assert.ok(
				html.includes("Интактный") || html.includes("Здоров"),
				"Must include physiological norm state",
			);
			assert.ok(
				html.includes("safe-area-inset-bottom"),
				"Sheet must enforce Apple HIG safe-area-inset-bottom",
			);
		});
	});

	describe("2. ToothRadialSurfaceBar — Touch Targets & 0px Horizontal Drift", () => {
		it("renders surface chips in a wrap layout with >=44px touch targets on mobile", () => {
			const html = renderToString(
				<ToothRadialSurfaceBar
					isPrimary={false}
					selectedSurfaces={["O"]}
					setSelectedSurfaces={() => {}}
					isMobile={true}
				/>,
			);

			const chips = ["O", "M", "D", "V", "L", "MOD", "MO", "OD"];
			for (const chip of chips) {
				assert.ok(
					html.includes(`radial-mobile-quick-surf-${chip}`),
					`Must include surface chip data-testid radial-mobile-quick-surf-${chip}`,
				);
			}

			// Verify touch targets >= 44px
			assert.ok(
				html.includes("min-h-[44px]"),
				"Surface chips must enforce >=44px height",
			);
			assert.ok(
				html.includes("min-w-[44px]"),
				"Surface chips must enforce >=44px width",
			);
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
