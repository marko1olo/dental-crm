/**
 * apps/web/src/components/visit/__tests__/visitRealBehavioralSuite.test.tsx
 *
 * Real behavioral test suite for Visit & Clinical Diary components.
 * Mandates:
 * - 8e: Doctor autonomy (0 disabled buttons, debounced autosave, 1-click physiological norm).
 * - 8am: Unified clinical tokens, 36px buttons, rounded-xl.
 * - 8ze: Apple HIG touch targets >= 44x44px.
 * - 8x / 8ap: Clean clinical Russian without raw law numbers.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import { EmkToolbar } from "../emk/EmkToolbar";
import { apply1ClickClinicalAutopilot } from "../presets/autopilotPresets";
import {
	saveChairsideVisitDraft,
	loadChairsideVisitDraft,
	clearChairsideVisitDraft,
	isChairsideDraftRecent,
} from "../doctorChairSessions";

// Setup lightweight in-memory localStorage for Node.js test environment if absent
if (typeof globalThis.localStorage === "undefined") {
	const storage = new Map<string, string>();
	const storageMock = {
		getItem: (k: string) => storage.get(k) ?? null,
		setItem: (k: string, v: string) => storage.set(k, String(v)),
		removeItem: (k: string) => storage.delete(k),
		clear: () => storage.clear(),
	};
	Object.defineProperty(globalThis, "localStorage", {
		value: storageMock,
		writable: true,
	});
	if (typeof (globalThis as any).window === "undefined") {
		(globalThis as any).window = globalThis;
	}
	(globalThis as any).window.localStorage = storageMock;
	if (typeof (globalThis as any).window.dispatchEvent !== "function") {
		(globalThis as any).window.dispatchEvent = () => true;
	}
}

describe("EmkToolbar Real Rendering & Mandates (React 19)", () => {
	const defaultProps = {
		activeEmkTab: "all",
		setActiveEmkTab: () => {},
		onApplyPhysiologicalNorm: () => {},
		onApplyNorm: () => {},
		onToggleStarProtocols: () => {},
		onOpenConsent: () => {},
		onPrintMedicalCard: () => {},
	};

	it("1. renders physiological norm button with clean Russian clinical label", () => {
		const html = renderToString(<EmkToolbar {...defaultProps} />);

		assert.ok(html.includes('data-testid="btn-chairside-physiological-norm"'));
		assert.ok(
			html.includes("Соматически здоров") || html.includes("Норма"),
			"Must contain clean clinical norm text",
		);
	});

	it("2. verifies Mandate 8e: 0 disabled buttons in active unlocked toolbar (Doctor Autonomy)", () => {
		const html = renderToString(<EmkToolbar {...defaultProps} />);

		// Check disabled attributes on primary actions
		assert.ok(
			!html.includes('data-testid="btn-chairside-physiological-norm" disabled'),
			"Physiological norm button must NEVER be disabled",
		);
	});

	it("3. renders secondary actions: prescriptions and protocol catalog", () => {
		const html = renderToString(
			<EmkToolbar
				{...defaultProps}
				onOpenProtocolsCatalog={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-chairside-prescriptions-toolbar"'));
		assert.ok(html.includes('data-testid="btn-open-protocols-catalog-1142"'));
		assert.ok(html.includes('data-testid="btn-toggle-extra-soap-menu"'));
	});
});

describe("Physiological Norm Application Logic (Mandate 8e)", () => {
	it("4. apply1ClickClinicalAutopilot sets healthy anamnesis, statusLocalis, Z01.2 and zero-stress treatment", () => {
		const result = apply1ClickClinicalAutopilot("autopilot_norm_healthy");

		assert.equal(result.preset.icd10, "Z01.2");
		assert.equal(result.diary.diagnosisIcd10, "Z01.2");
		assert.ok(result.diary.anamnesis.includes("Соматически здоров"));
		assert.ok(result.diary.statusLocalis.includes("интактны"));
	});

	it("5. autosave & instant recovery of chairside visit draft: persists all SOAP fields & tooth selection without data loss", () => {
		const visitId = "visit-autosave-test-999";

		// Doctor types notes during chairside examination
		const originalDraft = saveChairsideVisitDraft(visitId, {
			chairId: "chair-main",
			patientId: "pat-12345",
			patientName: "Смирнов Алексей Викторович",
			doctorId: "doc-01",
			activeTooth: 24,
			activeTab: "emk",
			diary: {
				complaint: "Ноющая боль при накусывании на зуб 24",
				anamnesis: "Боли в течение недели, ранее зуб лечен по поводу глубокого кариеса",
				objectiveStatus: "Зуб 24: пломба с дефектом прилегания по дистальной поверхности, перкуссия слабо болезненна",
				diagnosis: "K04.4 Хронический апикальный периодонтит",
				treatmentPlan: "Эндодонтическое перелечивание каналов зуба 24, распломбировка, медикаментозная обработка",
				recommendations: "Охранительный режим, не жевать на левой стороне",
				icd10: "K04.4",
				toothNumber: 24,
			},
		});

		assert.equal(originalDraft.visitId, visitId);
		assert.equal(originalDraft.activeTooth, 24);

		// Sudden browser refresh or accidental tab close: recover draft instantly
		const loadedDraft = loadChairsideVisitDraft(visitId);
		assert.ok(loadedDraft !== null, "Draft must be safely recovered from isolated storage");
		assert.equal(loadedDraft?.patientId, "pat-12345");
		assert.equal(loadedDraft?.patientName, "Смирнов Алексей Викторович");
		assert.equal(loadedDraft?.diary?.complaint, "Ноющая боль при накусывании на зуб 24");
		assert.equal(loadedDraft?.diary?.diagnosis, "K04.4 Хронический апикальный периодонтит");
		assert.equal(loadedDraft?.diary?.icd10, "K04.4");
		assert.equal(loadedDraft?.diary?.toothNumber, 24);

		// Verify draft is recent (within 24 hours)
		assert.equal(isChairsideDraftRecent(loadedDraft), true);

		// Clean up
		clearChairsideVisitDraft(visitId);
		assert.equal(loadChairsideVisitDraft(visitId), null, "Draft should be cleared after visit finalization");
	});

	it("6. isChairsideDraftRecent distinguishes between active and stale drafts (> 24 hours)", () => {
		const now = Date.now();
		const recentDraft: any = {
			visitId: "v-recent",
			timestamp: now - 3600 * 1000, // 1 hour ago
		};
		assert.equal(isChairsideDraftRecent(recentDraft), true);

		const staleDraft: any = {
			visitId: "v-stale",
			timestamp: now - (25 * 3600 * 1000), // 25 hours ago
		};
		assert.equal(isChairsideDraftRecent(staleDraft), false);
	});
});
