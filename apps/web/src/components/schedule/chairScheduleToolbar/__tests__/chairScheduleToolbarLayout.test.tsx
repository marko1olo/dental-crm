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

  it("renders ChairScheduleToolbar at canonical 48-52px height (h-12 min-h-[48px] max-h-[52px])", () => {
    const html = renderToStaticMarkup(<ChairScheduleToolbar {...defaultProps} />);

    expect(html).toContain('data-testid="chair-schedule-palette-strip"');
    expect(html).toContain("h-12");
    expect(html).toContain("min-h-[48px]");
    expect(html).toContain("max-h-[52px]");
    expect(html).toContain("flex-nowrap");
  });

  it("renders ChairScheduleQuickActions with 36px rounded-xl controls and design tokens", () => {
    const html = renderToStaticMarkup(<ChairScheduleQuickActions {...defaultProps} />);

    // Segmented switcher
    expect(html).toContain('data-testid="schedule-density-switcher"');
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("max-h-[36px]");
    expect(html).toContain("rounded-xl");

    // All density buttons present
    expect(html).toContain('data-testid="btn-density-compact"');
    expect(html).toContain('data-testid="btn-density-informative"');
    expect(html).toContain('data-testid="btn-density-expanded"');

    // Shifts dropdown trigger 36px rounded-xl
    expect(html).toContain('data-testid="btn-chair-shifts-menu-trigger"');
    expect(html).toContain("min-h-[36px]");

    // Primary CTA "+ Кресло"
    expect(html).toContain('data-testid="btn-add-chair-header"');
    expect(html).toContain("var(--primary)");

    // Actions visible on 2xl
    expect(html).toContain('data-testid="chair-toolbar-find-slots-btn"');
    expect(html).toContain('data-testid="btn-open-chair-roster"');
    expect(html).toContain('data-testid="btn-chair-view-add-doctor"');
    expect(html).toContain('data-testid="btn-chair-more-menu-trigger"');
  });

  it("renders ChairScheduleFilterChips with 34-36px rounded-xl chips, badges and branch selector", () => {
    const html = renderToStaticMarkup(<ChairScheduleFilterChips {...defaultProps} />);

    // Count badge
    expect(html).toContain('data-testid="chair-view-count-badge"');
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("rounded-xl");

    // Branch select
    expect(html).toContain('data-testid="chair-view-branch-select"');
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("rounded-xl");

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
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("rounded-xl");
  });

  it("renders ChairScheduleDatePicker with 36px rounded-xl stepper buttons", () => {
    const html = renderToStaticMarkup(
      <ChairScheduleDatePicker
        dateKey={defaultProps.dateKey}
        onDateChange={defaultProps.onDateChange}
      />
    );

    expect(html).toContain('data-testid="chair-schedule-date-stepper"');

    // Prev button
    expect(html).toContain('data-testid="btn-chair-date-prev"');
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("max-h-[36px]");
    expect(html).toContain("rounded-xl");

    // Today button
    expect(html).toContain('data-testid="btn-chair-date-today"');
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("rounded-xl");

    // Next button
    expect(html).toContain('data-testid="btn-chair-date-next"');
    expect(html).toContain("min-h-[36px]");
    expect(html).toContain("rounded-xl");
  });
});
