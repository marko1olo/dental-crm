import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { FileText, Stethoscope, User, Zap, AlertCircle } from "lucide-react";
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
import { ChairsideEndoQuickBar } from "./components/endo/ChairsideEndoQuickBar";
import { EndoCanalLogModal } from "./components/endo/EndoCanalLogModal";

function EndoPreviewApp() {
	const [activeTooth] = useState<number>(16);
	const [soapDiary, setSoapDiary] = useState<string>(
		"Зуб 16: Механическая и медикаментозная обработка каналов (MB1, MB2, DB, P). Ирригация 3% NaOCl + ультразвуковая активация. Обтурация методом латеральной компакции гуттаперчи с силером AH Plus.",
	);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			return params.get("modal") === "true";
		}
		return false;
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 transition-colors duration-200">
			{/* Top Bar / Clinical Patient Context */}
			<header className="max-w-4xl mx-auto mb-4 p-3 sm:p-4 rounded-2xl bg-[var(--paper-card)] border border-[var(--line)] shadow-xs flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Stethoscope className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="font-semibold text-sm sm:text-base text-[var(--ink)]">
								Смирнова Анна Сергеевна, 38 лет
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
								Зуб {activeTooth}
							</span>
						</div>
						<div className="text-xs text-[var(--muted)] flex items-center gap-2 mt-0.5">
							<span>K04.0 Острый очаговый пульпит</span>
							<span>•</span>
							<span className="text-amber-500 flex items-center gap-1 font-medium">
								<AlertCircle className="w-3 h-3" /> Аллергия: Пенициллины
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 rounded-xl border border-[var(--line)] hover:bg-[var(--paper-hover)] text-xs sm:text-sm font-medium transition-colors"
					>
						Журнал каналов (модалка)
					</button>
				</div>
			</header>

			{/* Main Workspace Card */}
			<main className="max-w-4xl mx-auto space-y-4">
				{/* 1-Click Chairside Endo QuickBar (First Principles) */}
				<section className="rounded-2xl bg-[var(--paper-card)] border border-[var(--line)] p-3 sm:p-5 shadow-xs">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<Zap className="w-4 h-4 text-[var(--primary)]" />
							<h1 className="text-sm sm:text-base font-semibold text-[var(--ink)]">
								Эндодонтический протокол — Зуб {activeTooth}
							</h1>
						</div>
						<span className="text-xs text-[var(--muted)]">
							Анатомические длины FDI (MB1, MB2, DB, P)
						</span>
					</div>

					<ChairsideEndoQuickBar
						activeTooth={activeTooth}
						toothState="Пульпит / Лечение каналов"
						onInsertToDiary={(soapText) => {
							setSoapDiary((prev) => (prev ? `${prev}\n\n${soapText}` : soapText));
						}}
						onOpenFullModal={() => setIsModalOpen(true)}
					/>
				</section>

				{/* SOAP Clinical Diary Preview */}
				<section className="rounded-2xl bg-[var(--paper-card)] border border-[var(--line)] p-3 sm:p-5 shadow-xs">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--muted)]">
							<FileText className="w-4 h-4 text-[var(--primary)]" />
							<span>Дневник приёма (SOAP) — План и манипуляции</span>
						</div>
						<button
							type="button"
							onClick={() => setSoapDiary("")}
							className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
						>
							Очистить
						</button>
					</div>
					<textarea
						value={soapDiary}
						onChange={(e) => setSoapDiary(e.target.value)}
						placeholder="Текст протокола будет мгновенно передан сюда..."
						className="w-full min-h-[90px] p-3 text-xs sm:text-sm rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] resize-y focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)] leading-relaxed"
					/>
				</section>
			</main>

			{/* EndoCanalLogModal (Full Root Canal Table) */}
			{isModalOpen && (
				<EndoCanalLogModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					toothNumber={activeTooth}
					toothState="K04.0 Острый пульпит"
					patientId="pat-1"
					onInsertToProtocol={(protocolText) => {
						setSoapDiary((prev) => (prev ? `${prev}\n\n${protocolText}` : protocolText));
						setIsModalOpen(false);
					}}
				/>
			)}
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<EndoPreviewApp />);
}
