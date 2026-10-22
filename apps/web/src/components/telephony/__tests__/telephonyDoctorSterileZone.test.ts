import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

describe("Telephony Doctor Sterile Zone & Solo Doctor Autonomy (Mandates 8e, 8n, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");
	const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
	const widgetPath = path.resolve(srcDir, "components/telephony/TelephonyFloatingWidget.tsx");
	const quickActionsPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/useIncomingCallQuickActions.ts");
	const floatingQuickActionsPath = path.resolve(srcDir, "components/telephony/telephonyFloatingWidget/useFloatingCallQuickActions.ts");
	const shellPath = path.resolve(srcDir, "workspaceShell.tsx");
	const cssPath = path.resolve(srcDir, "components/telephony/telephonyFloatingWidget.css");

	it("1. Doctor Sterile Zone & Draft Immunity (Mandate 8e p. 6, 8n)", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const widgetSource = fs.readFileSync(widgetPath, "utf-8");

		assert.ok(
			popupSource.includes("const shouldShowCapsule = isDoctorMode || !isPopupExpanded;"),
			"IncomingCallPopup must collapse into IncomingCallCapsuleBar in doctor mode",
		);
		assert.ok(
			popupSource.includes("<IncomingCallCapsuleBar ctrl={ctrl} />"),
			"IncomingCallPopup must render non-blocking capsule bar in doctor mode",
		);
		assert.ok(
			widgetSource.includes("isDoctorChairsideMode"),
			"TelephonyFloatingWidget must identify doctor chairside mode",
		);
		assert.ok(
			widgetSource.includes("if (isDoctorChairsideMode) {\n\t\treturn null;\n\t}"),
			"TelephonyFloatingWidget must return null in doctor chairside mode",
		);
	});

	it("2. Solo-Doctor & Reception Autonomy: 1-Click Booking without Mandatory Assistant (Mandates 8e & 8n)", () => {
		const quickActionsSource = fs.readFileSync(quickActionsPath, "utf-8");
		const floatingQuickActionsSource = fs.readFileSync(floatingQuickActionsPath, "utf-8");

		assert.ok(
			quickActionsSource.includes('assistantUserId: ""'),
			"IncomingCallPopup quick actions handleQuickBook must set assistantUserId: ''",
		);
		assert.ok(
			floatingQuickActionsSource.includes('assistantUserId: ""'),
			"TelephonyFloatingWidget handleQuickBook must set assistantUserId: ''",
		);
	});

	it("3. Odontogram Working Zone Protection & Doctor Immunity (Mandates 8e, 8p)", () => {
		const shellSource = fs.readFileSync(shellPath, "utf-8");
		assert.ok(
			shellSource.includes("!isDoctorMode ? ("),
			"workspaceShell must strictly guard telephony widget mounting with !isDoctorMode",
		);

		const cssSource = fs.readFileSync(cssPath, "utf-8");
		assert.ok(
			cssSource.includes("pointer-events: none;"),
			"telephonyFloatingWidget.css container must have pointer-events: none",
		);
		assert.ok(
			cssSource.includes("top: 12px;"),
			"telephony container must be anchored at top: 12px",
		);
	});
});
