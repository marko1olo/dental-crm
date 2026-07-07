import React, { useEffect, useState } from 'react';
import './PatientJourneyTimeline.css';

interface JourneyEvent {
  id: string;
  timestamp: string;
  type: 'appointment' | 'medical_alert' | 'lab_order' | 'transaction' | 'inventory_depletion';
  title: string;
  description: string;
  amount?: number;
  status?: string;
  actionUrl?: string;
}

export const PatientJourneyTimeline: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [events, setEvents] = useState<JourneyEvent[]>([]);

  useEffect(() => {
    // Cleanup state for State Bleeding Fix
    setEvents([]);
    
    // Mock Data Fetching
    const mockEvents: JourneyEvent[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: 'medical_alert',
        title: 'Anamnesis Updated',
        description: 'Critical Alert registered: Allergy to Lidocaine.',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        type: 'appointment',
        title: 'Consultation & CBCT',
        description: 'Implant planning on FDI 16. Misch Bone Class D2.',
        status: 'Completed',
      },
      {
        id: '3',
        timestamp: new Date().toISOString(),
        type: 'transaction',
        title: 'Installment Down Payment',
        description: 'Received initial payment for Orthopedic plan.',
        amount: 25000,
        status: 'Paid',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() + 3600000).toISOString(),
        type: 'inventory_depletion',
        title: 'Inventory Depleted',
        description: '1x Composite A2, 2x Articaine used. Deducted from inventory.',
      },
      {
        id: '5',
        timestamp: new Date(Date.now() + 86400000 * 3).toISOString(),
        type: 'lab_order',
        title: 'E.max Crown Lab Order',
        description: 'Sent to lab. Expected delivery in 3 days.',
        status: 'In Progress',
        actionUrl: '/lab-orders/5',
      },
    ];
    setEvents(mockEvents);

    return () => {
      // Cleanup on unmount (State Bleeding Fix)
      setEvents([]);
    };
  }, [patientId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'medical_alert': return '⚠️';
      case 'appointment': return '📅';
      case 'transaction': return '💰';
      case 'inventory_depletion': return '📦';
      case 'lab_order': return '🦷';
      default: return '🔹';
    }
  };

  return (
    <div className="patient-journey-timeline">
      <div className="timeline-header">
        <h3>Patient Journey</h3>
        <span className="patient-id-badge">ID: {patientId.slice(0, 8)}</span>
      </div>
      
      <div className="timeline-track">
        {events.map((evt, index) => (
          <div key={evt.id} className={`timeline-item ${evt.type}`}>
            <div className="timeline-marker">
              <div className="marker-icon">{getIcon(evt.type)}</div>
              {index !== events.length - 1 && <div className="marker-line" />}
            </div>
            
            <div className="timeline-content">
              <div className="content-header">
                <span className="timestamp">{new Date(evt.timestamp).toLocaleString()}</span>
                {evt.status && <span className={`status-badge ${evt.status.toLowerCase().replace(' ', '-')}`}>{evt.status}</span>}
              </div>
              <h4>{evt.title}</h4>
              <p>{evt.description}</p>
              {evt.amount && <div className="amount-highlight">+{evt.amount.toLocaleString()} ₽</div>}
              {evt.actionUrl && (
                <button className="timeline-action-btn" onClick={() => console.log('Navigate', evt.actionUrl)}>
                  View Details &rarr;
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
