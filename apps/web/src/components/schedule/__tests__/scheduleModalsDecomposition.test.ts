import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "../../..");

describe("Schedule Modals & Appointment Monolith Decomposition Suite (/decomposer)", () => {
  it("1. enforces AppointmentModal.tsx facade <= 250 lines", () => {
    const file = path.join(
      webSrcDir,
      "components/schedule/AppointmentModal.tsx",
    );
    assert.ok(fs.existsSync(file), "AppointmentModal.tsx must exist");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
    assert.ok(
      lines <= 250,
      `AppointmentModal.tsx facade must be <= 250 lines, got ${lines}`,
    );
  });

  it("2. enforces all modules in appointmentModalModules/ <= 500 lines", () => {
    const dir = path.join(
      webSrcDir,
      "components/schedule/appointmentModalModules",
    );
    assert.ok(fs.existsSync(dir), "appointmentModalModules dir must exist");
    const getAllFiles = (d: string): string[] => {
      const results: string[] = [];
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          results.push(...getAllFiles(full));
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          results.push(full);
        }
      }
      return results;
    };
    const files = getAllFiles(dir);
    assert.ok(files.length >= 4, "Must contain all decomposed modules");

    for (const fullPath of files) {
      const rel = path.relative(dir, fullPath).replace(/\\/g, "/");
      const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).length;
      assert.ok(
        lines <= 500,
        `Module appointmentModalModules/${rel} must be <= 500 lines, got ${lines}`,
      );
    }
  });

  it("3. enforces ScheduleViewModals.tsx facade <= 250 lines", () => {
    const file = path.join(
      webSrcDir,
      "components/schedule/view/ScheduleViewModals.tsx",
    );
    assert.ok(fs.existsSync(file), "ScheduleViewModals.tsx must exist");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
    assert.ok(
      lines <= 250,
      `ScheduleViewModals.tsx facade must be <= 250 lines, got ${lines}`,
    );
  });

  it("4. enforces all modules in scheduleModalsModules/ <= 500 lines", () => {
    const dir = path.join(
      webSrcDir,
      "components/schedule/view/scheduleModalsModules",
    );
    assert.ok(fs.existsSync(dir), "scheduleModalsModules dir must exist");
    const files = fs.readdirSync(dir);
    assert.ok(files.length >= 4, "Must contain all decomposed modules");

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).length;
      assert.ok(
        lines <= 500,
        `Module scheduleModalsModules/${file} must be <= 500 lines, got ${lines}`,
      );
    }
  });

  it("5. preserves AppointmentModal public runtime exports", { timeout: 30000 }, async () => {
    const mod = await import("../AppointmentModal.js");
    assert.equal(typeof mod.AppointmentModal, "function");
    assert.equal(typeof mod.resolveChairDutyDoctor, "function");
    assert.ok(Array.isArray(mod.QUICK_APPOINTMENT_REASONS));
    assert.ok(Array.isArray(mod.TECHNICAL_BREAK_PRESETS));
    assert.equal(typeof mod.isTechnicalBreakAppointment, "function");
  });

  it("6. preserves ScheduleViewModals public runtime exports", { timeout: 30000 }, async () => {
    const mod = await import("../view/ScheduleViewModals.js");
    assert.equal(typeof mod.ScheduleViewModals, "function");
  });
});
