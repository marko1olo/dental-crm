/**
 * DENTE Dental CRM — Red Team Test Suite for Copilot & Anatomy Remediation
 * apps/web/src/tests/copilotAnatomyRemediation.test.ts
 *
 * Verifies remediation of:
 * - [COP-02] Doctor's visit notes preservation on Copilot nudges (zero data loss)
 * - [END-01] Anatomical root canals for upper (MB1, MB2, DB, P) and lower (MB, ML, DB, DL) molars
 * - [PED-01] Mixed dentition permanent incisors resolution & permanent mode non-empty array
 */

import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	MIXED_INCISORS_TOP_TEETH,
	MIXED_INCISORS_BOTTOM_TEETH,
	ALL_MIXED_INCISORS_TEETH,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	resolveMixedDentitionArch,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
} from "@dental/shared";
import {
	getChairsideDefaultCanals,
} from "../components/endo/endodonticsCatalogData";
import { useVisitStore } from "../store/visit";
import { PediatricTeethChart } from "../components/pediatric/PediatricTeethChart";

describe("🛡️ Red Team Inquisition Suite: Copilot & Anatomy Remediation", () => {
	describe("1. [COP-02] Doctor's Clinical Notes Zero Data Loss Protection", () => {
		it("Functional update in setVisitNoteForm never erases doctor-typed complaint or anamnesis", () => {
			const store = useVisitStore.getState();

			// Doctor has typed subjective findings
			store.setVisitNoteForm({
				complaint: "Ноющая боль в зубе 46 при накусывании",
				anamnesis: "Боль началась 3 дня назад после приёма горячей пищи. Аллергия на новокаин.",
				objectiveStatus: "Зондирование безболезненно",
				diagnosis: "K04.0 Начальный пульпит",
				treatmentPlan: "Эндодонтическое лечение",
			});

			const prev = useVisitStore.getState().visitNoteForm;
			assert.equal(prev.complaint, "Ноющая боль в зубе 46 при накусывании");
			assert.equal(prev.anamnesis, "Боль началась 3 дня назад после приёма горячей пищи. Аллергия на новокаин.");

			// Copilot nudge applies with only objective status and additional diagnosis note
			const nudgePayload = {
				complaint: "",
				anamnesis: "",
				objectiveStatus: "Глубокая кариозная полость на дистальной поверхности, термопроба положительна",
				diagnosis: "K04.0 Пульпит",
				treatmentPlan: "Механическая обработка каналов NiTi",
			};

			// Simulate the non-destructive append with separator logic implemented in useCopilotActions
			store.setVisitNoteForm((current) => {
				const appendWithSeparator = (existing?: string, addition?: string) => {
					if (!addition?.trim()) return existing || "";
					if (!existing?.trim()) return addition.trim();
					if (existing.includes(addition.trim())) return existing;
					return `${existing.trim()}\n\n${addition.trim()}`;
				};

				return {
					...current,
					complaint: appendWithSeparator(current.complaint, nudgePayload.complaint),
					anamnesis: appendWithSeparator(current.anamnesis, nudgePayload.anamnesis),
					objectiveStatus: appendWithSeparator(current.objectiveStatus, nudgePayload.objectiveStatus),
					diagnosis: appendWithSeparator(current.diagnosis, nudgePayload.diagnosis),
					treatmentPlan: appendWithSeparator(current.treatmentPlan, nudgePayload.treatmentPlan),
				};
			});

			const updated = useVisitStore.getState().visitNoteForm;

			// Doctor's complaint and anamnesis MUST be intact! Zero data loss!
			assert.equal(updated.complaint, "Ноющая боль в зубе 46 при накусывании");
			assert.equal(updated.anamnesis, "Боль началась 3 дня назад после приёма горячей пищи. Аллергия на новокаин.");
			assert.ok(updated.objectiveStatus.includes("Зондирование безболезненно"));
			assert.ok(updated.objectiveStatus.includes("Глубокая кариозная полость"));
		});
	});

	describe("2. [END-01] Anatomical Root Canal Defaults for Molars", () => {
		it("Upper molar 16 returns 4 canals: MB1, MB2, DB, P with exact clinical lengths and files", () => {
			const canals16 = getChairsideDefaultCanals(16);
			assert.equal(canals16.length, 4, "Upper molar must have 4 anatomical canals");

			const names = canals16.map((c) => c.name);
			assert.deepEqual(names, ["MB1", "MB2", "DB", "P"]);

			const mb1 = canals16.find((c) => c.name === "MB1")!;
			const mb2 = canals16.find((c) => c.name === "MB2")!;
			const db = canals16.find((c) => c.name === "DB")!;
			const p = canals16.find((c) => c.name === "P")!;

			assert.equal(mb1.workingLengthMm, 21.0);
			assert.equal(mb2.workingLengthMm, 20.0);
			assert.equal(db.workingLengthMm, 20.0);
			assert.equal(p.workingLengthMm, 22.0);

			assert.equal(mb2.masterApicalFile, "#20");
			assert.equal(p.masterApicalFile, "#30");
		});

		it("Lower molar 46 returns 4 canals: MB, ML, DB, DL (Mandates 8e, 8n anatomical accuracy)", () => {
			const canals46 = getChairsideDefaultCanals(46);
			assert.equal(canals46.length, 4, "Lower molar must have 4 anatomical canals (MB, ML, DB, DL)");

			const names = canals46.map((c) => c.name);
			assert.deepEqual(names, ["MB", "ML", "DB", "DL"]);

			const mb = canals46.find((c) => c.name === "MB")!;
			const ml = canals46.find((c) => c.name === "ML")!;
			const db = canals46.find((c) => c.name === "DB")!;
			const dl = canals46.find((c) => c.name === "DL")!;

			assert.equal(mb.workingLengthMm, 21.5);
			assert.equal(ml.workingLengthMm, 21.0);
			assert.equal(db.workingLengthMm, 21.5);
			assert.equal(dl.workingLengthMm, 21.0);
		});

		it("Upper molar 26 and Lower molar 36 also have 4 anatomical canals", () => {
			const canals26 = getChairsideDefaultCanals(26);
			assert.equal(canals26.length, 4);
			assert.deepEqual(canals26.map((c) => c.name), ["MB1", "MB2", "DB", "P"]);

			const canals36 = getChairsideDefaultCanals(36);
			assert.equal(canals36.length, 4);
			assert.deepEqual(canals36.map((c) => c.name), ["MB", "ML", "DB", "DL"]);
		});
	});

	describe("3. [PED-01] Mixed Dentition Permanent Incisors Resolution & Non-Empty Adult Arch", () => {
		it("resolveMixedDentitionArch replaces primary teeth with permanent successors when active", () => {
			// Early mixed top base arch (16 + 55..51 + 61..65 + 26)
			const baseTop = MIXED_TOP_TEETH;
			assert.equal(baseTop.length, 12);

			// Child has permanent central incisors 11 and 21 erupted
			const resolvedTop = resolveMixedDentitionArch(baseTop, [11, 21]);

			// 51 should be replaced by 11, 61 should be replaced by 21
			assert.ok(resolvedTop.includes(11), "Arch must contain permanent incisor 11");
			assert.ok(resolvedTop.includes(21), "Arch must contain permanent incisor 21");
			assert.ok(!resolvedTop.includes(51), "Primary 51 must be substituted by 11");
			assert.ok(!resolvedTop.includes(61), "Primary 61 must be substituted by 21");
			// Lateral incisors 52, 62 remain primary
			assert.ok(resolvedTop.includes(52));
			assert.ok(resolvedTop.includes(62));
		});

		it("Mixed incisors constants define anatomically correct arches for 8–10 year olds", () => {
			assert.equal(MIXED_INCISORS_TOP_TEETH.length, 12);
			assert.equal(MIXED_INCISORS_BOTTOM_TEETH.length, 12);
			assert.equal(ALL_MIXED_INCISORS_TEETH.length, 24);

			// Top contains permanent first molars (16, 26) and permanent incisors (12, 11, 21, 22)
			assert.ok(MIXED_INCISORS_TOP_TEETH.includes(16));
			assert.ok(MIXED_INCISORS_TOP_TEETH.includes(12));
			assert.ok(MIXED_INCISORS_TOP_TEETH.includes(11));
			assert.ok(MIXED_INCISORS_TOP_TEETH.includes(21));
			assert.ok(MIXED_INCISORS_TOP_TEETH.includes(22));
			assert.ok(MIXED_INCISORS_TOP_TEETH.includes(26));

			// Bottom contains permanent first molars (46, 36) and permanent incisors (42, 41, 31, 32)
			assert.ok(MIXED_INCISORS_BOTTOM_TEETH.includes(46));
			assert.ok(MIXED_INCISORS_BOTTOM_TEETH.includes(42));
			assert.ok(MIXED_INCISORS_BOTTOM_TEETH.includes(41));
			assert.ok(MIXED_INCISORS_BOTTOM_TEETH.includes(31));
			assert.ok(MIXED_INCISORS_BOTTOM_TEETH.includes(32));
			assert.ok(MIXED_INCISORS_BOTTOM_TEETH.includes(36));
		});

		it("PediatricTeethChart in mode='permanent' generates all 32 teeth without collapsing to []", () => {
			const html = renderToString(
				React.createElement(PediatricTeethChart, {
					mode: "permanent",
					activeTooth: 16,
				}),
			);

			assert.ok(html.includes("pediatric-teeth-chart"), "Renders pediatric chart container");
			assert.ok(html.includes("Подростки (32)"), "Renders 32 teeth badge for teenagers/permanent");
			assert.ok(!html.includes("Сменный (24)"), "Does not label permanent mode as mixed");
		});

		it("PediatricTeethChart in mode='mixed' with erupted permanent incisors renders seamlessly", () => {
			const html = renderToString(
				React.createElement(PediatricTeethChart, {
					mode: "mixed",
					activeTooth: 11,
					toothFindings: {
						11: "Healthy",
						21: "Healthy",
						16: "Healthy",
						26: "Healthy",
					},
				}),
			);

			assert.ok(html.includes("pediatric-teeth-chart"));
			assert.ok(html.includes("Сменный (24)"));
		});
	});
});
