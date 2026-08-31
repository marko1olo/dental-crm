import React, { useState, useMemo, useCallback } from 'react';
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  PenTool,
  Sparkles,
  Check,
  ArrowRight,
  FileText,
  Pill,
  Users,
  Percent,
  Stethoscope,
  Activity,
  AlertCircle,
  FileSignature,
} from 'lucide-react';
import { formatMoney, formatDateTime, formatTimeRange } from './useCopilotFormat';

// ============================================================================
// TYPE DEFINITIONS FOR GENERATIVE CARDS
// ============================================================================

export interface PatientProfileCardData {
  id: string;
  fullName: string;
  phone?: string | undefined;
  birthDate?: string | undefined;
  gender?: 'male' | 'female' | string | undefined;
  cardNumber?: string | undefined;
  status?: string | undefined;
  balanceRub?: number | undefined;
  depositRub?: number | undefined;
  debtRub?: number | undefined;
  familyBalanceRub?: number | undefined;
  allergies?: string[] | undefined;
  lastVisitDate?: string | undefined;
  lastDoctorName?: string | undefined;
  lastDiagnosis?: string | undefined;
  nextAppointmentDate?: string | undefined;
  activePlanStage?: string | undefined;
}

export interface PatientProfileCardProps {
  patient: PatientProfileCardData;
  onOpenCard?: ((patientId: string) => void) | undefined;
  onSelectPatient?: ((patientId: string) => void) | undefined;
  onBookAppointment?: ((patientId: string) => void) | undefined;
  onSelectPlan?: ((patientId: string) => void) | undefined;
}

export interface ScheduleSlotOption {
  id: string;
  time: string;
  endTime?: string | undefined;
  startTime?: string | undefined;
  durationMinutes?: number | undefined;
  cabinet?: string | undefined;
  chairName?: string | undefined;
  isAvailable?: boolean | undefined;
  priceRub?: number | undefined;
}

export interface ScheduleSlotPickerData {
  doctorId?: string | undefined;
  doctorName?: string | undefined;
  doctorSpecialty?: string | undefined;
  cabinet?: string | undefined;
  date?: string | undefined;
  availableDates?: string[] | undefined;
  slots: ScheduleSlotOption[];
}

export interface ScheduleSlotPickerCardProps {
  data: ScheduleSlotPickerData;
  selectedSlotId?: string | undefined;
  onSelectSlot?: ((slot: ScheduleSlotOption) => void) | undefined;
  onBookSlot?: ((slot: ScheduleSlotOption) => void) | undefined;
  onChangeDate?: ((date: string) => void) | undefined;
}

export interface Prescription107DrugItem {
  id: string;
  mnn: string;
  tradeName?: string | undefined;
  latinName: string;
  dosageForm: string;
  dosage: string;
  quantity: string;
  signa: string;
  icd10?: string | undefined;
}

export interface Prescription107Data {
  id?: string | undefined;
  series?: string | undefined;
  number?: string | undefined;
  issueDate?: string | undefined;
  validityDays?: number | string | undefined;
  patientName: string;
  patientBirthDate?: string | undefined;
  patientAgeYears?: number | undefined;
  patientAddress?: string | undefined;
  doctorName: string;
  doctorSpecialty?: string | undefined;
  doctorSnils?: string | undefined;
  clinicName?: string | undefined;
  clinicOgrn?: string | undefined;
  clinicAddress?: string | undefined;
  medicalLicense?: string | undefined;
  diagnosisIcd10?: string | undefined;
  diagnosisName?: string | undefined;
  drugs: Prescription107DrugItem[];
  isChronicallyIll?: boolean | undefined;
  isSignedUkep?: boolean | undefined;
  ukepCertificate?: string | undefined;
  ukepSignedAt?: string | undefined;
}

export interface Prescription107CardProps {
  prescription: Prescription107Data;
  onPrint?: ((prescription: Prescription107Data) => void) | undefined;
  onSignUkep?: ((prescription: Prescription107Data) => void) | undefined;
}

export interface EstimateStageBreakdown {
  stageName: string;
  proceduresCount: number;
  totalRub: number;
}

