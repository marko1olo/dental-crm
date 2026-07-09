import React, { useState, useEffect } from 'react';
import './TourEngine.css';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export type TourStep = {
  targetSelector: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
};

export type TourConfig = {
  id: string;
  steps: TourStep[];
};

const tours: Record<string, TourConfig> = {
  'treatment_plan': {
    id: 'treatment_plan',
    steps: [
      {
        targetSelector: '.odontogram-chart-area',
        title: 'Шаг 1: Выбор зуба',
        content: 'Кликните на больной зуб на 3D-схеме слева, чтобы начать работу с ним.',
        placement: 'right'
      },
      {
        targetSelector: '.tooth-chart-legend',
        title: 'Шаг 2: Легенда',
        content: 'Цвета помогают быстро определить состояние зубов на формуле.',
        placement: 'top'
      },
      {
        targetSelector: '.odontogram-treatment-area',
        title: 'Шаг 3: Смета',
        content: 'Сгенерированная смета появится здесь.',
        placement: 'left'
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
    if (!activeTour) return;

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

    const interval = setInterval(updatePosition, 500);
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
  const gap = 24;
  switch (placement) {
    case 'top':
      return { top: rect.top - gap, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' };
    case 'bottom':
      return { top: rect.bottom + gap, left: rect.left + rect.width / 2, transform: 'translate(-50%, 0)' };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - gap, transform: 'translate(-100%, -50%)' };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + gap, transform: 'translate(0, -50%)' };
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}
