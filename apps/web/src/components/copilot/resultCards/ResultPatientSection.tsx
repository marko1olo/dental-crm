import React from 'react';
import type { SelectIdHandler, PatientResult } from '../copilotTypes';
import type { PatientProfileCardData } from '../cards/types';
import { PatientProfileCard } from '../cards/PatientProfileCard';
import { CopilotPatientCard } from '../CopilotPatientCard';

type Obj = Record<string, unknown>;

export function renderPatientSection(
  tool: string,
  obj: Obj,
  result: unknown,
  onSelectPatient?: SelectIdHandler,
): React.ReactNode | null {
  // Patient Profile Card
  if (
    (tool.includes('profile') || tool === 'get_emr_card') &&
    (obj.fullName || obj.full_name) &&
    (obj.balanceRub !== undefined || obj.balance_rub !== undefined || obj.allergies !== undefined || obj.cardNumber !== undefined || obj.card_number !== undefined || obj.lastVisitDate !== undefined)
  ) {
    const patientData: PatientProfileCardData = {
      id: String(obj.id || ''),
      fullName: String(obj.fullName || obj.full_name || ''),
      phone: typeof obj.phone === 'string' ? obj.phone : undefined,
      birthDate: typeof obj.birthDate === 'string' ? obj.birthDate : typeof obj.birth_date === 'string' ? obj.birth_date : undefined,
      gender: typeof obj.gender === 'string' ? obj.gender : undefined,
      cardNumber: typeof obj.cardNumber === 'string' ? obj.cardNumber : typeof obj.card_number === 'string' ? obj.card_number : undefined,
      status: typeof obj.status === 'string' ? obj.status : undefined,
      balanceRub: typeof obj.balanceRub === 'number' ? obj.balanceRub : typeof obj.balance_rub === 'number' ? obj.balance_rub : undefined,
      familyBalanceRub: typeof obj.familyBalanceRub === 'number' ? obj.familyBalanceRub : typeof obj.family_balance_rub === 'number' ? obj.family_balance_rub : undefined,
      allergies: Array.isArray(obj.allergies) ? (obj.allergies as string[]) : undefined,
      lastVisitDate: typeof obj.lastVisitDate === 'string' ? obj.lastVisitDate : typeof obj.last_visit_date === 'string' ? obj.last_visit_date : undefined,
      lastDoctorName: typeof obj.lastDoctorName === 'string' ? obj.lastDoctorName : typeof obj.last_doctor_name === 'string' ? obj.last_doctor_name : undefined,
      lastDiagnosis: typeof obj.lastDiagnosis === 'string' ? obj.lastDiagnosis : typeof obj.last_diagnosis === 'string' ? obj.last_diagnosis : undefined,
      nextAppointmentDate: typeof obj.nextAppointmentDate === 'string' ? obj.nextAppointmentDate : typeof obj.next_appointment_date === 'string' ? obj.next_appointment_date : undefined,
      activePlanStage: typeof obj.activePlanStage === 'string' ? obj.activePlanStage : typeof obj.active_plan_stage === 'string' ? obj.active_plan_stage : undefined,
    };
    return <PatientProfileCard patient={patientData} onOpenCard={onSelectPatient} />;
  }

  // Patients list
  if (Array.isArray(obj.patients) || tool.includes('patient') || tool === 'search' || tool === 'search_patients' || (obj.id && obj.full_name)) {
    const patients: PatientResult[] = Array.isArray(obj.patients)
      ? (obj.patients as PatientResult[])
      : Array.isArray(result)
      ? (result as PatientResult[])
      : (obj.id && obj.full_name)
      ? [obj as unknown as PatientResult]
      : [];

    if (patients.length > 0) {
      return (
        <div className="space-y-2">
          {patients.map((p) => (
            <CopilotPatientCard key={p.id} patient={p} onSelectPatient={onSelectPatient} />
          ))}
        </div>
      );
    }
  }

  return null;
}
