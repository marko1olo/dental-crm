import React from "react";
import { Calendar, Plus } from "lucide-react";

export interface ScheduleMobileEmptyDayProps {
  onAddAppointment: () => void;
}

export const ScheduleMobileEmptyDay: React.FC<ScheduleMobileEmptyDayProps> = ({
  onAddAppointment,
}) => {
  return (
    <div className="schedule-mobile-empty-day">
      <div className="schedule-mobile-empty-icon">
        <Calendar size={28} />
      </div>
      <div className="schedule-mobile-empty-title">На этот день записей нет</div>
      <div className="schedule-mobile-empty-subtitle">
        Выберите другой день на полосе недели или создайте новую запись
      </div>
      <button
        type="button"
        className="primary-button schedule-mobile-empty-btn"
        onClick={onAddAppointment}
      >
        <Plus size={16} />
        <span>Записать пациента</span>
      </button>
    </div>
  );
};
