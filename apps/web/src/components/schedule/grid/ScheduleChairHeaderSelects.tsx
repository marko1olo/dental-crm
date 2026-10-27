import React from "react";
import { formatDoctorShortName } from "../GridAppointmentCard";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface ScheduleChairHeaderSelectsProps {
  chair: any;
  doctors: Array<any>;
  assignment?: ChairDoctorShiftAssignment;
  openAssignModal: (chairId: string) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
  handleConfirmAssignDoctor: (chairId: string, docId: string, shiftPreset: any) => void;
  handleUnassignDoctor: (chairId: string) => void;
}

export const ScheduleChairHeaderSelects: React.FC<ScheduleChairHeaderSelectsProps> = ({
  chair,
  doctors,
  assignment,
  openAssignModal,
  handleBindDoctorToChair,
  handleConfirmAssignDoctor,
  handleUnassignDoctor,
}) => {
  if (!doctors || doctors.length === 0) return null;

  const currentPreset = assignment?.shiftPreset || "full";

  return (
    <div
      className="sr-only"
      data-testid={`chair-doctor-badge-${chair.id}`}
      onClick={() => openAssignModal(chair.id)}
      title={
        assignment?.doctorName
          ? `Врач на смене: ${assignment.doctorName} (${assignment.shiftHours || "08:00–20:00"}). Нажмите для смены`
          : undefined
      }
      aria-label={
        assignment?.doctorName
          ? `Врач ${assignment.doctorName}, ${assignment.shiftHours || "08:00–20:00"}. Нажмите для изменения`
          : undefined
      }
    >
      <select
        value={assignment?.doctorId || ""}
        onChange={(e) => {
          const docId = e.target.value;
          if (docId) {
            handleBindDoctorToChair(chair.id, docId);
            handleConfirmAssignDoctor(chair.id, docId, currentPreset);
          } else {
            handleUnassignDoctor(chair.id);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="sr-only"
        title="Закрепление врача за креслом (выбор из списка)"
        data-testid={`chair-duty-doctor-select-${chair.id}`}
        aria-label={`Дежурный врач для ${chair.name}`}
      >
        <option value="">
          {assignment?.doctorId ? "Снять врача (без назначения)" : "+ Врач..."}
        </option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id} title={d.fullName}>
            {formatDoctorShortName(d.fullName)}
          </option>
        ))}
      </select>
      <select
        value={currentPreset}
        onChange={(e) => {
          const newPreset = e.target.value;
          const currentDocId = assignment?.doctorId || (doctors.length > 0 ? doctors[0]!.id : "");
          if (currentDocId) {
            handleConfirmAssignDoctor(chair.id, currentDocId, newPreset);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="sr-only"
        title="Смена врача на кресле (Утро 09:00-15:00 / Вечер 15:00-21:00 / Полный день 08:00-20:00 / 09:00-21:00)"
        data-testid={`chair-shift-select-${chair.id}`}
        aria-label={`Смена для ${chair.name}`}
      >
        <option value="morning_9">09–15</option>
        <option value="evening_15">15–21</option>
        <option value="full">08–20</option>
        <option value="full_9_21">09–21</option>
        <option value="morning">08–14</option>
        <option value="evening">14–20</option>
        <option value="two_shifts">2 см</option>
      </select>
    </div>
  );
};
