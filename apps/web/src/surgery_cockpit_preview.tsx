import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/components.css";
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

import { VisitSurgeryExtractionBar } from "./components/visit/surgery/VisitSurgeryExtractionBar";
import { VisitSurgerySinusGbrBar } from "./components/visit/surgery/VisitSurgerySinusGbrBar";
import { VisitSurgeryImplantBar } from "./components/visit/surgery/VisitSurgeryImplantBar";
import { VisitSurgeryProtocolTab } from "./components/visit/surgery/VisitSurgeryProtocolTab";
import { ImplantPassportCard } from "./components/implants/ImplantPassportCard";
import { ImplantPassportModal } from "./components/implants/ImplantPassportModal";
import { createDefaultPassportRecord } from "./components/implants/implantQuickPresets";
import { PeriodontogramChart } from "./components/perio/PeriodontogramChart";
import { PeriodontalPocketDepthModal } from "./components/perio/PeriodontalPocketDepthModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function SurgeryCockpitPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const view = params.get("view") || "all"; // 'extraction', 'sinus_gbr', 'implant', 'protocol_tab', 'passport_card', 'passport_modal', 'perio', or 'all'

	const [activeBrand, setActiveBrand] = useState("Osstem");
	const [activeCapType, setActiveCapType] = useState<"fdm" | "plug">("fdm");
	const [activeTorque, setActiveTorque] = useState(35);
	const [activeIsq, setActiveIsq] = useState(72);
	const [activeDiameter, setActiveDiameter] = useState(4.0);
	const [activeLength, setActiveLength] = useState(10.0);
	const [activeSuture, setActiveSuture] = useState("ПГА 4-0");
	const [protocolText, setProtocolText] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(true);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	const samplePassport = createDefaultPassportRecord({
		toothFdi: 36,
		brand: "Osstem",
		patientName: "Ковалёв Роман Станиславович",
		patientId: "pat-101",
		doctorName: "Д-р Воронов Алексей Владимирович",
		doctorId: "doc-1",
		torqueNcm: 35,
		isqDay0: 74,
		capType: "fdm",
	});

	const sampleVisit = {
		id: "visit-surgery-1",
		patientId: "pat-101",
		patientName: "Ковалёв Роман Станиславович",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов Алексей Владимирович",
		specialty: "surgeon",
		date: "2026-10-03",
		notes: "",
	};

	return (
		<div
			className={`min-h-screen bg-[var(--paper)] text-[var(--ink)] ${
				view === "perio" ? "p-1 sm:p-4" : "p-2 sm:p-6"
			} transition-colors duration-200 overflow-x-clip max-w-[100vw]`}
		>
			<div className="max-w-7xl mx-auto space-y-4">
				{/* Header & Theme switcher */}
				{view !== "perio" && (
					<header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--glass-border)]">
						<div>
							<h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
								Хирургический протокол, имплантология и пародонтология (DENTE CRM)
							</h1>
							<p className="text-xs text-[var(--muted)]">
								Пациент: Ковалёв Р.С. | Врач: Д-р Воронов А.В. | Тема: {rawTheme.toUpperCase()} | Режим: {view.toUpperCase()}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									window.location.search = `?theme=light&view=${view}`;
								}}
								className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
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
									window.location.search = `?theme=dark&view=${view}`;
								}}
								className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
									rawTheme === "dark"
										? "bg-[var(--accent)] text-white border-[var(--accent)]"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								Dark
							</button>
						</div>
					</header>
				)}

				{/* 1. Tooth Extraction Cockpit */}
				{(view === "all" || view === "extraction") && (
					<section
						data-testid="extraction-cockpit-section"
						className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
					>
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wide">
								1. Кокпит хирургического удаления зуба (Зуб 48)
							</h2>
							<span className="text-xs text-[var(--muted)]">Амбулаторная хирургия</span>
						</div>
						<VisitSurgeryExtractionBar
							effectiveTooth={48}
							patientName="Ковалёв Роман Станиславович"
							doctorName="Д-р Воронов Алексей Владимирович"
							onApplyProtocolText={(t) => setProtocolText((prev) => (prev ? prev + "\n" + t : t))}
						/>
					</section>
				)}

				{/* 2. Bone Grafting & Sinus Lift Cockpit */}
				{(view === "all" || view === "sinus_gbr") && (
					<section
						data-testid="sinus-gbr-cockpit-section"
						className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
					>
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wide">
								2. Кокпит костной пластики, НКР и синус-лифтинга (Зуб 16 / 26)
							</h2>
							<span className="text-xs text-[var(--muted)]">Костная пластика</span>
						</div>
						<VisitSurgerySinusGbrBar
							effectiveTooth={16}
							isClosedSinus={false}
							onApplyProtocolText={(t) => setProtocolText((prev) => (prev ? prev + "\n" + t : t))}
						/>
					</section>
				)}

				{/* 3. Dental Implantation Cockpit */}
				{(view === "all" || view === "implant") && (
					<section
						data-testid="implant-cockpit-section"
						className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
					>
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wide">
								3. Расширенный кокпит имплантации (8 брендов + стабильность + ФДМ)
							</h2>
							<span className="text-xs text-[var(--muted)]">Дентальная имплантация</span>
						</div>
						<VisitSurgeryImplantBar
							implantBrand={activeBrand}
							setImplantBrand={setActiveBrand}
							implantCap={activeCapType}
							setImplantCap={setActiveCapType}
							implantTorque={activeTorque}
							setImplantTorque={setActiveTorque}
							implantIsq={activeIsq}
							setImplantIsq={setActiveIsq}
							implantDiameter={activeDiameter}
							setImplantDiameter={setActiveDiameter}
							implantLength={activeLength}
							setImplantLength={setActiveLength}
							implantSuture={activeSuture}
							setImplantSuture={setActiveSuture}
							onApplyPreset={(overrides) => {
								if (overrides) console.log("Overrides applied:", overrides);
							}}
						/>
					</section>
				)}

				{/* 4. Full VisitSurgeryProtocolTab integration */}
				{(view === "all" || view === "protocol_tab") && (
					<section
						data-testid="protocol-tab-section"
						className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
					>
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wide">
								4. Полный инлайн-протокол операции (VisitSurgeryProtocolTab)
							</h2>
							<span className="text-xs text-[var(--muted)]">Протокол операции 043/у</span>
						</div>
						<VisitSurgeryProtocolTab
							activeTooth={36}
							patientName="Ковалёв Роман Станиславович"
							patientId="pat-101"
							doctorName="Д-р Воронов Алексей Владимирович"
							doctorId="doc-1"
							onApplyToDiary={(txt) => alert("Вставлено в дневник приёма:\n" + txt)}
						/>
					</section>
				)}

				{/* 5. Implant Passport Card */}
				{(view === "all" || view === "passport_card") && (
					<section
						data-testid="passport-card-section"
						className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
					>
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wide">
								5. Паспорт имплантата (ImplantPassportCard)
							</h2>
							<span className="text-xs text-[var(--muted)]">Гарантийный паспорт</span>
						</div>
						<ImplantPassportCard
							data={samplePassport}
							onPrint={() => window.print()}
							onCopySummary={() => alert("Паспорт скопирован")}
						/>
					</section>
				)}

				{/* 6. Periodontal 6-Point Probing (Florida Probe & PSR) */}
				{(view === "all" || view === "perio") && (
					<section
						data-testid="perio-chart-section"
						className={
							view === "perio"
								? "w-full max-w-full overflow-x-clip"
								: "bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
						}
					>
						{view !== "perio" && (
							<div className="flex items-center justify-between">
								<h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wide">
									6. Пародонтограмма 6-точечного зондирования Florida Probe (32 зуба, 192 точки)
								</h2>
								<span className="text-xs text-[var(--muted)]">Пародонтология</span>
							</div>
						)}
						<PeriodontogramChart
							patientId="pat-101"
							patientName="Ковалёв Роман Станиславович"
							doctorName="Д-р Воронов Алексей Владимирович"
							compactMode={false}
						/>
					</section>
				)}

				{/* 7. Implant Passport Modal */}
				{view === "passport_modal" && (
					<div data-testid="passport-modal-wrapper" className="relative z-50">
						<ImplantPassportModal
							isOpen={isModalOpen}
							onClose={() => setIsModalOpen(false)}
							patientName="Ковалёв Роман Станиславович"
							patientId="PAT-101"
							doctorName="Д-р Воронов Алексей Владимирович"
							doctorId="DOC-01"
							initialTooth={36}
							initialTab="passport"
							inventoryOverdraftActive={false}
							onSavePassport={(data) => console.log("Passport saved:", data)}
							onInsertIntoDiary={(txt) => console.log("Diary inserted:", txt)}
						/>
					</div>
				)}

				{/* 8. Periodontal Pocket Depth Modal */}
				{view === "pocket_modal" && (
					<div data-testid="perio-pocket-modal-wrapper" className="relative z-50">
						<PeriodontalPocketDepthModal
							isOpen={isModalOpen}
							onClose={() => setIsModalOpen(false)}
							toothNumber={16}
							onSaveToothRecord={(rec) => console.log("Saved perio tooth record:", rec)}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<SurgeryCockpitPreviewApp />);
}
