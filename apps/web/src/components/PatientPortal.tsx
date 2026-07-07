import React, { useState, useEffect } from 'react';
import './PatientPortal.css';

interface TreatmentStage {
  id: string;
  description: string;
  cost: number;
  status: 'pending' | 'completed';
}

export const PatientPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  // Mock patient data
  const plan: TreatmentStage[] = [
    { id: '1', description: 'Consultation & CBCT', cost: 3500, status: 'completed' },
    { id: '2', description: 'E.max Crown Tooth 16', cost: 45000, status: 'pending' },
  ];

  const totalCost = plan.reduce((sum, item) => sum + item.cost, 0);
  const paid = plan.filter(i => i.status === 'completed').reduce((sum, item) => sum + item.cost, 0);
  const remaining = totalCost - paid;

  useEffect(() => {
    // Cleanup state for State Bleeding Fix
    return () => {
      setIsAuthenticated(false);
      setPhone('');
      setOtp('');
      setStep('phone');
    };
  }, []);

  const handleSendOtp = () => {
    if (phone.length >= 10) setStep('otp');
  };

  const handleVerifyOtp = () => {
    if (otp === '1234') setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="portal-auth-container">
        <div className="portal-auth-card">
          <h2>Patient Portal Login</h2>
          {step === 'phone' ? (
            <div className="auth-step">
              <p>Enter your phone number</p>
              <input 
                type="tel" 
                placeholder="+1 (555) 000-0000" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <button onClick={handleSendOtp}>Send Code</button>
            </div>
          ) : (
            <div className="auth-step">
              <p>Enter the 4-digit code sent to {phone}</p>
              <input 
                type="text" 
                placeholder="1234" 
                maxLength={4}
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />
              <button onClick={handleVerifyOtp}>Verify & Login</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="patient-portal">
      <header className="portal-header">
        <h2>My Health Dashboard</h2>
        <button className="logout-btn" onClick={() => setIsAuthenticated(false)}>Logout</button>
      </header>

      <div className="portal-grid">
        <section className="portal-card visits-card">
          <h3>My Visits</h3>
          <div className="visit-item past">
            <div className="visit-date">Oct 15, 2025 - 10:00 AM</div>
            <div className="visit-desc">Dr. Smith - Consultation</div>
            <span className="badge gray">Completed</span>
          </div>
          <div className="visit-item upcoming">
            <div className="visit-date">Nov 02, 2025 - 11:30 AM</div>
            <div className="visit-desc">Dr. Smith - Crown Installation</div>
            <div className="visit-actions">
              <button className="btn-confirm">Confirm</button>
              <button className="btn-cancel">Cancel</button>
            </div>
          </div>
        </section>

        <section className="portal-card plan-card">
          <h3>My Treatment Plan</h3>
          <div className="financial-summary">
            <div className="fin-stat">
              <span>Total Plan</span>
              <strong>{totalCost.toLocaleString()} ₽</strong>
            </div>
            <div className="fin-stat">
              <span>Paid</span>
              <strong className="text-green">{paid.toLocaleString()} ₽</strong>
            </div>
            <div className="fin-stat">
              <span>Remaining Balance</span>
              <strong className="text-orange">{remaining.toLocaleString()} ₽</strong>
            </div>
          </div>
          <div className="stages-list">
            {plan.map(stage => (
              <div key={stage.id} className={`stage-item ${stage.status}`}>
                <span className="stage-desc">{stage.description}</span>
                <span className="stage-cost">{stage.cost.toLocaleString()} ₽</span>
                {stage.status === 'completed' && <span className="stage-icon">✓</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="portal-card docs-card">
          <h3>My Documents</h3>
          <div className="doc-item">
            <span>📄 Therapy Consent Form.pdf</span>
            <button className="btn-download">Download</button>
          </div>
          <div className="doc-item">
            <span>🦷 Panoramic_XRay.jpg</span>
            <button className="btn-download" onClick={() => setViewingDoc('Panoramic_XRay.jpg')}>View</button>
          </div>
        </section>
      </div>

      {/* Document Viewer Overlay */}
      {viewingDoc && (
        <div className="doc-overlay" onClick={() => setViewingDoc(null)}>
          <div className="doc-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="doc-overlay-header">
              <h3>{viewingDoc}</h3>
              <button className="doc-close-btn" onClick={() => setViewingDoc(null)}>×</button>
            </div>
            <div className="doc-overlay-body">
              <div className="doc-placeholder">
                <span style={{fontSize: '48px'}}>📄</span>
                <p>Document preview for {viewingDoc}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
