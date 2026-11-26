import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SCREEN_TARGETS } from "../../.agents/skills/visual-audit-pipeline/scripts/screen-targets.mjs";
import {
	runAggregation,
	validateVerdictPayload,
} from "../../.agents/skills/visual-audit-pipeline/scripts/aggregate_verdicts.mjs";
import { compareRounds } from "../../.agents/skills/visual-audit-pipeline/scripts/verify_round_diff.mjs";

function makeFullAxes(defectAxis = null) {
	return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((ax) => ({
		axis: ax,
		status: ax === defectAxis ? "DEFECT" : "CLEAN",
		evidence: `Verified axis ${ax} via screenshot and DOM X-Ray probe`,
	}));
}

describe("Visual Audit Pipeline Infrastructure", () => {
	it("screen-targets.mjs has unique IDs, valid groups, and non-empty hashes", () => {
		assert.ok(SCREEN_TARGETS.length >= 45, `Expected >=45 screen targets, got ${SCREEN_TARGETS.length}`);
		const seenIds = new Set();
		const validGroups = new Set(["views", "overlays", "modals", "portals", "empty"]);
		for (const t of SCREEN_TARGETS) {
			assert.ok(!seenIds.has(t.id), `Duplicate target id: ${t.id}`);
			seenIds.add(t.id);
			assert.ok(validGroups.has(t.group), `Invalid group ${t.group} on ${t.id}`);
			assert.ok(t.hash && t.hash.startsWith("#"), `Target ${t.id} hash must start with '#': ${t.hash}`);
			assert.ok(Array.isArray(t.files) && t.files.length > 0, `Target ${t.id} must declare source files`);
		}
	});

	it("validateVerdictPayload rejects lazy verdicts missing axes or proposals", () => {
		const lazy = {
			targetId: "002",
			domain: "schedule",
			component: "ScheduleView",
			axes: [{ axis: 1, status: "CLEAN", evidence: "ok" }],
			defects: [],
		};
		const errors = validateVerdictPayload(lazy, "lazy.json");
		assert.ok(errors.length > 0, "Expected lazy verdict with 1 axis to be rejected");

		const vagueDefect = {
			targetId: "002",
			domain: "schedule",
			component: "ScheduleView",
			axes: makeFullAxes(2),
			defects: [
				{
					axis: 2,
					severity: "P1",
					scopeType: "DOMAIN_LOCAL",
					observation: "bad",
					designerProposal: "",
				},
			],
		};
		const dErrors = validateVerdictPayload(vagueDefect, "vague.json");
		assert.ok(dErrors.length >= 2, "Expected defect without detailed observation & designerProposal to fail");
	});

	it("aggregate_verdicts preserves every small defect, splits FOUNDATION vs DOMAIN_LOCAL, and reopens recurrences", () => {
		const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "vap-test-"));
		try {
			const verdictsDirR1 = path.join(tmpRoot, "r1_verdicts");
			const verdictsDirR2 = path.join(tmpRoot, "r2_verdicts");
			const outDir = path.join(tmpRoot, "out");
			mkdirSync(verdictsDirR1, { recursive: true });
			mkdirSync(verdictsDirR2, { recursive: true });

			writeFileSync(
				path.join(verdictsDirR1, "002_ScheduleView.json"),
				JSON.stringify({
					targetId: "002",
					domain: "schedule",
					component: "ScheduleView",
					screenshotRef: "round_1/shots/002_desktop_light.png",
					axes: makeFullAxes(1),
					defects: [
						{
							axis: 1,
							severity: "P1",
							scopeType: "DOMAIN_LOCAL",
							viewport: "desktop",
							theme: "light",
							zone: "schedule-toolbar",
							elementSelector: ".schedule-toolbar",
							elementText: "Фильтры",
							fileHint: "apps/web/src/ScheduleView.tsx:45",
							domEvidence: "topChromeHeightPx=210",
							observation: "Суммарная высота трёх шапок 210px превышает бюджет 180px.",
							designerProposal: "Объединить фильтр врачей и зум в одну строку 48px.",
						},
						{
							axis: 6,
							severity: "P0",
							scopeType: "FOUNDATION",
							viewport: "desktop",
							theme: "dark",
							zone: "global-dropdown",
							elementSelector: ".dente-dropdown",
							fileHint: "apps/web/src/styles/dente-redesign.css:300",
							observation: "Белый фон выпадающего списка в Dark Mode (lum=255).",
							designerProposal: "Заменить #ffffff на var(--paper-strong) и border var(--line).",
						},
					],
				}),
			);

			writeFileSync(
				path.join(verdictsDirR1, "003_PatientsView.json"),
				JSON.stringify({
					targetId: "003",
					domain: "patients",
					component: "PatientsView",
					axes: makeFullAxes(null),
					defects: [],
				}),
			);

			const res1 = runAggregation({ round: 1, verdictsDir: verdictsDirR1, outDir });
			assert.equal(res1.processedVerdicts, 2);
			assert.equal(res1.totalActive, 2);
			assert.equal(res1.foundationCount, 1);
			assert.deepEqual(res1.domainBatches, ["schedule"]);

			const ledger1 = JSON.parse(readFileSync(res1.ledgerPath, "utf8"));
			assert.deepEqual(ledger1.protectedCleanTargets, ["003_PatientsView"]);
			assert.equal(ledger1.defects[0].id, "VAP-R1-0001");
			assert.equal(ledger1.defects[1].id, "VAP-R1-0002");

			// Simulate fixer marking VAP-R1-0001 FIXED before Round 2
			ledger1.defects[0].status = "FIXED";
			writeFileSync(res1.ledgerPath, JSON.stringify(ledger1, null, 2));

			// Round 2 still reports the same schedule toolbar defect -> must REOPEN
			writeFileSync(
				path.join(verdictsDirR2, "002_ScheduleView.json"),
				readFileSync(path.join(verdictsDirR1, "002_ScheduleView.json")),
			);
			const res2 = runAggregation({ round: 2, verdictsDir: verdictsDirR2, outDir });
			const ledger2 = JSON.parse(readFileSync(res2.ledgerPath, "utf8"));
			const reopened = ledger2.defects.find((d) => d.id === "VAP-R1-0001");
			assert.equal(reopened.status, "REOPENED");
			assert.equal(reopened.lastSeenRound, 2);
		} finally {
			rmSync(tmpRoot, { recursive: true, force: true });
		}
	});

	it("verify_round_diff detects improvements and regressions accurately", () => {
		const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "vap-diff-"));
		try {
			const r1 = path.join(tmpRoot, "round_1", "shots");
			const r2 = path.join(tmpRoot, "round_2", "shots");
			mkdirSync(r1, { recursive: true });
			mkdirSync(r2, { recursive: true });

			writeFileSync(
				path.join(r1, "002_schedule_ScheduleView_390x844_light.metrics.json"),
				JSON.stringify({
					dom: {
						horizontalOverflowPx: 14,
						clippedTextsCount: 3,
						undersizedTargetsCount: 2,
						allCapsViolationsCount: 1,
						inputIconOverlapsCount: 0,
						darkModeWhiteBlobsCount: 0,
						overlappingControlsCount: 0,
						primaryCtaCount: 1,
					},
					consoleErrors: [],
				}),
			);

			writeFileSync(
				path.join(r2, "002_schedule_ScheduleView_390x844_light.metrics.json"),
				JSON.stringify({
					dom: {
						horizontalOverflowPx: 0,
						clippedTextsCount: 0,
						undersizedTargetsCount: 4, // REGRESSION: 2 -> 4
						allCapsViolationsCount: 0,
						inputIconOverlapsCount: 0,
						darkModeWhiteBlobsCount: 0,
						overlappingControlsCount: 0,
						primaryCtaCount: 1,
					},
					consoleErrors: [],
				}),
			);

			const diff = compareRounds({
				prevRound: 1,
				currRound: 2,
				artifactsRoot: tmpRoot,
				outFile: path.join(tmpRoot, "diff.md"),
			});
			assert.equal(diff.improvements.length, 3);
			assert.equal(diff.regressions.length, 1);
			assert.equal(diff.regressions[0].prev, 2);
			assert.equal(diff.regressions[0].curr, 4);
		} finally {
			rmSync(tmpRoot, { recursive: true, force: true });
		}
	});
});
