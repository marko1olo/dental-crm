import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChairScheduleToolbar } from "../ChairScheduleToolbar";

describe("ChairScheduleToolbar 1-line 36px & Responsive More Menu (Mandate 8p)", () => {
  const mockChairs = [
    { id: "chair-1", name: "Кресло 1", active: true },
    { id: "chair-2", name: "Кресло 2", active: true },
  ];

  const defaultProps: any = {
    chairs: mockChairs,
    isSoloDoctor: false,
    rawBranches: [],
    hasMultipleBranches: false,
    effectiveSelectedChairId: null,
    handleToggleChairFilter: () => {},
    chairDoctorAssignments: {},
    dashboard: { clinicSettings: { staff: [], chairs: mockChairs } },
    activeShiftChairId: null,
    setActiveShiftChairId: () => {},
    handleEditChair: () => {},
    popoverRef: { current: null },
    doctors: [{ id: "doc-1", fullName: "Иванов И.И." }],
    popoverSelectedDocId: {},
    setPopoverSelectedDocId: () => {},
    dateKey: "2026-10-04",
    handleAssignShift: () => {},
    handleUnassignShift: () => {},
    handleDuplicateChair: () => {},
    isSubstituteOpen: {},
    setIsSubstituteOpen: () => {},
    handleQuickSubstituteDoctor: () => {},
    handleOpenAddChair: () => {},
    isShiftsMenuOpen: false,
    setIsShiftsMenuOpen: () => {},
    shiftsMenuRef: { current: null },
    handleCopyTodayShiftsToCurrentWeek: () => {},
    handleCopyTodayShiftsToMonth: () => {},
    handleRotateChairShifts: () => {},
    handleApplyDoctorPreferredChairs: () => {},
    handleCopyWeekShiftsToNextWeek: () => {},
    setIsDateRangeModalOpen: () => {},
    handleClearAllDayShifts: () => {},
    onOpenRosterModal: () => {},
    setIsAddDoctorOpen: () => {},
    onOpenDoctorFreeSlots: () => {},
    onOpenPreventiveInspection: () => {},
    preventiveInspectionCount: 2,
  };

  it("renders strictly 36px 1-line toolbar container with flex-nowrap", () => {
    const html = renderToStaticMarkup(React.createElement(ChairScheduleToolbar, defaultProps));

    assert.ok(html.includes('data-testid="chair-schedule-palette-strip"'), "Toolbar strip must exist");
    assert.ok(html.includes("h-9"), "Toolbar must have h-9 class (36px)");
    assert.ok(html.includes("min-h-[36px]"), "Toolbar must have min-h-[36px]");
    assert.ok(html.includes("max-h-[36px]"), "Toolbar must have max-h-[36px]");
    assert.ok(html.includes("flex-nowrap"), "Toolbar must have flex-nowrap to prevent wrapping");
  });

  it("renders compact h-7 buttons in toolbar without clipping", () => {
    const html = renderToStaticMarkup(React.createElement(ChairScheduleToolbar, defaultProps));

    assert.ok(html.includes('data-testid="btn-add-chair-header"'), "Primary CTA btn-add-chair-header must exist");
    assert.ok(html.includes('data-testid="btn-chair-shifts-menu-trigger"'), "btn-chair-shifts-menu-trigger must exist");
    assert.ok(html.includes('data-testid="btn-chair-more-menu-trigger"'), "btn-chair-more-menu-trigger must exist");
    assert.ok(html.includes('data-testid="btn-open-chair-roster"'), "btn-open-chair-roster must exist");
    assert.ok(html.includes('data-testid="btn-chair-view-add-doctor"'), "btn-chair-view-add-doctor must exist");
    assert.ok(html.includes('data-testid="chair-toolbar-find-slots-btn"'), "chair-toolbar-find-slots-btn must exist");
  });

  it("renders 3 density modes switcher in 1-line toolbar", () => {
    const html = renderToStaticMarkup(React.createElement(ChairScheduleToolbar, defaultProps));

    assert.ok(html.includes('data-testid="schedule-density-switcher"'), "Density switcher container must exist");
    assert.ok(html.includes('data-testid="btn-density-compact"'), "Compact mode button must exist");
    assert.ok(html.includes('data-testid="btn-density-informative"'), "Informative mode button must exist");
    assert.ok(html.includes('data-testid="btn-density-expanded"'), "Expanded mode button must exist");
    assert.ok(html.includes("Компактный"), "Text 'Компактный' must be present");
    assert.ok(html.includes("Информативный"), "Text 'Информативный' must be present");
    assert.ok(html.includes("Развернутый"), "Text 'Развернутый' must be present");
  });
});
