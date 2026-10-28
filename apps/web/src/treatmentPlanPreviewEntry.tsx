/**
 * treatmentPlanPreviewEntry.tsx — Превью-стенд модуля планов лечения и смет (SSOT).
 * Мандат 8b: Золотой стандарт (до 150 строк).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal).
 */

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
	TreatmentPlanTierSelector,
	TreatmentPlanEditor,
	TreatmentPlanPresenterModal,
	type TreatmentPlanTierId,
	type TreatmentPlanTier,
	type TreatmentPlanStage,
} from "./components/treatment-plans";
import { Sparkles, Sun, Moon, Eye } from "lucide-react";
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

const PREVIEW_TIERS: TreatmentPlanTier[] = [
	{
		tierId: "economy",
		title: "Базовый",
		subtitle: "Функциональная санация и базовое терапевтическое лечение",
		badge: "Базовый",
		isRecommended: false,
		totalRub: 48000,
		totalKopecks: 4800000,
		warrantyYears: 1,
		keyAdvantages: ["Качественные композитные материалы", "Устранение очагов инфекции", "Гарантия 1 год"],
		stages: [],
	},
	{
		tierId: "optimum",
		title: "Оптимальный",
		subtitle: "Золотой стандарт клиники: диоксид циркония и биоинертные сплавы",
		badge: "Стандарт клиники",
		isRecommended: true,
		totalRub: 86000,
		totalKopecks: 8600000,
		warrantyYears: 3,
		keyAdvantages: [
			"Коронки из диоксида циркония Prettau",
			"Микроинвазивная эндодонтия под увеличением",
			"Расширенная гарантия 3 года",
		],
		stages: [],
	},
	{
		tierId: "premium",
		title: "Премиум",
		subtitle: "Максимальная эстетика: керамика E.max Press и цифровой протокол",
		badge: "Премиум",
		isRecommended: false,
		totalRub: 145000,
		totalKopecks: 14500000,
		warrantyYears: 5,
		keyAdvantages: [
			"Безупречная эстетика E.max CAD/CAM",
			"3D-навигационный хирургический шаблон",
			"VIP сопровождение и гарантия 5 лет",
		],
		stages: [],
	},
];

function TreatmentPlanPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const [isDark, setIsDark] = useState(themeParam === "dark" || themeParam === "night");
	const [activeTab, setActiveTab] = useState<"selector" | "editor">("selector");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [isPresenterOpen, setIsPresenterOpen] = useState(params.get("presenter") === "1");
	const [discountPercent, setDiscountPercent] = useState(0);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, [isDark]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col p-3 sm:p-6 space-y-4">
			{/* Верхняя панель управления превью */}
			<header className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black text-[var(--ink)] m-0">
							Планы лечения и сметы (SSOT)
						</h1>
						<p className="text-xs text-[var(--muted)] m-0">
							DENTE CRM · Канонический модуль многовариантных сценариев
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
					<div className="flex items-center p-0.5 sm:p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setActiveTab("selector")}
							className={`min-h-[36px] px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
								activeTab === "selector"
									? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-preview-selector"
						>
							3 Сценария
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("editor")}
							className={`min-h-[36px] px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
								activeTab === "editor"
									? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-preview-editor"
						>
							Редактор
						</button>
					</div>

					<button
						type="button"
						onClick={() => setIsPresenterOpen(true)}
						className="min-h-[36px] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
						data-testid="btn-open-presenter-modal"
					>
						<Eye className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="hidden sm:inline">Презентация для пациента</span>
						<span className="sm:hidden">Презентация</span>
					</button>

					<button
						type="button"
						onClick={() => setIsDark((prev) => !prev)}
						className="w-9 h-9 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0"
						title={isDark ? "Светлая тема" : "Тёмная тема"}
						data-testid="btn-toggle-theme"
					>
						{isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
					</button>
				</div>
			</header>

			{/* Контент активного таба */}
			<main className="flex-1 max-w-6xl mx-auto w-full">
				{activeTab === "selector" ? (
					<TreatmentPlanTierSelector
						tiers={PREVIEW_TIERS}
						selectedTierId={selectedTierId}
						onSelectTier={setSelectedTierId}
						onApproveTier={() => setIsPresenterOpen(true)}
						onPrintPlan={() => window.print()}
						doctorDiscountPercent={discountPercent}
					/>
				) : (
					<TreatmentPlanEditor
						doctorDiscountPercent={discountPercent}
						onDiscountChange={setDiscountPercent}
						onSavePlan={() => {}}
						onApprovePlan={() => setIsPresenterOpen(true)}
					/>
				)}
			</main>

			{/* Модалка презентации для пациента */}
			<TreatmentPlanPresenterModal
				isOpen={isPresenterOpen}
				onClose={() => setIsPresenterOpen(false)}
				patientName="Алексеева Анна Сергеевна"
				patientId="PAT-2026-0891"
				doctorFullName="Д-р Воронов Михаил Васильевич"
				clinicName="Стоматологическая клиника DENTE"
				tiers={PREVIEW_TIERS}
				initialSelectedTierId={selectedTierId}
				onApproveAndSign={() => setIsPresenterOpen(false)}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<TreatmentPlanPreviewApp />);
}
