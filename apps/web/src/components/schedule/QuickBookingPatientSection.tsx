import type { Dashboard, Patient } from "@dental/shared";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CreditCard,
  FileText,
  Flame,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  X,
} from "lucide-react";
import React from "react";
import { printBlankMedicalContract } from "../patients/blankContractPrint";
import type { PotentialDuplicateItem } from "./patientSearchEngine";
import {
  calculatePatientReliability,
  type PatientReliabilityAssessment,
} from "./patientReliabilityScore";
import { QuickBookingInlinePatientForm } from "./QuickBookingInlinePatientForm";

export interface QuickBookingPatientSectionProps {
  dashboard?: Dashboard | undefined;
  selectedPatient: Patient | null;
  setSelectedPatient: (p: Patient | null) => void;
  setPatientId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isTypeaheadOpen: boolean;
  setIsTypeaheadOpen: (open: boolean) => void;
  searchResults: Array<{ patient: Patient; isFuzzy?: boolean | undefined; suggestedName?: string | undefined }>;
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  selectPatient: (p: Patient) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  focusTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  showInlineNewPatient: boolean;
  setShowInlineNewPatient: (show: boolean) => void;
  newPatientFullName: string;
  setNewPatientFullName: (name: string) => void;
  newPatientPhone: string;
  setNewPatientPhone: (phone: string) => void;
  newPatientBirthDate: string;
  setNewPatientBirthDate: (bd: string) => void;
  isCreatingPatient: boolean;
  handleCreateInlinePatient: (e: React.FormEvent) => Promise<void>;
  newPatientFullNameInputRef: React.RefObject<HTMLInputElement | null>;
  potentialDuplicates: PotentialDuplicateItem[];
  patientReliability: PatientReliabilityAssessment | null;
  hasActivePatientVisit: boolean;
  doctorUserId: string;
  doctors: Array<{ id: string; fullName: string }>;
  setAppointmentType: (t: any) => void;
  setReason: (r: string) => void;
  setComment: (c: string) => void;
  setDurationMinutes: (d: number) => void;
}

