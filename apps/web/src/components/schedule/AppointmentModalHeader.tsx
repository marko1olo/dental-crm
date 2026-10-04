import type { Appointment, Dashboard } from "@dental/shared";
import {
  Calendar,
  Copy,
  CreditCard,
  FileText,
  MoreHorizontal,
  Printer,
  Repeat,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import {
  printBlankMedicalConsent,
  printBlankMedicalContract,
} from "../patients/blankContractPrint";

export interface AppointmentModalHeaderProps {
  appointment: Appointment;
  dashboard: Dashboard;
  patientId: string;
  currentPatientName: string;
  startsAtLocal: string;
  endsAtLocal: string;
  isNewAppointment: boolean;
  isCito: boolean;
  onConvertToCito: () => void;
  onClose: () => void;
  repeatAppointment?: ((appointment: Appointment) => void) | undefined;
  copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
}

export function AppointmentModalHeader({
  appointment,
  dashboard,
  patientId,
  currentPatientName,
  startsAtLocal,
  endsAtLocal,
  isNewAppointment,
  isCito,
  onConvertToCito,
  onClose,
  repeatAppointment,
  copyAppointmentToBuffer,
}: AppointmentModalHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="px-4 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2.5 sm:gap-3 flex-nowrap shrink-0">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
          <Calendar size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 truncate leading-tight"
            title={
              isNewAppointment
                ? `Запись на следующий этап: ${currentPatientName}`
                : `Детали записи: ${currentPatientName}`
            }
          >
            {isNewAppointment
              ? `Запись на следующий этап: ${currentPatientName}`
              : `Детали записи: ${currentPatientName}`}
          </h3>
          <p
            className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate leading-tight"
            title={
              startsAtLocal
                ? `${startsAtLocal.slice(0, 10)} ${startsAtLocal.slice(11, 16)} - ${endsAtLocal.slice(11, 16)}`
                : ""
            }
          >
            {startsAtLocal
              ? `${startsAtLocal.slice(0, 10)} ${startsAtLocal.slice(11, 16)} - ${endsAtLocal.slice(11, 16)}`
              : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-nowrap relative">
        {!isCito ? (
          <button
            type="button"
            onClick={onConvertToCito}
            className="h-8 min-h-[44px] sm:min-h-[32px] px-2.5 sm:px-3 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Пациент обратился с острой болью: перевести в CITO, разрешить овербукинг и включить CITO-подсветку в расписании"
            data-testid="convert-to-cito-btn"
          >
            <Zap
              size={14}
              className="text-rose-600 dark:text-rose-400 shrink-0"
            />
            <span className="hidden sm:inline">
              Перевести в CITO (Острая боль)
            </span>
            <span className="sm:hidden">CITO</span>
          </button>
        ) : (
          <div
            className="h-8 min-h-[32px] px-2.5 rounded-lg border border-rose-500/50 bg-rose-500/20 text-rose-800 dark:text-rose-200 text-xs font-black flex items-center gap-1 shrink-0 animate-pulse"
            title="Экстренный прием CITO"
            data-testid="appointment-cito-active-badge"
          >
            <Zap
              size={14}
              className="text-rose-600 dark:text-rose-400 shrink-0 fill-current"
            />
            <span className="tracking-wider">CITO</span>
          </div>
        )}

        {/* 1-Click Blank Contract Button (Mandates 8e, 8p) */}
        <button
          type="button"
          onClick={() => {
            const currentPatient = (dashboard?.patients ?? []).find(
              (p) => p.id === patientId,
            );
            printBlankMedicalContract(
              {
                id: currentPatient?.id,
                fullName: currentPatient?.fullName || currentPatientName || "",
                phone: currentPatient?.phone || null,
              },
              {
                clinicName: dashboard?.clinicSettings?.profile?.clinicName,
                clinicInn: dashboard?.clinicSettings?.profile?.inn,
                clinicAddress: dashboard?.clinicSettings?.profile?.address,
              },
            );
            showToast("Печать бланка договора со строками (_____)", "info");
          }}
          className="h-8 min-h-[32px] px-2 sm:px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Распечатать бумажный договор с пропусками для подписи (1 клик)"
          data-testid="appointment-modal-print-blank-contract-btn"
        >
          <Printer
            size={14}
            className="text-amber-600 dark:text-amber-400 shrink-0"
          />
          <span className="hidden md:inline whitespace-nowrap">Бланк договора</span>
        </button>

        {/* 1-Click Blank Medical Consent Button (Mandates 8e, 8p) */}
        <button
          type="button"
          onClick={() => {
            const currentPatient = (dashboard?.patients ?? []).find(
              (p) => p.id === patientId,
            );
            printBlankMedicalConsent(
              {
                id: currentPatient?.id,
                fullName: currentPatient?.fullName || currentPatientName || "",
                phone: currentPatient?.phone || null,
              },
              {
                clinicName: dashboard?.clinicSettings?.profile?.clinicName,
                clinicInn: dashboard?.clinicSettings?.profile?.inn,
                clinicAddress: dashboard?.clinicSettings?.profile?.address,
              },
            );
            showToast("Печать бланка согласия (ИДС)", "info");
          }}
          className="h-8 min-h-[32px] px-2 sm:px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Распечатать бланк информированного добровольного согласия (1 клик)"
          data-testid="appointment-modal-print-blank-consent-btn"
        >
          <FileText
            size={14}
            className="text-cyan-600 dark:text-cyan-400 shrink-0"
          />
          <span className="hidden md:inline whitespace-nowrap">ИДС</span>
        </button>

        {/* 1-Click Pay 54-FZ button (Mandates 8e, 8n) */}
        {patientId && !isNewAppointment && (
          <button
            type="button"
            onClick={() => {
              onClose();
              usePatientStore.getState().setSelectedPatientId(patientId);
              useAppStore.getState().setCurrentView("finance");
              showToast(
                `Касса: расчёт ${currentPatientName}`,
                "info",
              );
            }}
            className="h-8 min-h-[32px] px-2 sm:px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Принять оплату через кассу (1 клик)"
            data-testid="appointment-modal-pay-btn"
          >
            <CreditCard
              size={14}
              className="text-emerald-600 dark:text-emerald-400 shrink-0"
            />
            <span className="hidden sm:inline whitespace-nowrap">
              Принять оплату
            </span>
            <span className="sm:hidden">Оплата</span>
          </button>
        )}

        {/* Secondary actions popover (Hick / Miller: all non-primary actions in ... menu) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Дополнительные действия (печать согласий, повтор записи)"
            aria-label="Дополнительные действия"
            data-testid="appointment-modal-more-actions-btn"
          >
            <MoreHorizontal size={15} />
            <span className="hidden md:inline">Еще</span>
          </button>
          {isMenuOpen && (
            <div
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={`absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl z-30 py-1 ${isMenuOpen ? "block" : "hidden"}`}
            data-testid="appointment-modal-more-menu"
          >
            {patientId && !isNewAppointment && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onClose();
                  usePatientStore
                    .getState()
                    .setSelectedPatientId(patientId);
                  useAppStore.getState().setCurrentView("finance");
                  showToast(
                    `Касса: расчёт ${currentPatientName}`,
                    "info",
                  );
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
                title="Принять оплату на кассе"
                data-testid="appointment-modal-menu-pay-btn"
              >
                <CreditCard
                  size={14}
                  className="text-emerald-600 dark:text-emerald-400 shrink-0"
                />
                <span className="truncate">Касса / Оплата</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                const currentPatient = (dashboard?.patients ?? []).find(
                  (p) => p.id === patientId,
                );
                printBlankMedicalContract(
                  {
                    id: currentPatient?.id,
                    fullName:
                      currentPatient?.fullName || currentPatientName || "",
                    phone: currentPatient?.phone || null,
                  },
                  {
                    clinicName: dashboard?.clinicSettings?.profile?.clinicName,
                    clinicInn: dashboard?.clinicSettings?.profile?.inn,
                    clinicAddress: dashboard?.clinicSettings?.profile?.address,
                  },
                );
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
              title="Распечатать бумажный договор с пропусками для подписи (1 клик)"
              data-testid="appointment-modal-menu-print-blank-contract-btn"
            >
              <Printer
                size={14}
                className="text-amber-600 dark:text-amber-400 shrink-0"
              />
              <span className="truncate">Бланк договора (_______)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                const currentPatient = (dashboard?.patients ?? []).find(
                  (p) => p.id === patientId,
                );
                printBlankMedicalConsent(
                  {
                    id: currentPatient?.id,
                    fullName:
                      currentPatient?.fullName || currentPatientName || "",
                    phone: currentPatient?.phone || null,
                  },
                  {
                    clinicName: dashboard?.clinicSettings?.profile?.clinicName,
                    clinicInn: dashboard?.clinicSettings?.profile?.inn,
                    clinicAddress: dashboard?.clinicSettings?.profile?.address,
                  },
                );
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
              title="Распечатать бланк информированного добровольного согласия (1 клик)"
              data-testid="appointment-modal-print-blank-consent-btn"
            >
              <FileText
                size={14}
                className="text-cyan-600 dark:text-cyan-400 shrink-0"
              />
              <span className="truncate">Бланк ИДС</span>
            </button>
            {repeatAppointment && !isNewAppointment && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  repeatAppointment(appointment);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors border-t border-[var(--line)]/50"
                title="Повторить прием"
                data-testid="appointment-modal-repeat-btn"
              >
                <Repeat
                  size={14}
                  className="text-[var(--muted)] shrink-0"
                />
                <span>Повторить</span>
              </button>
            )}
            {copyAppointmentToBuffer && !isNewAppointment && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  copyAppointmentToBuffer(appointment);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
                title="Скопировать в буфер"
                data-testid="appointment-modal-copy-btn"
              >
                <Copy size={14} className="text-[var(--muted)] shrink-0" />
                <span>В буфер</span>
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
          aria-label="Закрыть"
          data-testid="appointment-modal-close-btn"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
