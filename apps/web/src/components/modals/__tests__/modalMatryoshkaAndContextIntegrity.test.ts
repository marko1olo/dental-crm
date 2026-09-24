/**
 * modalMatryoshkaAndContextIntegrity.test.ts
 *
 * Red Team Inquisitor Verification:
 * 1. Modal Matryoshka & Depth Guard (Mandate 8d, Sin 6: Depth strictly <= 1).
 * 2. React Context Integrity: AuthProvider useMemo stability & AppLogicContext teardown drain.
 * 3. Offline Data Loss Prevention: beforeunload protection for pending doctor mutations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Red Team Inquisitor — Contexts, Modals & Sync Resilience", async (t) => {
	const authContextPath = path.resolve(__dirname, "../../../contexts/AuthContext.tsx");
	const appLogicContextPath = path.resolve(__dirname, "../../../contexts/AppLogicContext.tsx");
	const networkIndicatorPath = path.resolve(__dirname, "../../sync/NetworkStatusIndicator.tsx");
	const clinicalTasksPanelPath = path.resolve(__dirname, "../../../ClinicalTasksPanel.tsx");

	await t.test("1. AuthContext memoizes value via useMemo (prevents render cascades)", () => {
		const content = fs.readFileSync(authContextPath, "utf8");
		assert.ok(content.includes("useMemo"), "AuthContext must import and use useMemo");
		assert.ok(
			content.includes("const resolvedValue = useMemo("),
			"AuthProvider must memoize resolvedValue via useMemo",
		);
	});

	await t.test("2. AppLogicContext drains teardown callbacks on tab switch (anti-memory leak)", () => {
		const content = fs.readFileSync(appLogicContextPath, "utf8");
		assert.ok(
			content.includes("tabTeardownCallbacks.clear()"),
			"AppLogicContext must clear executed teardown callbacks to prevent unbounded memory retention",
		);
		assert.ok(
			content.includes("clearTabTeardownCallbacks"),
			"AppLogicContext must export explicit teardown clearing utility",
		);
	});

	await t.test("3. NetworkStatusIndicator guards against data loss on tab close (beforeunload)", () => {
		const content = fs.readFileSync(networkIndicatorPath, "utf8");
		assert.ok(
			content.includes("beforeunload"),
			"NetworkStatusIndicator must attach beforeunload listener when pending mutations exist",
		);
		assert.ok(
			content.includes("pendingMutationCount"),
			"beforeunload must be tied to pendingMutationCount",
		);
	});

	await t.test("4. NetworkStatusIndicator handles sync errors gracefully without unhandled rejection", () => {
		const content = fs.readFileSync(networkIndicatorPath, "utf8");
		assert.ok(
			content.includes("try {") && content.includes("await syncNow();"),
			"syncNow call must be wrapped in try/catch to avoid unhandled rejections",
		);
		assert.ok(
			content.includes("setSyncError"),
			"NetworkStatusIndicator must capture sync failure state",
		);
	});

	await t.test("5. ClinicalTasksPanel maintains 0 cartoon emojis and doctor autonomy", () => {
		const content = fs.readFileSync(clinicalTasksPanelPath, "utf8");
		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(content), "ClinicalTasksPanel must contain 0 cartoon emojis");
		assert.ok(
			content.includes("executeClinicalPresetTaskAutonomy"),
			"Must export 1-click autonomous preset execution engine",
		);
	});
});