export function QuickBookingPatientSection(props: QuickBookingPatientSectionProps) {
  const {
    dashboard,
    selectedPatient,
    setSelectedPatient,
    setPatientId,
    searchQuery,
    setSearchQuery,
    isTypeaheadOpen,
    setIsTypeaheadOpen,
    searchResults,
    highlightedIndex,
    setHighlightedIndex,
    selectPatient,
    searchInputRef,
    focusTimerRef,
    showInlineNewPatient,
    setShowInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    newPatientBirthDate,
    setNewPatientBirthDate,
    isCreatingPatient,
    handleCreateInlinePatient,
    newPatientFullNameInputRef,
    potentialDuplicates,
    patientReliability,
    hasActivePatientVisit,
    doctorUserId,
    doctors,
    setAppointmentType,
    setReason,
    setComment,
    setDurationMinutes,
  } = props;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center flex-wrap gap-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <User size={14} className="text-[var(--teal)]" />
          <span>Пациент *</span>
        </label>
        {!showInlineNewPatient && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setAppointmentType("emergency");
                setReason("Срочно: острая боль");
                setComment("Срочный приём по острой боли");
                setDurationMinutes(30);
                setShowInlineNewPatient(true);
                setNewPatientFullName("Пациент с острой болью (срочно)");
                setNewPatientPhone("");
              }}
              className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
              title="Создать временную карту для пациента с острой болью"
              data-testid="quick-booking-cito-express-btn"
            >
              <Flame size={14} />
              <span>+ Срочный пациент (острая боль)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const candidateForPrint =
                  selectedPatient ||
                  (newPatientFullName.trim()
                    ? {
                        fullName: newPatientFullName.trim(),
                        phone: newPatientPhone.trim() || undefined,
                        birthDate: newPatientBirthDate.trim() || undefined,
                      }
                    : searchQuery.trim()
                      ? { fullName: searchQuery.trim() }
                      : null);
                void printBlankMedicalContract(candidateForPrint, {
                  doctorName: doctors.find((d) => d.id === doctorUserId)
                    ?.fullName,
                  clinicName: dashboard?.clinicSettings?.profile?.legalName,
                });
              }}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-amber-500/10 rounded-xl cursor-pointer transition-colors"
              title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
              data-testid="quick-booking-print-blank-contract-btn"
            >
              <FileText size={14} className="text-amber-600" />
              <span>Бланк договора (_______)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInlineNewPatient(true);
                const trimmedQ = searchQuery.trim();
                const hasLetters = /[а-яёa-z]/i.test(trimmedQ);
                const hasDigits = /\d/.test(trimmedQ);
                if (hasLetters && !hasDigits) {
                  setNewPatientFullName(trimmedQ);
                  setNewPatientPhone("");
                } else if (hasDigits && !hasLetters) {
                  setNewPatientFullName("");
                  setNewPatientPhone(trimmedQ);
                } else {
                  setNewPatientFullName(trimmedQ);
                  setNewPatientPhone("");
                }
              }}
              className="text-xs font-bold text-[var(--teal)] hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-[var(--teal)]/10 rounded-xl cursor-pointer transition-colors"
              data-testid="quick-booking-new-patient-toggle"
            >
              <UserPlus size={14} />
              <span>+ Новый пациент</span>
            </button>
          </div>
        )}
      </div>

      {/* Selected Patient Card */}
      {selectedPatient ? (
        <div
          className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
          data-testid="selected-patient-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] font-bold text-sm flex items-center justify-center border border-[var(--teal)]/30 shrink-0">
                {selectedPatient.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--ink)] m-0 leading-snug truncate">
                  {selectedPatient.fullName}
                </h4>
                <div className="text-xs text-[var(--muted)] flex gap-2 mt-0.5">
                  {selectedPatient.phone && <span>{selectedPatient.phone}</span>}
                  {selectedPatient.birthDate && (
                    <span>д.р. {selectedPatient.birthDate}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setPatientId("");
                setSearchQuery("");
                if (focusTimerRef.current) {
                  clearTimeout(focusTimerRef.current);
                }
                focusTimerRef.current = setTimeout(() => {
                  searchInputRef.current?.focus();
                  focusTimerRef.current = null;
                }, 50);
              }}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs text-[var(--muted)] hover:text-rose-600 rounded-lg hover:bg-[var(--paper)] transition-colors cursor-pointer"
              title="Выбрать другого пациента"
              aria-label="Сменить пациента"
            >
              <X size={16} />
            </button>
          </div>

          {/* Reliability & Discipline Assessment */}
          {patientReliability && (
            <div
              className="pt-2.5 border-t border-[var(--line)] space-y-2"
              data-testid="patient-reliability-section"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Reliability Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${patientReliability.reliabilityBadge.badgeClass}`}
                  data-testid={`patient-reliability-badge-${patientReliability.category}`}
                  title={patientReliability.reliabilityBadge.summary}
                >
                  {patientReliability.reliabilityBadge.status === "reliable" && (
                    <ShieldCheck
                      size={14}
                      className="text-emerald-700 dark:text-emerald-300 shrink-0"
                    />
                  )}
                  {patientReliability.reliabilityBadge.status === "new" && (
                    <Sparkles
                      size={14}
                      className="text-sky-700 dark:text-sky-300 shrink-0"
                    />
                  )}
                  {patientReliability.reliabilityBadge.status ===
                    "high_risk" && (
                    <AlertTriangle
                      size={14}
                      className="text-rose-700 dark:text-rose-300 shrink-0"
                    />
                  )}
                  {patientReliability.reliabilityBadge.status ===
                    "attention" && (
                    <AlertTriangle
                      size={14}
                      className="text-amber-700 dark:text-amber-300 shrink-0"
                    />
                  )}
                  <span>{patientReliability.reliabilityBadge.badgeText}</span>
                </div>

                {/* Financial Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${patientReliability.financialBadge.badgeClass}`}
                  data-testid="patient-financial-badge"
                  title={`Баланс пациента: ${patientReliability.financialBadge.label}`}
                >
                  <CreditCard size={14} className="shrink-0 opacity-80" />
                  <span>{patientReliability.financialBadge.label}</span>
                </div>
              </div>

              {/* Stats Summary Line */}
              <div className="text-[11px] text-[var(--muted)] flex items-center justify-between gap-2">
                <span>
                  Дисциплина: {patientReliability.reliabilityBadge.summary}
                </span>
                {patientReliability.stats.totalAppointments > 0 && (
                  <span>
                    Визитов вовремя:{" "}
                    {patientReliability.stats.onTimeRatePercent}%
                  </span>
                )}
              </div>

              {/* Receptionist Guidance Alert Banner */}
              {patientReliability.category === "risk" && (
                <div
                  className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-900 dark:text-rose-100 text-xs font-bold flex items-start gap-2 animate-pulse"
                  data-testid="patient-reliability-risk-alert"
                >
                  <AlertTriangle
                    size={16}
                    className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="m-0 font-bold text-rose-700 dark:text-rose-300">
                      Требуется подтверждение за 2 часа
                    </p>
                    <p className="m-0 font-normal text-[11px]">
                      {patientReliability.receptionistAlert ||
                        "У пациента зафиксированы повторные неявки. Рекомендуется подтвердить визит перед приемом."}
                    </p>
                  </div>
                </div>
              )}

              {patientReliability.category === "attention" && (
                <div
                  className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-100 text-xs font-semibold flex items-start gap-2"
                  data-testid="patient-reliability-attention-alert"
                >
                  <AlertTriangle
                    size={15}
                    className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="m-0 font-bold text-amber-800 dark:text-amber-300">
                      Зона внимания регистратуры
                    </p>
                    <p className="m-0 font-normal text-[11px]">
                      {patientReliability.receptionistAlert ||
                        "Рекомендуется контрольный звонок накануне визита."}
                    </p>
                  </div>
                </div>
              )}

              {patientReliability.category === "reliable" && (
                <div
                  className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-1.5"
                  data-testid="patient-reliability-reliable-notice"
                >
                  <Check
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400 shrink-0"
                  />
                  <span>
                    Высокая надежность: 0 срывов визитов. Стандартная запись.
                  </span>
                </div>
              )}

              {/* Financial Debt Notification if debt > 0 */}
              {patientReliability.financialBadge.isDebt && (
                <div
                  className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2"
                  data-testid="patient-reliability-debt-alert"
                >
                  <span className="font-semibold">
                    Финансовый долг:{" "}
                    {patientReliability.financialBadge.formattedAmount}
                  </span>
                  <span className="text-[11px] text-rose-700 dark:text-rose-300">
                    Напомнить об оплате
                  </span>
                </div>
              )}

              {/* Active Visit Informative Badge */}
              {hasActivePatientVisit && (
                <div
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs flex items-start gap-2"
                  data-testid="quick-booking-active-visit-warning"
                >
                  <AlertCircle
                    size={15}
                    className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="m-0 font-bold">
                      По пациенту сейчас идет активный приём в кресле
                    </p>
                    <p className="m-0 font-normal text-[11px] text-[var(--muted)]">
                      (Запись на следующий приём не блокируется, врач или
                      администратор может сразу забронировать слот)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Typeahead Search Input */
        <div className="relative z-30">
          <div className="dente-search-wrap">
            <Search className="dente-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              data-testid="quick-booking-patient-search-input"
              value={searchQuery}
              placeholder="Поиск по ФИО, телефону или дате рождения…"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsTypeaheadOpen(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => setIsTypeaheadOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIndex((prev) =>
                    prev < searchResults.length - 1 ? prev + 1 : 0,
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : searchResults.length - 1,
                  );
                } else if (
                  e.key === "Enter" &&
                  searchResults[highlightedIndex]
                ) {
                  e.preventDefault();
                  const picked = searchResults[highlightedIndex]?.patient;
                  if (picked) selectPatient(picked);
                } else if (e.key === "Escape") {
                  setIsTypeaheadOpen(false);
                }
              }}
              className="dente-search-input"
              aria-autocomplete="list"
              aria-expanded={isTypeaheadOpen}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsTypeaheadOpen(false);
                }}
                className="dente-search-clear"
                title="Очистить поиск"
                aria-label="Очистить поиск"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dropdown Suggestions */}
          {isTypeaheadOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-[var(--paper)] border border-[var(--line-strong)] shadow-2xl z-50 divide-y divide-[var(--line)]"
              role="listbox"
            >
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => {
                  const p = item.patient;
                  const itemReliability = calculatePatientReliability(
                    p,
                    dashboard?.appointments,
                  );
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className={`w-full p-3 text-left flex items-center justify-between transition-colors min-h-[44px] cursor-pointer ${
                        idx === highlightedIndex
                          ? "bg-[var(--teal-surface)] text-[var(--ink)]"
                          : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
                      }`}
                      role="option"
                      aria-selected={idx === highlightedIndex}
                      data-testid={`quick-booking-patient-option-${p.id}`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--ink)] truncate">
                            {p.fullName}
                          </span>
                          {item.isFuzzy && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0"
                              title="Нечеткое совпадение по опечатке"
                              data-testid="quick-booking-fuzzy-badge"
                            >
                              <Sparkles size={10} className="text-amber-500" />
                              <span>
                                Возможно: {item.suggestedName || p.fullName}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--muted)] flex gap-2 mt-0.5">
                          {p.phone && <span>{p.phone}</span>}
                          {p.birthDate && <span>д.р. {p.birthDate}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${itemReliability.reliabilityBadge.badgeClass}`}
                          title={itemReliability.reliabilityBadge.summary}
                        >
                          {itemReliability.reliabilityBadge.status ===
                            "reliable" && (
                            <ShieldCheck
                              size={11}
                              className="text-emerald-700 dark:text-emerald-300 shrink-0"
                            />
                          )}
                          {itemReliability.reliabilityBadge.status ===
                            "new" && (
                            <Sparkles
                              size={11}
                              className="text-sky-700 dark:text-sky-300 shrink-0"
                            />
                          )}
                          {itemReliability.reliabilityBadge.status ===
                            "high_risk" && (
                            <AlertTriangle
                              size={11}
                              className="text-rose-700 dark:text-rose-300 shrink-0"
                            />
                          )}
                          {itemReliability.reliabilityBadge.status ===
                            "attention" && (
                            <AlertTriangle
                              size={11}
                              className="text-amber-700 dark:text-amber-300 shrink-0"
                            />
                          )}
                          <span>
                            {itemReliability.reliabilityBadge.shortLabel}
                          </span>
                        </span>
                        {itemReliability.financialBadge.isDebt && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-200 border border-rose-500/30 font-mono"
                            title={`Долг: ${itemReliability.financialBadge.formattedAmount}`}
                          >
                            -{itemReliability.financialBadge.formattedAmount}
                          </span>
                        )}
                        {itemReliability.financialBadge.isDeposit && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30 font-mono"
                            title={`Депозит: ${itemReliability.financialBadge.formattedAmount}`}
                          >
                            +{itemReliability.financialBadge.formattedAmount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-[var(--muted)]">
                  <span>Пациент не найден в базе.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineNewPatient(true);
                      setIsTypeaheadOpen(false);
                      const trimmedQ = searchQuery.trim();
                      const hasLetters = /[а-яёa-z]/i.test(trimmedQ);
                      const hasDigits = /\d/.test(trimmedQ);
                      if (hasLetters && !hasDigits) {
                        setNewPatientFullName(trimmedQ);
                        setNewPatientPhone("");
                      } else if (hasDigits && !hasLetters) {
                        setNewPatientFullName("");
                        setNewPatientPhone(trimmedQ);
                      } else {
                        setNewPatientFullName(trimmedQ);
                        setNewPatientPhone("");
                      }
                    }}
                    className="block mx-auto mt-2 text-xs font-bold text-[var(--teal)] hover:underline min-h-[44px] px-3 py-2 rounded-lg cursor-pointer"
                  >
                    + Создать «{searchQuery || "Нового пациента"}»
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline New Patient Form with Duplication Guard */}
      <QuickBookingInlinePatientForm
        dashboard={dashboard}
        showInlineNewPatient={showInlineNewPatient}
        setShowInlineNewPatient={setShowInlineNewPatient}
        newPatientFullName={newPatientFullName}
        setNewPatientFullName={setNewPatientFullName}
        newPatientPhone={newPatientPhone}
        setNewPatientPhone={setNewPatientPhone}
        newPatientBirthDate={newPatientBirthDate}
        setNewPatientBirthDate={setNewPatientBirthDate}
        isCreatingPatient={isCreatingPatient}
        handleCreateInlinePatient={handleCreateInlinePatient}
        newPatientFullNameInputRef={newPatientFullNameInputRef}
        potentialDuplicates={potentialDuplicates}
        selectPatient={selectPatient}
        doctorUserId={doctorUserId}
        doctors={doctors}
      />
    </div>
  );
}
