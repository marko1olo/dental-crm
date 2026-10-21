import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import * as mod from "../../../ScheduleView.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "../../..");
const facadeFile = path.join(webSrcDir, "ScheduleView.tsx");
const modulesDir = path.join(webSrcDir, "components/schedule/scheduleViewModules");

describe("ScheduleView Monolith Decomposition Suite (/decomposer)", () => {
  it("1. enforces strict Mandate 8b facade line limit (<= 120 lines) on ScheduleView.tsx", () => {
    assert.ok(fs.existsSync(facadeFile), "ScheduleView.tsx facade must exist");
    const content = fs.readFileSync(facadeFile, "utf8");
    const lineCount = content.split(/\r?\n/).length;
    assert.ok(
      lineCount <= 120,
      `ScheduleView.tsx must be <= 120 lines, got ${lineCount}`,
    );
  });

  it("2. enforces strict sub-module line budget (<= 800 lines) across scheduleViewModules/", () => {
    assert.ok(fs.existsSync(modulesDir), "scheduleViewModules directory must exist");
    const requiredFiles = [
      "types.ts",
      "scheduleViewConstants.ts",
      "useScheduleViewController.ts",
      "useScheduleShiftDrawerController.ts",
      "useScheduleFilterSummary.tsx",
      "ScheduleHeaderToolbar.tsx",
      "ScheduleActiveViewPort.tsx",
      "ScheduleModalsLayer.tsx",
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(modulesDir, file);
      assert.ok(fs.existsSync(fullPath), `Required module ${file} is missing`);
      const content = fs.readFileSync(fullPath, "utf8");
      const lineCount = content.split(/\r?\n/).length;
      assert.ok(
        lineCount <= 800,
        `Module ${file} exceeds 800 lines (${lineCount})`,
      );
    }
  });

  it("3. preserves 100% of public runtime exports from ScheduleView facade", () => {
    assert.equal(typeof mod.ScheduleView, "function", "ScheduleView must be a function");
    assert.equal(typeof mod.default, "function", "default export must be ScheduleView");
    assert.equal(
      typeof mod.buildChairDoctorAssignmentsFromShifts,
      "function",
      "buildChairDoctorAssignmentsFromShifts must be exported",
    );
    assert.equal(
      typeof mod.buildChairDoctorAssignmentsByDate,
      "function",
      "buildChairDoctorAssignmentsByDate must be exported",
    );
    assert.ok(
      mod.activeVisitLockedAppointmentStatuses instanceof Set,
      "activeVisitLockedAppointmentStatuses must be a Set",
    );
    assert.ok(
      mod.activeVisitLockedAppointmentStatuses.has("completed"),
      "activeVisitLockedAppointmentStatuses must lock completed status",
    );
  });

  it("4. enforces createPortal(..., document.body) in ScheduleModalsLayer without nested wrapper divs", () => {
    const modalsSource = fs.readFileSync(
      path.join(modulesDir, "ScheduleModalsLayer.tsx"),
      "utf8",
    );
    assert.ok(
      modalsSource.includes("createPortal(") && modalsSource.includes("document.body"),
      "ScheduleModalsLayer must mount modals strictly via createPortal(..., document.body)",
    );

    const headerSource = fs.readFileSync(
      path.join(modulesDir, "ScheduleHeaderToolbar.tsx"),
      "utf8",
    );
    assert.ok(
      headerSource.includes("<>") && headerSource.includes("</>"),
      "ScheduleHeaderToolbar must use React.Fragment to avoid accidental wrapper divs",
    );
  });

  it("5. preserves test anchors and DOM identity attributes across facade and sub-modules", () => {
    const facadeSource = fs.readFileSync(facadeFile, "utf8");
    assert.ok(
      facadeSource.includes('id="schedule"') &&
        facadeSource.includes('data-testid="schedule-view"'),
      "ScheduleView facade must preserve id='schedule' and data-testid='schedule-view'",
    );

    const summarySource = fs.readFileSync(
      path.join(modulesDir, "useScheduleFilterSummary.tsx"),
      "utf8",
    );
    assert.ok(
      summarySource.includes('data-testid="schedule-shift-summary"') &&
        summarySource.includes('aria-label="Короткая сводка смены"'),
      "useScheduleFilterSummary must preserve data-testid='schedule-shift-summary' and aria-label",
    );
  });
});
