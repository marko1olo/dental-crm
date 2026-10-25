import React, { useEffect, useState } from "react";
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

import { EmkPerioSection } from "./components/visit/emk/EmkPerioSection";
import { PeriodontogramChart } from "./components/perio/PeriodontogramChart";
import { PerioChartModal } from "./components/perio/PerioChartModal";

function PerioPreviewApp() {
	const [diaryForm, setDiaryForm] = useState<Record<string, string>>({
		objectiveStatus: "Пародонт: Интактный пародонт, глубина борозды <=2 мм, кровоточивости нет.",
		diagnosis: "K05.1 Хронический гингивит",
		treatmentPlan: "Профессиональная гигиена полости рта, антисептическая обработка десневого края.",
	});
	const [isModalOpen, setIsModalOpen] = useState<boolean>(() => {
		const search = new URLSearchParams(window.location.search || "");
		return search.get("perio") === "modal" || search.get("modal") === "1";
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.body.className = theme === "dark" ? "dark antialiased" : "light antialiased";
		document.documentElement.style.colorScheme = theme;
	}, []);

	const patientId = "01a00000-0000-0000-0000-000000000001";
	const patientName = "Смирнова Анна Сергеевна";

	return (
		<div
			className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-2 sm:p-5 transition-colors duration-200 overflow-y-auto overflow-x-clip max-w-[100vw]"
			data-testid="perio-standalone-workspace"
		>
			<div className="max-w-6xl mx-auto space-y-4">
				<header className="p-3 sm:p-4 rounded-2xl bg-[var(--paper-card)] border border-[var(--line)] shadow-xs flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2">
							{patientName}
						</h1>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Медицинская карта приёма • Полных лет: 34 • Пародонтологический осмотр
						</p>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
							PSR Скрининг
						</span>
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="px-3 py-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] transition-colors min-h-[36px]"
						>
							Шторка карты
						</button>
					</div>
				</header>

				<EmkPerioSection
					visitNoteForm={diaryForm as any}
					updateVisitNoteField={(f, v) => setDiaryForm((p) => ({ ...p, [f]: v }))}
					patientId={patientId}
					patientName={patientName}
					activeTooth={16}
					onOpenPerioModal={() => setIsModalOpen(true)}
				/>

				<PeriodontogramChart
					patientId={patientId}
					patientName={patientName}
					onInsertToProtocol={(text) =>
						setDiaryForm((p) => ({
							...p,
							objectiveStatus: `${p.objectiveStatus ? `${p.objectiveStatus}\n` : ""}${text}`,
						}))
					}
				/>
			</div>

			{isModalOpen && (
				<PerioChartModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					onInsertToProtocol={(text) =>
						setDiaryForm((p) => ({
							...p,
							objectiveStatus: `${p.objectiveStatus ? `${p.objectiveStatus}\n` : ""}${text}`,
						}))
					}
				/>
			)}
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	createRoot(container).render(<PerioPreviewApp />);
}
