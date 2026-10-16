import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChairScheduleToolbar } from "../../ChairScheduleToolbar";
import { ChairScheduleDatePicker } from "../ChairScheduleDatePicker";
import { ChairScheduleFilterChips } from "../ChairScheduleFilterChips";
import { ChairScheduleQuickActions } from "../ChairScheduleQuickActions";

describe("ChairScheduleToolbar Layout & Rotten Seeds Law (Red Team Verification)", () => {
  const mockChairs = [
    { id: "chair-1", name: "Кресло 1", active: true, color: "#0d9488" },
    { id: "chair-2", name: "Кресло 2", active: true, color: "#3b82f6" },
  ];

  const defaultProps: any = {
    chairs: mockChairs,
    isSoloDoctor: false,
    rawBranches: [{ id: "b-1", name: "Главный филиал" }, { id: "b-2", name: "Запад" }],
    hasMultipleBranches: true,
    selectedBranchId: null,
    onSelectBranch: vi.fn(),
    effectiveSelectedChairId: null,
    handleToggleChairFilter: vi.fn(),
    chairDoctorAssignments: {},
    dashboard: { clinicSettings: { staff: [], chairs: mockChairs } },
    activeShiftChairId: null,
    setActiveShiftChairId: vi.fn(),
    handleEditChair: vi.fn(),
    popoverRef: { current: null },
    doctors: [{ id: "doc-1", fullName: "Иванов Иван Иванович" }],
    popoverSelectedDocId: {},
    setPopoverSelectedDocId: vi.fn(),
    dateKey: "2026-10-13",
    onDateChange: vi.fn(),
    handleAssignShift: vi.fn(),
    handleUnassignShift: vi.fn(),
    handleDuplicateChair: vi.fn(),
    isSubstituteOpen: {},
    setIsSubstituteOpen: vi.fn(),
    handleQuickSubstituteDoctor: vi.fn(),
    handleOpenAddChair: vi.fn(),
    isShiftsMenuOpen: false,
    setIsShiftsMenuOpen: vi.fn(),
    shiftsMenuRef: { current: null },
    handleCopyTodayShiftsToCurrentWeek: vi.fn(),
    handleCopyTodayShiftsToMonth: vi.fn(),
    handleRotateChairShifts: vi.fn(),
    handleApplyDoctorPreferredChairs: vi.fn(),
    handleCopyWeekShiftsToNextWeek: vi.fn(),
    setIsDateRangeModalOpen: vi.fn(),
    handleClearAllDayShifts: vi.fn(),
    onOpenRosterModal: vi.fn(),
    setIsAddDoctorOpen: vi.fn(),
    onOpenDoctorFreeSlots: vi.fn(),
    onOpenPreventiveInspection: vi.fn(),
    preventiveInspectionCount: 3,
  };

  it("renders ChairScheduleToolbar at canonical height and layout structure", () => {
    const html = renderToStaticMarkup(<ChairScheduleToolbar {...defaultProps} />);

    expect(html).toContain('data-testid="chair-schedule-palette-strip"');
    expect(html).toContain("border-b");
    expect(html).toContain("bg-[var(--paper-soft)]");
    expect(html).toContain("flex-nowrap");
  });

  it("renders ChairScheduleQuickActions with canonical button primitives and design tokens", () => {
    const html = renderToStaticMarkup(<ChairScheduleQuickActions {...defaultProps} />);

    // Segmented switcher
    expect(html).toContain('data-testid="schedule-density-switcher"');

    // All density buttons present
    expect(html).toContain('data-testid="btn-density-compact"');
    expect(html).toContain('data-testid="btn-density-informative"');
    expect(html).toContain('data-testid="btn-density-expanded"');

    // Shifts dropdown trigger uses canonical secondary-button
    expect(html).toContain('data-testid="btn-chair-shifts-menu-trigger"');
    expect(html).toContain("secondary-button");
    expect(html).toContain("var(--teal)");

    // Primary CTA "+ Кресло" uses canonical primary-button
    expect(html).toContain('data-testid="btn-add-chair-header"');
    expect(html).toContain("primary-button");

    // Actions visible on 2xl
    expect(html).toContain('data-testid="chair-toolbar-find-slots-btn"');
    expect(html).toContain('data-testid="btn-open-chair-roster"');
    expect(html).toContain('data-testid="btn-chair-view-add-doctor"');
    expect(html).toContain('data-testid="btn-chair-more-menu-trigger"');
  });

  it("renders ChairScheduleFilterChips with chips, badges and branch selector", () => {
    const html = renderToStaticMarkup(<ChairScheduleFilterChips {...defaultProps} />);

    // Count badge
    expect(html).toContain('data-testid="chair-view-count-badge"');

    // Branch select
    expect(html).toContain('data-testid="chair-view-branch-select"');

    // Chair chips
    expect(html).toContain('data-testid="chair-view-badge-chair-1"');
    expect(html).toContain('data-testid="chair-view-badge-chair-2"');
    expect(html).toContain('data-testid="chair-view-accent-strip-chair-1"');
    expect(html).toContain("rounded-t-xl");

    // Unstaffed badge "+ Врач"
    expect(html).toContain('data-testid="chair-view-unstaffed-badge-chair-1"');
    expect(html).toContain("+ Врач");

    // Strip "+ Кресло" button
    expect(html).toContain('data-testid="chair-view-add-chair-strip-btn"');
  });

  it("renders ChairScheduleDatePicker with canonical icon-button and secondary-button stepper", () => {
    const html = renderToStaticMarkup(
      <ChairScheduleDatePicker
        dateKey={defaultProps.dateKey}
        onDateChange={defaultProps.onDateChange}
      />
    );

    expect(html).toContain('data-testid="chair-schedule-date-stepper"');

    // Prev button
    expect(html).toContain('data-testid="btn-chair-date-prev"');
    expect(html).toContain("icon-button");

    // Today button
    expect(html).toContain('data-testid="btn-chair-date-today"');
    expect(html).toContain("secondary-button");

    // Next button
    expect(html).toContain('data-testid="btn-chair-date-next"');
    expect(html).toContain("icon-button");
  });
});
