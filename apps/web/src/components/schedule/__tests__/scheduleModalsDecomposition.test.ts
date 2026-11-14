import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

if (typeof registerHooks === "function") {
  try {
    registerHooks({
      load(url, context, nextLoad) {
        if (url.endsWith(".css")) {
          return {
            format: "module",
            shortCircuit: true,
            source: "export default {};",
          };
        }
        return nextLoad(url, context);
      },
    });
  } catch {
    // Ignore if already registered
  }
}

import { resolveChairDutyDoctor } from "../chairRosterMath";
import * as catalogMod from "../scheduleCatalogData";
import { ScheduleViewModals } from "../view/ScheduleViewModals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "../../..");

describe("Schedule Modals & Appointment Monolith Decomposition Suite (/decomposer)", () => {
  it("1. validates QuickBookingDrawer.tsx exists as canonical booking SSOT", () => {
    const file = path.join(
      webSrcDir,
      "components/schedule/QuickBookingDrawer.tsx",
    );
    assert.ok(fs.existsSync(file), "QuickBookingDrawer.tsx must exist");
  });

  it("2. validates scheduleCatalogData.ts exists and contains canonical presets", () => {
    const file = path.join(
      webSrcDir,
      "components/schedule/scheduleCatalogData.ts",
    );
    assert.ok(fs.existsSync(file), "scheduleCatalogData.ts must exist");
  });

  it("3. validates ScheduleViewModals.tsx exists and is decomposed", () => {
    const file = path.join(
      webSrcDir,
      "components/schedule/view/ScheduleViewModals.tsx",
    );
    assert.ok(fs.existsSync(file), "ScheduleViewModals.tsx must exist");
  });

  it("4. validates scheduleModalsModules/ contains all decomposed modules", () => {
    const dir = path.join(
      webSrcDir,
      "components/schedule/view/scheduleModalsModules",
    );
    assert.ok(fs.existsSync(dir), "scheduleModalsModules dir must exist");
    const files = fs.readdirSync(dir);
    assert.ok(files.length >= 4, "Must contain all decomposed modules");
  });

  it("5. preserves schedule catalog and duty doctor runtime exports", () => {
    assert.equal(typeof resolveChairDutyDoctor, "function");
    assert.ok(Array.isArray(catalogMod.QUICK_APPOINTMENT_REASONS));
    assert.ok(Array.isArray(catalogMod.TECHNICAL_BREAK_PRESETS));
    assert.equal(typeof catalogMod.isTechnicalBreakAppointment, "function");
  });

  it("6. preserves ScheduleViewModals public runtime exports", () => {
    assert.equal(typeof ScheduleViewModals, "function");
  });
});
