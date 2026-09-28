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
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/lab/dentalLabWorkflow.css";
import "./components/lab/labOrders.css";
import "./components/patients/LabOrdersPanel.css";
import { LabOrdersPage } from "./pages/LabOrdersPage";
import { LabOrdersPanel } from "./components/patients/LabOrdersPanel";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function LabOrdersPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const initialTab = (params.get("tab") || "registry") as "registry" | "chairside";
	const [activeTab, setActiveTab] = useState<"registry" | "chairside">(initialTab);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200">
			<div className="max-w-7xl mx-auto space-y-4">
				<header className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--glass-border)]">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
							Зуботехническая лаборатория (ЗТЛ): Реестр и Кресельная панель
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Врач: Д-р Воронов А.В. | Тема: {rawTheme.toUpperCase()} | 32px унифицированные контролы
						</p>
					</div>

					<div className="flex items-center gap-3">
						<div className="inline-flex rounded-lg bg-[var(--paper-soft)] p-0.5 border border-[var(--glass-border)]">
							<button
								type="button"
								data-testid="tab-lab-registry"
								onClick={() => setActiveTab("registry")}
								className={`h-7 px-3 rounded-md text-xs font-medium transition-all ${
									activeTab === "registry"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Реестр нарядов (32px)
							</button>
							<button
								type="button"
								data-testid="tab-lab-chairside"
								onClick={() => setActiveTab("chairside")}
								className={`h-7 px-3 rounded-md text-xs font-medium transition-all ${
									activeTab === "chairside"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Кресельная панель (Chairside)
							</button>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => {
									const url = new URL(window.location.href);
									url.searchParams.set("theme", "light");
									window.location.href = url.toString();
								}}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
									rawTheme === "light"
										? "bg-[var(--accent)] text-white border-[var(--accent)]"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								Light
							</button>
							<button
								type="button"
								onClick={() => {
									const url = new URL(window.location.href);
									url.searchParams.set("theme", "dark");
									window.location.href = url.toString();
								}}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
									rawTheme === "dark"
										? "bg-[var(--accent)] text-white border-[var(--accent)]"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								Dark
							</button>
						</div>
					</div>
				</header>

				<main className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm">
					{activeTab === "registry" ? (
						<LabOrdersPage />
					) : (
						<LabOrdersPanel patientId="pat-1" />
					)}
				</main>
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<LabOrdersPreviewApp />);
}
