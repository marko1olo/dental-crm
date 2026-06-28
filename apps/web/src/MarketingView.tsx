import "./styles/marketing.css";
import { useState } from "react";
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

const SEO_KEYS_DENTISTRY = [
  "лечение кариеса",
  "безболезненное удаление",
  "стоматология",
  "лечение зубов",
  "чистка зубов",
  "отбеливание зубов",
  "протезирование зубов",
  "имплантация зубов",
  "стоматологическая клиника",
  "детская стоматология",
  "ортодонт брекеты",
  "профессиональная гигиена"
];

type ReviewTone = "positive" | "negative" | "neutral";

function injectSeoKeys(text: string, tone: ReviewTone): string {
  if (tone === "negative") {
    // Minimum keys for negative — don't look cynical
    const key = SEO_KEYS_DENTISTRY[Math.floor(Math.random() * 4)] ?? "лечение зубов";
    return text.replace("{SEO1}", key);
  }
  const key1 = SEO_KEYS_DENTISTRY[Math.floor(Math.random() * 6)] ?? "лечение зубов";
  const key2 = SEO_KEYS_DENTISTRY[6 + Math.floor(Math.random() * 6)] ?? "стоматологическая клиника";
  return text.replace("{SEO1}", key1).replace("{SEO2}", key2);
}

function generateReply(reviewText: string, tone: ReviewTone, clinicName: string, phone: string): string {
  const name = clinicName || "нашей клинике";
  const ph = phone || "администратором";

  if (tone === "positive") {
    const template = `Большое спасибо за ваш отзыв! 😊 Нам очень важно, что вы остались довольны {SEO1} и качеством обслуживания. Мы всегда стремимся к тому, чтобы {SEO2} в ${name} было приятным и безопасным опытом. Ждём вас снова!`;
    return injectSeoKeys(template, tone);
  }

  if (tone === "neutral") {
    const template = `Благодарим вас за обратную связь! Каждый отзыв помогает нам становиться лучше. Если вас что-то не устроило в части {SEO1}, мы будем рады обсудить это лично. Записаться можно по телефону или через приложение. Надеемся увидеть вас снова в ${name}.`;
    return injectSeoKeys(template, tone);
  }

  // Negative
  const template = `Приносим свои искренние извинения за доставленные неудобства. Мы ценим вашу обратную связь и воспринимаем её серьёзно. Пожалуйста, свяжитесь напрямую с главным врачом по телефону ${ph} — мы разберёмся в ситуации и сделаем всё возможное для её решения.`;
  return injectSeoKeys(template, tone);
}

type MarketingStats = {
  yandex: { rating: number; reviews: number };
  gis2: { rating: number; reviews: number };
  google: { rating: number; reviews: number };
};

const MOCK_STATS: MarketingStats = {
  yandex: { rating: 4.7, reviews: 84 },
  gis2: { rating: 4.8, reviews: 61 },
  google: { rating: 4.6, reviews: 112 }
};

export function MarketingView({ clinicName, clinicPhone }: { clinicName: string; clinicPhone: string }) {
  const [reviewText, setReviewText] = useState("");
  const [tone, setTone] = useState<ReviewTone>("positive");
  const [generatedReply, setGeneratedReply] = useState("");
  const [phone, setPhone] = useState(() => {
    return localStorage.getItem("dental_crm_mkt_phone") || clinicPhone || "+7 (800) 000-00-00";
  });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"reviews" | "stats" | "keys">("reviews");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    localStorage.setItem("dental_crm_mkt_phone", val);
  };

  const handleGenerate = () => {
    if (!reviewText.trim()) return;
    const reply = generateReply(reviewText, tone, clinicName, phone);
    setGeneratedReply(reply);
    setCopied(false);
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
            <div className="marketing-rating">
              <Star aria-hidden="true" style={{ color: "#f4a261", width: 16, height: 16 }} />
              <strong>{MOCK_STATS.yandex.rating}</strong>
              <span>· {MOCK_STATS.yandex.reviews} отзывов</span>
            </div>
          </div>
        </article>
        <article className="marketing-stat-card">
          <Globe aria-hidden="true" style={{ color: "#2196f3" }} />
          <div>
            <p className="eyebrow">2ГИС</p>
            <div className="marketing-rating">
              <Star aria-hidden="true" style={{ color: "#f4a261", width: 16, height: 16 }} />
              <strong>{MOCK_STATS.gis2.rating}</strong>
              <span>· {MOCK_STATS.gis2.reviews} отзывов</span>
            </div>
          </div>
        </article>
        <article className="marketing-stat-card">
          <Search aria-hidden="true" style={{ color: "#0f766e" }} />
          <div>
            <p className="eyebrow">Google</p>
            <div className="marketing-rating">
              <Star aria-hidden="true" style={{ color: "#f4a261", width: 16, height: 16 }} />
              <strong>{MOCK_STATS.google.rating}</strong>
              <span>· {MOCK_STATS.google.reviews} отзывов</span>
            </div>
          </div>
        </article>
        <article className="marketing-stat-card" style={{ gridColumn: "1 / -1" }}>
          <TrendingUp aria-hidden="true" style={{ color: "#0f766e" }} />
          <div>
            <p className="eyebrow">Позиция в поиске</p>
            <strong style={{ fontSize: 18 }}>Топ-3 по "стоматология" · Самара</strong>
            <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
              Обновляется вручную. Введите запрос в Яндекс.Карты и зафиксируйте позицию.
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
          </div>

          <div className="marketing-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleGenerate}
              disabled={!reviewText.trim()}
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
            Эти ключи автоматически вставляются в ответы на отзывы. Они помогают продвижению клиники в поиске Яндекс.Карты и 2ГИС.
          </p>
          <div className="seo-keys-grid">
            {SEO_KEYS_DENTISTRY.map((key) => (
              <span className="seo-key-chip" key={key}>
                {key}
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
    </section>
  );
}
