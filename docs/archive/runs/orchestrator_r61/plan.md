# Orchestrator Plan — Round 61

## Objective
Full elimination of prop-drilling in App.tsx and integration of views (VisitView, FinanceView, CommunicationsView, DocumentsView, PatientsView, ShiftView) with useAppLogicContext().
Cleanup of hundreds of lines of unused appLogicValue destructuring in App.tsx without breaking internal logic, reactivity, or memoization.
Complete machine verification gates (check:encoding, typecheck web & api, tests).
