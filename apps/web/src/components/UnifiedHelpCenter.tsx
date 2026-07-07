import React, { useState, useEffect, useRef, useCallback } from 'react';
import './UnifiedHelpCenter.css';

interface HotkeyEntry {
  keys: string;
  description: string;
  scope: 'global' | 'calendar' | 'emr' | 'imaging' | 'billing';
}

interface HelpArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
}

const HOTKEYS: HotkeyEntry[] = [
  { keys: 'Ctrl + K', description: 'Open Help Center', scope: 'global' },
  { keys: 'Ctrl + P', description: 'Create new patient', scope: 'global' },
  { keys: 'Ctrl + S', description: 'Save current draft', scope: 'emr' },
  { keys: 'Ctrl + D', description: 'Open dental chart', scope: 'emr' },
  { keys: 'Ctrl + I', description: 'Open imaging viewer', scope: 'imaging' },
  { keys: 'Ctrl + L', description: 'Create lab order', scope: 'billing' },
  { keys: 'Escape', description: 'Close modal / cancel action', scope: 'global' },
  { keys: 'F5', description: 'Refresh schedule grid', scope: 'calendar' },
  { keys: 'Alt + N', description: 'Next appointment slot', scope: 'calendar' },
  { keys: 'Alt + P', description: 'Previous appointment slot', scope: 'calendar' },
  { keys: 'Ctrl + M', description: 'Mark appointment as arrived', scope: 'calendar' },
  { keys: 'Ctrl + G', description: 'Generate treatment plan PDF', scope: 'billing' },
];

const ARTICLES: HelpArticle[] = [
  {
    id: 'a1',
    title: 'How to schedule an appointment',
    body: 'Click any empty time slot on the Schedule grid. Select a chair, doctor, and patient. Fill in the reason and duration.',
    tags: ['schedule', 'calendar', 'appointment']
  },
  {
    id: 'a2',
    title: 'Adding a Critical Medical Alert',
    body: 'Open the patient EMR → Anamnesis tab → enable the Critical Alert toggle. A red pulsing indicator will appear on all calendar slots for that patient.',
    tags: ['alert', 'allergy', 'anamnesis', 'medical']
  },
  {
    id: 'a3',
    title: 'Creating a Lab Order',
    body: 'From the Treatment Plan, select a prosthetic item → click "Send to Lab". Track the delivery status. When status changes to Delivered, the calendar slot turns green.',
    tags: ['lab', 'order', 'crown', 'delivery']
  },
  {
    id: 'a4',
    title: 'Installment Payment Plans',
    body: 'In the Billing module → Installment Scheduler: enter down payment, duration in months, and discount. The system generates a monthly payment calendar automatically.',
    tags: ['installment', 'billing', 'payment']
  },
  {
    id: 'a5',
    title: 'Generating patient consent (IDS)',
    body: 'Open Consent Templates from the navigation. Choose a template, verify patient data, click Print Consent. The system auto-fills name, tooth numbers, and total cost.',
    tags: ['consent', 'ids', 'document', 'print']
  },
];

interface TourStep {
  selector: string;
  message: string;
}

const TOUR_STEPS: Record<string, TourStep[]> = {
  calendar: [
    { selector: '.scheduler-grid', message: 'This is the Chair Grid — each column is a physical dental chair.' },
    { selector: '.indicator.alert', message: 'Red pulse = patient has a Critical Medical Alert (allergy/diabetes). Check before treatment.' },
    { selector: '.indicator.lab-warning', message: 'Yellow pulse = lab order not delivered yet. Contact the lab before the appointment!' },
  ],
  emr: [
    { selector: '.patient-card', message: 'Patient card shows full medical history, consents, and billing.' },
    { selector: '.dental-chart', message: 'Interactive dental chart — click a tooth to update its clinical status.' },
  ],
};

interface Props {
  onClose: () => void;
  activeModule?: keyof typeof TOUR_STEPS;
}

export const UnifiedHelpCenter: React.FC<Props> = ({ onClose, activeModule = 'calendar' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'articles' | 'hotkeys'>('articles');
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      setSearchQuery('');
      setTourActive(false);
      setTourStep(0);
    };
  }, []);

  const filteredArticles = ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some((t) => t.includes(searchQuery.toLowerCase()))
  );

  const filteredHotkeys = HOTKEYS.filter(
    (h) =>
      h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.keys.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startTour = useCallback(() => {
    setTourActive(true);
    setTourStep(0);
    onClose(); // Close the help center first, then overlay runs
  }, [onClose]);

  const currentTourSteps = TOUR_STEPS[activeModule] ?? [];
  const currentStep = currentTourSteps[tourStep];

  return (
    <div className="help-center-overlay" onClick={onClose}>
      <div className="help-center-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h3>Help & Shortcuts Center</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search articles or shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tab-bar">
          <button
            className={activeTab === 'articles' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('articles')}
          >
            📄 Articles
          </button>
          <button
            className={activeTab === 'hotkeys' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('hotkeys')}
          >
            ⌨️ Hotkeys
          </button>
        </div>

        <div className="help-content">
          {activeTab === 'articles' && (
            <div className="article-list">
              {filteredArticles.length === 0 && (
                <p className="empty-state">No articles found for "{searchQuery}"</p>
              )}
              {filteredArticles.map((a) => (
                <div key={a.id} className="article-card">
                  <h4>{a.title}</h4>
                  <p>{a.body}</p>
                  <div className="article-tags">
                    {a.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="hotkey-table">
              {(['global', 'calendar', 'emr', 'imaging', 'billing'] as const).map((scope) => {
                const keys = filteredHotkeys.filter((h) => h.scope === scope);
                if (keys.length === 0) return null;
                return (
                  <div key={scope} className="hotkey-group">
                    <span className="scope-label">{scope.toUpperCase()}</span>
                    {keys.map((h) => (
                      <div key={h.keys} className="hotkey-row">
                        <span className="hotkey-keys">{h.keys}</span>
                        <span className="hotkey-desc">{h.description}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="help-footer">
          <button className="tour-btn" onClick={startTour}>
            🚀 Start Interactive Tour ({activeModule})
          </button>
        </div>
      </div>

      {tourActive && currentStep && (
        <div className="tour-tooltip">
          <p>{currentStep.message}</p>
          <div className="tour-nav">
            <span>{tourStep + 1} / {currentTourSteps.length}</span>
            <button
              disabled={tourStep >= currentTourSteps.length - 1}
              onClick={() => setTourStep((s) => s + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
