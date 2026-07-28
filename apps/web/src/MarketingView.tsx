import "./styles/marketing.css";
import { useState } from "react";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Star,
  Copy,
  CheckCircle2,
  Search,
  TrendingUp,
  MapPin,
  Globe
} from "lucide-react";
import { RebookingConversionRulesWidget } from "./components/analytics/RebookingConversionRulesWidget";
import { RecallListPanel } from "./components/patients/RecallListPanel";
import { FamilyRecommendationSourcesWidget } from "./components/marketing/FamilyRecommendationSourcesWidget";
import { LandingFieldMappingsWidget } from "./components/integrations/LandingFieldMappingsWidget";

import { CustomCrmTaskTypesWidget } from "./components/crm/CustomCrmTaskTypesWidget";

type MarketingStats = {
  yandex: { rating: number; reviews: number };
  gis2: { rating: number; reviews: number };
  google: { rating: number; reviews: number };
};

const DEFAULT_STATS: MarketingStats = {
  yandex: { rating: 0, reviews: 0 },
  gis2: { rating: 0, reviews: 0 },
  google: { rating: 0, reviews: 0 }
};

type ReviewTone = "positive" | "negative" | "neutral";

export function MarketingView({ clinicName, clinicPhone }: { clinicName: string; clinicPhone: string }) {
  const [customSeoKeys, setCustomSeoKeys] = useState(() => {
    try {
      const saved = localStorage.getItem("dental_crm_mkt_seo_keys");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("[Marketing] Failed to parse saved SEO keys from localStorage:", e);
    }
    return [
      "лечение кариеса", "безболезненное удаление", "стоматология", 
      "профессиональная гигиена", "имплантация зубов"
    ];
  });
  
  const handleAddSeoKey = (val: string) => {
    if (!val.trim()) return;
    const updated = [...customSeoKeys, val.trim()];
    setCustomSeoKeys(updated);
    localStorage.setItem("dental_crm_mkt_seo_keys", JSON.stringify(updated));
  };

  const handleRemoveSeoKey = (val: string) => {
    const updated = customSeoKeys.filter(k => k !== val);
    setCustomSeoKeys(updated);
    localStorage.setItem("dental_crm_mkt_seo_keys", JSON.stringify(updated));
  };

  const [reviewText, setReviewText] = useState("");
  const [tone, setTone] = useState<ReviewTone>("positive");
  const [generatedReply, setGeneratedReply] = useState("");
  const [phone, setPhone] = useState(() => {
    return localStorage.getItem("dental_crm_mkt_phone") || clinicPhone || "+7 (800) 000-00-00";
  });
  
  const [stats, setStats] = useState<MarketingStats>(() => {
    try {
      const saved = localStorage.getItem("dental_crm_mkt_stats");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("[Marketing] Failed to parse saved stats from localStorage:", e);
    }
    return DEFAULT_STATS;
  });

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"reviews" | "stats" | "keys">("reviews");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    localStorage.setItem("dental_crm_mkt_phone", val);
  };
  
  const updateStat = (platform: keyof MarketingStats, field: 'rating' | 'reviews', value: string) => {
    const num = parseFloat(value) || 0;
    const newStats = { ...stats, [platform]: { ...stats[platform], [field]: num } };
    setStats(newStats);
    localStorage.setItem("dental_crm_mkt_stats", JSON.stringify(newStats));
  };

  const [newKeyInput, setNewKeyInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!reviewText.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    setGeneratedReply("");

    const orchestratorResult = AiOrchestrator.processMarketingReview(reviewText, tone, clinicName, customSeoKeys);
    
    // Simulate AI LLM Request Fallback (Since we are in local UI mode)
    setTimeout(() => {
       if (orchestratorResult.source === "llm_required") {
          // Demo fallback text showing the generated prompt
          const fallbackText = "--- ДЕМО-РЕЖИМ (LLM не подключена) ---\nГенерируемый промпт:\n" + orchestratorResult.suggestedPrompt;
          setGeneratedReply(fallbackText);
       }
       setIsAiLoading(false);
    }, 600);
  };

  const handleCopy = () => {
    if (!generatedReply) return;
    navigator.clipboard.writeText(generatedReply).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const clearAll = () => {
    setReviewText("");
    setGeneratedReply("");
    setCopied(false);
  };

  return (
    <section className="settings-zone marketing-zone panel p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]" id="marketing" aria-label="Маркетинг/SEO" data-testid="marketing-view">
      <div className="panel-heading settings-heading mb-4">
        <h2 title="Маркетинг и привлечение: работа с отзывами на геосервисах, продвижение и воронка сарафанного радио">Маркетинг / SEO</h2>
        <span className="status-pill status-confirmed">
          активен
        </span>
      </div>

      {/* STATS STRIP */}
      <div className="marketing-stats-strip" aria-label="Рейтинги клиники">
        <article className="marketing-stat-card">
          <MapPin aria-hidden="true" className="text-[var(--danger,#e63946)]" />
          <div>
            <p className="eyebrow">Яндекс.Карты</p>
            <div className="marketing-rating flex gap-2 mt-1">
              <input type="number" step="0.1" value={stats.yandex.rating || ''} onChange={e => updateStat('yandex', 'rating', e.target.value)} placeholder="Оценка" className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]" />
              <input type="number" value={stats.yandex.reviews || ''} onChange={e => updateStat('yandex', 'reviews', e.target.value)} placeholder="Отзывов" className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]" />
            </div>
          </div>
        </article>
        <article className="marketing-stat-card">
          <Globe aria-hidden="true" className="text-[var(--brand-500,#2196f3)]" />
          <div>
            <p className="eyebrow">2ГИС</p>
            <div className="marketing-rating flex gap-2 mt-1">
              <input type="number" step="0.1" value={stats.gis2.rating || ''} onChange={e => updateStat('gis2', 'rating', e.target.value)} placeholder="Оценка" className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]" />
              <input type="number" value={stats.gis2.reviews || ''} onChange={e => updateStat('gis2', 'reviews', e.target.value)} placeholder="Отзывов" className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]" />
            </div>
          </div>
        </article>
        <article className="marketing-stat-card">
          <Search aria-hidden="true" className="text-[var(--teal-500,#0f766e)]" />
          <div>
            <p className="eyebrow">Google</p>
            <div className="marketing-rating flex gap-2 mt-1">
              <input type="number" step="0.1" value={stats.google.rating || ''} onChange={e => updateStat('google', 'rating', e.target.value)} placeholder="Оценка" className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]" />
              <input type="number" value={stats.google.reviews || ''} onChange={e => updateStat('google', 'reviews', e.target.value)} placeholder="Отзывов" className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]" />
            </div>
          </div>
        </article>
        <article className="marketing-stat-card col-span-full">
          <TrendingUp aria-hidden="true" className="text-[var(--teal-500,#0f766e)]" />
          <div>
            <p className="eyebrow">Позиция в поиске</p>
            <strong className="text-lg font-bold text-[var(--ink)]">Топ-3 по "стоматология"</strong>
            <p className="text-xs text-[var(--muted,#94a3b8)] mt-1">
              Укажите актуальные данные вручную для отслеживания динамики.
            </p>
          </div>
        </article>
      </div>

      {/* TAB NAV */}
      <div className="marketing-tab-nav" role="tablist">
        <button
          className={`marketing-tab ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
          role="tab"
          aria-selected={activeTab === "reviews"}
          type="button"
        >
          <MessageSquare aria-hidden="true" />
          Ответ на отзыв
        </button>
        <button
          className={`marketing-tab ${activeTab === "keys" ? "active" : ""}`}
          onClick={() => setActiveTab("keys")}
          role="tab"
          aria-selected={activeTab === "keys"}
          type="button"
        >
          <Search aria-hidden="true" />
          SEO-ключи
        </button>
        <button
          className={`marketing-tab ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
          role="tab"
          aria-selected={activeTab === "stats"}
          type="button"
        >
          <TrendingUp aria-hidden="true" />
          Инструкции
        </button>
      </div>

      {/* REVIEW REPLY TAB */}
      {activeTab === "reviews" ? (
        <div className="marketing-panel">
          <div className="marketing-form-grid">
            <div>
              <label className="field-label" htmlFor="mkt-phone">
                Телефон главного врача (для негатива)
              </label>
              <input
                className="text-input"
                id="mkt-phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+7 (000) 000-00-00"
              />
            </div>

            <div>
              <label className="field-label">Тональность отзыва</label>
              <div className="marketing-tone-group" role="group" aria-label="Тональность">
                <button
                  type="button"
                  className={`tone-btn ${tone === "positive" ? "active" : ""}`}
                  onClick={() => setTone("positive")}
                  aria-pressed={tone === "positive"}
                >
                  <ThumbsUp aria-hidden="true" /> Позитив
                </button>
                <button
                  type="button"
                  className={`tone-btn ${tone === "neutral" ? "active" : ""}`}
                  onClick={() => setTone("neutral")}
                  aria-pressed={tone === "neutral"}
                >
                  <MinusCircle aria-hidden="true" /> Нейтральный
                </button>
                <button
                  type="button"
                  className={`tone-btn tone-btn-negative ${tone === "negative" ? "active" : ""}`}
                  onClick={() => setTone("negative")}
                  aria-pressed={tone === "negative"}
                >
                  <ThumbsDown aria-hidden="true" /> Негатив
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="mkt-review">
              Текст отзыва (скопируйте с Яндекса / 2ГИС)
            </label>
            <textarea
              className="text-input"
              id="mkt-review"
              rows={5}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Вставьте текст отзыва сюда..."
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
            <div className="quick-chips-row" style={{ marginTop: '8px', marginBottom: '16px' }}>
              <button type="button" className="quick-chip" onClick={() => { setReviewText("Вчера удаляла зуб мудрости. Врач просто супер, всё прошло без боли!"); setTone("positive"); }}>👍 Удаление зуба (Позитив)</button>
              <button type="button" className="quick-chip" onClick={() => { setReviewText("Долго ждал приема, администратор даже не поздоровалась."); setTone("negative"); }}>👎 Очередь (Негатив)</button>
              <button type="button" className="quick-chip" onClick={() => { setReviewText("Обычная клиника, цены средние."); setTone("neutral"); }}>😐 Обычный отзыв (Нейтраль)</button>
            </div>

          </div>

          <div className="marketing-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleGenerate}
              disabled={!reviewText.trim() || isAiLoading}
            >
              <MessageSquare aria-hidden="true" />
              Сгенерировать ответ
            </button>
            {generatedReply ? (
              <button className="secondary-button" type="button" onClick={clearAll}>
                Очистить
              </button>
            ) : null}
          </div>

          {generatedReply ? (
            <div className="marketing-result">
              <div className="marketing-result-header">
                <p className="eyebrow">Готовый ответ (с SEO-ключами)</p>
                <button
                  type="button"
                  className={`icon-button ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                  aria-label="Скопировать ответ"
                  title="Скопировать"
                >
                  {copied ? <CheckCircle2 aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" /> : <Copy aria-hidden="true" />}
                </button>
              </div>
              <p className="marketing-reply-text">{generatedReply}</p>
              {copied ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-bold">
                  ✓ Скопировано в буфер — вставьте в Яндекс.Карты или 2ГИС
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* SEO KEYS TAB */}
      {activeTab === "keys" ? (
        
        <div className="marketing-panel" style={{ background: "var(--paper-soft)", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px" }}>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Эти ключи автоматически передаются ИИ для вставки в ответы на отзывы. Они помогают продвижению клиники в поиске.
          </p>
          <div className="flex gap-2 mb-4">
             <input type="text" className="text-input" value={newKeyInput} onChange={e => setNewKeyInput(e.target.value)} placeholder="Новый SEO-ключ (напр. 'детский ортодонт')" />
             <button type="button" className="secondary-button" onClick={() => { handleAddSeoKey(newKeyInput); setNewKeyInput(""); }}>Добавить</button>
          </div>
          <div className="seo-keys-grid">
            {customSeoKeys.map((key: string) => (
              <span className="seo-key-chip" key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {key}
                <button type="button" onClick={() => handleRemoveSeoKey(key)} className="bg-transparent border-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0">×</button>
              </span>
            ))}
          </div>

          <p className="eyebrow mt-5">
            Правило вставки ключей
          </p>
          <ul className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-5 mt-2 space-y-1">
            <li><strong>Позитив/нейтральный:</strong> 1-2 ключа естественно в тексте</li>
            <li><strong>Негатив:</strong> 0-1 ключ, минимально, чтобы не выглядело цинично</li>
          </ul>
        </div>
      ) : null}

      {/* INSTRUCTIONS TAB */}
      {activeTab === "stats" ? (
        <div className="marketing-panel" style={{ background: "var(--paper-soft)", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Инструкция по работе с отзывами</h3>
          <ol className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-5 space-y-1">
            <li>Откройте страницу клиники на <strong>Яндекс.Картах</strong> или <strong>2ГИС</strong></li>
            <li>Скопируйте текст нового отзыва</li>
            <li>Вставьте в поле на вкладке «Ответ на отзыв»</li>
            <li>Выберите тональность (позитив / нейтральный / негатив)</li>
            <li>Нажмите «Сгенерировать ответ»</li>
            <li>Скопируйте готовый текст и вставьте в ответ на карте</li>
          </ol>

          <div className="marketing-warning" role="note">
            <strong>⚠ Важно:</strong> Никогда не используйте боты и автоматический сбор отзывов — это ведёт к бану аккаунта и штрафам от площадок.
            Только ручной copy-paste + умная генерация ответа.
          </div>

          <h3 style={{ marginTop: 24 }}>Формула ответа на негативный отзыв</h3>
          <div className="marketing-formula">
            <span className="formula-step">1. Искреннее извинение</span>
            <span className="formula-arrow">→</span>
            <span className="formula-step">2. Признание важности обратной связи</span>
            <span className="formula-arrow">→</span>
            <span className="formula-step">3. Призыв позвонить главврачу для решения</span>
          </div>
        </div>
      ) : null}

      {/*
        Возврат пациентов. Стоит перед мелкими виджетами и во всю ширину: это
        единственный блок раздела, по которому в клинике действительно работают
        руками — звонят и приглашают.
      */}
      <div className="mt-8">
        <RecallListPanel />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FamilyRecommendationSourcesWidget />
        {/*
          LostPatientsFiltersWidget убран отсюда: он читал таблицу
          lost_patients_filters, в которую в проекте никто не пишет — список был
          снимком, сделанным неизвестно когда, и обновиться не мог. Живой расчёт
          стоит выше.
        */}
        <RebookingConversionRulesWidget />
        <LandingFieldMappingsWidget />
        <CustomCrmTaskTypesWidget />
      </div>
    </section>
  );
}
