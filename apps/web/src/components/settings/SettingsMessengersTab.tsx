import { MessageCircle } from "lucide-react";
import React, { useState } from "react";
import "./SettingsMessengersTab.css";
import { MaxSettingsPanel } from "./MaxSettingsPanel.js";
import { SettingsTelegramTab } from "./SettingsTelegramTab.js";
import { WhatsappSettingsPanel } from "./WhatsappSettingsPanel.js";

import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface StaffOption {
  id: string;
  fullName: string;
}

type MessengerTabId = "telegram" | "whatsapp" | "max";

export function SettingsMessengersTab({
  settingsTab,
}: {
  settingsTab: string;
}) {
  const props = useAppLogicContext();
  const [activeMessenger, setActiveMessenger] = useState<MessengerTabId>(
    settingsTab === "telegram" ? "telegram" : "whatsapp"
  );

  if (settingsTab !== "messengers" && settingsTab !== "telegram") return null;

  const staffOptions = (props.staffOptions ?? []) as StaffOption[];
  const serverBaseUrl =
    typeof props.serverBaseUrl === "string" ? props.serverBaseUrl : undefined;

  return (
    <section
      className="messengers-settings"
      aria-label="Мессенджеры клиники"
    >
      <div className="import-copy">
        <MessageCircle aria-hidden="true" />
        <div>
          <p className="eyebrow">Мессенджеры</p>
          <h2>Интеграция с мессенджерами</h2>
          <p>
            Настройте интеграцию с Telegram, WhatsApp Business и MAX для
            автоматических уведомлений, рассылок и обратной связи с пациентами.
          </p>
        </div>
      </div>

      <div
        className="messenger-channel-tabs"
        role="tablist"
        aria-label="Каналы мессенджеров"
      >
        <button
          role="tab"
          aria-selected={activeMessenger === "telegram"}
          aria-controls="messenger-panel-telegram"
          id="messenger-tab-telegram"
          type="button"
          onClick={() => setActiveMessenger("telegram")}
          className={`messenger-channel-tab${activeMessenger === "telegram" ? " active" : ""}`}
        >
          <span
            className="messenger-tab-badge tg-badge"
            aria-hidden="true"
          >
            TG
          </span>
          Telegram-бот
        </button>

        <button
          role="tab"
          aria-selected={activeMessenger === "whatsapp"}
          aria-controls="messenger-panel-whatsapp"
          id="messenger-tab-whatsapp"
          type="button"
          onClick={() => setActiveMessenger("whatsapp")}
          className={`messenger-channel-tab${activeMessenger === "whatsapp" ? " active" : ""}`}
        >
          <span
            className="messenger-tab-badge wa-badge"
            aria-hidden="true"
          >
            WA
          </span>
          WhatsApp Business
        </button>

        <button
          role="tab"
          aria-selected={activeMessenger === "max"}
          aria-controls="messenger-panel-max"
          id="messenger-tab-max"
          type="button"
          onClick={() => setActiveMessenger("max")}
          className={`messenger-channel-tab${activeMessenger === "max" ? " active" : ""}`}
        >
          <span
            className="messenger-tab-badge max-badge"
            aria-hidden="true"
          >
            MAX
          </span>
          MAX (VK Max)
        </button>
      </div>

      <div
        role="tabpanel"
        id="messenger-panel-telegram"
        aria-labelledby="messenger-tab-telegram"
        hidden={activeMessenger !== "telegram"}
      >
        <SettingsTelegramTab
          settingsTab="telegram"
        />
      </div>

      <div
        role="tabpanel"
        id="messenger-panel-whatsapp"
        aria-labelledby="messenger-tab-whatsapp"
        hidden={activeMessenger !== "whatsapp"}
      >
        <WhatsappSettingsPanel
          staffOptions={staffOptions}
          serverBaseUrl={serverBaseUrl}
        />
      </div>

      <div
        role="tabpanel"
        id="messenger-panel-max"
        aria-labelledby="messenger-tab-max"
        hidden={activeMessenger !== "max"}
      >
        <MaxSettingsPanel
          staffOptions={staffOptions}
          serverBaseUrl={serverBaseUrl}
        />
      </div>
    </section>
  );
}
