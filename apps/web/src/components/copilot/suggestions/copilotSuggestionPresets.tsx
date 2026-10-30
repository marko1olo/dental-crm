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
  Camera,
  FolderSearch,
  ExternalLink,
  Activity,
  Receipt,
  Calculator,
} from 'lucide-react';
import type { SuggestionCategory } from '../copilotTypes';
import { COPILOT_CATALOG_CATEGORIES } from '../copilotCatalogData';

export const DEFAULT_SUGGESTION_CATEGORIES: SuggestionCategory[] = COPILOT_CATALOG_CATEGORIES.map((cat) => ({
  category: cat.title,
  items: cat.items.map((item) => ({
    label: item.label,
    prompt: item.prompt,
    icon: item.icon,
  })),
}));

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
    case 'Camera': return <Camera size={14} />;
    case 'FolderSearch': return <FolderSearch size={14} />;
    case 'ExternalLink': return <ExternalLink size={14} />;
    case 'Activity': return <Activity size={14} />;
    case 'Receipt': return <Receipt size={14} />;
    case 'Calculator': return <Calculator size={14} />;
    case 'Stethoscope': return <Stethoscope size={14} />;
    default: return <Sparkles size={14} />;
  }
}
