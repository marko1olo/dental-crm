import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PatientPortal.css';

interface TreatmentStage {
  id: string;
  description: string;
  cost: number;
  status: 'pending' | 'completed';
}

/* ── OTP Input Component ── */
const OTP_LENGTH = 4;

interface OTPInputProps {
  onComplete: (code: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({ onComplete }) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (idx: number) => {
    refs.current[idx]?.focus();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setDigits(prev => {
        const next = [...prev];
        if (next[idx] !== '') {
          next[idx] = '';
          return next;
        }
        // Jump to previous and clear
        if (idx > 0) {
          next[idx - 1] = '';
          focus(idx - 1);
        }
        return next;
      });
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const raw = e.target.value.replace(/\D/g, '').slice(-1);
    if (!raw) return;

    setDigits(prev => {
      const next = [...prev];
      next[idx] = raw;
      return next;
    });

    // Auto-advance
    if (idx < OTP_LENGTH - 1) {
      focus(idx + 1);
    } else {
      // Last digit filled — read all after state settles
      setTimeout(() => {
        setDigits(prev => {
          const code = prev.join('');
          if (code.length === OTP_LENGTH) onComplete(code);
          return prev;
        });
      }, 0);
    }
  }, [onComplete]);

  const handlePaste = useCallback((e: React.ClipboardEvent, startIdx: number) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    setDigits(prev => {
      const next = [...prev];
      for (let i = 0; i < pasted.length && startIdx + i < OTP_LENGTH; i++) {
        next[startIdx + i] = pasted[i] ?? '';
      }
      return next;
    });

    const nextFocus = Math.min(startIdx + pasted.length, OTP_LENGTH - 1);
    focus(nextFocus);
    if (pasted.length === OTP_LENGTH) {
      setTimeout(() => onComplete(pasted), 50);
    }
  }, [onComplete]);

  // Fire onComplete when digits are fully filled (handles last-digit path too)
  useEffect(() => {
    const code = digits.join('');
    if (code.length === OTP_LENGTH && !digits.includes('')) {
      onComplete(code);
    }
  }, [digits, onComplete]);

  return (
    <div className="otp-wrap">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          className={`otp-cell ${d ? 'otp-cell--filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={e => handlePaste(e, i)}
          onFocus={e => e.target.select()}
          autoComplete="one-time-code"
          aria-label={`Цифра ${i + 1} из ${OTP_LENGTH}`}
        />
      ))}
    </div>
  );
};

/* ── Main PatientPortal ── */
export const PatientPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpError, setOtpError] = useState('');
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const plan: TreatmentStage[] = [
    { id: '1', description: 'Консультация и КЛКТ', cost: 3500, status: 'completed' },
    { id: '2', description: 'E.max корона зуб 16',  cost: 45000, status: 'pending' },
  ];

  const totalCost  = plan.reduce((s, i) => s + i.cost, 0);
  const paid       = plan.filter(i => i.status === 'completed').reduce((s, i) => s + i.cost, 0);
  const remaining  = totalCost - paid;

  useEffect(() => {
    phoneRef.current?.focus();
    return () => {
      setIsAuthenticated(false);
      setPhone('');
      setStep('phone');
      setOtpError('');
    };
  }, []);

  const handleSendOtp = useCallback(() => {
    if (phone.replace(/\D/g, '').length >= 10) setStep('otp');
  }, [phone]);

  const handleOTPComplete = useCallback((code: string) => {
    if (code === '1234') {
      setOtpError('');
      setIsAuthenticated(true);
    } else {
      setOtpError('Неверный код. Попробуйте ещё раз.');
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="portal-auth-container">
        <div className="portal-auth-card">
          <div className="portal-auth-logo">🦷</div>
          <h2 className="portal-auth-title">Кабинет пациента</h2>

          {step === 'phone' ? (
            <div className="auth-step">
              <p className="auth-hint">Введите номер телефона для входа</p>
              <input
                ref={phoneRef}
                type="tel"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="auth-phone-input"
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              />
              <button onClick={handleSendOtp} className="auth-primary-btn">
                Получить СМС-код
              </button>
            </div>
          ) : (
            <div className="auth-step">
              <p className="auth-hint">
                Код отправлен на <strong>{phone}</strong>
              </p>
              <p className="auth-sublabel">Введите 4-значный код</p>
              <OTPInput onComplete={handleOTPComplete} />
              {otpError && <p className="auth-error">{otpError}</p>}
              <button
                onClick={() => { setStep('phone'); setOtpError(''); }}
                className="auth-text-btn"
              >
                ← Изменить номер
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="patient-portal">
      <header className="portal-header">
        <h2>Мой кабинет пациента</h2>
        <button className="logout-btn" onClick={() => setIsAuthenticated(false)}>Выйти</button>
      </header>

      <div className="portal-grid">
        <section className="portal-card visits-card">
          <h3>Мои приёмы</h3>
          <div className="visit-item past">
            <div className="visit-date">15 Октября 2025 — 10:00</div>
            <div className="visit-desc">Д-р Смит — Консультация</div>
            <span className="badge gray">Завершён</span>
          </div>
          <div className="visit-item upcoming">
            <div className="visit-date">2 Ноября 2025 — 11:30</div>
            <div className="visit-desc">Д-р Смит — Установка коронки</div>
            <div className="visit-actions">
              <button className="btn-confirm">Подтвердить</button>
              <button className="btn-cancel">Отменить</button>
            </div>
          </div>
        </section>

        <section className="portal-card plan-card">
          <h3>План лечения</h3>
          <div className="financial-summary">
            <div className="fin-stat">
              <span>Итого план</span>
              <strong>{totalCost.toLocaleString()} ₽</strong>
            </div>
            <div className="fin-stat">
              <span>Оплачено</span>
              <strong className="text-green">{paid.toLocaleString()} ₽</strong>
            </div>
            <div className="fin-stat">
              <span>Остаток</span>
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
          <h3>Документы</h3>
          <div className="doc-item">
            <span>📄 Согласие на лечение.pdf</span>
            <button className="btn-download">Скачать</button>
          </div>
          <div className="doc-item">
            <span>🦷 Панорамный_снимок.jpg</span>
            <button className="btn-download" onClick={() => setViewingDoc('Панорамный_снимок.jpg')}>Просмотр</button>
          </div>
        </section>
      </div>

      {viewingDoc && (
        <div className="doc-overlay" onClick={() => setViewingDoc(null)}>
          <div className="doc-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="doc-overlay-header">
              <h3>{viewingDoc}</h3>
              <button className="doc-close-btn" onClick={() => setViewingDoc(null)}>×</button>
            </div>
            <div className="doc-overlay-body">
              <div className="doc-placeholder">
                <span style={{ fontSize: '48px' }}>📄</span>
                <p>Предпросмотр документа: {viewingDoc}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
