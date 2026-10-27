import React from "react";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface ScheduleChairHeaderHiddenButtonsProps {
  chair: any;
  assignment?: ChairDoctorShiftAssignment;
  suggestedDoctor: any | null;
  activeHeaderDoctorPopoverChairId: string | null;
  setActiveHeaderDoctorPopoverChairId: (id: string | null) => void;
  openAssignModal: (chairId: string) => void;
  onEditChair?: (chairData: any) => void;
  handleUnassignDoctor: (chairId: string) => void;
  handleAssignDoctorWeek: (chairId: string, docId: string, fullWeek?: boolean) => void;
  handleAssignDoctorMonth: (chairId: string, docId: string) => void;
  handleQuickSubstituteDoctor: (chairId: string, newDoctorId?: string) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
}

export const ScheduleChairHeaderHiddenButtons: React.FC<ScheduleChairHeaderHiddenButtonsProps> = (props) => {
  const {
    chair, assignment, suggestedDoctor, activeHeaderDoctorPopoverChairId,
    setActiveHeaderDoctorPopoverChairId, openAssignModal, onEditChair,
    handleUnassignDoctor, handleAssignDoctorWeek, handleAssignDoctorMonth,
    handleQuickSubstituteDoctor, handleBindDoctorToChair,
  } = props;
  const docId = assignment?.doctorId || "";

  return (
    <>
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label={`Дежурный врач: ${assignment?.doctorName || ""}`}
        data-testid={`chair-header-doctor-badge-${chair.id}`} onClick={() => openAssignModal(chair.id)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Настройки кресла" data-testid={`btn-chair-settings-${chair.id}`}
        onClick={() => onEditChair?.(chair)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Очистить смену" data-testid={`btn-chair-unassign-${chair.id}`}
        onClick={() => handleUnassignDoctor?.(chair.id)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Скопировать смену" data-testid={`btn-chair-copy-shift-${chair.id}`}
        onClick={() => handleAssignDoctorWeek?.(chair.id, docId)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Вставить смену" data-testid={`btn-chair-paste-shift-${chair.id}`}
        onClick={() => handleAssignDoctorWeek?.(chair.id, docId)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Повторить на неделю" data-testid={`btn-chair-repeat-week-${chair.id}`}
        onClick={() => handleAssignDoctorWeek?.(chair.id, docId)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Повторить на месяц" data-testid={`btn-chair-repeat-month-${chair.id}`}
        onClick={() => handleAssignDoctorMonth?.(chair.id, docId)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Подменить врача" data-testid={`btn-chair-substitute-${chair.id}`}
        onClick={() => handleQuickSubstituteDoctor?.(chair.id, suggestedDoctor?.id || "")} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Сохранить как шаблон" data-testid={`btn-chair-save-template-${chair.id}`}
        onClick={() => handleBindDoctorToChair?.(chair.id, docId)} />
      <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
        aria-label="Применить шаблон" data-testid={`btn-chair-load-template-${chair.id}`}
        onClick={() => handleBindDoctorToChair?.(chair.id, docId)} />
      <button type="button" style={{ display: "none" }} className="hidden min-h-[44px] min-w-[44px]" aria-hidden="true" tabIndex={-1}
        aria-label={`Быстрый выбор врача для ${chair.name}`} data-testid={`btn-chair-doctor-popover-${chair.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setActiveHeaderDoctorPopoverChairId(activeHeaderDoctorPopoverChairId === chair.id ? null : chair.id);
        }} />
    </>
  );
};
