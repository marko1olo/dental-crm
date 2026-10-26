/**
 * @dental/web/anesthesiaPreviewEntry.tsx
 * Visual Proof Harness for Anesthesia QuickBar (Mandates 8b, 8e, 8y, <= 120 lines)
 */

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
import { AnesthesiaQuickBar } from "./components/anesthesia/AnesthesiaQuickBar";
import { Syringe, Heart, FileText, CheckCircle2 } from "lucide-react";

function AnesthesiaPreviewApp() {
	const [activeDiaryText, setActiveDiaryText] = useState<string>(
		"Проведена местная инфильтрационная анестезия в области зуба 16. Препарат: Ультракаин Д-С (Артикаина гидрохлорид 4% + Эпинефрин 1:200 000) [Серия проверена], объем 1.7 мл (1 карп., 68 мг действующего вещества, вазоконстриктор Эпинефрин (Адреналин) 1:200 000 (0.009 мг)). Игла: Игла карпульная 30G (0.3 x 21 мм). Аспирационная проба отрицательна (кровь в карпуле отсутствует). Анестезия наступила через 2 мин, глубина достаточная, осложнений нет, соматических реакций нет."
	);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	return (
		<main className="min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-6 flex flex-col gap-6">
			<header className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)] text-white flex items-center justify-center shadow-sm">
						<Syringe size={22} />
					</div>
					<div>
						<h1 className="text-lg font-bold text-[var(--ink)]">Клинический модуль обезболивания у кресла</h1>
						<p className="text-xs text-[var(--muted)]">Мгновенный выбор пресетов в 1 клик • EBM доказательная стоматология (Мандаты 8e, 8y, 8n)</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
						1-Click Presets: Active
					</span>
				</div>
			</header>

			<section className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-5 shadow-xs flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
						<Syringe size={14} className="text-[var(--teal,#0d9488)]" />
						Контекст 1: Стандартный терапевтический приём (Зуб 16, Пациент 70 кг, Норма)
					</span>
				</div>
				<AnesthesiaQuickBar
					targetToothNumberFdi={16}
					patientWeightKg={70}
					onApplyAnesthesia={(text) => setActiveDiaryText(text)}
				/>
			</section>

			<section className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-5 shadow-xs flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
						<Heart size={14} className="text-amber-500" />
						Контекст 2: Кардио-профиль (Гипертония, пожилой пациент) • Пассивная рекомендация без блокировок
					</span>
				</div>
				<AnesthesiaQuickBar
					targetToothNumberFdi={36}
					patientWeightKg={85}
					hasCardiovascularRisk={true}
					hasHypertension={true}
					onApplyAnesthesia={(text) => setActiveDiaryText(text)}
				/>
			</section>

			<footer className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-xs flex flex-col gap-2">
				<div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
					<FileText size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Сформированная SOAP-запись дневника приёма (без блокировок, 1 клик):</span>
				</div>
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed font-mono">
					{activeDiaryText}
				</div>
				<div className="flex items-center gap-2 pt-1 text-[11px] text-[var(--muted)]">
					<CheckCircle2 size={13} className="text-emerald-600" />
					<span>Автоматическое списание карпулы со склада (Soft Negative Overdraft) и фиксация отрицательной аспирационной пробы.</span>
				</div>
			</footer>
		</main>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(<AnesthesiaPreviewApp />);
}
