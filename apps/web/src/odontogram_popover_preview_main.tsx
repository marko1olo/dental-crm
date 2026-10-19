import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ToothState } from "./components/odontogram/chart/types/toothStateUnion";
import "./styles/tokens.css";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./components/odontogram/odontogram.css";
import { ToothRadialMenu } from "./components/odontogram/ToothRadialMenu";
import { GlobalToast } from "./components/GlobalToast";

function OdontogramPopoverPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const toothParam = Number(params.get("tooth")) || 16;
	const isMobileView = typeof window !== "undefined" && window.innerWidth <= 768;

	const [theme, setTheme] = useState<string>(themeParam);
	const [isOpen, setIsOpen] = useState(true);
	const [currentState, setCurrentState] = useState<ToothState>("Caries");
	const [surfaces, setSurfaces] = useState<readonly string[]>(["O", "M"]);

	useEffect(() => {
		const applyTheme = (th: string) => {
			document.documentElement.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
			document.documentElement.style.colorScheme = th;
		};

		applyTheme(theme);

		const handleStorage = () => {
			const stored = localStorage.getItem("dente_theme") || localStorage.getItem("dente_theme_mode");
			if (stored && (stored === "light" || stored === "dark")) {
				setTheme(stored);
				applyTheme(stored);
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [theme]);

	const anchor = isMobileView
		? { x: 195, y: 350, width: 44, height: 56 }
		: { x: 520, y: 220, width: 48, height: 64 };

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 font-sans text-slate-900 dark:text-slate-100 antialiased flex flex-col items-center">
			<header className="w-full max-w-4xl py-3 px-4 mb-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-200">
						Зубная формула — Клинический поповер Apple HIG
					</span>
					<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-medium">
						Зуб #{toothParam} ({String(currentState)})
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setTheme(theme === "light" ? "dark" : "light")}
						className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
					>
						{theme === "light" ? "Темная тема" : "Светлая тема"}
					</button>
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
					>
						Открыть меню зуба #{toothParam}
					</button>
				</div>
			</header>

			{/* Dental Chart Mock Context to demonstrate realistic popover anchoring */}
			<div className="w-full max-w-4xl bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center relative">
				<div className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
					Верхняя челюсть (постоянный прикус)
				</div>
				<div className="flex gap-2 flex-wrap justify-center py-4">
					{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => {
						const isSelected = t === toothParam;
						return (
							<button
								key={t}
								type="button"
								data-tooth-id={t}
								onClick={() => {
									setIsOpen(true);
								}}
								className={`w-11 h-14 rounded-lg flex flex-col items-center justify-between p-1 border text-xs font-mono transition-all ${
									isSelected
										? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/30 font-bold"
										: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
								}`}
							>
								<span className="text-[10px] text-slate-400">{t}</span>
								<div className="w-5 h-6 rounded border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] text-slate-500">
									{t === toothParam ? "C" : "N"}
								</div>
								<span className="text-[9px] text-slate-400">{t === toothParam ? "O,M" : ""}</span>
							</button>
						);
					})}
				</div>
			</div>

			{isOpen && (
				<ToothRadialMenu
					toothNumber={toothParam}
					anchorRect={anchor}
					currentState={currentState}
					surfaces={surfaces}
					onSelectState={(state, surfs) => {
						setCurrentState(state as ToothState);
						if (surfs) setSurfaces(surfs);
						setIsOpen(false);
					}}
					onSelectSurfaces={(surfs) => {
						setSurfaces(surfs);
					}}
					onClose={() => {
						setIsOpen(false);
					}}
				/>
			)}

			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<OdontogramPopoverPreviewApp />);
}
