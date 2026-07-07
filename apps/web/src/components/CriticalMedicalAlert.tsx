import React from 'react';
import './CriticalMedicalAlert.css';

export interface CriticalMedicalAlertProps {
  allergies?: string[];
  systemicDiseases?: string[];
  onAcknowledge?: () => void;
}

export function CriticalMedicalAlert({ 
  allergies = [], 
  systemicDiseases = [], 
  onAcknowledge 
}: CriticalMedicalAlertProps) {
  if (allergies.length === 0 && systemicDiseases.length === 0) {
    return null;
  }

  return (
    <div className="critical-medical-alert" role="alert" aria-live="assertive">
      <div className="critical-medical-alert-badge">
        <span className="pulse-icon">⚠️</span>
        <strong>CRITICAL MEDICAL ALERT</strong>
      </div>
      
      <div className="critical-medical-alert-content">
        {allergies.length > 0 && (
          <div className="alert-section">
            <span className="alert-label">Аллергии:</span>
            <ul className="alert-list">
              {allergies.map((allergy, i) => <li key={i}>{allergy}</li>)}
            </ul>
          </div>
        )}
        
        {systemicDiseases.length > 0 && (
          <div className="alert-section">
            <span className="alert-label">Системные заболевания:</span>
            <ul className="alert-list">
              {systemicDiseases.map((disease, i) => <li key={i}>{disease}</li>)}
            </ul>
          </div>
        )}
        
        {onAcknowledge && (
          <button className="acknowledge-btn" onClick={onAcknowledge}>
            Ознакомлен (Подтвердить)
          </button>
        )}
      </div>
    </div>
  );
}
