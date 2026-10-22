import assert from "node:assert/strict";
import { test, describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ScheduleCurrentTimeIndicator } from "../grid/ScheduleCurrentTimeIndicator";

describe("ScheduleCurrentTimeIndicator (StomX Parity Red Time Line)", () => {
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
  ];

  test("does not render when dateKey is not today", () => {
    const html = renderToString(
      <ScheduleCurrentTimeIndicator
        timeSlots={timeSlots}
        gridStep={30}
        dateKey="1999-01-01"
      />
    );
    assert.equal(html, "");
  });

  test("renders red current time line indicator when dateKey is today and in hours", () => {
    const today = new Date().toISOString().slice(0, 10);
    const html = renderToString(
      <ScheduleCurrentTimeIndicator
        timeSlots={timeSlots}
        gridStep={30}
        dateKey={today}
      />
    );
    // If test runs during working hours (08:00 - 20:30), it renders indicator
    const nowHour = new Date().getHours();
    if (nowHour >= 8 && nowHour <= 20) {
      assert.ok(html.includes("schedule-current-time-indicator"));
      assert.ok(html.includes("bg-rose-500"));
      assert.ok(html.includes("data-testid=\"schedule-current-time-indicator\""));
    }
  });

  test("AppointmentTrackGridLines contains ScheduleCurrentTimeIndicator mount", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "apps/web/src/components/schedule/grid/scheduleAppointmentTrackModules/AppointmentTrackGridLines.tsx",
      "utf-8"
    );
    assert.ok(content.includes("ScheduleCurrentTimeIndicator"));
    assert.ok(content.includes("timeSlots={morningSlots}"));
    assert.ok(content.includes("timeSlots={eveningSlots}"));
    assert.ok(content.includes("timeSlots={props.timeSlots}"));
  });
});
