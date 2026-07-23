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
import { LostPatientsFiltersWidget } from "./components/analytics/LostPatientsFiltersWidget";
import { RebookingConversionRulesWidget } from "./components/analytics/RebookingConversionRulesWidget";
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
    } catch(e) {}
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
    } catch (e) {}
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
    <section className="settings-zone marketing-zone" id="marketing" aria-label="Маркетинг/SEO">
      <div className="panel-heading settings-heading">
        <h2>Маркетинг / SEO</h2>
        <span className="status-pill" style={{ background: "#dcfce7", color: "#166534" }}>
          активен
        </span>
      </div>

      {/* STATS STRIP */}
      <div className="marketing-stats-strip" aria-label="Рейтинги клиники">
        <article className="marketing-stat-card">
          <MapPin aria-hidden="true" style={{ color: "#e63946" }} />
          <div>
            <p className="eyebrow">Яндекс.Карты</p>
            <div className="marketing-rating" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input type="number" step="0.1" value={stats.yandex.rating || ''} onChange={e => updateStat('yandex', 'rating', e.target.value)} placeholder="Оценка" style={{ width: '60px', padding: '2px 4px', fontSize: '13px' }} />
              <input type="number" value={stats.yandex.reviews || ''} onChange={e => updateStat('yandex', 'reviews', e.target.value)} placeholder="Отзывов" style={{ width: '70px', padding: '2px 4px', fontSize: '13px' }} />
            </div>
          </div>
        </article>
        <article className="marketing-stat-card">
          <Globe aria-hidden="true" style={{ color: "#2196f3" }} />
          <div>
            <p className="eyebrow">2ГИС</p>
            <div className="marketing-rating" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input type="number" step="0.1" value={stats.gis2.rating || ''} onChange={e => updateStat('gis2', 'rating', e.target.value)} placeholder="Оценка" style={{ width: '60px', padding: '2px 4px', fontSize: '13px' }} />
              <input type="number" value={stats.gis2.reviews || ''} onChange={e => updateStat('gis2', 'reviews', e.target.value)} placeholder="Отзывов" style={{ width: '70px', padding: '2px 4px', fontSize: '13px' }} />
            </div>
          </div>
        </article>
        <article className="marketing-stat-card">
          <Search aria-hidden="true" style={{ color: "#0f766e" }} />
          <div>
            <p className="eyebrow">Google</p>
            <div className="marketing-rating" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input type="number" step="0.1" value={stats.google.rating || ''} onChange={e => updateStat('google', 'rating', e.target.value)} placeholder="Оценка" style={{ width: '60px', padding: '2px 4px', fontSize: '13px' }} />
              <input type="number" value={stats.google.reviews || ''} onChange={e => updateStat('google', 'reviews', e.target.value)} placeholder="Отзывов" style={{ width: '70px', padding: '2px 4px', fontSize: '13px' }} />
            </div>
          </div>
        </article>
        <article className="marketing-stat-card" style={{ gridColumn: "1 / -1" }}>
          <TrendingUp aria-hidden="true" style={{ color: "#0f766e" }} />
          <div>
            <p className="eyebrow">Позиция в поиске</p>
            <strong style={{ fontSize: 18 }}>Топ-3 по "стоматология"</strong>
            <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
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
                  {copied ? <CheckCircle2 aria-hidden="true" style={{ color: "var(--green)" }} /> : <Copy aria-hidden="true" />}
                </button>
              </div>
              <p className="marketing-reply-text">{generatedReply}</p>
              {copied ? (
                <p style={{ color: "var(--green)", fontSize: 13, marginTop: 8, fontWeight: 700 }}>
                  ✓ Скопировано в буфер — вставьте в Яндекс.Карты или 2ГИС
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* SEO KEYS TAB */}
      {activeTab === "keys" ? (
        
        <div className="marketing-panel">
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>
            Эти ключи автоматически передаются ИИ для вставки в ответы на отзывы. Они помогают продвижению клиники в поиске.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
             <input type="text" className="text-input" value={newKeyInput} onChange={e => setNewKeyInput(e.target.value)} placeholder="Новый SEO-ключ (напр. 'детский ортодонт')" />
             <button type="button" className="secondary-button" onClick={() => { handleAddSeoKey(newKeyInput); setNewKeyInput(""); }}>Добавить</button>
          </div>
          <div className="seo-keys-grid">
            {customSeoKeys.map((key: string) => (
              <span className="seo-key-chip" key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {key}
                <button type="button" onClick={() => handleRemoveSeoKey(key)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>

          <p className="eyebrow" style={{ marginTop: 20 }}>
            Правило вставки ключей
          </p>
          <ul style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, paddingLeft: 20, marginTop: 8 }}>
            <li><strong>Позитив/нейтральный:</strong> 1-2 ключа естественно в тексте</li>
            <li><strong>Негатив:</strong> 0-1 ключ, минимально, чтобы не выглядело цинично</li>
          </ul>
        </div>
      ) : null}

      {/* INSTRUCTIONS TAB */}
      {activeTab === "stats" ? (
        <div className="marketing-panel">
          <h3 style={{ marginTop: 0 }}>Инструкция по работе с отзывами</h3>
          <ol style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: 20 }}>
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

      <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "16px" }}>
        <LostPatientsFiltersWidget />
        <RebookingConversionRulesWidget />
        <LandingFieldMappingsWidget />
        <CustomCrmTaskTypesWidget />
      </div>
    </section>
  );
}
