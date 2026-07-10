import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ClinicalScheduler.css';

interface AppointmentSlot {
  id: string;
  time: string;
  patientName: string;
  type: 'therapy' | 'orthopedics' | 'consultation';
  hasCriticalAlert: boolean;
  labStatus?: 'delivered' | 'in_progress' | 'none' | 'ready';
  duration?: number;
  alert?: string;
}

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];


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

export const ClinicalScheduler: React.FC<any> = ({ appointments, dashboard, onSlotClick }) => {
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

  const activeChairs = dashboard?.clinicSettings?.chairs?.filter((c: any) => c.active) || [];
  const chairsCount = activeChairs.length || 1;
  const isSingleChair = chairsCount === 1;
  const rowStyle = { gridTemplateColumns: `60px repeat(${chairsCount}, 1fr)` };

  return (
    <div className="clinical-scheduler">
      <div className="scheduler-header">
        <h3>Daily Schedule</h3>
        <div className="date-picker">Today</div>
      </div>

      {/* Crosshair grid */}
      <div className="scheduler-grid-wrap" onMouseLeave={handleCellLeave}>
        {/* Chair headers */}
        {!isSingleChair && (
          <div className="sg-row sg-header-row" style={rowStyle}>
            <div className="sg-time-cell" />
            {activeChairs.map((chair: any, ci: number) => (
              <div
                key={chair.id}
                className={`sg-chair-header ${crosshair && crosshair.colIdx === ci ? 'sg-col-highlight' : ''}`}
              >
                {chair.name}
              </div>
            ))}
          </div>
        )}

        {TIME_SLOTS.map((time, ri) => (
          <div key={time} className="sg-row" style={rowStyle}>
            {/* Time label */}
            <div className={`sg-time-cell ${crosshair && crosshair.rowIdx === ri ? 'sg-row-highlight-label' : ''}`}>
              {time}
            </div>

            {activeChairs.map((chair: any, ci: number) => {
              // Try to find a real appointment that matches chairId and time (HH:mm startsAt)
              // Or fallback to mock for visuals
              const realAppt = (appointments || []).find((a: any) => 
                a.chairId === chair.id && 
                a.startsAt && a.startsAt.includes("T" + time)
              );
              const key = `${chair.name}-${time}`;
              const mockAppt = MOCK_APPOINTMENTS[key];
              const appt = realAppt ? {
                id: realAppt.id,
                time: time,
                chair: chair.name,
                patientId: realAppt.patientId,
                patientName: "Patient Name (DB)",
                type: "Consultation",
                duration: 30,
                alert: null,
                labStatus: null
              } : mockAppt;

              return (
                <div 
                  key={chair.id} 
                  className={`sg-cell ${!appt ? 'sg-cell--empty' : 'sg-cell--filled'} 
                    ${crosshair && crosshair.rowIdx === ri && crosshair.colIdx === ci ? 'sg-cell-highlight' : ''}
                    ${crosshair && (crosshair.rowIdx === ri || crosshair.colIdx === ci) ? 'sg-row-highlight' : ''}
                  `}
                  onMouseEnter={() => setCrosshair({ rowIdx: ri, colIdx: ci })}
                  onClick={() => {
                    if (!appt) handleEmptyClick(time, chair.id);
                  }}
                >
                  {appt && (
                    <div className={`sg-appt-card sg-appt-${appt.type.toLowerCase()}`}>
                      <div className="sg-appt-title">{appt.patientName}</div>
                      <div className="sg-appt-meta">{appt.type}  {appt.duration}m</div>
                      <div className="sg-appt-badges">
                        {appt.alert && <span className="sg-badge sg-badge-alert">{appt.alert}</span>}
                        {appt.labStatus === 'ready' && <span className="sg-badge sg-badge-lab"></span>}
                      </div>
                    </div>
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
