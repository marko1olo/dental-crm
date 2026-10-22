import React from 'react';
import type { SelectIdHandler, BookSlotHandler } from './copilotTypes';
import { renderDrugSection } from './resultCards/ResultDrugSection';
import { renderLabSection } from './resultCards/ResultLabSection';
import { renderTimelineSection } from './resultCards/ResultTimelineSection';
import { renderFamilyBalanceSection } from './resultCards/ResultFamilyBalanceSection';
import { renderClinicalAndReActSection } from './resultCards/ResultClinicalAndReActSection';
import { renderEstimateSection } from './resultCards/ResultEstimateSection';
import { renderPrescriptionSection } from './resultCards/ResultPrescriptionSection';
import { renderScheduleSection } from './resultCards/ResultScheduleSection';
import { renderPatientSection } from './resultCards/ResultPatientSection';
import { renderFinancialAndGenericSection } from './resultCards/ResultFinancialAndGenericSection';

export interface CopilotResultCardProps {
  name?: string | undefined;
  toolName?: string | undefined;
  result: unknown;
  onSelectPatient?: SelectIdHandler;
  onSelectAppointment?: SelectIdHandler;
  onBookSlot?: BookSlotHandler;
  onSelectOrder?: SelectIdHandler;
}

type Obj = Record<string, unknown>;

export const CopilotResultCard: React.FC<CopilotResultCardProps> = ({
  name,
  toolName,
  result,
  onSelectPatient,
  onSelectAppointment,
  onBookSlot,
  onSelectOrder,
}) => {
  const effectiveName = name || toolName || '';
  const tool = (effectiveName.split('.').pop() || effectiveName).toLowerCase();
  const obj = result && typeof result === 'object' ? (result as Obj) : {};
  const errorCode = typeof obj.error === 'string' ? obj.error : null;

  if (errorCode) {
    return (
      <div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
        {errorCode === 'not_found' ? 'Ничего не найдено' : `Ошибка выполнения: ${errorCode}`}
      </div>
    );
  }

  const drugView = renderDrugSection(tool, obj, result);
  if (drugView) return drugView;

  const labView = renderLabSection(tool, obj, result, onSelectOrder);
  if (labView) return labView;

  const timelineView = renderTimelineSection(tool, obj, result, onSelectPatient);
  if (timelineView) return timelineView;

  const familyView = renderFamilyBalanceSection(tool, obj);
  if (familyView) return familyView;

  const clinicalReActView = renderClinicalAndReActSection(tool, obj);
  if (clinicalReActView) return clinicalReActView;

  const estimateView = renderEstimateSection(tool, obj, result);
  if (estimateView) return estimateView;

  const prescriptionView = renderPrescriptionSection(tool, obj);
  if (prescriptionView) return prescriptionView;

  const scheduleView = renderScheduleSection(tool, obj, result, onBookSlot, onSelectAppointment);
  if (scheduleView) return scheduleView;

  const patientView = renderPatientSection(tool, obj, result, onSelectPatient);
  if (patientView) return patientView;

  return renderFinancialAndGenericSection(tool, obj, result);
};
