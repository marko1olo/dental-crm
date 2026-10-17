import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/token-aliases.css";
import "./styles/themes.css";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/touch-targets.css";
import "./styles/contrast-fixes.css";
import { OrthopedicsChairsideLabOrderBanner } from "./components/orthopedics/OrthopedicsChairsideLabOrderBanner";
import { OrthopedicsProtocolsGrid } from "./components/orthopedics/OrthopedicsProtocolsGrid";
import { HygieneExpressPresetsStrip } from "./components/hygiene/HygieneExpressPresetsStrip";
import { GlobalToast } from "./components/GlobalToast";

function ClinicalHygieneOrthoPreviewApp() {
	const getUrlTheme = (): "light" | "dark" => {
		if (typeof window === "undefined") return "light";
		const p = new URLSearchParams(window.location.search).get("theme");
		return p === "dark" ? "dark" : "light";
	};

	const [theme, setTheme] = useState<"light" | "dark">(getUrlTheme);
	const [fittingConfirmed, setFittingConfirmed] = useState(false);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme === "light");
		if (document.body) {
			document.body.classList.toggle("dark", theme === "dark");
			document.body.classList.toggle("light", theme === "light");
		}
	}, [theme]);

	const toggleTheme = () => {
		const next = theme === "light" ? "dark" : "light";
		setTheme(next);
	};

	const showFeedback = (text: string) => {
		setToastMsg(text);
		setTimeout(() => setToastMsg(null), 3500);
	};

	return (
		<div
			data-testid="clinical-hygiene-ortho-preview-root"
			className="min-h-screen p-3 sm:p-6 transition-colors duration-200"
			style={{
				backgroundColor: "var(--canvas, #f8fafc)",
				color: "var(--ink, #0f172a)",
			}}
		>
			<div className="max-w-5xl mx-auto space-y-6">
				{/* Top Bar with doctor context and theme toggle */}
				<header className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-sm">
					<div>
						<h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink,#0f172a)]">
							Клинический протокол: Ортопедия & Экспресс-гигиена
						</h1>
						<p className="text-xs sm:text-sm text-[var(--muted,#64748b)]">
							Пациент: Смирнова А. С. • Врач: Д-р Воронов А. В. • Этап 3 (Ортопедия)
						</p>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--teal-subtle,rgba(20,184,166,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-border,rgba(20,184,166,0.3))]">
							✓ 043/у и 804н ликвидированы
						</span>
						<button
							type="button"
							data-testid="theme-toggle-btn"
							onClick={toggleTheme}
							className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,#f1f5f9)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] transition-colors min-h-[44px]"
						>
							{theme === "light" ? "🌙 Dark" : "☀️ Light"}
						</button>
					</div>
				</header>

				{toastMsg && (
					<div className="p-3 rounded-lg bg-[var(--teal-subtle,rgba(20,184,166,0.1))] border border-[var(--teal-border,rgba(20,184,166,0.4))] text-[var(--teal,#0d9488)] text-xs font-semibold">
						{toastMsg}
					</div>
				)}

				{/* 1. Hygiene Express Presets Strip */}
				<section
					data-testid="hygiene-section"
					className="p-4 sm:p-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-sm space-y-3"
				>
					<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2.5">
						<div>
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)]">
								Экспресс-панель гигиены и диагнозы пародонта
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Клинические пресеты в 1 клик • Протоколы гигиены
							</p>
						</div>
					</div>
					<HygieneExpressPresetsStrip
						onPresetHygieneNorm={() => showFeedback("Применен статус: Норма OHI-S")}
						onPresetHygieneFair={() => showFeedback("Применен статус: Удовлетворительная гигиена")}
						onPresetHygienePoor={() => showFeedback("Применен статус: Неудовлетворительная гигиена")}
						onPresetHygieneSevere={() => showFeedback("Применен статус: Плохая гигиена")}
						onPresetPeriodontalNorm={() => showFeedback("Диагноз: Пародонт интактен")}
						onPresetCatarrhalGingivitis={() => showFeedback("Диагноз: Катаральный гингивит")}
						onPresetMildPeriodontitis={() => showFeedback("Диагноз: Хронический пародонтит лёгкой степени")}
						onPresetModeratePeriodontitis={() => showFeedback("Диагноз: Хронический пародонтит средней степени")}
						onPresetSeverePeriodontitis={() => showFeedback("Диагноз: Хронический пародонтит тяжёлой степени")}
						onPresetProHygieneDone={() => showFeedback("Добавлен протокол: Комплексная гигиена")}
						onPresetDeepFluoridation={() => showFeedback("Добавлен протокол: Глубокое фторирование")}
						onPresetToothMousse={() => showFeedback("Добавлен протокол: Реминерализующая терапия")}
						onPresetPerioAntiseptic={() => showFeedback("Добавлен протокол: Антисептическая обработка пародонта")}
					/>
				</section>

				{/* 2. Orthopedics Chairside Lab Order Banner */}
				<section
					data-testid="orthopedics-section"
					className="p-4 sm:p-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-sm space-y-4"
				>
					<div className="border-b border-[var(--line,#e2e8f0)] pb-2.5">
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)]">
							Ортопедический статус и связь с зуботехнической лабораторией
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Клинический ортопедический наряд • Согласование примерки • Паспорт ЗТЛ
						</p>
					</div>

					<OrthopedicsChairsideLabOrderBanner
						readinessHeadline="Наряд ЗТЛ #ZL-2026-088 готов к примерке и постоянной фиксации"
						orderNumber="ZL-2026-088"
						technicianName="Мастер-техник Соколов В. П."
						selectedMaterial="Диоксид циркония Prettau (Zirkonzahn Multi-Layer)"
						selectedShade="A2 / VITA Classical"
						warrantyPassport="WP-ZL-9941"
						fittingConfirmed={fittingConfirmed}
						onConfirmFitting={() => {
							setFittingConfirmed(true);
							showFeedback("Примерка и фиксация подтверждены, атрибуты ЗТЛ внесены в дневник приёма");
						}}
						onOpenPassportA4={() => showFeedback("Открытие гарантийного паспорта ЗТЛ A4")}
					/>

					{/* 3. Orthopedics Protocols Grid */}
					<div className="pt-2">
						<h3 className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] mb-2">
							Быстрые ортопедические протоколы (Этап 3)
						</h3>
						<OrthopedicsProtocolsGrid
							filterCategory="all"
							appliedCount={0}
							isLocked={false}
							onApplyProtocol={(protocol) =>
								showFeedback(`Протокол «${protocol.title}» внесён в дневник приёма и смету`)
							}
						/>
					</div>
				</section>
			</div>
			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<ClinicalHygieneOrthoPreviewApp />);
}
