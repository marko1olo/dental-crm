import React, { useState } from 'react';
import './SmartWaitlistSuggestor.css';

export interface WaitlistCandidate {
  id: string;
  patientName: string;
  patientPhone: string;
  priorityLevel: 'high' | 'medium' | 'low';
  preferredTimeRanges: { day: string; slot: string }[];
  treatmentSummary: string;
}

export function SmartWaitlistSuggestor({ 
  candidates, 
  cancelledSlotInfo, 
  onAssign, 
  onDismiss 
}: {
  candidates: WaitlistCandidate[];
  cancelledSlotInfo: string;
  onAssign: (candidateId: string) => void;
  onDismiss: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen || candidates.length === 0) return null;

  const handleDismiss = () => {
    setIsOpen(false);
    onDismiss();
  };

  return (
    <div className="waitlist-suggestor-overlay">
      <div className="waitlist-suggestor-modal" role="dialog" aria-labelledby="waitlist-title">
        <header className="waitlist-header">
          <h3 id="waitlist-title">Умный Лист Ожидания</h3>
          <button className="close-btn" onClick={handleDismiss} aria-label="Закрыть">×</button>
        </header>

        <div className="waitlist-body">
          <p className="waitlist-context">
            Слот <strong>{cancelledSlotInfo}</strong> освободился. 
            Система подобрала 3 наиболее приоритетных пациентов:
          </p>
          
          <div className="candidates-list">
            {candidates.slice(0, 3).map(candidate => (
              <article key={candidate.id} className={`candidate-card priority-${candidate.priorityLevel}`}>
                <div className="candidate-info">
                  <div className="candidate-header">
                    <strong>{candidate.patientName}</strong>
                    <span className="priority-badge">{candidate.priorityLevel.toUpperCase()} PRIORITY</span>
                  </div>
                  <small>{candidate.patientPhone}</small>
                  <p className="treatment-summary">{candidate.treatmentSummary}</p>
                  <div className="preferred-times">
                    {candidate.preferredTimeRanges.map((pt, i) => (
                      <span key={i} className="time-chip">{pt.day}, {pt.slot}</span>
                    ))}
                  </div>
                </div>
                <div className="candidate-actions">
                  <button 
                    className="assign-btn" 
                    onClick={() => {
                      onAssign(candidate.id);
                      setIsOpen(false);
                    }}
                  >
                    Назначить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
