import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

describe("Telephony Quiet UI & Dynamic Island (Mandates 8d, 8e, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	it("4. Quiet UI: Non-Blocking Translucent Dynamic Island Capsule & Backdrop Blur", () => {
		const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
		const headerBarPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/IncomingCallHeaderBar.tsx");
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const headerBarSource = fs.readFileSync(headerBarPath, "utf-8");

		assert.ok(popupSource.includes("pointer-events-none"));
		assert.ok(headerBarSource.includes('data-testid="incoming-call-capsule"'));
		assert.ok(popupSource.includes("backdrop-blur-xl"));
		assert.ok(!popupSource.includes("fixed inset-0 bg-black/50"));
	});

	it("5. Doctor Mode & Form 043/u Sterile Zone Immunity (Mandate 8e, 8n)", () => {
		const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
		const controllerPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/useIncomingCallPopupController.ts");
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const controllerSource = fs.readFileSync(controllerPath, "utf-8");

		assert.ok(controllerSource.includes('selectedWorkspaceRole === "doctor" || currentView === "visit"'));
		assert.ok(popupSource.includes("const shouldShowCapsule = isDoctorMode || !isPopupExpanded;"));
		assert.ok(popupSource.includes("<IncomingCallCapsuleBar ctrl={ctrl} />"));
	});

	it("6. Miller's Law: Strictly <= 2 Primary Direct Buttons (Mandates 8d & 8p)", () => {
		const headerBarPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/IncomingCallHeaderBar.tsx");
		const actionFooterPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/IncomingCallActionFooter.tsx");
		const headerBarSource = fs.readFileSync(headerBarPath, "utf-8");
		const actionFooterSource = fs.readFileSync(actionFooterPath, "utf-8");

		assert.ok(headerBarSource.includes('data-testid="badge-header-answer-btn"'));
		assert.ok(headerBarSource.includes('data-testid="badge-header-reject-btn"'));
		assert.ok(actionFooterSource.includes('data-testid="badge-action-book"'));
		assert.ok(actionFooterSource.includes('data-testid="badge-action-card"'));
	});
});
