import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Calendar, FileText, Settings, X, LogOut, ChevronRight } from 'lucide-react';

interface CommandPaletteProps {
  patients: any[];
  onSelectPatient: (patientId: string) => void;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
}

export function CommandPalette({ patients, onSelectPatient, onNavigate, onLogout }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredPatients = query
    ? patients.filter(p => p.fullName.toLowerCase().includes(query.toLowerCase()) || p.phone?.includes(query))
    : [];

  const commands = [
    { id: 'view-schedule', icon: <Calendar size={18} />, label: 'Расписание', action: () => onNavigate('schedule') },
    { id: 'view-patients', icon: <User size={18} />, label: 'Пациенты', action: () => onNavigate('patients') },
    { id: 'view-documents', icon: <FileText size={18} />, label: 'Документы', action: () => onNavigate('documents') },
    { id: 'view-settings', icon: <Settings size={18} />, label: 'Настройки', action: () => onNavigate('settings') },
  ].filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  if (onLogout) {
    commands.push({ id: 'logout', icon: <LogOut size={18} />, label: 'Выйти', action: onLogout });
  }

  const items: Array<{ id: string; icon: React.ReactNode; label: string; subLabel?: string; action: () => void }> = [
    ...filteredPatients.slice(0, 5).map(p => ({
      id: `patient-${p.id}`,
      icon: <User size={18} />,
      label: p.fullName,
      subLabel: p.phone,
      action: () => {
        onSelectPatient(p.id);
        setIsOpen(false);
      }
    })),
    ...commands
  ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items.length > 0) {
      e.preventDefault();
      items[selectedIndex]?.action?.();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-palette-header">
          <Search size={20} className="cmd-palette-icon" />
          <input
            ref={inputRef}
            className="cmd-palette-input"
            placeholder="Найти пациента или команду (Ctrl+K)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="cmd-palette-close" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="cmd-palette-content">
          {items.length === 0 ? (
            <div className="cmd-palette-empty">Ничего не найдено</div>
          ) : (
            <ul className="cmd-palette-list">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={`cmd-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                >
                  <div className="cmd-palette-item-icon">{item.icon}</div>
                  <div className="cmd-palette-item-text">
                    <span className="cmd-palette-item-label">{item.label}</span>
                    {item.subLabel && <span className="cmd-palette-item-sublabel">{item.subLabel}</span>}
                  </div>
                  <ChevronRight size={16} className="cmd-palette-item-arrow" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


