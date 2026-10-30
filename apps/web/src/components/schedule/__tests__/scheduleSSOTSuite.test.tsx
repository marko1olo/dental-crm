/**
 * scheduleSSOTSuite.test.tsx — Red Team тестирование SSOT расписания, сетки кресел и экспресс-бронирования
 * Мандаты 8b, 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8am (Single Primary CTA), 8aq (Mounted in UI).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  CHAIR_PRESETS,
  APPOINTMENT_STATUS_OPTIONS,
  SCHEDULE_DURATION_OPTIONS,
  checkSlotCollision,
  generateDailyTimeSlots,
  parseTimeToMinutes,
  formatMinutesToTime,
  getStatusMeta,
} from "../scheduleCatalogData";
import { ChairScheduleStudioModal } from "../ChairScheduleStudioModal";
import { DirectScheduleLauncher } from "../DirectScheduleLauncher";

describe("SSOT Schedule & Chair Grid Inquisition (Mandates 8e, 8n, 8am)", () => {
  it("verifies chair presets conform to Mandate 8n (Solo practitioner & 1-3 chairs sovereign scale)", () => {
    assert.strictEqual(CHAIR_PRESETS.length, 3, "Must provide exactly 3 primary chairs");
    assert.strictEqual(CHAIR_PRESETS[0]?.id, "chair-1");
    assert.strictEqual(CHAIR_PRESETS[0]?.name, "Кресло 1");
    assert.strictEqual(CHAIR_PRESETS[1]?.id, "chair-2");
    assert.strictEqual(CHAIR_PRESETS[2]?.id, "chair-3");

    // All chairs must have active status and clinical specialties
    for (const chair of CHAIR_PRESETS) {
      assert.ok(chair.specialty.length > 0, `Chair ${chair.name} must have a specialty`);
      assert.ok(chair.roomNumber.length > 0, `Chair ${chair.name} must have a room number`);
      assert.strictEqual(chair.isActive, true, `Chair ${chair.name} must be active`);
    }
  });

  it("verifies canonical appointment status meta and clean Russian localization (Mandate 8x)", () => {
    const requiredCodes = ["planned", "confirmed", "arrived", "in_progress", "completed", "no_show", "cancelled"];
    for (const code of requiredCodes) {
      const meta = getStatusMeta(code);
      assert.strictEqual(meta.code, code);
      assert.ok(meta.label.length > 0, `Status ${code} must have a Russian label`);
      assert.ok(!meta.label.includes("приказ"), "No Soviet order numbers in status labels");
      assert.ok(!meta.label.includes("ФЗ"), "No legal articles in status labels");
    }
  });

  it("verifies Zero Overlap Collision Guard detects intersecting slots correctly", () => {
    const existingSlots = [
      { id: "s1", chairId: "chair-1", startMinutes: 600, endMinutes: 660 }, // 10:00 - 11:00
      { id: "s2", chairId: "chair-2", startMinutes: 600, endMinutes: 660 }, // 10:00 - 11:00 (chair-2)
    ];

    // Overlapping slot in chair-1 (10:30 - 11:30 = 630 - 690)
    const collision1 = checkSlotCollision(
      { chairId: "chair-1", startMinutes: 630, endMinutes: 690 },
      existingSlots,
    );
    assert.strictEqual(collision1.hasCollision, true, "Must detect overlap in chair-1");
    assert.strictEqual(collision1.conflictingSlot?.id, "s1");

    // Same time in chair-3 (no conflict)
    const noCollisionDiffChair = checkSlotCollision(
      { chairId: "chair-3", startMinutes: 630, endMinutes: 690 },
      existingSlots,
    );
    assert.strictEqual(noCollisionDiffChair.hasCollision, false, "Different chair must not collide");

    // Exact adjacent slot (стык в стык: 11:00 - 12:00 = 660 - 720) -> NO collision
    const adjacentSlot = checkSlotCollision(
      { chairId: "chair-1", startMinutes: 660, endMinutes: 720 },
      existingSlots,
    );
    assert.strictEqual(adjacentSlot.hasCollision, false, "Adjacent back-to-back slot must not collide");
  });

  it("verifies daily time slots generator and time conversion helpers", () => {
    assert.strictEqual(parseTimeToMinutes("09:30"), 570);
    assert.strictEqual(formatMinutesToTime(570), "09:30");
    assert.strictEqual(parseTimeToMinutes("14:15"), 855);
    assert.strictEqual(formatMinutesToTime(855), "14:15");

    const slots = generateDailyTimeSlots(9, 12, 30);
    assert.deepStrictEqual(slots, ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("renders ChairScheduleStudioModal with non-blocking Mandate 8e/8n controls", () => {
    const html = renderToString(
      <ChairScheduleStudioModal isOpen={true} onClose={() => {}} />,
    );

    // Dialog root must render
    assert.ok(html.includes('data-testid="chair-schedule-studio-modal"'));
    assert.ok(html.includes("Расписание приёмов"));
    assert.ok(html.includes("Все кресла"));
    assert.ok(html.includes("Кресло 1"));
    assert.ok(html.includes("Кресло 2"));
    assert.ok(html.includes("Кресло 3"));

    // Mandate 8n: zero requirement for assistant or chief medical officer
    assert.ok(!html.includes("Обязательный ассистент"));
    assert.ok(!html.includes("Начмед"));

    // Mandate 8e: zero disabled buttons in schedule
    assert.ok(!html.includes('disabled=""'), "No disabled buttons permitted in schedule");
  });

  it("verifies DirectScheduleLauncher renders when active or returns null cleanly", () => {
    // In server environment without active hash, launcher returns null
    const html = renderToString(<DirectScheduleLauncher />);
    assert.strictEqual(html, "");
  });
});
