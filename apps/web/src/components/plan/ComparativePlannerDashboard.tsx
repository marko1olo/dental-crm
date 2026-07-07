import React, { useState, useMemo } from 'react';
import { Check, X, ShieldAlert, CreditCard, MoreVertical, Printer, Download, Archive, FileText } from 'lucide-react';

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

const MOCK_PLANS: TreatmentPlan[] = [
  {
    id: 'plan-a',
    title: 'План А: Премиум-Цирконий',
    description: 'Максимальная эстетика и долговечность',
    visitsCount: 3,
    warrantyYears: 10,
    durabilityScore: 'Высокая',
    labWaitDays: 7,
    status: 'draft',
    items: [
      { id: '1', name: 'Коронка из диоксида циркония (E.max)', priceRub: 45000, isOptional: false, category: 'ortho' },
      { id: '2', name: 'Снятие оттисков (цифра)', priceRub: 5000, isOptional: false, category: 'ortho' },
      { id: '3', name: 'Профессиональная гигиена полости рта', priceRub: 8000, isOptional: true, category: 'hygiene' },
      { id: '4', name: 'Временная коронка (PMMA)', priceRub: 6000, isOptional: true, category: 'ortho' },
    ],
  },
  {
    id: 'plan-b',
    title: 'План Б: Металлокерамика',
    description: 'Надежный стандартный вариант',
    visitsCount: 4,
    warrantyYears: 5,
    durabilityScore: 'Средняя',
    labWaitDays: 10,
    status: 'draft',
    items: [
      { id: '5', name: 'Металлокерамическая коронка', priceRub: 22000, isOptional: false, category: 'ortho' },
      { id: '6', name: 'Снятие оттисков (А-силикон)', priceRub: 3000, isOptional: false, category: 'ortho' },
      { id: '7', name: 'Терапевтическая подготовка (Эндо)', priceRub: 15000, isOptional: false, category: 'therapy' },
      { id: '8', name: 'Временная коронка (композит)', priceRub: 4000, isOptional: true, category: 'ortho' },
    ],
  },
];

const MOCK_INSURANCE: InsuranceContract = {
  id: 'ins-1',
  companyName: 'АльфаСтрахование ДМС',
  coverageTherapyPct: 80,
  coverageOrthoPct: 50,
  coverageHygienePct: 100,
  coverageSurgeryPct: 80,
};

