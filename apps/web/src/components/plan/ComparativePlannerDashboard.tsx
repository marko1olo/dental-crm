import React, { useState } from 'react';
import { Check, X, ShieldAlert, CreditCard, MoreVertical, Printer, Download, Archive, FileText } from 'lucide-react';
import './ComparativePlanner.css';

interface ServiceItem {
  id: string;
  name: string;
  priceRub: number;
  isOptional: boolean;
  category: 'therapy' | 'ortho' | 'hygiene' | 'surgery';
}

interface TreatmentPlan {
  id: string;
  title: string;
  description: string;
  items: ServiceItem[];
  visitsCount: number;
  warrantyYears: number;
  durabilityScore: string;
  labWaitDays: number;
  status: 'draft' | 'approved' | 'archived';
}

interface InsuranceContract {
  id: string;
  companyName: string;
  coverageTherapyPct: number;
  coverageOrthoPct: number;
  coverageHygienePct: number;
  coverageSurgeryPct: number;
}

export const ComparativePlannerDashboard: React.FC = () => {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [insuranceActive, setInsuranceActive] = useState(false);
  const [insuranceData, setInsuranceData] = useState<InsuranceContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Added fetch to purge MOCK_PLANS
  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/treatment-plans').then(r => r.ok ? r.json() : []),
      fetch('/api/insurance/patient').then(r => r.ok ? r.json() : null)
    ]).then(([plansData, insData]) => {
      setPlans(Array.isArray(plansData) ? plansData : []);
      setInsuranceData(insData);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<string>('plan-a');
  const [optionalToggles, setOptionalToggles] = useState<Record<string, Record<string, boolean>>>({
    'plan-a': { '3': true, '4': true },
    'plan-b': { '8': true },
  });

  const handleToggleOptional = (planId: string, itemId: string) => {
    setOptionalToggles(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [itemId]: !prev[planId]?.[itemId]
      }
    }));
  };

  const handleApprove = (planId: string) => {
    setPlans(prev => prev.map(p => ({
      ...p,
      status: p.id === planId ? 'approved' : 'archived'
    })));
  };

  const calculateTotals = (plan: TreatmentPlan) => {
    let total = 0;
    let patientCopay = 0;
    let insuranceCoverage = 0;

    plan.items.forEach(item => {
      const isSelected = !item.isOptional || optionalToggles[plan.id]?.[item.id];
      if (isSelected) {
        total += item.priceRub;
        
        let coveragePct = 0;
        if (insuranceActive && insuranceData) {
          if (item.category === 'therapy') coveragePct = insuranceData.coverageTherapyPct;
          if (item.category === 'ortho') coveragePct = insuranceData.coverageOrthoPct;
          if (item.category === 'hygiene') coveragePct = insuranceData.coverageHygienePct;
          if (item.category === 'surgery') coveragePct = insuranceData.coverageSurgeryPct;
        }
        
        const coveredAmt = (item.priceRub * coveragePct) / 100;
        insuranceCoverage += coveredAmt;
        patientCopay += (item.priceRub - coveredAmt);
      }
    });

    return { total, patientCopay, insuranceCoverage };
  };

  return (
    <div className="comp-planner">
      <div className="comp-container">
        <header className="comp-header">
          <div className="comp-title-group">
            <h1>Сравнительный конструктор смет</h1>
            <p>Анализ альтернативных планов лечения для пациента</p>
          </div>
          {insuranceData ? (
            <div className="insurance-status-card">
              <ShieldAlert className={insuranceActive ? "text-emerald-400" : "text-zinc-500"} />
              <div className="insurance-info">
                <p>Полис ДМС</p>
                <p>{insuranceData.companyName}</p>
              </div>
              <button
                onClick={() => setInsuranceActive(!insuranceActive)}
                className={`insurance-toggle-btn ${insuranceActive ? 'active' : 'inactive'}`}
              >
                {insuranceActive ? 'Применен' : 'Применить полис'}
              </button>
            </div>
          ) : (
            <div className="insurance-status-card">
              <ShieldAlert className="text-zinc-500" />
              <div className="insurance-info">
                <p>Нет полиса ДМС</p>
              </div>
            </div>
          )}
        </header>

        {typeof window !== 'undefined' && window.innerWidth <= 768 && (
          <div className="mobile-plan-tabs">
            <button 
              type="button" 
              className={`mobile-tab-btn ${activeMobileTab === 'plan-a' ? 'active-tab-A' : ''}`}
              onClick={() => setActiveMobileTab('plan-a')}
            >
              План А
            </button>
            <button 
              type="button" 
              className={`mobile-tab-btn ${activeMobileTab === 'plan-b' ? 'active-tab-B' : ''}`}
              onClick={() => setActiveMobileTab('plan-b')}
            >
              План Б
            </button>
          </div>
        )}

        <div className="plans-grid">
          {plans.map(plan => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
            if (isMobile && plan.id !== activeMobileTab) return null;

            const { total, patientCopay, insuranceCoverage } = calculateTotals(plan);
            const isApproved = plan.status === 'approved';
            const isArchived = plan.status === 'archived';

            return (
              <div 
                key={plan.id}
                className={`plan-item-card ${isApproved ? 'is-approved' : ''} ${isArchived ? 'is-archived' : ''}`}
              >
                {/* Header */}
                <div className="plan-card-header">
                  <div className="plan-title-wrapper">
                    <div>
                      <h2>{plan.title}</h2>
                      <p>{plan.description}</p>
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === plan.id ? null : plan.id)}
                        className="plan-actions-trigger"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {activeDropdown === plan.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveDropdown(null)} 
                          />
                          <div className="plan-dropdown-menu">
                            <button onClick={() => setActiveDropdown(null)}>
                              <Printer className="w-4 h-4" /> Печать ИДС
                            </button>
                            <button onClick={() => setActiveDropdown(null)}>
                              <FileText className="w-4 h-4" /> Выгрузка сметы
                            </button>
                            <button onClick={() => setActiveDropdown(null)}>
                              <Download className="w-4 h-4" /> Экспорт КТ
                            </button>
                            <div className="border-t border-zinc-800 my-1"></div>
                            <button 
                              className="danger" 
                              onClick={() => {
                                setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, status: 'archived' } : p));
                                setActiveDropdown(null);
                              }}
                            >
                              <Archive className="w-4 h-4" /> Архивировать
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="plan-pricing-summary">
                    {insuranceActive ? (
                      <>
                        <div className="price-row total-original">
                          <span>Итого:</span>
                          <span>{total.toLocaleString()} ₽</span>
                        </div>
                        <div className="price-row insurance-share">
                          <span>Покрывает ДМС:</span>
                          <span>-{insuranceCoverage.toLocaleString()} ₽</span>
                        </div>
                        <div className="price-row final-due">
                          <span>К оплате:</span>
                          <span className="price-val">{patientCopay.toLocaleString()} ₽</span>
                        </div>
                      </>
                    ) : (
                      <div className="price-row final-due no-insurance">
                        <span>Итого:</span>
                        <span className="price-val">{total.toLocaleString()} ₽</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parameters */}
                <div className="specs-grid">
                  <div className="spec-item">
                    <span>Визиты</span>
                    <span>{plan.visitsCount} посещ.</span>
                  </div>
                  <div className="spec-item">
                    <span>Гарантия</span>
                    <span>{plan.warrantyYears} лет</span>
                  </div>
                  <div className="spec-item">
                    <span>Надежность</span>
                    <span>{plan.durabilityScore}</span>
                  </div>
                  <div className="spec-item">
                    <span>Лаборатория</span>
                    <span>{plan.labWaitDays} дней</span>
                  </div>
                </div>

                {/* Services */}
                <div className="services-section">
                  <h3>Услуги в смете</h3>
                  {plan.items.map(item => {
                    const isSelected = !item.isOptional || optionalToggles[plan.id]?.[item.id];
                    return (
                      <div 
                        key={item.id} 
                        className={`service-tile ${isSelected ? 'is-active' : 'is-inactive'}`}
                      >
                        {item.isOptional ? (
                          <button 
                            onClick={() => handleToggleOptional(plan.id, item.id)}
                            disabled={plan.status !== 'draft'}
                            className={`tile-check-indicator ${isSelected ? 'checked' : ''}`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        ) : (
                          <div className="tile-check-indicator checked">
                            <ShieldAlert className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="tile-info">
                          <p className={isSelected ? '' : 'is-crossed'}>
                            {item.name}
                            {item.isOptional && <span className="optional-tag">Опция</span>}
                          </p>
                          <p className="price-tag">{item.priceRub.toLocaleString()} ₽</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="card-bottom-actions">
                  {plan.status === 'draft' && (
                    <>
                      <button 
                        onClick={() => handleApprove(plan.id)}
                        className="approve-plan-btn"
                      >
                        <Check className="w-5 h-5" />
                        <span>Утвердить план</span>
                      </button>
                      
                      <button 
                        onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, status: 'archived' } : p))}
                        className="reject-plan-btn"
                      >
                        <X className="w-5 h-5" />
                        <span>Отклонить</span>
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <div className="status-badge-approved">
                      <Check className="w-5 h-5" />
                      <span>План утвержден</span>
                    </div>
                  )}
                  {isArchived && (
                    <div className="status-badge-archived">
                      <Archive className="w-5 h-5" />
                      <span>В архиве</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
