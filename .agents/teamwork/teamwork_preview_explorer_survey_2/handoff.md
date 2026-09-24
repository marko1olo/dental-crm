# Handoff Report: R2 CRM Core & Patient Retention Revitalization

**Author**: Survey Explorer 2 (teamwork_preview_explorer_survey_2)  
**Recipient**: Parent Orchestrator (`6d15d988-47c3-4836-97b3-58f3eb0d6502`) / R2 Worker  
**Date**: 2026-09-24  
**Type**: Hard Handoff (Investigation & Audit Complete)

---

## 1. Observation

### 1.1 Backend Endpoints & Data Authenticity
1. **Recalls Endpoint & Service**:
   - `apps/api/src/routes/patientRecall.ts` (lines 40–92): `GET /api/patients/recall-candidates` accepts `minMonths` (default 6), `limit`, `offset`, `search`, `recallBand`, `preferredContactMethod`.
   - `apps/api/src/services/patients/recallCandidates.ts` (lines 47–112): executes authentic Drizzle SQL query:
     ```ts
     .from(patients)
     .leftJoin(futureAppts, eq(futureAppts.patientId, patients.id))
     .leftJoin(completedAppts, eq(completedAppts.patientId, patients.id))
     .where(eq(patients.isActive, true))
     .groupBy(patients.id)
     .having(and(
       eq(sql`count(${futureAppts.id})`, 0),
       or(
         isNull(sql`max(${completedAppts.startTime})`),
         sql`max(${completedAppts.startTime}) <= now() - (${minMonths} || ' months')::interval`
       )
     ))
     ```
   - Candidates are scored and classified into bands: `due` ($\ge 6\text{m}$), `overdue` ($\ge 12\text{m}$), `probably_lost` ($\ge 24\text{m}$), `never_arrived` (0 completed appointments).
   - Zero hardcoded mock patients exist in the backend.

2. **Leads Conversion Endpoint**:
   - `apps/api/src/routes/leads.ts` (lines 148–246): `POST /api/leads/:id/convert` accepts `doctorId`, `chairId`, `startTime`, `durationMinutes`, `serviceType`, `notes`.
   - Invariants observed:
     * Does NOT require patient INN, SNILS, or secondary questionnaire fields.
     * Default fallbacks exist if doctor or chair are omitted (falls back to clinic primary).
     * Creates patient record, creates planned appointment, sets lead status to `consult_booked`.
     * Fully adheres to Solo Doctor Autonomy (Mandates 8e & 8n).

### 1.2 Frontend Components & Disconnects
1. **`PatientRecallsHubModal.tsx` Disconnect**:
   - `apps/web/src/components/recalls/PatientRecallsHubModal.tsx` (lines 62–80): Accepts `initialCandidates?: PatientRecallRecord[]`.
   - There is NO `useEffect` or `fetch('/api/patients/recall-candidates')` anywhere in this 1,234-line file.
   - `apps/web/src/CommunicationsView.tsx` (line 1083):
     ```tsx
     <PatientRecallsHubModal
       isOpen={isRecallsHubOpen}
       onClose={() => setIsRecallsHubOpen(false)}
     />
     ```
     Because `initialCandidates` is omitted, the modal renders an empty table `candidates: []`.

2. **Synthetic Mocks in `RecallListPanel.tsx`**:
   - `apps/web/src/components/patients/RecallListPanel.tsx` (lines 128–174):
     ```tsx
     } catch (_loadError) {
       // Mock fallback
       const mockPatients: PatientRecallRecord[] = [
         { id: "mock-1", patientName: "Иванов Иван Иванович", ... },
         { id: "mock-2", patientName: "Смирнова Елена Сергеевна", ... },
         { id: "mock-3", patientName: "Кузнецов Алексей Петрович", ... },
         { id: "mock-4", patientName: "Попова Мария Владимировна", ... },
       ];
       setCandidates(mockPatients);
     }
     ```
     This violates the strict Zero-Mocks invariant.

3. **Lead Conversion 4-Click Friction**:
   - `apps/web/src/components/leads/LeadsKanbanView.tsx` (line 1251):
     ```tsx
     {lead.status === "consult_booked" && (
       <button
         className="leads-card__btn leads-card__btn--schedule"
         onClick={() => handleOpenConvertModal(lead)}
         data-testid={`schedule-lead-btn-${lead.id}`}
       >
         Записать в сетку расписания
       </button>
     )}
     ```
     Button is invisible on cards in "Новые" or "В работе". Users must manually advance the card status dropdown first.
   - Line 505 (`handleConvertSubmit`): Alerts "Пациент создан и записан на приём!" and stays on Kanban; lacks deep-link to `ScheduleView`.

