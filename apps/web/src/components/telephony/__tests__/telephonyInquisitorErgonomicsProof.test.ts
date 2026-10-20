import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

describe("Telephony & Softphone Red Team Inquisitor Suite (Mandates 8e, 8n, Apple HIG, Anti-Floating Trap)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const floatingCssPath = path.resolve(srcDir, "components/telephony/telephonyFloatingWidget.css");
	const coexistenceCssPath = path.resolve(srcDir, "components/telephony/styles/telephonyCoexistence.css");
	const drawerCssPath = path.resolve(srcDir, "components/telephony/styles/telephonyCapsuleAndDrawer.css");
	const drawerFooterPath = path.resolve(srcDir, "components/telephony/incomingCallPatientDrawer/IncomingCallDrawerFooter.tsx");
	const topBarActionsPath = path.resolve(srcDir, "workspaceShellModules/topBarModules/WorkspaceTopBarActions.tsx");
	const widgetPath = path.resolve(srcDir, "components/telephony/TelephonyFloatingWidget.tsx");
	const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");

	const floatingCss = fs.readFileSync(floatingCssPath, "utf-8");
	const coexistenceCss = fs.readFileSync(coexistenceCssPath, "utf-8");
	const drawerCss = fs.readFileSync(drawerCssPath, "utf-8");
	const drawerFooter = fs.readFileSync(drawerFooterPath, "utf-8");
	const topBarActions = fs.readFileSync(topBarActionsPath, "utf-8");
	const widgetSource = fs.readFileSync(widgetPath, "utf-8");
	const popupSource = fs.readFileSync(popupPath, "utf-8");

	it("1. Anti-Floating Trap: Relocates incoming call badge away from dialogs, visit view, and bottom CTAs", () => {
		assert.ok(
			coexistenceCss.includes("body:has([role=\"dialog\"]) .dnt-incoming-call-badge-container") &&
			coexistenceCss.includes("top: 68px;") &&
			coexistenceCss.includes("bottom: auto;"),
			"Incoming call badge must relocate to top: 68px and bottom: auto when dialogs or visit views are open",
		);
		assert.ok(
			coexistenceCss.includes("body:has([data-testid=\"visit-view\"]) .dnt-incoming-call-badge-container"),
			"Incoming call badge must yield space during visit view to avoid covering primary CTAs",
		);
	});

	it("2. Mobile Ergonomics (Apple HIG): Zero horizontal drift & Bottom Sheet drawer standard", () => {
		// Zero drift overflow-x clip in mobile badge
		assert.ok(
			floatingCss.includes("overflow-x: clip;"),
			"Mobile telephony containers must enforce overflow-x: clip to guarantee 0px horizontal drift",
		);

		// Mobile drawer conforms to iOS Bottom Sheet
		assert.ok(
			drawerCss.includes("border-radius: 24px 24px 0 0;") &&
			drawerCss.includes("max-height: 85dvh;"),
			"Mobile telephony drawer must render as an iOS Bottom Sheet with 24px top radius and max 85dvh",
		);

		// Safe-area inset protection in drawer footer
		assert.ok(
			drawerFooter.includes("env(safe-area-inset-bottom"),
			"IncomingCallDrawerFooter must account for env(safe-area-inset-bottom) to protect iOS Home Bar",
		);
	});

	it("3. Chairside Discreet 32px Badge in Workspace TopBar (Mandates 8e, 8n)", () => {
		assert.ok(
			topBarActions.includes("topbar-chairside-telephony-btn"),
			"WorkspaceTopBarActions must provide discreet chairside telephony button",
		);
		assert.ok(
			topBarActions.includes("min-h-[32px]") && topBarActions.includes("h-8"),
			"Chairside telephony button must use discreet 32px height to avoid distracting dentist",
		);
		assert.ok(
			widgetSource.includes("isDoctorChairsideMode"),
			"TelephonyFloatingWidget must identify doctor chairside mode and yield screen space",
		);
	});

	it("4. Zero AudioContext / Oscillator Procedural Simulators (Mandates 8k, 8s)", () => {
		assert.ok(
			!popupSource.includes("AudioContext") && !popupSource.includes("createOscillator"),
			"IncomingCallPopup must NOT use procedural AudioContext / oscillator simulations",
		);
		assert.ok(
			!widgetSource.includes("AudioContext") && !widgetSource.includes("createOscillator"),
			"TelephonyFloatingWidget must NOT use procedural AudioContext / oscillator simulations",
		);
	});

	it("5. Solo-Doctor Autonomy: 1-Click Booking without Mandatory Assistant (Mandate 8n)", () => {
		const quickBookingActionsPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/useIncomingCallBookingActions.ts");
		const quickBookingActions = fs.readFileSync(quickBookingActionsPath, "utf-8");

		assert.ok(
			quickBookingActions.includes("assistantUserId: \"\""),
			"handleQuickBook must set assistantUserId: '' to prevent blocking solo doctors",
		);
		assert.ok(
			quickBookingActions.includes("patientName: resolvedPatient?.fullName || (callerName"),
			"handleQuickBook must automatically prefill patient name from caller",
		);
	});
});
