/**
 * shadowAnalystPreviewEntry.tsx — Preview entry for Shadow Analyst & Ambient Clinical HUD.
 * Mandates 8b (<= 120 lines), 8e (Doctor Autonomy), 8n (Solo Practice)
 */

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AlertTriangle, Check, CheckCircle2, FileText, Minimize2, Maximize2, ShieldAlert, Sparkles, X } from "lucide-react";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import "./styles/shadow-analyst.css";

function ShadowAnalystPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = params.get("theme") || "light";
	const [theme, setTheme] = useState(initialTheme);
	const [isMinimized, setIsMinimized] = useState(false);
	const [applied, setApplied] = useState<Record<string, boolean>>({});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		const isDark = theme === "dark" || theme === "night";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
	}, [theme]);

	const toggle = (k: string) => setApplied((p) => ({ ...p, [k]: !p[k] }));

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-start p-4 sm:p-6 md:p-10 select-none">
			<div className="w-full max-w-4xl flex items-center justify-between mb-6 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<Activity className="text-teal-600 dark:text-teal-400" size={24} />
					<h1 className="text-lg font-bold text-[var(--ink)]">Эмбиентный клинический ассистент & Теневой анализ</h1>
				</div>
				<button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer">
					Тема: {theme === "dark" ? "🌙 Ночь" : "☀️ День"}
				</button>
			</div>

			{isMinimized ? (
				<button type="button" onClick={() => setIsMinimized(false)} className="sa-hud-pill">
					<Sparkles size={16} className="text-teal-600 dark:text-teal-400 animate-pulse" />
					<span className="text-xs font-bold text-[var(--ink)]">Shadow Analyst: 2 клинические находки</span>
					<Maximize2 size={14} className="text-[var(--muted)]" />
				</button>
			) : (
				<div className="sa-hud-card sa-panel w-full max-w-2xl">
					<div className="sa-panel-header">
						<div className="sa-panel-title">
							<Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
							<span>Эмбиентная диагностика у кресла</span>
							<span className="sa-badge-critical">2 критических</span>
						</div>
						<div className="sa-panel-actions">
							<span className="sa-study-label">Иванов А.В.</span>
							<button type="button" onClick={() => setIsMinimized(true)} className="sa-icon-btn" title="Свернуть"><Minimize2 size={14} /></button>
						</div>
					</div>

					<div className="sa-panel-body">
						<div className="sa-section space-y-2">
							<div className="sa-allergy-alert">
								<ShieldAlert size={16} className="text-amber-500 shrink-0" />
								<span>⚠️ Стоп-фактор: Аллергия на пенициллины (амоксициллин). Препарат выбора: клиндамицин.</span>
							</div>
							<div className="sa-ddi-alert">
								<AlertTriangle size={16} className="text-rose-500 shrink-0" />
								<span>⚠️ DDI: Пациент принимает бисопролол. Дозировка артикаина с адреналином 1:200 000 &le; 4.0 мл.</span>
							</div>
						</div>

						<div className="sa-section">
							<div className="sa-section-label"><FileText size={14} /><span>Находки по снимку КЛКТ & Зубная формула</span></div>
							<div className="sa-tooth-grid">
								<div className="sa-tooth-row sa-tooth-row--critical">
									<span className="sa-tooth-num">16</span>
									<span className="sa-tooth-text font-medium">К04.5 Хронический апикальный периодонтит · Пропущен MB2 канал</span>
									<button type="button" onClick={() => toggle("16")} className="sa-action-apply text-xs">
										{applied["16"] ? <><Check size={12} /> В карте</> : "Принять"}
									</button>
								</div>
								<div className="sa-tooth-row sa-tooth-row--critical">
									<span className="sa-tooth-num">47</span>
									<span className="sa-tooth-text font-medium">К02.1 Глубокий кариес дентина (дистально-окклюзионная полость)</span>
									<button type="button" onClick={() => toggle("47")} className="sa-action-apply text-xs">
										{applied["47"] ? <><Check size={12} /> В карте</> : "Принять"}
									</button>
								</div>
							</div>
						</div>

						<div className="sa-section flex items-center justify-between">
							<span className="text-xs text-[var(--muted)]">Рекомендации EBM СтАР совещательны (Мандат 8e)</span>
							<div className="sa-action-group">
								<button type="button" onClick={() => setApplied({ "16": true, "47": true })} className="sa-action-btn">
									<CheckCircle2 size={13} /><span>Принять все в карту</span>
								</button>
								<button type="button" onClick={() => setIsMinimized(true)} className="sa-action-ignore">
									<X size={13} /><span>Скрыть</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<ShadowAnalystPreviewApp />);