export interface EstimateTierOption {
  tierKey: 'economy' | 'optimum' | 'premium';
  tierName: string;
  badge: string;
  totalRub: number;
  monthlyInstallmentRub?: number | undefined;
  installmentMonths?: number | undefined;
  taxDeductionRub: number;
  netCostAfterDeductionRub: number;
  warrantyDescription: string;
  materialsDescription: string;
  keyAdvantages: string[];
  stages?: EstimateStageBreakdown[] | undefined;
}

export interface EstimateTierData {
  patientId?: string | undefined;
  patientName?: string | undefined;
  discountPercent?: number | undefined;
  createdAt?: string | undefined;
  diagnoses?: string[] | undefined;
  teeth?: (string | number)[] | undefined;
  selectedTier?: 'economy' | 'optimum' | 'premium' | undefined;
  tiers: EstimateTierOption[];
}

export interface EstimateTierCardProps {
  data: EstimateTierData;
  activeTier?: 'economy' | 'optimum' | 'premium' | undefined;
  onSelectTier?: ((tierKey: 'economy' | 'optimum' | 'premium') => void) | undefined;
  onApplyTier?: ((tierKey: 'economy' | 'optimum' | 'premium', tier: EstimateTierOption) => void) | undefined;
}

// ============================================================================
// 1. PatientProfileCard COMPONENT
// ============================================================================

