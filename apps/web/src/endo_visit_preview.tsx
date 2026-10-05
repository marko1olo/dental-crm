import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";

import { EmkEndoSection } from "./components/visit/emk/EmkEndoSection";
import { EndoCanalLogModal } from "./components/endo/EndoCanalLogModal";
import { EndoWorkspace } from "./components/radiology/mpr/workspaces/EndoWorkspace";
import { EndoExperimentalHarness } from "./components/radiology/mpr/workspaces/endo/EndoExperimentalHarness";
import type { ViewportRenderers } from "./components/radiology/mpr/workspaces/workspaceTypes";
import type { CbctVoxelVolume } from "./components/radiology/cbctMprMath";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { Activity, FileText, Compass, Cpu, Layers } from "lucide-react";

function createCalibratedDemoVolume(): CbctVoxelVolume {
	const roiW = 48;
	const roiH = 48;
	const roiD = 80;
	const totalVoxels = roiW * roiH * roiD;
	const volData = new Int16Array(totalVoxels);

	for (let z = 0; z < roiD; z++) {
		const zNorm = z / roiD;
		for (let y = 0; y < roiH; y++) {
			for (let x = 0; x < roiW; x++) {
				const dx = x - roiW / 2;
				const dy = y - roiH / 2;
				const r = Math.hypot(dx, dy);
				const idx = z * roiW * roiH + y * roiW + x;

				if (r < 2.5 && zNorm > 0.15 && zNorm < 0.85) {
					volData[idx] = 120; // pulp chamber
				} else if (r < 12.0) {
					volData[idx] = 950 + ((x * y) % 50); // dentin
				} else if (r < 18.0) {
					volData[idx] = 780; // bone
				} else {
					volData[idx] = -600; // air
				}
			}
		}
	}

	return {
		id: "zakharov-cbct-subvolume",
		dimensions: { width: roiW, height: roiH, depth: roiD },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -6.0, y: -6.0, z: -10.0 },
		physicalSizeMm: { x: 12.0, y: 12.0, z: 20.0 },
		data: volData,
		minHU: -1000,
		maxHU: 2500,
		isDisposed: false,
		patientName: "Захаров Иван Дмитриевич",
	};
}

function EndoVisitPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "dark") as ThemeMode;
	const initialView = (params.get("view") || "visit") as "visit" | "modal" | "cbct" | "harness";
	const [activeView, setActiveView] = useState<"visit" | "modal" | "cbct" | "harness">(initialView);
	const [volume] = useState<CbctVoxelVolume>(createCalibratedDemoVolume);

	const [visitForm, setVisitForm] = useState<Record<string, any>>({
		patientId: "demo-pat-zakharov",
		patientName: "Захаров Иван Дмитриевич",
		complaints: "Жалобы на приступообразные ночные боли в зубе 36, иррадиирующие по ходу тройничного нерва.",
		objectiveStatus: "Зуб 36: глубокая кариозная полость на жевательной поверхности, сообщающаяся с полостью зуба. Зондирование устьев каналов резко болезненно. Термометрия (+).",
		diagnosis: "K04.0 Острый очаговый пульпит (зуб #36)",
		diagnosisTooth: "36",
		treatmentPlan: "1. Анестезия Sol. Ultracaini DS Forte 1:100000 1.7 ml.\n2. Коффердам (A16.07.051).\n3. Определение рабочей длины по КЛКТ 3D (WL: MB=21.0мм, ML=20.5мм, D=21.5мм).\n4. Мехобработка Ni-Ti ProTaper Gold (A16.07.030.001).\n5. Обтурация гуттаперчей + AH Plus (A16.07.008.002).",
	});

	const updateVisitField = (field: string, val: any) => {
		setVisitForm((prev) => ({ ...prev, [field]: val }));
	};

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen ${activeView === "cbct" ? "p-0 overflow-hidden" : "p-4"}`;
	}, [rawTheme, activeView]);

	// Viewport renderers for CBCT Endo Workspace
	const mockRenderers: ViewportRenderers = {
		renderAxial: (cls) => (
			<div className={`bg-black flex flex-col items-center justify-center text-zinc-400 font-mono text-xs relative ${cls}`}>
				<span className="text-cyan-400 font-semibold">1. Поперечный срез устьев каналов (Axial)</span>
				<span className="text-[10px] text-zinc-500 mt-1">Z = -4.50 мм • Воксель 0.25 мм • W:4025 L:525</span>
			</div>
		),
		renderCoronal: (cls) => (
			<div className={`bg-black flex flex-col items-center justify-center text-zinc-400 font-mono text-xs relative ${cls}`}>
				<span className="text-cyan-400 font-semibold">2. Продольная ось корня (Paraxial Coronal)</span>
				<span className="text-[10px] text-zinc-500 mt-1">Зуб #36 (MB / ML каналы) • Контроль апекса</span>
			</div>
		),
		renderSagittal: (cls) => (
			<div className={`bg-black flex flex-col items-center justify-center text-zinc-400 font-mono text-xs relative ${cls}`}>
				<span className="text-cyan-400 font-semibold">3. Продольный срез дистального корня (Sagittal)</span>
				<span className="text-[10px] text-zinc-500 mt-1">Канал D (Дистальный) • Кривизна по Шнейдеру 11°</span>
			</div>
		),
		renderPanoramic: (cls) => (
			<div className={`bg-black flex flex-col items-center justify-center text-zinc-400 font-mono text-xs relative ${cls}`}>
				<span className="text-zinc-400 font-semibold">Панорамная кривая зубного ряда</span>
			</div>
		),
		renderCrossSection: (cls) => (
			<div className={`bg-black flex flex-col items-center justify-center text-zinc-400 font-mono text-xs relative ${cls}`}>
				<span className="text-emerald-400 font-semibold">Кросс-секция апикальной трети</span>
				<span className="text-[10px] text-zinc-500 mt-1">Физиологическое сужение (WL - 0.5 мм)</span>
			</div>
		),
		renderVolume3D: (cls) => (
			<div className={`bg-black flex flex-col items-center justify-center text-cyan-300 font-mono text-xs relative ${cls}`}>
				<span className="text-cyan-300 font-semibold">4. 3D Изоповерхность дентинных каналов</span>
				<span className="text-[10px] text-zinc-500 mt-1">Web Worker Frangi Hessian • 26-FMM Geodesic</span>
			</div>
		),
	};

	return (
		<div className={activeView === "cbct" ? "w-screen h-screen flex flex-col bg-black text-white" : "max-w-4xl mx-auto space-y-4"}>
			{/* Top Preview Navigation Bar */}
			<header className={`p-3 rounded-xl bg-[var(--paper-card)] border border-[var(--line)] shadow-xs flex items-center justify-between flex-wrap gap-2 ${activeView === "cbct" ? "m-2 rounded-lg" : ""}`}>
				<div>
					<h1 className="text-sm sm:text-base font-extrabold text-[var(--ink)] flex items-center gap-2">
						<Activity className="w-5 h-5 text-[var(--teal,var(--brand-primary))]" />
						<span>DENTE КЛКТ 3D & ЭМК 043/у • Сквозная интеграция</span>
					</h1>
					<p className="text-[11px] text-[var(--muted)]">
						Пациент: Захаров И.Д. (Зуб #36) • Мандат 8e: Автономия врача и 1-клик экспорт
					</p>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={() => setActiveView("visit")}
						className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
							activeView === "visit"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-hover)]"
						}`}
						data-testid="tab-view-visit"
					>
						<Activity className="w-3.5 h-3.5" />
						<span>Форма 043/у (Дневник)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveView("cbct")}
						className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
							activeView === "cbct"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-hover)]"
						}`}
						data-testid="tab-view-cbct"
					>
						<Compass className="w-3.5 h-3.5" />
						<span>Рабочее место КЛКТ</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveView("modal")}
						className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
							activeView === "modal"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-hover)]"
						}`}
						data-testid="tab-view-modal"
					>
						<FileText className="w-3.5 h-3.5" />
						<span>Журнал каналов</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveView("harness")}
						className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
							activeView === "harness"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-hover)]"
						}`}
						data-testid="tab-view-harness"
					>
						<Cpu className="w-3.5 h-3.5" />
						<span>3D Frangi Движок</span>
					</button>
				</div>
			</header>

			{/* VIEW 1: Form 043/u Outpatient Visit Diary */}
			{activeView === "visit" && (
				<div className="p-4 rounded-xl bg-[var(--paper-card)] border border-[var(--line)] shadow-xs space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
						<div className="space-y-1">
							<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
								Диагноз (МКБ-10):
							</span>
							<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] font-medium text-[var(--ink)]">
								{visitForm.diagnosis}
							</div>
						</div>
						<div className="space-y-1">
							<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
								Локальный статус (Status Localis):
							</span>
							<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
								{visitForm.objectiveStatus}
							</div>
						</div>
					</div>

					<div className="pt-2">
						<EmkEndoSection
							visitNoteForm={visitForm}
							updateVisitNoteField={updateVisitField}
							activeTooth={36}
							onOpenEndoModal={() => setActiveView("modal")}
						/>
					</div>

					<div className="space-y-1 pt-2 border-t border-[var(--line)]">
						<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
							Дневник лечения и внесенные протоколы (Форма 043/у):
						</span>
						<div
							className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] whitespace-pre-wrap font-mono leading-relaxed max-h-56 overflow-y-auto"
							data-testid="preview-treatment-plan-output"
						>
							{visitForm.treatmentPlan}
						</div>
					</div>
				</div>
			)}

			{/* VIEW 2: Complete CBCT Endo Workspace with 3D Compass */}
			{activeView === "cbct" && (
				<div className="flex-1 min-h-0 w-full h-[calc(100vh-80px)] border-t border-zinc-800 relative">
					<EndoWorkspace
						volume={volume}
						renderers={mockRenderers}
						activeViewport="coronal"
						setActiveViewport={() => {}}
						maximizedViewport={null}
						handleToggleMaximize={() => {}}
						mobileActiveTab="coronal"
						patientDisplayName="Захаров Иван Дмитриевич"
						patientId="demo-pat-zakharov"
						activeToothFdi={36}
						handleSelectTooth={() => {}}
						handleExportToEmr={() => {
							updateVisitField("treatmentPlan", `${visitForm.treatmentPlan}\n\n[Экспорт из КЛКТ 3D] Протокол эндодонтии зуба #36 перенесен в 043/у.`);
						}}
						handleExportToPlan={() => {
							updateVisitField("treatmentPlan", `${visitForm.treatmentPlan}\n\n[Экспорт в план лечения] Услуги эндодонтии (Приказ 804н: A16.07.051, A16.07.030, A16.07.008) добавлены.`);
						}}
					/>
				</div>
			)}

			{/* VIEW 3: Interactive Canal Journal Modal */}
			{activeView === "modal" && (
				<EndoCanalLogModal
					isOpen={true}
					onClose={() => setActiveView("visit")}
					toothNumber={36}
					patientId="demo-pat-zakharov"
					patientName="Захаров Иван Дмитриевич"
					onInsertToProtocol={(text) => {
						updateVisitField("treatmentPlan", `${visitForm.treatmentPlan}\n\n${text}`);
						setActiveView("visit");
					}}
				/>
			)}

			{/* VIEW 4: 3D Frangi Voxel Calculation Engine Harness */}
			{activeView === "harness" && (
				<div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<EndoExperimentalHarness
						volume={volume}
						initialToothFdi={36}
					/>
				</div>
			)}
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<EndoVisitPreviewApp />);
}
