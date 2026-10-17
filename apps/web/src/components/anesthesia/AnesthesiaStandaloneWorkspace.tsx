import React, { useState, useEffect } from "react";
import { User, Stethoscope } from "lucide-react";
import { AnesthesiaQuickBar } from "./AnesthesiaQuickBar";
import { AnesthesiaWorkspaceHeader } from "./AnesthesiaWorkspaceHeader";

export function AnesthesiaStandaloneWorkspace() {
	const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
	const [hasCardio, setHasCardio] = useState(Boolean(searchParams?.has("cardio")));
	const [hasSulfite] = useState(Boolean(searchParams?.has("sulfite")));
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
			if (nextDark) document.documentElement.classList.add("dark");
			else document.documentElement.classList.remove("dark");
		}
	};

	useEffect(() => {
		if (typeof window !== "undefined") {
			const theme = isDark ? "dark" : "light";
			document.documentElement.setAttribute("data-theme", theme);
			if (isDark) document.documentElement.classList.add("dark");
			else document.documentElement.classList.remove("dark");
		}
	}, [isDark]);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] p-3 sm:p-6 overflow-y-auto"
			data-testid="anesthesia-standalone-workspace"
		>
			<div className="max-w-7xl mx-auto space-y-4">
				<AnesthesiaWorkspaceHeader
					isDark={isDark}
					toggleTheme={toggleTheme}
					hasLidocaineAllergy={hasLidocaineAllergy}
					setHasLidocaineAllergy={setHasLidocaineAllergy}
					hasArticaineAllergy={hasArticaineAllergy}
					setHasArticaineAllergy={setHasArticaineAllergy}
					hasCardio={hasCardio}
					setHasCardio={setHasCardio}
				/>

				{/* Chairside Visit Context Bar */}
				<div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<User size={16} />
						</div>
						<div>
							<div className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								<span>Пациент: Ковалёв Д. С., 38 лет</span>
								<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">· Стандартный вес 70 кг</span>
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
