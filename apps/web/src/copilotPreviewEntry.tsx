import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";

import "./components/copilot/CopilotDrawer.css";
import "./components/copilot/ChairsideCopilotHUD.css";
import "./components/copilot/CopilotVoiceStenographer.css";

import { ChairsideCopilotHUD } from "./components/copilot/ChairsideCopilotHUD";
import { CopilotDrawer } from "./components/copilot/CopilotDrawer";
import { CopilotVoiceStenographer } from "./components/copilot/CopilotVoiceStenographer";

const SAMPLE_MESSAGES = [
  {
    kind: "text",
    role: "user" as const,
    text: "Осмотр: зуб 36 глубокий кариес дентина, жалуется на боли от холодного. Назначь протокол лечения и смету.",
  },
  {
    kind: "tool",
    callId: "call-overview-1",
    name: "clinical.apply_tooth_state",
    status: "done",
    result: {
      tooth: 36,
      condition: "caries",
      diagnosis: "K02.1 Кариес дентина",
      recommended_services: [
        { code: "A16.07.002", name: "Наложение пломбы светового отверждения", priceKopecks: 450000 },
        { code: "B01.003.004", name: "Проводниковая анестезия (Артикаин 4%)", priceKopecks: 85000 },
      ],
    },
  },
  {
    kind: "text",
    role: "assistant" as const,
    text: `### Клинический протокол SOAP (Зуб 36)
- **S (Жалобы)**: Кратковременные боли от термических раздражителей (холодное), быстро проходящие после устранения фактора.
- **O (Объективно)**: На окклюзионно-дистальной поверхности зуба 36 глубокая кариозная полость, дентин пигментирован, зондирование дна слабо болезненно. Перкуссия безболезненна. ЭОД 8 мкА.
- **A (Диагноз)**: K02.1 Кариес дентина (Зуб 36, окклюзионная поверхность).
- **P (План)**: Инфильтрационная анестезия Убистезин 1.7 мл, препарирование, медикаментозная обработка, изолирующая прокладка, реставрация светоотверждаемым композитом.`,
  },
];

function CopilotPreviewApp() {
  const [theme, setTheme] = useState("light");
  const [currentView, setCurrentView] = useState("drawer");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "pending">("chat");
  const [messages, setMessages] = useState<any[]>(SAMPLE_MESSAGES);
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const th = params.get("theme") || "light";
    setTheme(th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", th === "dark");
    document.documentElement.classList.toggle("light", th !== "dark");
    document.documentElement.style.colorScheme = th;

    const view = params.get("view") || "drawer";
    setCurrentView(view);
    if (view === "voice") {
      const isMobileScreen = typeof window !== "undefined" && window.innerWidth <= 768;
      setDrawerOpen(!isMobileScreen);
      setVoiceActive(true);
    } else if (view === "hud") {
      setDrawerOpen(false);
      setVoiceActive(false);
    } else {
      setDrawerOpen(true);
      setVoiceActive(false);
    }

    const tab = params.get("tab");
    if (tab === "pending") {
      setActiveTab("pending");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg,#f8fafc)] text-[var(--ink,#0f172a)] p-6 relative overflow-hidden">
      {/* Background Mock Canvas (Dental Odontogram / Schedule Backdrop) */}
      <div className="max-w-4xl mx-auto space-y-6 opacity-75">
        <header className="flex items-center justify-between border-b pb-4 border-[var(--line,rgba(15,118,110,0.15))]">
          <div>
            <h1 className="text-xl font-bold text-[var(--ink)]">Клинический приём • Кабинет 1</h1>
            <p className="text-xs text-[var(--muted)]">Пациент: Иванов И.И. • 28 октября 2026</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--teal-soft,#0d94881a)] text-[var(--teal,#0d9488)]">
              В кресле (35 мин)
            </span>
          </div>
        </header>

        <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
          <h2 className="text-sm font-semibold mb-2">Одонтограмма (Зубной ряд)</h2>
          <div className="flex gap-2 flex-wrap">
            {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
              <div key={t} className="w-9 h-11 border rounded flex items-center justify-center text-xs font-mono bg-[var(--paper-soft)]">
                {t}
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
              <div
                key={t}
                className={`w-9 h-11 border rounded flex items-center justify-center text-xs font-mono ${
                  t === 36 ? "border-[var(--teal)] bg-[var(--teal-soft,#0d94881a)] font-bold text-[var(--teal,#0d9488)]" : "bg-[var(--paper-soft)]"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Chairside Copilot HUD Capsule */}
      {(currentView === "hud" || currentView === "all") && (
        <ChairsideCopilotHUD
          activeTooth={36}
          patientName="Иванов И.И."
          patientAllergies={["Пенициллин"]}
          initialOpen={true}
          onClose={() => {}}
        />
      )}

      {/* 2. Canonical Copilot Drawer */}
      <CopilotDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        messages={messages}
        busy={false}
        phase={null}
        pending={currentView === "voice" || activeTab === "pending" ? {
          callId: "call-save-diary-1",
          toolName: "clinical.save_protocol_043",
          args: {
            patientId: "patient-1",
            tooth: 36,
            icd10: "K02.1",
            diagnosis: "Кариес дентина",
            treatmentPlan: "Инфильтрационная анестезия Убистезин 1.7 мл, реставрация зуба 36 светоотверждаемым композитом",
          },
        } : null}
        nameCache={{}}
        nudges={[
          {
            id: "nudge-1",
            text: "Зуб 36: Обнаружен кариес дентина (K02.1). Рекомендован протокол со светоотверждаемым композитом.",
            priority: "medium",
          },
        ]}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        onSend={(text) => {
          setMessages((prev) => [...prev, { kind: "text", role: "user", text }]);
        }}
        onConfirm={() => {}}
        onReset={() => setMessages([])}
      />

      {/* 3. Voice Stenographer */}
      <CopilotVoiceStenographer
        isOpen={voiceActive}
        onClose={() => setVoiceActive(false)}
        activeTooth={36}
        patientName="Иванов И.И."
        initialTranscript="Зуб 36 глубокий кариес дентина, жалобы на боли от холодного, наложение пломбы светового отверждения."
      />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<CopilotPreviewApp />);
}
