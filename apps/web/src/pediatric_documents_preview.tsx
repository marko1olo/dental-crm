import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles/modules/documents.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./styles/components.css";

import { PediatricBraveryDiplomaModal } from "./components/pediatric/PediatricBraveryDiplomaModal";
import { PediatricVisitAdaptationTab } from "./components/pediatric/PediatricVisitAdaptationTab";
import { DocumentsCatalogView } from "./components/documents/DocumentsCatalogView";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { Award, FileText, Heart, Moon, Sun } from "lucide-react";

export function PediatricDocumentsPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "light";
	const initialView = params.get("view") || "diploma";

	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [activeView, setActiveView] = useState<"diploma" | "documents" | "adaptation">(
		initialView === "documents"
			? "documents"
			: initialView === "adaptation"
				? "adaptation"
				: "diploma",
	);
	const [isDiplomaOpen, setIsDiplomaOpen] = useState<boolean>(true);

	useEffect(() => {
		const isDark = theme === "dark" || theme === "night";
		const resolved = resolveTheme(theme, isDark);
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	return (
		<div
			className="min-h-screen bg-[var(--bg,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col font-sans"
			data-testid="pediatric-documents-preview-root"
		>
			{/* Top Preview Control Bar */}
			<header className="sticky top-0 z-50 bg-[var(--paper-strong,#ffffff)] border-b border-[var(--line,#e2e8f0)] px-4 py-2.5 flex items-center justify-between shadow-xs">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs">
						<Heart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>DENTE Педиатрия & Документооборот</span>
					</div>

					<nav className="inline-flex p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] gap-1">
						<button
							type="button"
							onClick={() => {
								setActiveView("diploma");
								setIsDiplomaOpen(true);
							}}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "diploma"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-diploma"
						>
							<Award className="w-3.5 h-3.5 text-amber-500" />
							<span>Диплом за храбрость</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveView("documents")}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "documents"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-documents"
						>
							<FileText className="w-3.5 h-3.5 text-teal-500" />
							<span>Каталог документов</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveView("adaptation")}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "adaptation"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-adaptation"
						>
							<Heart className="w-3.5 h-3.5 text-rose-500" />
							<span>Адаптационный приём</span>
						</button>
					</nav>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
						className="h-8 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-toggle-theme"
					>
						{theme === "dark" ? (
							<>
								<Sun className="w-4 h-4 text-amber-400" />
								<span>Светлая тема</span>
							</>
						) : (
							<>
								<Moon className="w-4 h-4 text-indigo-500" />
								<span>Тёмная тема</span>
							</>
						)}
					</button>
				</div>
			</header>

			{/* Main Workspace Area */}
			<main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
				{activeView === "diploma" && (
					<div className="space-y-4">
						<div className="p-4 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between shadow-xs">
							<div>
								<h2 className="text-sm font-extrabold text-[var(--ink,#0f172a)]">
									Рабочее место детского приёма: выдача наград
								</h2>
								<p className="text-xs text-[var(--muted,#64748b)]">
									Пациент: Миша Смирнов (6 лет) • Приём завершён успешно
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsDiplomaOpen(true)}
								className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
								data-testid="btn-open-diploma-harness"
							>
								<Award className="w-4 h-4" />
								<span>Открыть диплом за храбрость</span>
							</button>
						</div>

						<PediatricBraveryDiplomaModal
							isOpen={isDiplomaOpen}
							onClose={() => setIsDiplomaOpen(false)}
							patientName="Миша Смирнов"
							patientAgeYears={6}
							doctorName="Д-р Анна Сергеевна Смирнова"
							clinicName="Стоматология «DENTE ДЕТИ»"
							visitDate="08 октября 2026"
						/>
					</div>
				)}

				{activeView === "documents" && (
					<div className="space-y-4">
						<div className="mb-2">
							<h1 className="text-lg font-black tracking-tight text-[var(--ink,#0f172a)]">
								Единый каталог клинических документов
							</h1>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Информированные согласия, амбулаторные карты, договоры и детские дипломы
							</p>
						</div>

						<DocumentsCatalogView
							patientName="Миша Смирнов"
							patientAgeYears={6}
							doctorName="Д-р Анна Сергеевна Смирнова"
							clinicName="Стоматология «DENTE ДЕТИ»"
						/>
					</div>
				)}

				{activeView === "adaptation" && (
					<div className="space-y-4">
						<div className="mb-2">
							<h1 className="text-lg font-black tracking-tight text-[var(--ink,#0f172a)]">
								Протокол адаптационного приёма ребёнка
							</h1>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Пошаговая методика Tell-Show-Do, шкала Франкла и молочная зубная формула FDI (51–85)
							</p>
						</div>

						<PediatricVisitAdaptationTab
							patientId="pat-pedia-001"
							patientName="Миша Смирнов"
							patientAgeYears={6}
							doctorName="Д-р Анна Сергеевна Смирнова"
							clinicName="Стоматология «DENTE ДЕТИ»"
						/>
					</div>
				)}
			</main>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(<PediatricDocumentsPreviewApp />);
}
