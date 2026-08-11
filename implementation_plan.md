# Phase 8: Final Annihilation of App.tsx Prop-Drilling (Visit, Finance, Communications, Patients, Shift)

The previous phase successfully decoupled `SettingsView`, `DocumentsView`, `ImagingView`, and `ScheduleView`, splitting form buckets into 21 files, and shrinking `App.tsx` by over 1000 lines. 
However, 5 major monolithic views still remain heavily prop-drilled in `App.tsx`:
- `VisitView` (104 props)
- `FinanceView` (59 props)
- `CommunicationsView` (17 props)
- `PatientsView` (15 props)
- `ShiftView` (8 props)

## CTO Directives & Reconnaissance Mandate
In accordance with the "Global System Census" and "Execution Chain Verification" mandates:
1. We cannot blindly assume these views can just switch to Context without breaking internal memoization or prop dependencies.
2. We must verify what internal components rely on these props, and if `useAppLogicContext()` is sufficient.
3. Subagents have been dispatched to map the AST execution chains for these 5 views.

## Proposed Changes

### [MODIFY] `apps/web/src/App.tsx`
- Strip all props passed to `<VisitView>`, `<FinanceView>`, `<CommunicationsView>`, `<PatientsView>`, and `<ShiftView>`.
- Run an automated AST variable cleanup to drop all unused destructuring from `appLogicValue`. This will further reduce `App.tsx` by hundreds of lines.

### [MODIFY] `apps/web/src/VisitView.tsx`
- Remove `VisitViewProps` and `props` destructuring.
- Inject `const appLogic = useAppLogicContext();` and destructure required state.

### [MODIFY] `apps/web/src/FinancePlanning.tsx` (FinanceView)
- Remove `FinanceViewProps` and `props` destructuring.
- Inject `const appLogic = useAppLogicContext();` and destructure required state.

### [MODIFY] `apps/web/src/components/communications/CommunicationsView.tsx`
- Remove `CommunicationsViewProps` and `props` destructuring.
- Inject `const appLogic = useAppLogicContext();` and destructure required state.

### [MODIFY] `apps/web/src/PatientsView.tsx`
- Remove `PatientsViewProps` and `props` destructuring.
- Inject `const appLogic = useAppLogicContext();` and destructure required state.

### [MODIFY] `apps/web/src/components/schedule/ShiftView.tsx`
- Remove `ShiftViewProps` and `props` destructuring.
- Inject `const appLogic = useAppLogicContext();` and destructure required state.

## Verification Plan
1. **Compilation Check**: `npx tsc -b apps/web --noEmit` must return code 0.
2. **Prop Audit**: Verify no instances of `<VisitView` with props remain across the entire codebase.

# Phase 9: Settings Domain Monoliths Decomposition

## The Problem
The Settings domain is the last remaining set of massive monolithic files in the application. 
- SettingsSmartImportTab.tsx (3,500 lines)
- SettingsAuditTab.tsx (3,000 lines)
- SettingsImagingImportTab.tsx (3,500 lines)

These files are single React components containing thousands of lines of JSX, state, and API logic. In accordance with the **Strangler Pattern** and **Domain-Driven Design (DDD)** principles, we must extract these into modular layers (View, Domain Logic, Data).

## CTO Directives & Reconnaissance Mandate
Subagents have been dispatched to map the AST of SettingsSmartImportTab.tsx and SettingsAuditTab.tsx to identify the largest functional chunks that can be safely extracted. 

## Proposed Changes
(Pending subagent reports...)

## Verification Plan
1. **Compilation Check**: npx tsc -b apps/web --noEmit must pass.
2. **Visual Inspection**: UI must remain completely identical.
3. **AST Check**: The source files must be significantly reduced in size.

