import React, { createContext, useContext } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

type TourType = 'schedule' | 'ehr' | 'viewer' | 'odontogram' | 'admin';

interface OnboardingContextType {
  startTour: (tour: TourType) => void;
}

const OnboardingContext = createContext<OnboardingContextType>({ startTour: () => {} });

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tours = {
    schedule: [
      { element: '.timeline-container', popover: { title: 'Расписание клиники', description: 'Управление приемами. Используйте Drag-and-Drop для быстрого переноса визитов.' } },
      { element: '.btn-primary', popover: { title: 'Новый визит', description: 'Создайте запись пациента на кресло. Здесь же назначаются recall-даты.' } }
    ],
    ehr: [
      { element: '#patients', popover: { title: 'ЭМК пациента', description: 'Вся история болезни, 2D снимки и расчеты хранятся здесь.' } },
      { element: '#patient-create-guidance', popover: { title: 'Умный ввод', description: 'Ищите или создавайте пациентов в одно окно, без сложных форм.' } }
    ],
    viewer: [
      { element: '#mpr-toolbar', popover: { title: 'КТ и MPR', description: 'Тулбар для переключения W/L пресетов (Bone, Soft Tissue) и 3D режимов (VR, MPR).' } },
      { popover: { title: 'Горячие клавиши', description: 'Зажатая Правая кнопка мыши — регулировка W/L.\n[Скролл мыши] — листать КТ-срезы.\n[Скролл клик + тянуть] — Panning (Сдвиг).' } },
      { popover: { title: 'Продвинутое планирование', description: '[Ctrl] + Клик — трассировка нижнечелюстного нерва (IAN).\n[Shift] + Клик — установка виртуального имплантата.' } }
    ],
    odontogram: [
      { element: '.tooth-chart-container', popover: { title: 'Интерактивная формула FDI', description: 'Кликайте на зубы для вызова радиального меню патологий и выбора 5 поверхностей.' } },
      { element: '.patient-appointment-preferences', popover: { title: 'Смета (Financial Estimate)', description: 'Ваши отметки (кариес, имплант) мгновенно формируют фазированный план лечения со стоимостью.' } }
    ],
    admin: [
      { element: '.settings-page', popover: { title: 'Администрирование', description: 'Настройка реквизитов, расчета маржинальности, учета вычетов на материалы и выплат врачам.' } }
    ]
  };

  const startTour = (tour: TourType) => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Далее →',
      prevBtnText: '← Назад',
      doneBtnText: 'Понятно',
      steps: tours[tour] as any
    });
    driverObj.drive();
  };

  return (
    <OnboardingContext.Provider value={{ startTour }}>
      {children}
    </OnboardingContext.Provider>
  );
};