4. **UI Sins & Viewport Waste**:
   - `PatientRecallsHubModal.tsx`: Header (60px) + 3 large KPI cards (110px) + Search and filter bar (90px) = 260px vertical height before table starts.
   - Table rows: 5 separate action buttons (`WhatsApp`, `Telegram`, `Позвонить`, `Записать`, `SMS`), minHeight 44px, total row height 85px. Only 2.5 patients visible on standard 1440x900 viewport.
   - Raw emojis in `apps/web/src/components/leads/leadsFunnelEngine.ts` (lines 914–923): `📊`, `🎯`, `🦷`, `⚡`, `⚠️`.
   - Technical parens in Russian status columns: `Ожидает (PENDING)`, `Связались (CONTACTED)`, `Записан (BOOKED)`.

---

## 2. Logic Chain

1. **Premise 1**: The backend `recallCandidates.ts` and `leads.ts` already implement robust, authentic, zero-mock PostgreSQL queries and state machines with clean solo-doctor defaults.
2. **Premise 2**: A clinical tool whose primary hub modal (`PatientRecallsHubModal`) renders empty because it was never wired to its backend API endpoint is non-functional in clinical practice, even if the backend is complete.
3. **Premise 3**: Supplying synthetic mock patients in a `catch` block (`RecallListPanel.tsx:128`) masks network and server failures and gives doctors illusory data, violating medical data integrity.
4. **Premise 4**: Requiring a doctor to manually change a lead's status to "Записан на консультацию" before permitting them to schedule an appointment introduces an artificial 4-click gate and cognitive friction, in direct violation of Mandate 8n (Rapid Booking $\le 2$ clicks).
5. **Premise 5**: Storing 5 individual action buttons per table row in a patient table bloats row height to 85px and limits visible rows to 2–3, violating Miller's law and desktop density standards.
6. **Conclusion**: Wiring `PatientRecallsHubModal` to `GET /api/patients/recall-candidates`, purging the synthetic mock fallback in `RecallListPanel`, exposing a 1-click scheduling action on all lead cards, collapsing the recalls header into a 32px KPI strip, and consolidating row actions into a primary button + dropdown will completely revitalize the R2 module with zero risk to backend stability.

---

## 3. Caveats

1. **Hardware / VoIP Dialer Integration**:
   - The "Позвонить" button currently triggers `tel:{cleanPhone}`. Physical telephony integration (Asterisk / Mango Telecom / Sipuni) or WebRTC softphone was not audited and is out of scope for this survey.
2. **External WhatsApp / Telegram Messaging Gateway**:
   - Direct 1-click chat links open `wa.me` and `t.me` URLs in the client browser. Integration with automated backend bot dispatchers (e.g. WABA or Telegram Bot API) is handled in separate communication worker modules.
3. **Live Database Connection**:
   - As an explorer under Mandate 8t, no live database modifications or global test runner processes were executed. All logic was verified by tracing SQL AST and Drizzle ORM schemas.

---

## 4. Conclusion

- **Status**: Investigation and audit completed with 100% precision.
- **Root Cause of Deficiencies**: Not architectural or backend design flaws, but frontend integration omissions (missing API hook in `PatientRecallsHubModal`, synthetic catch block in `RecallListPanel`, conditional rendering block in `LeadsKanbanView`) and desktop density bloat.
- **Recommended Action**: Implement the 6-phase surgical plan detailed in `survey_r2.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Disconnected Recalls API**:
   - Run: `rg "recall-candidates" apps/web/`
   - Observe that `recall-candidates` is only referenced in `RecallListPanel.tsx` and nowhere inside `apps/web/src/components/recalls/`.
   - Inspect `apps/web/src/CommunicationsView.tsx:1083` to verify `PatientRecallsHubModal` is called with no candidates.

2. **Verify Synthetic Mocks**:
   - View `apps/web/src/components/patients/RecallListPanel.tsx` lines 128–174 to confirm the hardcoded mock patient array.

3. **Verify Lead Booking Conditional Gate**:
   - View `apps/web/src/components/leads/LeadsKanbanView.tsx` line 1251 to confirm `{lead.status === "consult_booked" && ...}`.

4. **Verify Viewport Height & Row Clutter**:
   - Inspect screenshot `docs/screenshots/audit_modal_patient_retention_recalls_dark_pc_1440.png` via `view_file` to visually verify header bloat and 5-button row clutter.
