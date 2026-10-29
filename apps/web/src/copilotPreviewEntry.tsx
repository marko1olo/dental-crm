import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Calendar, Clock, User, Check, FileText, Sparkles, ShieldAlert,
  Printer, Heart, Search, Building2, CheckCircle2, Activity,
  Phone, AlertTriangle, Layers, ChevronRight
} from "lucide-react";

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
    text: "Осмотр: зуб 36 глубокий кариес дентина, боли от холодного. Составь протокол SOAP и смету лечения.",
  },
  {
    kind: "text",
    role: "assistant" as const,
    text: `### Протокол SOAP (Зуб 36 — Кариес дентина)
- **S (Жалобы)**: Кратковременные боли от термических раздражителей (холодное), быстро проходящие после устранения.
- **O (Объективно)**: На окклюзионной поверхности зуба 36 глубокая кариозная полость дентина, зондирование слабо болезненно. ЭОД 8 мкА.
- **A (Диагноз)**: K02.1 Кариес дентина (Зуб 36).
- **P (План)**: Анестезия Артикаин 1:200000 1.7 мл, препарирование, изолирующая прокладка SDR, пломба светового отверждения.

Подготовил предварительную смету для согласования:`,
  },
];

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function getToothStatus(t: number) {
  if (t === 36) return { code: "C", name: "Кариес (активный)", color: "text-[var(--rust,#ef4444)]", bg: "bg-[var(--rust-soft,rgba(239,68,68,0.12))]", border: "border-[var(--teal,#0d9488)] ring-2 ring-[var(--teal)]" };
  if (t === 46) return { code: "P", name: "Пульпит (план)", color: "text-[var(--amber,#f59e0b)]", bg: "bg-[var(--amber-soft,rgba(245,158,11,0.12))]", border: "border-[var(--amber,#f59e0b)]" };
  if (t === 16) return { code: "F", name: "Пломба", color: "text-[var(--teal,#0d9488)]", bg: "bg-[var(--teal-soft,rgba(13,148,136,0.12))]", border: "border-[var(--line)]" };
  if (t === 26) return { code: "Cr", name: "Коронка", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-[var(--line)]" };
  return { code: "N", name: "Норма", color: "text-[var(--muted)]", bg: "bg-[var(--paper-soft,#f4f7f6)]", border: "border-[var(--line)]" };
}

function CopilotPreviewApp() {
  const [, setTheme] = useState("light");
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
    if (params.get("voice") === "true") {
      setVoiceActive(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col relative overflow-x-hidden">
      {/* 1. Authentic Top CRM Navigation Bar */}
      <header className="h-14 border-b border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)] px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)] flex items-center justify-center text-white shadow-sm font-bold">
              🦷
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[var(--ink)]">DENTE</span>
              <span className="text-xs text-[var(--teal)] font-medium ml-1.5">CRM</span>
            </div>
          </div>
          <div className="h-4 w-px bg-[var(--line)]" />
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <span className="px-3 py-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--paper-soft)] cursor-pointer">
              Расписание
            </span>
            <span className="px-3 py-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--paper-soft)] cursor-pointer">
              Пациенты
            </span>
            <span className="px-3 py-1.5 rounded-md bg-[var(--teal-soft,#0d94881a)] text-[var(--teal,#0d9488)] font-semibold flex items-center gap-1.5">
              <Activity size={13} />
              Приём у кресла
            </span>
            <span className="px-3 py-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--paper-soft)] cursor-pointer">
              Планы лечения
            </span>
            <span className="px-3 py-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--paper-soft)] cursor-pointer">
              Склад
            </span>
            <span className="px-3 py-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--paper-soft)] cursor-pointer">
              Касса
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
            <Search size={13} />
            <span>Поиск пациента (Ctrl+K)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[var(--ink)]">Д-р Соколов А. В.</span>
            <span className="text-[var(--muted)] hidden sm:inline">• Кабинет 1</span>
          </div>
        </div>
      </header>

      {/* 2. Authentic Clinical Workspace Body */}
      <main className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-5 pb-24">
        {/* Patient Header Cockpit */}
        <section className="p-4 sm:p-5 rounded-2xl border border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[var(--teal-soft,#0d94881a)] border border-[var(--teal-surface,#0d948833)] flex items-center justify-center text-[var(--teal,#0d9488)] font-bold text-base shrink-0">
                ИИ
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-[var(--ink)]">Иванов Иван Иванович</h1>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono">
                    №ЭМК-1284
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                    Первичный
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1 flex-wrap">
                  <span>38 лет (14.04.1988)</span>
                  <span>•</span>
                  <span>+7 (999) 123-45-67</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[var(--teal)] font-medium">
                    <Clock size={12} /> В кресле: 35 мин
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Clinical Safety */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                <ShieldAlert size={13} />
                <span>Аллергия: Пенициллин</span>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-medium hover:bg-[var(--paper-soft)] flex items-center gap-1.5"
              >
                <Printer size={13} className="text-[var(--muted)]" />
                <span>Печать медкарты</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-semibold shadow-sm hover:opacity-90 flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>Сохранить приём</span>
              </button>
            </div>
          </div>
        </section>

        {/* Secondary Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 text-xs font-semibold overflow-x-auto">
          <button type="button" className="px-3 py-1.5 rounded-lg bg-[var(--teal-soft,#0d94881a)] text-[var(--teal,#0d9488)] flex items-center gap-1.5 shrink-0">
            <span>Зубная формула (FDI)</span>
          </button>
          <button type="button" className="px-3 py-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 shrink-0">
            <span>Дневник SOAP</span>
          </button>
          <button type="button" className="px-3 py-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 shrink-0">
            <span>Планы лечения (3)</span>
          </button>
          <button type="button" className="px-3 py-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 shrink-0">
            <span>Документы и ИДС</span>
          </button>
        </div>

        {/* Realistic Interactive Odontogram */}
        <section className="p-4 sm:p-5 rounded-2xl border border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">Зубная формула пациента (FDI 11–48)</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Выберите зуб для детального осмотра или добавления диагноза</p>
            </div>
            {/* Odontogram Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Кариес</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Пульпит</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Пломба</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Коронка</span>
            </div>
          </div>

          {/* Upper Jaw */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Верхняя челюсть</span>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
              {UPPER_TEETH.map((t) => {
                const st = getToothStatus(t);
                return (
                  <div
                    key={t}
                    className={`p-2 rounded-lg border ${st.border} ${st.bg} flex flex-col items-center justify-between min-h-[52px] cursor-pointer hover:shadow-sm transition-all`}
                  >
                    <span className="text-xs font-mono font-bold text-[var(--ink)]">{t}</span>
                    <span className={`text-[10px] font-bold ${st.color}`}>{st.code}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lower Jaw */}
          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Нижняя челюсть</span>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
              {LOWER_TEETH.map((t) => {
                const st = getToothStatus(t);
                return (
                  <div
                    key={t}
                    className={`p-2 rounded-lg border ${st.border} ${st.bg} flex flex-col items-center justify-between min-h-[52px] cursor-pointer hover:shadow-sm transition-all`}
                  >
                    <span className="text-xs font-mono font-bold text-[var(--ink)]">{t}</span>
                    <span className={`text-[10px] font-bold ${st.color}`}>{st.code}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SOAP Protocol Draft Card & Treatment Estimate */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* SOAP Note */}
          <section className="lg:col-span-2 p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--teal)]" />
                <h3 className="text-sm font-bold text-[var(--ink)]">Дневник приёма (SOAP) • Медицинская карта</h3>
              </div>
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 size={12} /> Автосохранение активно
              </span>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-[var(--ink)]">
              <p><strong className="text-[var(--teal)] font-bold">S (Жалобы):</strong> Кратковременные боли от холодного и сладкого в зубе 36, быстро проходящие после устранения раздражителя.</p>
              <p><strong className="text-[var(--teal)] font-bold">O (Объективно):</strong> На окклюзионно-дистальной поверхности зуба 36 глубокая кариозная полость дентина, зондирование слабо болезненно. Перкуссия безболезненна. ЭОД 8 мкА.</p>
              <p><strong className="text-[var(--teal)] font-bold">A (Диагноз):</strong> K02.1 Кариес дентина (Зуб 36).</p>
              <p><strong className="text-[var(--teal)] font-bold">P (План):</strong> Анестезия Артикаин 1.7 мл, препарирование полости, изолирующая прокладка SDR, световая пломба Ceram.X.</p>
            </div>
          </section>

          {/* Treatment Estimate Summary */}
          <section className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--ink)] mb-1">Смета лечения зуба 46</h3>
              <p className="text-xs text-[var(--muted)]">План эндодонтического лечения</p>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--line)]">
                  <span className="text-[var(--muted)]">Эндодонтия (3 канала)</span>
                  <span className="font-semibold text-[var(--ink)]">18 500 ₽</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line)]">
                  <span className="text-[var(--muted)]">Восстановление пломбой</span>
                  <span className="font-semibold text-[var(--ink)]">6 500 ₽</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)]">Итого к оплате:</span>
              <span className="text-base font-extrabold text-[var(--teal)]">25 000 ₽</span>
            </div>
          </section>
        </div>
      </main>

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
        isVoiceActive={voiceActive}
        onToggleVoice={() => setVoiceActive((prev) => !prev)}
        pending={{
          callId: "call-tx-46-confirm",
          toolName: "clinical.calculate_treatment_estimate",
          name: "clinical.calculate_treatment_estimate",
          args: {
            toothNumber: 46,
            diagnosis: "K04.0 Хронический пульпит",
            services: [
              "A16.07.008 Пломбирование корневого канала зуба (эндодонтия) — 18 500 ₽",
              "A16.07.002 Восстановление зуба пломбой (лечение кариеса) — 6 500 ₽",
            ],
            totalRub: 25000,
            discount_percent: 10,
            doctor_name: "Д-р Соколов А.В.",
            safe_alternative: "Артикаин 4% 1:200 000 (кардио-протокол)",
          },
        }}
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