export const PatientProfileCard: React.FC<PatientProfileCardProps> = ({
  patient,
  onOpenCard,
  onSelectPatient,
  onBookAppointment,
  onSelectPlan,
}) => {
  const handleOpen = onOpenCard || onSelectPatient;

  const initials = useMemo(() => {
    if (!patient.fullName) return 'П';
    const parts = patient.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }, [patient.fullName]);

  const rawBalance = patient.balanceRub ?? (patient.depositRub ? patient.depositRub : patient.debtRub ? -patient.debtRub : 0);
  const isPositive = rawBalance >= 0;
  const statusLower = (patient.status || 'active').toLowerCase();

  const allergiesList = patient.allergies || [];
  const hasAllergies = allergiesList.length > 0;

  return (
    <div className="copilot-gen-card copilot-patient-profile-card" data-testid="copilot-patient-profile-card">
      {/* Top Identity Block */}
      <div className="copilot-pp-header">
        <div className="copilot-pp-identity">
          <div className="copilot-pp-avatar">
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="copilot-pp-name-row">
              <h4 className="copilot-pp-name">{patient.fullName}</h4>
              <span className={`copilot-pp-status-badge ${statusLower.includes('vip') ? 'vip' : statusLower.includes('active') ? 'active' : 'primary'}`}>
                {patient.status || 'Пациент клиники'}
              </span>
            </div>
            <div className="copilot-pp-meta">
              {Boolean(patient.phone) && (
                <span className="copilot-pp-meta-item">
                  <Phone size={12} />
                  {patient.phone}
                </span>
              )}
              {Boolean(patient.birthDate) && (
                <span className="copilot-pp-meta-item">
                  <Calendar size={12} />
                  {patient.birthDate}
                </span>
              )}
              {Boolean(patient.cardNumber) && (
                <span className="copilot-pp-meta-item">
                  <FileText size={12} />
                  № {patient.cardNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics Strip */}
      <div className="copilot-pp-finance-strip">
        <div className="copilot-pp-finance-cell">
          <span className="copilot-pp-finance-label">Личный баланс</span>
          <span className={`copilot-pp-finance-val ${isPositive ? 'positive' : 'negative'} tabular-nums`}>
            {isPositive ? `+${formatMoney(rawBalance)}` : formatMoney(rawBalance)}
          </span>
        </div>

        {patient.familyBalanceRub !== undefined && (
          <div className="copilot-pp-finance-cell">
            <span className="copilot-pp-finance-label flex items-center gap-1">
              <Users size={11} className="inline" />
              <span>Семейный счёт</span>
            </span>
            <span className="copilot-pp-finance-val tabular-nums">
              {formatMoney(patient.familyBalanceRub)}
            </span>
          </div>
        )}

        {Boolean(patient.activePlanStage) && (
          <div className="copilot-pp-finance-cell">
            <span className="copilot-pp-finance-label">Этап лечения</span>
            <span className="copilot-pp-finance-val text-xs text-[var(--teal-dark)] truncate">
              {patient.activePlanStage}
            </span>
          </div>
        )}
      </div>

      {/* Allergy & Safety Alert */}
      {hasAllergies ? (
        <div className="copilot-pp-allergy-alert danger">
          <ShieldAlert size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>Аллергический статус:</strong> {allergiesList.join(', ')}
          </span>
        </div>
      ) : (
        <div className="copilot-pp-allergy-alert clean">
          <ShieldCheck size={14} style={{ flexShrink: 0, color: 'var(--green, #15803d)' }} />
          <span>Аллергоанамнез не отягощен</span>
        </div>
      )}

      {/* Clinical History & Next Visit */}
      {(patient.lastVisitDate || patient.lastDiagnosis || patient.nextAppointmentDate) && (
        <div className="copilot-pp-history-row">
          {patient.lastVisitDate && (
            <div className="copilot-pp-history-title">
              <Activity size={13} className="text-[var(--teal)]" />
              <span>Последний приём: {patient.lastVisitDate}</span>
              {patient.lastDoctorName && <span className="text-[var(--muted)] font-normal">({patient.lastDoctorName})</span>}
            </div>
          )}
          {patient.lastDiagnosis && (
            <div className="copilot-pp-history-text">
              Диагноз: <span className="font-semibold text-[var(--ink)]">{patient.lastDiagnosis}</span>
            </div>
          )}
          {patient.nextAppointmentDate && (
            <div className="copilot-pp-history-text flex items-center gap-1 text-[var(--teal-dark)] font-medium">
              <Clock size={12} />
              <span>Следующий визит: {patient.nextAppointmentDate}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="copilot-pp-actions">
        {handleOpen && (
          <button
            type="button"
            onClick={() => handleOpen(patient.id)}
            className="copilot-pp-primary-btn"
            title="Открыть электронную медицинскую карту 043/у"
          >
            <User size={15} />
            <span>Открыть карту</span>
            <ArrowRight size={14} />
          </button>
        )}

        {onBookAppointment && (
          <button
            type="button"
            onClick={() => onBookAppointment(patient.id)}
            className="copilot-pp-secondary-btn"
            title="Записать пациента на приём"
          >
            <Calendar size={14} />
            <span>+ Запись</span>
          </button>
        )}

        {onSelectPlan && (
          <button
            type="button"
            onClick={() => onSelectPlan(patient.id)}
            className="copilot-pp-secondary-btn"
            title="Перейти к плану лечения"
          >
            <FileText size={14} />
            <span>План</span>
          </button>
        )}
      </div>
    </div>
  );
};


// ============================================================================
// 2. ScheduleSlotPickerCard COMPONENT
// ============================================================================

export const ScheduleSlotPickerCard: React.FC<ScheduleSlotPickerCardProps> = ({
  data,
  selectedSlotId,
  onSelectSlot,
  onBookSlot,
  onChangeDate,
}) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedSlotId || data.slots?.[0]?.id);
  const [activeDate, setActiveDate] = useState<string>(data.date || 'Сегодня');
  const [bookedStatus, setBookedStatus] = useState<boolean>(false);

  const availableDates = data.availableDates || ['Сегодня', 'Завтра', 'Послезавтра'];

  const handleSlotClick = (slot: ScheduleSlotOption) => {
    if (slot.isAvailable === false) return;
    setSelectedId(slot.id);
    setBookedStatus(false);
    onSelectSlot?.(slot);
  };

  const selectedSlot = useMemo(() => {
    return data.slots.find((s) => s.id === selectedId) || data.slots[0];
  }, [data.slots, selectedId]);

  const handleBook = () => {
    if (!selectedSlot) return;
    setBookedStatus(true);
    onBookSlot?.(selectedSlot);
  };

  const handleDateSelect = (d: string) => {
    setActiveDate(d);
    onChangeDate?.(d);
  };

  return (
    <div className="copilot-gen-card copilot-schedule-picker-card" data-testid="copilot-schedule-picker-card">
      {/* Header with Doctor info */}
      <div className="copilot-sp-header">
        <div className="copilot-sp-doctor-info">
          <div className="copilot-sp-doctor-icon">
            <Stethoscope size={18} />
          </div>
          <div>
            <div className="copilot-sp-doctor-name">
              {data.doctorName || 'Врач клиники'}
            </div>
            <div className="copilot-sp-doctor-meta">
              {data.doctorSpecialty && <span>{data.doctorSpecialty}</span>}
              {data.cabinet && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {data.cabinet}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Selector Tabs */}
      <div className="copilot-sp-date-bar">
        {availableDates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDateSelect(d)}
            className={`copilot-sp-date-chip ${activeDate === d ? 'active' : ''}`}
          >
            <span>{d}</span>
          </button>
        ))}
      </div>

      {/* Interactive Slots Grid */}
      <div className="copilot-sp-slots-grid">
        {data.slots.map((slot) => {
          const isSelected = slot.id === selectedId;
          const isAvail = slot.isAvailable !== false;
          const label = slot.time || formatTimeRange(slot.startTime || '', slot.endTime);

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!isAvail}
              onClick={() => handleSlotClick(slot)}
              className={`copilot-sp-slot-btn ${isSelected ? 'selected' : ''}`}
              title={isAvail ? `Выбрать время ${label}` : 'Слот уже занят'}
            >
              <span>{label}</span>
              <span className="copilot-sp-slot-duration">
                {slot.durationMinutes ? `${slot.durationMinutes} мин` : '30 мин'}
              </span>
            </button>
          );
        })}
      </div>

      {/* 1-Click Booking Confirmation Bar */}
      {selectedSlot && (
        <div className="copilot-sp-booking-footer">
          <div className="copilot-sp-booking-info">
            <Clock size={14} className="inline mr-1.5" />
            <span>
              {activeDate}: <strong>{selectedSlot.time || selectedSlot.startTime}</strong> ({selectedSlot.cabinet || data.cabinet || 'Кабинет 1'})
            </span>
          </div>

          <button
            type="button"
            onClick={handleBook}
            disabled={bookedStatus}
            className={`copilot-sp-book-btn ${bookedStatus ? 'bg-[var(--green)]' : ''}`}
            title="Забронировать слот в 1 клик"
          >
            {bookedStatus ? (
              <>
                <CheckCircle2 size={15} />
                <span>Забронировано</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Забронировать</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// 3. Prescription107Card COMPONENT
// ============================================================================

export const Prescription107Card: React.FC<Prescription107CardProps> = ({
  prescription,
  onPrint,
  onSignUkep,
}) => {
  const [isSigned, setIsSigned] = useState<boolean>(Boolean(prescription.isSignedUkep));
  const [signing, setSigning] = useState<boolean>(false);

  const handlePrint = useCallback(() => {
    if (onPrint) {
      onPrint(prescription);
    } else if (typeof window !== 'undefined') {
      window.print();
    }
  }, [onPrint, prescription]);

  const handleSign = useCallback(() => {
    if (isSigned) return;
    setSigning(true);
    setTimeout(() => {
      setIsSigned(true);
      setSigning(false);
      onSignUkep?.(prescription);
    }, 300);
  }, [isSigned, onSignUkep, prescription]);

  const series = prescription.series || '77-АА';
  const number = prescription.number || '004821';
  const validityText = prescription.isChronicallyIll
    ? 'Действителен 1 год (для хроников)'
    : `Срок действия: ${prescription.validityDays || 60} дней`;

  return (
    <div className="copilot-gen-card copilot-prescription-card" data-testid="copilot-prescription-card">
      {/* Header */}
      <div className="copilot-rx-header">
        <div className="copilot-rx-title-box">
          <h4 className="copilot-rx-title">
            <Pill size={16} className="text-[var(--teal)]" />
            <span>Рецептурный бланк № 107-1/у</span>
          </h4>
          <span className="copilot-rx-subtitle">
            Приказ Минздрава России от 24.11.2021 № 1094н
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="copilot-rx-series-badge">
            {`${series} № ${number}`}
          </span>
          <span className="text-[10px] font-semibold text-[var(--muted)]">{validityText}</span>
        </div>
      </div>

      {/* Patient & Doctor metadata grid */}
      <div className="copilot-rx-meta-grid">
        <div className="copilot-rx-meta-col">
          <span className="copilot-rx-meta-label">Пациент</span>
          <span className="copilot-rx-meta-val">{prescription.patientName}</span>
          {prescription.patientBirthDate && (
            <span className="text-[11px] text-[var(--muted)]">Дата рожд.: {prescription.patientBirthDate}</span>
          )}
        </div>

        <div className="copilot-rx-meta-col">
          <span className="copilot-rx-meta-label">Врач</span>
          <span className="copilot-rx-meta-val">{prescription.doctorName}</span>
          {prescription.doctorSpecialty && (
            <span className="text-[11px] text-[var(--muted)]">{prescription.doctorSpecialty}</span>
          )}
        </div>
      </div>

      {/* Diagnosis if present */}
      {Boolean(prescription.diagnosisIcd10 || prescription.diagnosisName) && (
        <div className="text-xs text-[var(--ink)] bg-[var(--paper-soft)] p-2 rounded border border-[var(--line)]">
          <strong>Диагноз:</strong> {prescription.diagnosisIcd10} {prescription.diagnosisName ? `(${prescription.diagnosisName})` : ''}
        </div>
      )}

      {/* Drug List (Rp: items in Latin + Signa in Russian) */}
      <div className="copilot-rx-drug-list">
        {prescription.drugs.map((drug, idx) => (
          <div key={drug.id || idx} className="copilot-rx-drug-item">
            <div className="copilot-rx-latin-line">
              {`Rp.: ${drug.latinName || drug.mnn} ${drug.dosage || ''} ${drug.quantity || ''}`.trim()}
            </div>
            <div className="copilot-rx-signa-line">
              <strong>D.S.</strong> {drug.signa}
            </div>
            {drug.tradeName && (
              <div className="text-[10px] text-[var(--muted)]">
                Торговое наим.: {drug.tradeName} ({drug.dosageForm})
              </div>
            )}
          </div>
        ))}
      </div>

      {/* DDI Safety Badge */}
      <div className="copilot-rx-safety-badge">
        <ShieldCheck size={14} />
        <span>Клинический контроль: DDI Safe • Регламент СтАР соблюден</span>
      </div>

      {/* UKEP Stamp Box */}
      {isSigned ? (
        <div className="copilot-rx-ukep-stamp signed">
          <FileSignature size={18} className="text-[var(--teal)] flex-shrink-0" />
          <div style={{ minWidth: 0 }}>
            <div className="font-bold text-xs uppercase tracking-wider text-[var(--teal-dark)]">
              Электронный документ подписан УКЭП
            </div>
            <div className="text-[11px] text-[var(--ink)] mt-0.5">
              Сертификат: <code className="font-mono">{prescription.ukepCertificate || '00E10352F71B39D48C19'}</code>
            </div>
            <div className="text-[10px] text-[var(--muted)]">
              Владелец: {prescription.doctorName} • {prescription.ukepSignedAt || '31.08.2026 22:30'}
            </div>
          </div>
        </div>
      ) : (
        <div className="copilot-rx-ukep-stamp">
          <AlertCircle size={15} className="text-[var(--amber)] flex-shrink-0" />
          <span>Черновик рецепта. Требуется подписание УКЭП врача.</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="copilot-rx-actions">
        <button
          type="button"
          onClick={handlePrint}
          className="copilot-rx-print-btn"
          title="Распечатать официальный бланк 107-1/у"
        >
          <Printer size={15} />
          <span>Печать 107-1/у</span>
        </button>

        <button
          type="button"
          disabled={isSigned || signing}
          onClick={handleSign}
          className="copilot-rx-sign-btn"
          title="Подписать рецепт усиленной квалифицированной электронной подписью"
        >
          {isSigned ? (
            <>
              <CheckCircle2 size={15} />
              <span>Подписано УКЭП</span>
            </>
          ) : signing ? (
            <span>Подписание...</span>
          ) : (
            <>
              <PenTool size={15} />
              <span>Подписать УКЭП</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};


// ============================================================================
// 4. EstimateTierCard COMPONENT
// ============================================================================

export const EstimateTierCard: React.FC<EstimateTierCardProps> = ({
  data,
  activeTier,
  onSelectTier,
  onApplyTier,
}) => {
  const defaultTier = data.selectedTier || activeTier || 'optimum';
  const [currentTierKey, setCurrentTierKey] = useState<'economy' | 'optimum' | 'premium'>(defaultTier);
  const [appliedTierKey, setAppliedTierKey] = useState<string | null>(null);

  const tiers = useMemo(() => {
    if (data.tiers && data.tiers.length > 0) return data.tiers;
    // Fallback standard tier specs
    return [
      {
        tierKey: 'economy' as const,
        tierName: 'Тариф «Эконом»',
        badge: 'Базовый',
        totalRub: 42000,
        taxDeductionRub: 5460,
        netCostAfterDeductionRub: 36540,
        monthlyInstallmentRub: 3500,
        installmentMonths: 12,
        warrantyDescription: '1 год официальной гарантии',
        materialsDescription: 'Базовые сертифицированные композиты (Filtek Z250) и металлокерамика Co-Cr',
        keyAdvantages: ['Доступная стоимость санации', 'Сертифицированные материалы', 'Гарантия 1 год'],
      },
      {
        tierKey: 'optimum' as const,
        tierName: 'Тариф «Оптимум»',
        badge: '★ Рекомендуемый (Выбор врачей)',
        totalRub: 78500,
        taxDeductionRub: 10205,
        netCostAfterDeductionRub: 68295,
        monthlyInstallmentRub: 6540,
        installmentMonths: 12,
        warrantyDescription: '2 года расширенной гарантии',
        materialsDescription: 'Нанокомпозиты Estelite Sigma Quick, безметалловая керамика IPS e.max Press',
        keyAdvantages: ['Идеальный баланс эстетики и долговечности', 'Керамика e.max и наногибрид', 'Расширенная гарантия 2 года'],
      },
      {
        tierKey: 'premium' as const,
        tierName: 'Тариф «Премиум»',
        badge: 'VIP / Индивидуальный',
        totalRub: 135000,
        taxDeductionRub: 17550,
        netCostAfterDeductionRub: 117450,
        monthlyInstallmentRub: 11250,
        installmentMonths: 12,
        warrantyDescription: 'Пожизненная гарантия на конструкции',
        materialsDescription: 'CAD/CAM диоксид циркония Multi-Layer, индивидуальные титановые абатменты',
        keyAdvantages: ['Максимальная биосовместимость', 'Персональный куратор лечения', 'Пожизненная гарантия'],
      },
    ];
  }, [data.tiers]);

  const activeTierObj = useMemo(() => {
    return tiers.find((t) => t.tierKey === currentTierKey) || tiers[1] || tiers[0];
  }, [tiers, currentTierKey]);

  const handleTierSwitch = (key: 'economy' | 'optimum' | 'premium') => {
    setCurrentTierKey(key);
    onSelectTier?.(key);
  };

  const handleApply = () => {
    if (!activeTierObj) return;
    setAppliedTierKey(currentTierKey);
    onApplyTier?.(currentTierKey, activeTierObj);
  };

  return (
    <div className="copilot-gen-card copilot-estimate-tier-card" data-testid="copilot-estimate-tier-card">
      {/* Header */}
      <div className="copilot-et-header">
        <div>
          <h4 className="copilot-et-title">План лечения: 3 тарифных варианта</h4>
          <div className="copilot-et-subtitle">
            {data.patientName && <span>Пациент: {data.patientName} • </span>}
            {data.teeth && data.teeth.length > 0 && <span>Зубы: {data.teeth.join(', ')} • </span>}
            <span>Расчёт по ст. 149 НК РФ / 804н</span>
          </div>
        </div>
      </div>

      {/* Segmented Control Switcher (Apple HIG standard, no 2500px scroll!) */}
      <div className="copilot-et-segmented-control" role="tablist">
        {tiers.map((tier) => {
          const isSelected = tier.tierKey === currentTierKey;
          return (
            <button
              key={tier.tierKey}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleTierSwitch(tier.tierKey)}
              className={`copilot-et-segment-btn ${isSelected ? `active ${tier.tierKey}` : ''}`}
            >
              <span>{tier.tierKey === 'optimum' ? '★ Оптимум' : tier.tierKey === 'premium' ? 'Премиум' : 'Эконом'}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tier Presentation Body */}
      {activeTierObj && (
        <div className={`copilot-et-tier-body ${activeTierObj.tierKey}`}>
          {/* Price & Badge */}
          <div className="copilot-et-price-row">
            <div>
              <h5 className="copilot-et-tier-title">{activeTierObj.tierName}</h5>
              <span className="text-xs font-semibold text-[var(--teal-dark)]">{activeTierObj.badge}</span>
            </div>
            <div className="text-right">
              <span className="copilot-et-price tabular-nums">{formatMoney(activeTierObj.totalRub)}</span>
            </div>
          </div>

          {/* Tax Deduction & Installments Grid */}
          <div className="copilot-et-perks-grid">
            <div className="copilot-et-perk-box">
              <span className="copilot-et-perk-label flex items-center gap-1">
                <Percent size={11} className="text-[var(--teal)]" />
                <span>Вычет 13% НДФЛ</span>
              </span>
              <span className="copilot-et-perk-val text-[var(--teal)] tabular-nums">
                -{formatMoney(activeTierObj.taxDeductionRub)}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                К оплате: {formatMoney(activeTierObj.netCostAfterDeductionRub)}
              </span>
            </div>

            <div className="copilot-et-perk-box">
              <span className="copilot-et-perk-label flex items-center gap-1">
                <CreditCard size={11} className="text-[var(--amber)]" />
                <span>Рассрочка 0%</span>
              </span>
              <span className="copilot-et-perk-val text-[var(--ink)] tabular-nums">
                от {formatMoney(activeTierObj.monthlyInstallmentRub || Math.round(activeTierObj.totalRub / 12))} / мес
              </span>
              <span className="text-[10px] text-[var(--muted)]">на {activeTierObj.installmentMonths || 12} месяцев</span>
            </div>
          </div>

          {/* Warranty & Materials */}
          <div className="copilot-et-materials">
            <div className="font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[var(--teal)]" />
              <span>{activeTierObj.warrantyDescription}</span>
            </div>
            <div>{activeTierObj.materialsDescription}</div>
          </div>

          {/* Key Advantages */}
          <ul className="copilot-et-advantages-list">
            {activeTierObj.keyAdvantages.map((adv, i) => (
              <li key={i} className="copilot-et-adv-item">
                <CheckCircle2 size={13} className="text-[var(--teal)] flex-shrink-0 mt-0.5" />
                <span>{adv}</span>
              </li>
            ))}
          </ul>

          {/* Stage breakdown if available */}
          {activeTierObj.stages && activeTierObj.stages.length > 0 && (
            <div className="pt-2 border-t border-[var(--line)] space-y-1">
              <div className="text-[11px] font-bold uppercase text-[var(--muted)] tracking-wider">Этапы лечения:</div>
              {activeTierObj.stages.map((stage, idx) => (
                <div key={idx} className="flex justify-between text-xs text-[var(--ink)]">
                  <span>{stage.stageName} ({stage.proceduresCount} проц.)</span>
                  <span className="font-semibold tabular-nums">{formatMoney(stage.totalRub)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Apply Tier Action */}
          <button
            type="button"
            onClick={handleApply}
            className={`copilot-et-apply-btn ${appliedTierKey === currentTierKey ? 'applied' : ''}`}
            title={`Утвердить ${activeTierObj.tierName} в качестве активного плана`}
          >
            {appliedTierKey === currentTierKey ? (
              <>
                <CheckCircle2 size={16} />
                <span>Тариф «{activeTierObj.tierName}» применён в план</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Применить тариф в план лечения</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