export const ComparativePlannerDashboard: React.FC = () => {
  const [plans, setPlans] = useState<TreatmentPlan[]>(MOCK_PLANS);
  const [insuranceActive, setInsuranceActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // Optional services toggle state: { [planId]: { [itemId]: boolean } }
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
        if (insuranceActive) {
          if (item.category === 'therapy') coveragePct = MOCK_INSURANCE.coverageTherapyPct;
          if (item.category === 'ortho') coveragePct = MOCK_INSURANCE.coverageOrthoPct;
          if (item.category === 'hygiene') coveragePct = MOCK_INSURANCE.coverageHygienePct;
          if (item.category === 'surgery') coveragePct = MOCK_INSURANCE.coverageSurgeryPct;
        }
        
        const coveredAmt = (item.priceRub * coveragePct) / 100;
        insuranceCoverage += coveredAmt;
        patientCopay += (item.priceRub - coveredAmt);
      }
    });

    return { total, patientCopay, insuranceCoverage };
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Сравнительный конструктор смет
            </h1>
            <p className="text-zinc-400 mt-2">Анализ альтернативных планов лечения для пациента</p>
          </div>
          <div className="flex items-center space-x-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-md">
            <ShieldAlert className={insuranceActive ? "text-emerald-400" : "text-zinc-500"} />
            <div>
              <p className="text-sm font-semibold">Полис ДМС</p>
              <p className="text-xs text-zinc-400">{MOCK_INSURANCE.companyName}</p>
            </div>
            <button
              onClick={() => setInsuranceActive(!insuranceActive)}
              className={`ml-4 px-4 py-2 rounded-lg text-sm transition-all ${
                insuranceActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              {insuranceActive ? 'Применен' : 'Применить полис'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => {
            const { total, patientCopay, insuranceCoverage } = calculateTotals(plan);
            const isApproved = plan.status === 'approved';
            const isArchived = plan.status === 'archived';

            return (
              <div 
                key={plan.id}
                className={`relative flex flex-col bg-zinc-900/40 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isApproved ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.02]' : 
                  isArchived ? 'border-zinc-800/50 opacity-50 grayscale' : 
                  'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Header */}
                <div className={`p-6 ${isApproved ? 'bg-emerald-500/10' : 'bg-zinc-900/50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold">{plan.title}</h2>
                      <p className="text-sm text-zinc-400 mt-1 h-10">{plan.description}</p>
                    </div>
                    {/* Hick's Law: Dropdown for secondary actions */}
                    <div className="relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === plan.id ? null : plan.id)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {activeDropdown === plan.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveDropdown(null)} 
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl z-20 py-2">
                            <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                              <Printer className="w-4 h-4" /> Печать ИДС
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                              <FileText className="w-4 h-4" /> Выгрузка сметы
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                              <Download className="w-4 h-4" /> Экспорт КТ
                            </button>
                            <div className="border-t border-zinc-800 my-1"></div>
                            <button className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-zinc-800 hover:text-rose-300 flex items-center gap-2">
                              <Archive className="w-4 h-4" /> Архивировать
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col space-y-2">
                    {insuranceActive ? (
                      <>
                        <div className="flex justify-between items-end">
                          <span className="text-sm text-zinc-400">Итого:</span>
                          <span className="text-lg text-zinc-500 line-through">{total.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-sm text-emerald-400">Покрывает ДМС:</span>
                          <span className="text-lg font-bold text-emerald-400">-{insuranceCoverage.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-zinc-800">
                          <span className="text-sm font-semibold text-white">К оплате (Copay):</span>
                          <span className="text-3xl font-black text-cyan-400">{patientCopay.toLocaleString()} ₽</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-semibold text-white">Итого:</span>
                        <span className="text-3xl font-black text-white">{total.toLocaleString()} ₽</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parameters */}
                <div className="p-6 border-b border-zinc-800/50 bg-zinc-950/30 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Визиты</p>
                    <p className="font-semibold">{plan.visitsCount} посещений</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Гарантия</p>
                    <p className="font-semibold">{plan.warrantyYears} лет</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Износостойкость</p>
                    <p className="font-semibold">{plan.durabilityScore}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Ожидание лабы</p>
                    <p className="font-semibold">{plan.labWaitDays} дней</p>
                  </div>
                </div>

                {/* Services */}
                <div className="p-6 flex-1 flex flex-col space-y-3">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase mb-2">Услуги в смете</h3>
                  {plan.items.map(item => {
                    const isSelected = !item.isOptional || optionalToggles[plan.id]?.[item.id];
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-start space-x-3 p-3 rounded-xl border transition-colors ${
                          isSelected ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-transparent border-transparent opacity-50'
                        }`}
                      >
                        {item.isOptional ? (
                          <button 
                            onClick={() => handleToggleOptional(plan.id, item.id)}
                            disabled={plan.status !== 'draft'}
                            className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                              isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-600 hover:border-zinc-500'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-zinc-950" />}
                          </button>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-md bg-zinc-700/50 flex items-center justify-center mt-0.5">
                            <ShieldAlert className="w-3 h-3 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`text-sm ${isSelected ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
                            {item.name}
                            {item.isOptional && <span className="ml-2 text-[10px] uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Опция</span>}
                          </p>
                          <p className="text-xs text-zinc-500 font-mono mt-1">{item.priceRub.toLocaleString()} ₽</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="p-6 mt-auto">
                  {plan.status === 'draft' && (
                    <div className="flex flex-col space-y-4">
                      <button 
                        onClick={() => handleApprove(plan.id)}
                        className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 font-bold hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      >
                        <Check className="w-5 h-5" />
                        <span>Утвердить план</span>
                      </button>
                      
                      <button 
                        onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, status: 'archived' } : p))}
                        className="w-full min-h-[44px] py-3 rounded-xl bg-zinc-800/50 text-rose-400 font-semibold hover:bg-zinc-800 hover:text-rose-300 transition-colors flex items-center justify-center space-x-2 border border-transparent hover:border-rose-500/30"
                      >
                        <X className="w-5 h-5" />
                        <span>Отклонить</span>
                      </button>
                    </div>
                  )}
                  {isApproved && (
                    <div className="w-full min-h-[44px] py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center space-x-2 border border-emerald-500/50">
                      <Check className="w-5 h-5" />
                      <span>План утвержден</span>
                    </div>
                  )}
                  {isArchived && (
                    <div className="w-full min-h-[44px] py-3 rounded-xl bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center space-x-2">
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
