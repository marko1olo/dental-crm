/**
 * apps/web/src/components/visit/mobileChairside/ChairsidePatientQuickBar.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 1: Top HUD Patient Bar)
 */

import React from "react";
import {
  AlertOctagon,
  ChevronLeft,
  FlaskConical,
  Phone,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { VisitTimer } from "../VisitTimer";
import type { ChairsidePatientQuickBarProps } from "./types";

export const ChairsidePatientQuickBar: React.FC<ChairsidePatientQuickBarProps> = ({
  activePatient,
  activeAppointment,
  patientAge,
  consolidatedAllergyChip,
  handlePrintForm043uFast,
  handleOpenLabOrder,
  onClose,
  onPrevStep,
  testId = "mobile-chairside-workspace",
}) => {
  return (
    <header className="mobile-chairside-hud" data-testid={`${testId}-hud`}>
      {/* Main Row: Back Button, Large Centered Patient Name, Actions */}
      <div className="mobile-chairside-hud-main-row">
        <button
          type="button"
          onClick={onPrevStep}
          className="mobile-chairside-icon-btn"
          aria-label="Назад"
          data-testid={`${testId}-back-btn`}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="mobile-chairside-patient-title-box">
          <div
            className="mobile-chairside-patient-name"
            title={activePatient?.fullName || activePatient?.name || "Пациент"}
          >
            {activePatient?.fullName || activePatient?.name || "Пациент"}
          </div>
          <div className="mobile-chairside-patient-subtext">
            {patientAge && <span>{patientAge}</span>}
            {patientAge && activePatient?.phone && <span className="opacity-40">·</span>}
            {activePatient?.phone && (
              <a
                href={`tel:${activePatient.phone}`}
                className="mobile-chairside-phone-link"
                data-testid={`${testId}-phone-link`}
              >
                <Phone size={11} />
                <span>{activePatient.phone}</span>
              </a>
            )}
          </div>
        </div>

        <div className="mobile-chairside-hud-actions">
          {handlePrintForm043uFast && (
            <button
              type="button"
              onClick={handlePrintForm043uFast}
              className="mobile-chairside-icon-btn"
              aria-label="Печать дневника приёма"
              title="Печать дневника"
              data-testid={`${testId}-print-btn`}
            >
              <Printer size={18} />
            </button>
          )}

          {handleOpenLabOrder && (
            <button
              type="button"
              onClick={handleOpenLabOrder}
              className="mobile-chairside-icon-btn text-teal-600 dark:text-teal-400"
              aria-label="Наряд ЗТЛ"
              title="Наряд в лабораторию"
              data-testid={`${testId}-lab-btn`}
            >
              <FlaskConical size={18} />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mobile-chairside-icon-btn text-[var(--muted)]"
              aria-label="Свернуть приём"
              data-testid={`${testId}-close-btn`}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Sub Row: Visit Timer on Left, Allergy Alert on Right */}
      <div className="mobile-chairside-hud-sub-row">
        <div className="mobile-chairside-timer-wrap">
          <VisitTimer
            createdAt={
              activeAppointment?.startTime ||
              activeAppointment?.startAt ||
              activeAppointment?.createdAt ||
              null
            }
          />
        </div>

        {consolidatedAllergyChip ? (
          <span
            className="mobile-chairside-allergy-pulse"
            data-testid={`${testId}-allergy-badge`}
            title={consolidatedAllergyChip}
          >
            <AlertOctagon size={12} className="shrink-0" />
            <span>{consolidatedAllergyChip}</span>
          </span>
        ) : (
          <span
            className="mobile-chairside-allergy-clean"
            data-testid={`${testId}-allergy-clean-badge`}
            title="Отягощенный аллергоанамнез не выявлен"
          >
            <ShieldCheck size={12} className="shrink-0" />
            <span>Аллергии не выявлены</span>
          </span>
        )}
      </div>
    </header>
  );
};
