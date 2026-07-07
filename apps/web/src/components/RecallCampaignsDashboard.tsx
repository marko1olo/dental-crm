import React, { useState, useEffect } from 'react';
import './RecallCampaignsDashboard.css';

interface RecallPatient {
  id: string;
  name: string;
  lastVisit: string;
  cohort: 'Hygiene' | 'Ortho Checkup' | 'Lost';
  contacted: boolean;
}

export const RecallCampaignsDashboard: React.FC = () => {
  const [patients, setPatients] = useState<RecallPatient[]>([]);

  useEffect(() => {
    // Cleanup state for State Bleeding Fix
    setPatients([]);

    const mockData: RecallPatient[] = [
      { id: '1', name: 'Ivanov I.I.', lastVisit: '2025-01-10', cohort: 'Hygiene', contacted: false },
      { id: '2', name: 'Petrova A.S.', lastVisit: '2025-10-15', cohort: 'Ortho Checkup', contacted: true },
      { id: '3', name: 'Sidorov V.V.', lastVisit: '2024-03-20', cohort: 'Lost', contacted: false },
    ];
    setPatients(mockData);

    return () => {
      setPatients([]); // Cleanup on unmount
    };
  }, []);

  const handleContact = (id: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, contacted: true } : p))
    );
  };

  const total = patients.length;
  const contacted = patients.filter((p) => p.contacted).length;
  const conversion = total > 0 ? Math.round((contacted / total) * 100) : 0;

  return (
    <div className="recall-dashboard">
      <div className="dashboard-header">
        <h3>Recall Campaigns Monitoring</h3>
        <div className="conversion-metric">
          <span className="metric-label">Conversion Rate</span>
          <span className="metric-value">{conversion}%</span>
        </div>
      </div>

      <div className="cohort-container">
        {['Hygiene', 'Ortho Checkup', 'Lost'].map((cohort) => (
          <div key={cohort} className="cohort-column">
            <h4>{cohort}</h4>
            <div className="cohort-list">
              {patients
                .filter((p) => p.cohort === cohort)
                .map((p) => (
                  <div key={p.id} className="recall-card">
                    <div className="recall-info">
                      <span className="recall-name">{p.name}</span>
                      <span className="recall-date">Last visit: {p.lastVisit}</span>
                    </div>
                    <button
                      className={`contact-btn ${p.contacted ? 'contacted' : ''}`}
                      onClick={() => handleContact(p.id)}
                      disabled={p.contacted}
                    >
                      {p.contacted ? 'Sent' : 'Contact'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
