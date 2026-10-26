import React from 'react';
import {
  Sparkles,
  Calendar,
  FileText,
  Stethoscope,
  Search,
  Clock,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Sun,
  UserCheck,
  CalendarPlus,
  Pill,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import type { SuggestionCategory } from '../copilotTypes';

export const DEFAULT_SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    category: 'Быстрые действия у кресла',
    items: [
      { label: 'Заполнить дневник', prompt: 'Заполни дневник приёма по текущему пациенту', icon: 'FileText' },
      { label: 'Составить смету', prompt: 'Рассчитай смету лечения на 3 тарифа: Эконом, Оптимум и Премиум', icon: 'CreditCard' },
      { label: 'Проверить гарантию', prompt: 'Проверь гарантийный срок и статус ранее выполненных работ', icon: 'ShieldCheck' },
      { label: 'Осмотр и формула', prompt: 'Покажи зубную формулу и зафиксируй статус зубов', icon: 'Stethoscope' },
    ],
  },
  {
    category: 'Рабочие сценарии',
    items: [
      { label: 'Утренняя сводка дня', prompt: 'Покажи утреннюю сводку на сегодня: сколько пациентов, выручка и задачи', icon: 'Sun' },
      { label: 'Подготовка к приёму', prompt: 'Покажи детали ближайшего приёма и историю пациента', icon: 'UserCheck' },
      { label: 'Заполнить окно в графике', prompt: 'Найди пациентов из листа ожидания для заполнения свободного окна', icon: 'CalendarPlus' },
    ],
  },
  {
    category: 'Пациенты',
    items: [
      { label: 'Поиск пациента', prompt: 'Найди пациента по фамилии или номеру телефона', icon: 'Search' },
    ],
  },
  {
    category: 'Расписание',
    items: [
      { label: 'Свободные окна сегодня', prompt: 'Покажи все свободные слоты у терапевта на сегодня', icon: 'Clock' },
      { label: 'Записать на приём', prompt: 'Запиши пациента на консультацию к хирургу', icon: 'Calendar' },
    ],
  },
  {
    category: 'База знаний и обучение',
    items: [
      { label: 'Как устроено расписание', prompt: 'Расскажи, как устроена сетка расписания и как быстро создать запись', icon: 'BookOpen' },
      { label: 'Касса и чеки', prompt: 'Как пробить чек и принять оплату картой или по СБП?', icon: 'CreditCard' },
      { label: 'Зубная формула и норма', prompt: 'Как пользоваться зубной формулой и поставить норму?', icon: 'Stethoscope' },
      { label: 'Справка для налогового вычета', prompt: 'Как сформировать справку для налогового вычета (13%)?', icon: 'FileText' },
    ],
  },
];

export function renderSuggestionChipIcon(iconName?: string): React.ReactNode {
  switch (iconName) {
    case 'FileText': return <FileText size={14} />;
    case 'CreditCard': return <CreditCard size={14} />;
    case 'ShieldCheck': return <ShieldCheck size={14} />;
    case 'ShieldAlert': return <ShieldAlert size={14} />;
    case 'Sun': return <Sun size={14} />;
    case 'UserCheck': return <UserCheck size={14} />;
    case 'CalendarPlus': return <CalendarPlus size={14} />;
    case 'Search': return <Search size={14} />;
    case 'Clock': return <Clock size={14} />;
    case 'Calendar': return <Calendar size={14} />;
    case 'Pill': return <Pill size={14} />;
    case 'BookOpen': return <BookOpen size={14} />;
    case 'HelpCircle': return <HelpCircle size={14} />;
    default: return <Sparkles size={14} />;
  }
}
