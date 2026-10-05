import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";

import { SovereignScalePresetsCard } from "./components/onboarding/SovereignScalePresetsCard";
import { InteractiveGuideTour, startInteractiveTour } from "./components/tutorial/InteractiveGuideTour";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { Stethoscope, Mic, CheckCircle2, ShieldCheck, Sparkles, Building2, Network } from "lucide-react";

function OnboardingPresetsPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const isTourActive = params.get("tour") === "true";
	const tourRole = (params.get("role") || "doctor") as "doctor" | "admin" | "director";

	useEffect(() => {
		const updateTheme = () => {
			const currentTheme = (document.documentElement.getAttribute("data-theme") || rawTheme) as ThemeMode;
			const resolved = resolveTheme(currentTheme, false);
			applyThemeToRoot(document.documentElement, resolved);
			const isDark = currentTheme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", currentTheme);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen p-4 md:p-6`;
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, [rawTheme]);

	useEffect(() => {
		if (isTourActive) {
			const timer = setTimeout(() => {
				startInteractiveTour(tourRole);
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [isTourActive, tourRole]);

	return (
		<div className="max-w-[1200px] mx-auto w-full space-y-6">
			{/* Top Header Card */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
							Онбординг клиники
						</span>
						<span className="text-xs text-[var(--muted)]">Мандат 8n: Суверенитет масштаба</span>
					</div>
					<h1 className="text-xl md:text-2xl font-bold text-[var(--ink)]">
						Экспресс-конфигурация стоматологического кабинета
					</h1>
					<p className="text-xs md:text-sm text-[var(--muted)] mt-1">
						Выберите готовую модель работы вашей стоматологии в 1 клик либо запустите интерактивный тур обучения.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => startInteractiveTour(tourRole)}
						className="primary-button text-xs py-2 px-3.5"
					>
						<Sparkles size={14} className="mr-1 inline" />
						<span>Запустить Spotlight-тур</span>
					</button>
				</div>
			</div>

			{/* State 1: 3-Click Sovereign Scale Presets Card */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm">
				<SovereignScalePresetsCard />
			</div>

			{/* Clinical Mock Workspace for Spotlight Anchors */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm space-y-4">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
					<div className="flex items-center gap-2">
						<Stethoscope size={18} className="text-teal-600 dark:text-teal-400" />
						<h3 className="text-sm font-bold text-[var(--ink)]">
							Рабочее место врача-стоматолога (Клинический тур)
						</h3>
					</div>
					<span className="text-xs text-[var(--muted)]">Форма 043/у • Протокол приёма</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Tooth card / Odontogram formula anchor */}
					<div
						data-tour="tooth-card"
						className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,var(--line)/20)] space-y-2"
					>
						<div className="flex items-center justify-between">
							<strong className="text-xs font-bold text-[var(--ink)]">
								Квадрантная формула FDI
							</strong>
							<span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono">
								Q1: 18..11
							</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Анатомическая зубная схема. Нажмите зуб для фиксации кариеса, пломбы или импланта.
						</p>
						<div className="flex gap-1.5 pt-1">
							{[11, 12, 13, 14, 15, 16, 17, 18].map((tooth) => (
								<button
									key={tooth}
									type="button"
									className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-mono font-bold flex items-center justify-center hover:border-teal-500 hover:text-teal-600"
								>
									{tooth}
								</button>
							))}
						</div>
					</div>

					{/* 1-Click Norm button anchor */}
					<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,var(--line)/20)] space-y-3 flex flex-col justify-between">
						<div>
							<strong className="text-xs font-bold text-[var(--ink)] block mb-1">
								Автозаполнение нормы (Мандат 8e)
							</strong>
							<p className="text-xs text-[var(--muted)]">
								Физиологическая норма в 1 тап (52px). Врач отмечает только реальную патологию.
							</p>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								data-tour="autonorm-btn"
								data-testid="btn-autonorm-visit"
								className="h-[44px] md:h-[52px] px-4 rounded-xl bg-teal-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-teal-700 transition-colors"
							>
								<CheckCircle2 size={16} />
								<span>✓ Соматически здоров (Норма в 1 клик)</span>
							</button>

							<button
								type="button"
								data-tour="smart-mic-btn"
								data-testid="smart-mic-btn"
								className="w-[44px] h-[44px] md:w-[52px] md:h-[52px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center hover:border-teal-500 transition-colors"
								title="Диктовка протокола голосом"
							>
								<Mic size={18} className="text-teal-600 dark:text-teal-400" />
							</button>
						</div>
					</div>
				</div>

				{/* Finish Visit CTA */}
				<div className="pt-2 flex justify-end">
					<button
						type="button"
						data-tour="finish-visit-btn"
						data-testid="btn-finish-visit-primary"
						className="primary-button h-[44px] px-5 text-xs font-semibold"
					>
						<span>Завершить приём и сформировать счёт</span>
					</button>
				</div>
			</div>

			{/* Interactive Guide Tour component mounted */}
			<InteractiveGuideTour userRole={tourRole} />
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<OnboardingPresetsPreviewApp />
		</React.StrictMode>,
	);
}
