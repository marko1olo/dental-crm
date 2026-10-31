/**
 * copilotPreviewEntry.tsx — Превью-стенд модуля ИИ-Копайлота и голосового стенографа (SSOT).
 * Мандат 8b: Золотой стандарт (Sweet Spot).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal).
 */

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CopilotStudioModal } from "./components/copilot/CopilotStudioModal";
import { Sparkles, Sun, Moon } from "lucide-react";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";

function CopilotPreviewApp() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("theme");
      if (p === "dark" || p === "light") return p;
    }
    return "light";
  });
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme !== "dark");
    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme !== "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-sans antialiased relative">
      {/* Фоновый интерфейс врача-стоматолога у кресла */}
      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between pb-4 border-b border-[var(--line,#e2e8f0)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)] text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--ink,#0f172a)]">DENTE Dental CRM — Клинический кабинет</h1>
              <p className="text-xs text-[var(--muted,#64748b)]">Терапевтический приём у кресла • Пациент: Иванов Иван Иванович</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
              aria-label="Переключить тему"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Sparkles size={16} />
              <span>Открыть Копайлот</span>
            </button>
          </div>
        </header>

        <section className="p-6 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[var(--ink,#0f172a)]">Активная медицинская карта приёма</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
              <span className="text-[var(--muted,#64748b)] block text-[11px]">Зубная формула FDI</span>
              <strong className="text-[var(--ink,#0f172a)]">Зуб 36 (Кариес дентина)</strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
              <span className="text-[var(--muted,#64748b)] block text-[11px]">Анестезия</span>
              <strong className="text-[var(--ink,#0f172a)]">Септанест 1:100 000 (1.7 мл)</strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
              <span className="text-[var(--muted,#64748b)] block text-[11px]">Предварительный счёт</span>
              <strong className="text-[var(--ink,#0f172a)]">6 500 руб. (1 услуга)</strong>
            </div>
          </div>
        </section>
      </main>

      {/* Выдвижная студия копайлота */}
      <CopilotStudioModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        activeTooth={36}
        patientId="pat-active-01"
        patientName="Иванов Иван Иванович"
        initialTab="dialog"
      />
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<CopilotPreviewApp />);
}
