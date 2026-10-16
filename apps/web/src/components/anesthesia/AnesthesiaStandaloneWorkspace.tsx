import React, { useState, useEffect } from "react";
import { Moon, Sun, User, Stethoscope } from "lucide-react";
import { AnesthesiaQuickBar } from "./AnesthesiaQuickBar";

export function AnesthesiaStandaloneWorkspace() {
	const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
	const [hasCardio, setHasCardio] = useState(Boolean(searchParams?.has("cardio")));
	const [hasSulfite, setHasSulfite] = useState(Boolean(searchParams?.has("sulfite")));
	const [hasArticaineAllergy, setHasArticaineAllergy] = useState(
		Boolean(searchParams?.has("articaine_allergy") || searchParams?.has("allergy")),
	);
	const takesBeta = Boolean(searchParams?.has("beta"));
	const hasIhd = Boolean(searchParams?.has("ihd"));
	const [hasLidocaineAllergy, setHasLidocaineAllergy] = useState(
		Boolean(searchParams?.has("lidocaine_allergy")),
	);
	const [isDark, setIsDark] = useState(() => {
		if (typeof window === "undefined") return false;
		return (
			document.documentElement.getAttribute("data-theme") === "dark" ||
			document.documentElement.classList.contains("dark") ||
			localStorage.getItem("dente_theme") === "dark"
		);
	});

	const toggleTheme = () => {
		const nextDark = !isDark;
		setIsDark(nextDark);
		if (typeof window !== "undefined") {
			const theme = nextDark ? "dark" : "light";
			localStorage.setItem("dente_theme", theme);
			document.documentElement.setAttribute("data-theme", theme);
			if (nextDark) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}
	};

	useEffect(() => {
		if (typeof window !== "undefined") {
			const theme = isDark ? "dark" : "light";
			document.documentElement.setAttribute("data-theme", theme);
			if (isDark) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}
	}, [isDark]);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] p-3 sm:p-6 overflow-y-auto"
			data-testid="anesthesia-standalone-workspace"
		>
			<div className="max-w-7xl mx-auto space-y-4">
				{/* Top Header & Context */}
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] pb-3">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-lg sm:text-xl font-black text-[var(--ink,#0f172a)]">
								Обезболивание и местная анестезия у кресла
							</h1>
							<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30">
								Клинический блок DENTE
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Быстрый выбор препарата в 1 клик, безопасное дозирование и протокол приёма
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={toggleTheme}
							className="secondary-button text-xs font-bold px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] transition-all cursor-pointer inline-flex items-center gap-1.5"
							data-testid="toggle-theme-btn"
							title="Переключить тему оформления (Светлая / Тёмная)"
						>
							{isDark ? (
								<>
									<Sun size={14} className="text-amber-400" />
									<span>☀️ Светлая тема</span>
								</>
							) : (
								<>
									<Moon size={14} className="text-indigo-400" />
									<span>🌙 Тёмная тема</span>
								</>
							)}
						</button>

						<button
							type="button"
							onClick={() => setHasLidocaineAllergy((prev) => !prev)}
							className={`secondary-button text-xs font-bold px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-lg border transition-all cursor-pointer ${
								hasLidocaineAllergy
									? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500 font-black"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid="toggle-lidocaine-allergy"
						>
							{hasLidocaineAllergy ? "✓ Аллергия на лидокаин" : "+ Аллергия на лидокаин"}
						</button>

						<button
							type="button"
							onClick={() => setHasArticaineAllergy((prev) => !prev)}
							className={`secondary-button text-xs font-bold px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-lg border transition-all cursor-pointer ${
								hasArticaineAllergy
									? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500 font-black"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid="toggle-articaine-allergy"
						>
							{hasArticaineAllergy ? "✓ Аллергия на артикаин" : "+ Аллергия на артикаин"}
						</button>

						<button
							type="button"
							onClick={() => setHasCardio((prev) => !prev)}
							className={`secondary-button text-xs font-bold px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-lg border transition-all cursor-pointer ${
								hasCardio
									? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500 font-black"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid="toggle-cardio-risk"
						>
							{hasCardio ? "✓ ССЗ кардио-риск" : "+ Кардио-риск"}
						</button>
					</div>
				</div>

				{/* Chairside Visit Context Bar */}
				<div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<User size={16} />
						</div>
						<div>
							<div className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								<span>Пациент: Ковалёв Д. С., 38 лет</span>
								<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">· Масса тела: стандарт 70 кг</span>
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)]">
								Диагноз: K04.0 Острый очаговый пульпит зуба 16 · Кресло №1
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 text-[var(--muted,#64748b)] font-medium">
						<Stethoscope size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Врач: д-р Воронов А. В. (Стоматолог-терапевт)</span>
					</div>
				</div>

				{/* Anesthesia Quick Bar Core Component */}
				<AnesthesiaQuickBar
					patientWeightKg={70}
					targetToothNumberFdi={16}
					hasCardiovascularRisk={hasCardio}
					takesBetaBlockers={takesBeta}
					hasIschemicHeartDisease={hasIhd}
					hasSulfiteAllergy={hasSulfite}
					hasArticaineAllergy={hasArticaineAllergy}
					hasLidocaineAllergy={hasLidocaineAllergy}
					onApplyAnesthesia={() => {}}
					onOpenEmergencyProtocol={() => {
						const url = new URL(window.location.href);
						url.searchParams.set("emergency", "1");
						window.location.href = url.toString();
					}}
				/>
			</div>
		</div>
	);
}
