import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ClinicalScheduler.css';

interface AppointmentSlot {
  id: string;
  time: string;
  patientName: string;
  type: 'therapy' | 'orthopedics' | 'consultation';
  hasCriticalAlert: boolean;
  labStatus?: 'delivered' | 'in_progress' | 'none';
}

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];

const CHAIRS = ['Chair 1', 'Chair 2', 'Chair 3'];

const MOCK_APPOINTMENTS: Record<string, AppointmentSlot> = {
  'Chair 1-09:00': { id: '1', time: '09:00', patientName: 'Ivanov I.', type: 'therapy', hasCriticalAlert: true },
  'Chair 1-11:00': { id: '2', time: '11:00', patientName: 'Sidorov V.', type: 'consultation', hasCriticalAlert: false },
  'Chair 2-10:00': { id: '3', time: '10:00', patientName: 'Petrova A.', type: 'orthopedics', hasCriticalAlert: false, labStatus: 'in_progress' },
  'Chair 2-12:00': { id: '4', time: '12:00', patientName: 'Smirnov D.', type: 'orthopedics', hasCriticalAlert: false, labStatus: 'delivered' },
  'Chair 3-09:30': { id: '5', time: '09:30', patientName: 'Kuznetsov P.', type: 'therapy', hasCriticalAlert: false },
};

interface CrosshairState {
  rowIdx: number;
  colIdx: number;
}

export const ClinicalScheduler: React.FC<any> = ({ appointments, onSlotClick }) => {
  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
  const [popoverSlot, setPopoverSlot] = useState<{ time: string; chair: string } | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Autofocus on search when popover opens
  useEffect(() => {
    if (popoverSlot && searchRef.current) {
      // rAF ensures the DOM is painted before focus
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [popoverSlot]);

  const handleCellEnter = useCallback((rowIdx: number, colIdx: number) => {
    setCrosshair({ rowIdx, colIdx });
  }, []);

  const handleCellLeave = useCallback(() => {
    setCrosshair(null);
  }, []);

  const handleEmptyClick = useCallback((time: string, chair: string) => {
    setPatientSearch('');
    setPopoverSlot({ time, chair });
  }, []);

  return (
    <div className="clinical-scheduler">
      <div className="scheduler-header">
        <h3>Daily Schedule</h3>
        <div className="date-picker">Today</div>
      </div>

      {/* Crosshair grid */}
      <div className="scheduler-grid-wrap" onMouseLeave={handleCellLeave}>
        {/* Chair headers */}
        <div className="sg-row sg-header-row">
          <div className="sg-time-cell" />
          {CHAIRS.map((chair, ci) => (
            <div
              key={chair}
              className={`sg-chair-header ${crosshair && crosshair.colIdx === ci ? 'sg-col-highlight' : ''}`}
            >
              {chair}
            </div>
          ))}
        </div>

        {TIME_SLOTS.map((time, ri) => (
          <div key={time} className="sg-row">
            {/* Time label */}
            <div className={`sg-time-cell ${crosshair && crosshair.rowIdx === ri ? 'sg-row-highlight-label' : ''}`}>
              {time}
            </div>

            {CHAIRS.map((chair, ci) => {
              const key = `${chair}-${time}`;
              const appt = MOCK_APPOINTMENTS[key];
              const isRowHighlighted = crosshair !== null && crosshair.rowIdx === ri;
              const isColHighlighted = crosshair !== null && crosshair.colIdx === ci;

              return (
                <div
                  key={key}
                  className={[
                    'sg-cell',
                    isRowHighlighted ? 'sg-row-highlight' : '',
                    isColHighlighted ? 'sg-col-highlight' : '',
                    appt ? `sg-cell--${appt.type}` : 'sg-cell--empty',
                  ].join(' ')}
                  onMouseEnter={() => handleCellEnter(ri, ci)}
                  onClick={() => !appt && handleEmptyClick(time, chair)}
                >
                  {appt ? (
                    <div className="sg-appt">
                      <span className="sg-appt-name">{appt.patientName}</span>
                      <span className="sg-appt-type">{appt.type}</span>
                      <div className="sg-appt-indicators">
                        {appt.hasCriticalAlert && <span className="sg-indicator alert pulse" title="Critical Alert">⚠️</span>}
                        {appt.labStatus === 'in_progress' && <span className="sg-indicator lab-warning pulse" title="Lab in progress">📦</span>}
                        {appt.labStatus === 'delivered' && <span className="sg-indicator lab-ready" title="Lab delivered">✅</span>}
                      </div>
                    </div>
                  ) : (
                    <span className="sg-cell-plus">+</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick-Book Popover */}
      {popoverSlot && (
        <div className="sg-popover-backdrop" onClick={() => setPopoverSlot(null)}>
          <div className="sg-popover" onClick={e => e.stopPropagation()}>
            <div className="sg-popover-header">
              <span>Новая запись — {popoverSlot.chair}, {popoverSlot.time}</span>
              <button className="sg-popover-close" onClick={() => setPopoverSlot(null)}>×</button>
            </div>
            <div className="sg-popover-body">
              <label className="sg-popover-label">Поиск пациента</label>
              <input
                ref={searchRef}
                className="sg-popover-search"
                type="text"
                placeholder="ФИО или телефон..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
              {patientSearch.length > 0 && (
                <div className="sg-popover-results">
                  <div className="sg-popover-result-item">Иванов Иван Иванович</div>
                  <div className="sg-popover-result-item">Петрова Анна Сергеевна</div>
                </div>
              )}
              <button className="sg-popover-confirm">Создать запись</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
