import React from 'react';
import type {
  PatientResult,
  AppointmentResult,
  SlotResult,
  LabOrderItem,
  DrugInteractionItem,
  TimelineEventItem,
  FamilyBalanceResult,
  SelectIdHandler,
  BookSlotHandler,
} from './copilotTypes';
import { CopilotPatientCard } from './CopilotPatientCard';
import { CopilotAppointmentCard } from './CopilotAppointmentCard';
import { CopilotSlotCard } from './CopilotSlotCard';
import { CopilotLabOrderCard } from './CopilotLabOrderCard';
import { CopilotDrugInteractionCard } from './CopilotDrugInteractionCard';
import { CopilotTimelineCard } from './CopilotTimelineCard';
import {
  PatientProfileCard,
  ScheduleSlotPickerCard,
  Prescription107Card,
  EstimateTierCard,
  type PatientProfileCardData,
  type ScheduleSlotPickerData,
  type ScheduleSlotOption,
  type Prescription107Data,
  type EstimateTierData,
  type EstimateTierOption,
} from './CopilotGenerativeCards';
import { formatMoney } from './useCopilotFormat';
import { Users, CreditCard, AlertCircle } from 'lucide-react';

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

  // 1. Drug Interaction & Allergy Alerts
  if (
    tool.includes('drug') ||
    tool.includes('interaction') ||
    tool.includes('allergy') ||
    Array.isArray(obj.interactions) ||
    Array.isArray(obj.contraindications) ||
    typeof obj.medical_advice === 'string'
  ) {
    const interactions: DrugInteractionItem[] = Array.isArray(obj.interactions)
      ? (obj.interactions as DrugInteractionItem[])
      : Array.isArray(obj.contraindications)
      ? (obj.contraindications as DrugInteractionItem[])
      : Array.isArray(result) && result.length > 0 && ('severity' in (result[0] as Obj) || 'description' in (result[0] as Obj))
      ? (result as DrugInteractionItem[])
      : typeof obj.medical_advice === 'string'
      ? [
          {
            severity: String(obj.severity || 'warning'),
            title: String(obj.title || 'Клиническое предупреждение'),
            description: String(obj.description || obj.message || 'Обнаружен фармакологический риск'),
            medical_advice: String(obj.medical_advice),
            drugs: Array.isArray(obj.drugs) ? (obj.drugs as string[]) : undefined,
          },
        ]
      : [];

    const patientAllergies = Array.isArray(obj.patient_allergies)
      ? (obj.patient_allergies as string[])
      : Array.isArray(obj.allergies)
      ? (obj.allergies as string[])
      : undefined;

    const safeAlternatives = Array.isArray(obj.safe_alternatives)
      ? (obj.safe_alternatives as string[])
      : Array.isArray(obj.alternatives)
      ? (obj.alternatives as string[])
      : undefined;

    return (
      <CopilotDrugInteractionCard
        interactions={interactions}
        patientAllergies={patientAllergies}
        safeAlternatives={safeAlternatives}
      />
    );
  }

  // 2. Lab Orders (Prosthetics, ETA, Shade)
  if (
    tool.includes('lab') ||
    tool.includes('prosthetic') ||
    Array.isArray(obj.lab_orders) ||
    Array.isArray(obj.orders) ||
    typeof obj.prosthesis_kind === 'string' ||
    typeof obj.vita_shade === 'string'
  ) {
    const orders: LabOrderItem[] = Array.isArray(obj.lab_orders)
      ? (obj.lab_orders as LabOrderItem[])
      : Array.isArray(obj.orders)
      ? (obj.orders as LabOrderItem[])
      : Array.isArray(result) && result.length > 0 && ('prosthesis_kind' in (result[0] as Obj) || 'order_id' in (result[0] as Obj))
      ? (result as LabOrderItem[])
      : typeof obj.prosthesis_kind === 'string' || typeof obj.order_id === 'string'
      ? [obj as unknown as LabOrderItem]
      : [];

    if (orders.length > 0) {
      return <CopilotLabOrderCard orders={orders} onSelectOrder={onSelectOrder} />;
    }
  }

  // 3. Patient Timeline
  if (
    tool.includes('timeline') ||
    tool.includes('history') ||
    Array.isArray(obj.timeline) ||
    Array.isArray(obj.events)
  ) {
    const events: TimelineEventItem[] = Array.isArray(obj.timeline)
      ? (obj.timeline as TimelineEventItem[])
      : Array.isArray(obj.events)
      ? (obj.events as TimelineEventItem[])
      : Array.isArray(result) && result.length > 0 && 'date' in (result[0] as Obj)
      ? (result as TimelineEventItem[])
      : [];

    if (events.length > 0) {
      return (
        <CopilotTimelineCard
          events={events}
          patientId={typeof obj.patient_id === 'string' ? obj.patient_id : undefined}
          onSelectPatient={onSelectPatient}
        />
      );
    }
  }

  // 4. Family Balance
  if (tool.includes('family') || Array.isArray(obj.members)) {
    const members = Array.isArray(obj.members) ? (obj.members as Obj[]) : [];
    const totalBalance = typeof obj.total_family_balance_rub === 'number' ? obj.total_family_balance_rub : 0;

    return (
      <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-xs shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Семейный баланс</span>
          </span>
          <span className="font-bold text-sm text-[var(--teal)] tabular-nums">
            {formatMoney(totalBalance)}
          </span>
        </div>

        {members.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-[var(--line)]">
            {members.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded bg-[var(--paper-soft)]">
                <div>
                  <span className="font-medium text-[var(--ink)]">{String(m.patient_name || m.name || 'Член семьи')}</span>
                  {Boolean(m.relationship) && <span className="text-[var(--muted)] text-[10px]"> ({String(m.relationship)})</span>}
                </div>
                <span className="font-bold text-[var(--ink)] tabular-nums">
                  {formatMoney(Number(m.balance_rub || m.balance || 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4.1. Generative UI: Estimate 3-Tier Treatment Plan Card
  if (
    tool.includes('estimate') ||
    tool.includes('tier') ||
    tool.includes('treatment_plan') ||
    Array.isArray(obj.tiers) ||
    Array.isArray(obj.pricing_tiers) ||
    obj.estimate !== undefined
  ) {
    const rawTiers = Array.isArray(obj.tiers)
      ? (obj.tiers as unknown as EstimateTierOption[])
      : Array.isArray(obj.pricing_tiers)
      ? (obj.pricing_tiers as unknown as EstimateTierOption[])
      : Array.isArray(result) && result.length > 0 && ('tierKey' in (result[0] as Obj) || 'tierName' in (result[0] as Obj))
      ? (result as unknown as EstimateTierOption[])
      : undefined;

    if (rawTiers || obj.items) {
      const estimateData: EstimateTierData = {
        patientId: typeof obj.patientId === 'string' ? obj.patientId : undefined,
        patientName: typeof obj.patientName === 'string' ? obj.patientName : undefined,
        discountPercent: typeof obj.discountPercent === 'number' ? obj.discountPercent : undefined,
        teeth: Array.isArray(obj.teeth) ? (obj.teeth as (string | number)[]) : undefined,
        tiers: rawTiers || [],
      };
      return <EstimateTierCard data={estimateData} />;
    }
  }

  // 4.2. Generative UI: Prescription 107-1/u Card
  if (
    tool.includes('prescription') ||
    tool.includes('107') ||
    tool.includes('recipe') ||
    obj.prescription !== undefined ||
    (Array.isArray(obj.drugs) && obj.drugs.length > 0 && ('latinName' in (obj.drugs[0] as Obj) || 'signa' in (obj.drugs[0] as Obj)))
  ) {
    const rxObj = (obj.prescription && typeof obj.prescription === 'object' ? obj.prescription : obj) as unknown as Prescription107Data;
    if (rxObj && rxObj.patientName && Array.isArray(rxObj.drugs)) {
      return <Prescription107Card prescription={rxObj} />;
    }
  }

  // 4.3. Generative UI: Schedule Slot Picker Card (interactive grid)
  if (
    (tool.includes('picker') || tool.includes('schedule_picker') || (Array.isArray(obj.slots) && obj.slots.length > 0 && typeof (obj.slots[0] as Obj).time === 'string')) &&
    (typeof obj.doctorName === 'string' || Array.isArray(obj.slots))
  ) {
    const pickerData: ScheduleSlotPickerData = {
      doctorId: typeof obj.doctorId === 'string' ? obj.doctorId : undefined,
      doctorName: typeof obj.doctorName === 'string' ? obj.doctorName : undefined,
      doctorSpecialty: typeof obj.doctorSpecialty === 'string' ? obj.doctorSpecialty : undefined,
      cabinet: typeof obj.cabinet === 'string' ? obj.cabinet : undefined,
      date: typeof obj.date === 'string' ? obj.date : undefined,
      availableDates: Array.isArray(obj.availableDates) ? (obj.availableDates as string[]) : undefined,
      slots: Array.isArray(obj.slots) ? (obj.slots as unknown as ScheduleSlotOption[]) : [],
    };
    if (pickerData.slots.length > 0) {
      return (
        <ScheduleSlotPickerCard
          data={pickerData}
          onBookSlot={(slot) =>
            onBookSlot?.({
              start_time: slot.startTime || slot.time,
              end_time: slot.endTime,
              doctor_name: pickerData.doctorName,
              cabinet: slot.cabinet || pickerData.cabinet,
            })
          }
        />
      );
    }
  }

  // 4.4. Generative UI: Patient Profile Card (rich clinical profile)
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

  // 5. Patients (search / get / list)
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

  // 6. Free slots
  if (Array.isArray(obj.slots) || Array.isArray(obj.free_windows) || tool.includes('slot') || tool.includes('free_slots') || tool.includes('availability')) {
    const slots: SlotResult[] = Array.isArray(obj.slots)
      ? (obj.slots as SlotResult[])
      : Array.isArray(obj.free_windows)
      ? (obj.free_windows as SlotResult[])
      : Array.isArray(result)
      ? (result as SlotResult[])
      : [];
    return <CopilotSlotCard slots={slots} onBookSlot={onBookSlot} />;
  }

  // 7. Appointments
  if (Array.isArray(obj.appointments) || tool.includes('appointment') || tool.includes('day_overview') || (obj.id && obj.patient_name)) {
    const appts: AppointmentResult[] = Array.isArray(obj.appointments)
      ? (obj.appointments as AppointmentResult[])
      : Array.isArray(result)
      ? (result as AppointmentResult[])
      : (obj.id && obj.patient_name)
      ? [obj as unknown as AppointmentResult]
      : [];

    if (appts.length > 0) {
      return (
        <div className="space-y-2">
          {appts.map((a) => (
            <CopilotAppointmentCard
              key={a.id}
              appointment={a}
              onSelectAppointment={onSelectAppointment}
            />
          ))}
        </div>
      );
    }
  }


  // 8. Financial summary
  if (tool.includes('revenue') || tool.includes('debt') || tool.includes('finance') || typeof obj.total_rub === 'number' || typeof obj.total === 'number') {
    const total = typeof obj.total_rub === 'number' ? obj.total_rub : typeof obj.total === 'number' ? obj.total : null;
    return (
      <div className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] space-y-1 text-xs shadow-sm">
        <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-[var(--teal)]" />
          <span>Финансовый отчёт</span>
        </div>
        {total !== null && (
          <div className="text-sm font-extrabold text-[var(--teal)] tabular-nums">{formatMoney(total)}</div>
        )}
        {typeof obj.summary === 'string' && <div className="text-[var(--muted)]">{obj.summary}</div>}
      </div>
    );
  }

  // 9. Generic structured KV / list
  const rows: { label: string; value: string }[] = [];
  const currency = typeof obj.currency === 'string' ? obj.currency : 'RUB';
  const moneyPattern = /total|collected|invoiced|net|refunded|amount|balance|cost|price/i;

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || Array.isArray(value) || typeof value === 'object') {
      continue;
    }
    let display = String(value);
    if (typeof value === 'number' && moneyPattern.test(key)) {
      display = formatMoney(value, currency);
    }
    rows.push({ label: key.replace(/_/g, ' '), value: display });
  }

  if (rows.length > 0) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-xs shadow-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {rows.map((r) => (
            <React.Fragment key={r.label}>
              <dt className="text-[var(--muted)] capitalize font-medium">{r.label}:</dt>
              <dd className="text-right font-semibold text-[var(--ink)] tabular-nums">{r.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }

  // Fallback raw view
  return (
    <pre className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-mono text-[var(--ink)] overflow-x-auto m-0">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
};
