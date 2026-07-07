import React, { useState, useEffect } from 'react';
import './ClinicalScheduler.css';

interface AppointmentSlot {
  id: string;
  time: string;
  patientName: string;
  type: 'therapy' | 'orthopedics' | 'consultation';
  hasCriticalAlert: boolean;
  labStatus?: 'delivered' | 'in_progress' | 'none';
}

export const ClinicalScheduler: React.FC = () => {
  const [chairs, setChairs] = useState<{ [key: string]: AppointmentSlot[] }>({});

  useEffect(() => {
    // Cleanup state for State Bleeding Fix
    setChairs({});

    const mockSchedule = {
      'Chair 1': [
        { id: '1', time: '09:00', patientName: 'Ivanov I.', type: 'therapy' as const, hasCriticalAlert: true },
        { id: '2', time: '11:00', patientName: 'Sidorov V.', type: 'consultation' as const, hasCriticalAlert: false },
      ],
      'Chair 2': [
        { id: '3', time: '10:00', patientName: 'Petrova A.', type: 'orthopedics' as const, hasCriticalAlert: false, labStatus: 'in_progress' as const },
        { id: '4', time: '12:00', patientName: 'Smirnov D.', type: 'orthopedics' as const, hasCriticalAlert: false, labStatus: 'delivered' as const },
      ],
      'Chair 3': [
        { id: '5', time: '09:30', patientName: 'Kuznetsov P.', type: 'therapy' as const, hasCriticalAlert: false },
      ],
    };
    
    setChairs(mockSchedule);

    return () => setChairs({});
  }, []);

  return (
    <div className="clinical-scheduler">
      <div className="scheduler-header">
        <h3>Daily Schedule</h3>
        <div className="date-picker">Today</div>
      </div>

      <div className="scheduler-grid">
        {Object.entries(chairs).map(([chairName, slots]) => (
          <div key={chairName} className="chair-column">
            <div className="chair-header">{chairName}</div>
            <div className="slots-container">
              {slots.map((slot) => (
                <div key={slot.id} className={`appointment-card ${slot.type}`}>
                  <div className="appointment-time">{slot.time}</div>
                  <div className="appointment-details">
                    <span className="patient-name">{slot.patientName}</span>
                    <span className="appointment-type">{slot.type}</span>
                  </div>
                  <div className="appointment-indicators">
                    {slot.hasCriticalAlert && (
                      <span className="indicator alert pulse" title="Critical Medical Alert">⚠️</span>
                    )}
                    {slot.labStatus === 'in_progress' && (
                      <span className="indicator lab-warning pulse" title="Lab order not ready!">📦</span>
                    )}
                    {slot.labStatus === 'delivered' && (
                      <span className="indicator lab-ready" title="Lab order delivered">📦</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
