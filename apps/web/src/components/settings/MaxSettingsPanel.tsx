import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import React from "react";
import type { MaxStaffRouting } from "../../hooks/useMaxSettings.js";
import { useMaxSettings } from "../../hooks/useMaxSettings.js";
import { MessengerRoutingRules } from "./MessengerRoutingRules.js";

interface StaffOption {
  id: string;
  fullName: string;
}

interface Props {
  staffOptions: StaffOption[];
  serverBaseUrl: string | undefined;
}

export function MaxSettingsPanel({ staffOptions, serverBaseUrl }: Props) {
  const {
    settings,
    status,
    loading,
    saveState,
    saveError,
    botIdDraft,
    setBotIdDraft,
    apiTokenDraft,
    setApiTokenDraft,
    webhookUrlDraft,
    setWebhookUrlDraft,
    isActiveDraft,
    setIsActiveDraft,
    staffRoutingDraft,
    setStaffRoutingDraft,
    save,
    reload,
  } = useMaxSettings();

  // The webhook URL is our server endpoint that MAX platform calls
  const myWebhookUrl = serverBaseUrl
    ? `${serverBaseUrl}/api/max/webhook`
    : `${window.location.origin}/api/max/webhook`;

  const copyWebhook = () => {
    void navigator.clipboard.writeText(myWebhookUrl);
  };

  const dirty =
    botIdDraft !== (settings?.botId ?? "") ||
    isActiveDraft !== (settings?.isActive ?? false) ||
    apiTokenDraft.trim() !== "";

  return (
    <section className="messenger-panel max-panel">
      <div className="messenger-panel-header">
        <div className="messenger-panel-icon max-icon" aria-hidden="true">
          MAX
        </div>
        <div className="messenger-panel-title">
          <h3>MAX (VK Max)</h3>
          <p>
            Российский мессенджер MAX (business.max.ru). Требует
            верифицированного бизнес-аккаунта и API Token из панели бота.
          </p>
        </div>
        <div className={`messenger-status-badge ${status?.connected ? "connected" : "disconnected"}`}>
          {status?.connected ? (
            <>
              <Wifi size={14} aria-hidden="true" />
              <span>Подключён</span>
            </>
          ) : (
            <>
              <WifiOff size={14} aria-hidden="true" />
              <span>Не подключён</span>
            </>
          )}
        </div>
      </div>

      {status?.detail && (
        <p className="messenger-status-detail">{status.detail}</p>
      )}

      <div className="messenger-panel-body">
        <div className="form-group">
          <label htmlFor="max-bot-id">Bot ID</label>
          <input
            id="max-bot-id"
            type="text"
            placeholder="ID вашего бота из business.max.ru"
            value={botIdDraft}
            onChange={(e) => setBotIdDraft(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="max-api-token">
            API Token{" "}
            {settings?.hasToken && (
              <span className="token-set-badge">установлен</span>
            )}
          </label>
          <input
            id="max-api-token"
            type="password"
            placeholder={
              settings?.hasToken
                ? "Оставьте пустым, чтобы не менять"
                : "Токен бота из business.max.ru"
            }
            value={apiTokenDraft}
            onChange={(e) => setApiTokenDraft(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label>Webhook URL для MAX</label>
          <div className="webhook-url-row">
            <code className="webhook-url-code">{myWebhookUrl}</code>
            <button
              type="button"
              onClick={copyWebhook}
              className="btn-icon"
              aria-label="Скопировать webhook URL"
              title="Скопировать"
            >
              <Copy size={14} />
            </button>
            <a
              href="https://business.max.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              aria-label="Открыть business.max.ru"
              title="business.max.ru"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="form-group form-group-toggle">
          <label htmlFor="max-active">Активен</label>
          <input
            id="max-active"
            type="checkbox"
            checked={isActiveDraft}
            onChange={(e) => setIsActiveDraft(e.target.checked)}
          />
        </div>

        <div className="messenger-routing-section">
          <h4>Роутинг входящих сообщений</h4>
          <p className="messenger-routing-hint">
            Укажите, кому направлять входящие сообщения пациентов из MAX.
          </p>
          <MessengerRoutingRules
            routing={staffRoutingDraft}
            onChange={(r: MaxStaffRouting) => setStaffRoutingDraft(r)}
            staffOptions={staffOptions}
          />
        </div>

        <div className="messenger-panel-actions">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="btn-secondary"
            aria-label="Обновить данные"
            title="Обновить"
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveState === "saving" || !dirty}
            className="btn-primary"
          >
            {saveState === "saving" && "Сохранение..."}
            {saveState === "saved" && (
              <>
                <Check size={14} /> Сохранено
              </>
            )}
            {saveState === "error" && "Ошибка"}
            {saveState === "idle" && "Сохранить"}
          </button>
        </div>

        {saveError && (
          <p className="messenger-save-error" role="alert">
            {saveError}
          </p>
        )}

        <div className="messenger-setup-guide">
          <Shield size={14} aria-hidden="true" />
          <p>
            <strong>Как подключить MAX:</strong> Зайдите на{" "}
            <a
              href="https://business.max.ru"
              target="_blank"
              rel="noopener noreferrer"
            >
              business.max.ru
            </a>{" "}
            с верифицированным бизнес-аккаунтом → Чат-боты → создайте бота.
            Скопируйте Bot ID и API Token. Укажите Webhook URL выше в
            настройках бота на платформе MAX.
          </p>
        </div>
      </div>
    </section>
  );
}
