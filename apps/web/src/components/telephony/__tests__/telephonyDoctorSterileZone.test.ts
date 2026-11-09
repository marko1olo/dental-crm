import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("Telephony Doctor Sterile Zone & Solo Doctor Autonomy (Mandates 8e, 8n, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");
	const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
	const quickActionsPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/useIncomingCallQuickActions.ts");
	const cssPath = path.resolve(srcDir, "components/telephony/styles/telephonyCapsuleAndDrawer.css");

	it("1. Doctor Sterile Zone & Draft Immunity (Mandate 8e p. 6, 8n)", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");

		assert.ok(
			popupSource.includes("if (isDoctorMode) return null;"),
			"IncomingCallPopup must return null in doctor sterile zone",
		);
		assert.ok(
			popupSource.includes("const shouldShowCapsule = !isPopupExpanded;"),
			"IncomingCallPopup must use simplified capsule visibility condition",
		);
		assert.ok(
			popupSource.includes("<IncomingCallCapsuleBar ctrl={ctrl} />"),
			"IncomingCallPopup must render non-blocking capsule bar in doctor mode",
		);
	});

	it("2. Solo-Doctor & Reception Autonomy: 1-Click Booking without Mandatory Assistant (Mandates 8e & 8n)", () => {
		const quickActionsSource = fs.readFileSync(quickActionsPath, "utf-8");

		assert.ok(
			quickActionsSource.includes('assistantUserId: ""'),
			"IncomingCallPopup quick actions handleQuickBook must set assistantUserId: ''",
		);
	});

	it("3. Odontogram Working Zone Protection & Non-blocking Island (Mandates 8e, 8p)", () => {
		const cssSource = fs.readFileSync(cssPath, "utf-8");
		assert.ok(
			cssSource.includes("pointer-events: none;"),
			"telephony container must have pointer-events: none",
		);
		assert.ok(
			cssSource.includes("top: 12px;"),
			"telephony container must be anchored at top: 12px",
		);
	});
});
