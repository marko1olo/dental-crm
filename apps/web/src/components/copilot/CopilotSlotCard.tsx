import React from 'react';
import { Clock, MapPin, User, CalendarPlus } from 'lucide-react';
import type { SlotResult, BookSlotHandler } from './copilotTypes';
import { formatTimeRange } from './useCopilotFormat';

export interface CopilotSlotCardProps {
  slot?: SlotResult | undefined;
  slots?: SlotResult[] | undefined;
  onSelect?: BookSlotHandler;
  onBookSlot?: BookSlotHandler;
  onBook?: BookSlotHandler;
}

export const CopilotSlotCard: React.FC<CopilotSlotCardProps> = ({ slot, slots, onSelect, onBookSlot, onBook }) => {
  const handler = onBookSlot || onSelect || onBook;

  if (slots && slots.length > 0) {
    return (
      <div className="copilot-slots-container">
        <div className="copilot-slots-header">
          <Clock size={12} />
          <span>Доступные окна для записи ({slots.length})</span>
        </div>
        {slots.map((s, idx) => (
          <CopilotSlotCard key={idx} slot={s} onSelect={handler} />
        ))}
      </div>
    );
  }

  if (!slot) return null;

  return (
    <div className="copilot-slot-item">
      <div>
        <div className="copilot-slot-time">
          <Clock size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px', color: 'var(--teal)' }} />
          {formatTimeRange(slot.start_time || '', slot.end_time)}
        </div>
        <div className="copilot-slot-meta">
          {slot.doctor_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <User size={11} />
              {slot.doctor_name}
            </span>
          )}
          {slot.cabinet && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
              <MapPin size={11} />
              {slot.cabinet}
            </span>
          )}
        </div>
      </div>
      {handler && (
        <button
          type="button"
          onClick={() => handler(slot)}
          className="copilot-slot-book-btn"
          title="Записать на приём"
        >
          <CalendarPlus size={13} />
          <span>Выбрать</span>
        </button>
      )}
    </div>
  );
};
