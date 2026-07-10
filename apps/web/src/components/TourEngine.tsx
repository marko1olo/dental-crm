import React, { useState, useEffect } from 'react';
import './TourEngine.css';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export type TourStep = {
  targetSelector: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  view?: string;
};

export type TourConfig = {
  id: string;
  steps: TourStep[];
};

const tours: Record<string, TourConfig> = {
  'schedule': {
    id: 'schedule',
    steps: [
      {
        targetSelector: '.schedule-create-btn',
        title: 'Запись на прием',
        content: 'Используйте кнопку «+ Запись» для быстрого создания нового визита пациента в календарь.',
        placement: 'bottom',
        view: 'schedule'
      },
      {
        targetSelector: '.clinical-scheduler',
        title: 'Сетка календаря',
        content: 'Здесь отображаются все запланированные приемы. Вы можете перетаскивать их для изменения времени.',
        placement: 'top',
        view: 'schedule'
      }
    ]
  },
  'patients': {
    id: 'patients',
    steps: [
      {
        targetSelector: 'input[placeholder*="Поиск"], .search-input',
        title: 'Поиск пациентов',
        content: 'Введите ФИО или номер телефона пациента для мгновенного поиска его амбулаторной карты.',
        placement: 'bottom',
        view: 'patients'
      },
      {
        targetSelector: '.patient-admin-panel',
        title: 'Медицинская карта (ЭМК)',
        content: 'Вся персональная, контактная и медицинская информация о пациенте сосредоточена в этой карточке.',
        placement: 'left',
        view: 'patients'
      }
    ]
  },
  'tooth_chart': {
    id: 'tooth_chart',
    steps: [
      {
        targetSelector: '.odontogram-card',
        title: 'Интерактивная зубная формула',
        content: 'Нажмите на любой зуб, чтобы отметить кариес, пломбу или отсутствие зуба в круговом меню.',
        placement: 'top',
        view: 'patients'
      },
      {
        targetSelector: 'button[style*="Групповой выбор"], .odontogram-card button',
        title: 'Групповой выбор зубов',
        content: 'Включите групповой выбор для быстрого применения одного статуса к нескольким зубам одновременно.',
        placement: 'bottom',
        view: 'patients'
      }
    ]
  },
  'treatment_plan': {
    id: 'treatment_plan',
    steps: [
      {
        targetSelector: '.odontogram-card',
        title: 'Клиническое обследование',
        content: 'Назначьте статус зуба на формуле (например, Caries или Crown) — это автоматически создаст план лечения.',
        placement: 'top',
        view: 'patients'
      },
      {
        targetSelector: '.odontogram-treatment-area, [className*="treatment"], .patient-admin-panel',
        title: 'План лечения и смета',
        content: 'Вся калькуляция стоимости услуг, группировка по фазам и печать согласий выполняются в этой зоне.',
        placement: 'left',
        view: 'patients'
      }
    ]
  },
  'finance': {
    id: 'finance',
    steps: [
      {
        targetSelector: '.finance-panel',
        title: 'Финансовый учет клиники',
        content: 'Здесь отображаются все счета пациентов, статусы оплаты и графики рассрочек.',
        placement: 'top',
        view: 'finance'
      },
      {
        targetSelector: '#payment-capture, .payment-capture-form',
        title: 'Регистрация оплаты',
        content: 'Используйте этот блок для приема наличной/безналичной оплаты от пациента и печати чеков.',
        placement: 'bottom',
        view: 'finance'
      }
    ]
  }
};

export default function TourEngine() {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleStartTour = (e: CustomEvent) => {
      const tourId = e.detail;
      if (tours[tourId]) {
        setActiveTour(tours[tourId]);
        setCurrentStepIndex(0);
      }
    };
    
    window.addEventListener('START_TOUR' as any, handleStartTour);
    return () => {
      window.removeEventListener('START_TOUR' as any, handleStartTour);
    };
  }, []);

  useEffect(() => {
    if (!activeTour) {
      setTargetRect(null);
      return;
    }

    const step = activeTour.steps[currentStepIndex];
    if (step && step.view && window.location.hash !== `#${step.view}`) {
      window.location.hash = step.view;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTour(null);
      }
    };

    const updatePosition = () => {
      const step = activeTour.steps[currentStepIndex];
      if (step) {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      }
    };

    const interval = setInterval(updatePosition, 150);
    updatePosition();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeTour, currentStepIndex]);

  if (!activeTour) return null;

  const currentStep = activeTour.steps[currentStepIndex];
  if (!currentStep) return null;

  return (
    <div className="tour-engine-overlay">
      <div className="tour-engine-backdrop" onClick={() => setActiveTour(null)} />
      
      {targetRect && (
        <div 
          className="tour-engine-highlight"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {targetRect && (
        <div 
          className={`tour-engine-popover placement-${currentStep.placement}`}
          style={getPopoverPosition(targetRect, currentStep.placement)}
        >
          <button className="tour-close-btn" onClick={() => setActiveTour(null)}>
            <X size={16} />
          </button>
          <h4 className="tour-title">{currentStep.title}</h4>
          <p className="tour-content">{currentStep.content}</p>
          <div className="tour-footer">
            <div className="tour-dots">
              {activeTour.steps.map((_, idx) => (
                <span key={idx} className={`tour-dot ${idx === currentStepIndex ? 'active' : ''}`} />
              ))}
            </div>
            <div className="tour-controls">
              <button 
                className="tour-btn secondary" 
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex(i => i - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className="tour-btn primary"
                onClick={() => {
                  if (currentStepIndex === activeTour.steps.length - 1) {
                    setActiveTour(null);
                  } else {
                    setCurrentStepIndex(i => i + 1);
                  }
                }}
              >
                {currentStepIndex === activeTour.steps.length - 1 ? 'Завершить' : 'Далее'}
                {currentStepIndex < activeTour.steps.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getPopoverPosition(rect: DOMRect, placement: string): React.CSSProperties {
  const gap = 16;
  const popoverWidth = 320;
  
  let top = 0;
  let left = 0;
  let transform = '';

  switch (placement) {
    case 'top':
      top = rect.top - gap;
      left = rect.left + rect.width / 2;
      transform = 'translate(-50%, -100%)';
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2;
      transform = 'translate(-50%, 0)';
      break;
    case 'left':
      top = rect.top + rect.height / 2;
      left = rect.left - gap;
      transform = 'translate(-100%, -50%)';
      break;
    case 'right':
      top = rect.top + rect.height / 2;
      left = rect.right + gap;
      transform = 'translate(0, -50%)';
      break;
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  // Boundary checks
  if (placement === 'top' || placement === 'bottom') {
    const leftEdge = left - popoverWidth / 2;
    const rightEdge = left + popoverWidth / 2;
    if (leftEdge < 8) {
      left = 8;
      transform = `translate(0, ${placement === 'top' ? '-100%' : '0'})`;
    } else if (rightEdge > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
      transform = `translate(0, ${placement === 'top' ? '-100%' : '0'})`;
    }
  } else if (placement === 'left') {
    if (rect.left - gap - popoverWidth < 8) {
      left = rect.right + gap;
      transform = 'translate(0, -50%)';
    }
  } else if (placement === 'right') {
    if (rect.right + gap + popoverWidth > window.innerWidth - 8) {
      left = rect.left - gap;
      transform = 'translate(-100%, -50%)';
    }
  }

  if (top < 8) {
    top = 8;
  }

  return {
    position: 'fixed',
    top,
    left,
    transform,
    width: popoverWidth,
    maxWidth: 'calc(100vw - 16px)'
  };
}
