import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/components.css";

import { SmartOpgViewerModal } from "./components/orthodontics/SmartOpgViewerModal";
import { OdontogramViewContainer } from "./components/odontogram/OdontogramViewContainer";
import type { ToothData, ToothState } from "./components/odontogram/ToothChart";
import type { OpgToothSlot } from "./components/orthodontics/opgTopologicalEngine";
import { Sparkles, Sun, Moon, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";

// Generate initial 32 adult teeth
const createInitialTeeth = (): ToothData[] => {
	const teeth: ToothData[] = [];
	const quadrants = [
		[18, 17, 16, 15, 14, 13, 12, 11],
		[21, 22, 23, 24, 25, 26, 27, 28],
		[31, 32, 33, 34, 35, 36, 37, 38],
		[41, 42, 43, 44, 45, 46, 47, 48],
	];

	for (const quad of quadrants) {
		for (const toothNum of quad) {
			teeth.push({
				toothNumber: toothNum,
				state: "Healthy",
			});
		}
	}
	return teeth;
};

export function SmartOpgInquisitionPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as "light" | "dark") || "dark";
	const initialModal = params.get("modal") !== "closed"; // default open unless ?modal=closed
	const initialSynced = params.get("synced") === "true";

	const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
	const [isSmartOpgOpen, setIsSmartOpgOpen] = useState<boolean>(initialModal);
	const [teethData, setTeethData] = useState<ToothData[]>(() => {
		const base = createInitialTeeth();
		if (initialSynced) {
			return base.map((t) => {
				if (t.toothNumber === 48) return { ...t, state: "Retained" as ToothState };
				if (t.toothNumber === 38 || t.toothNumber === 28 || t.toothNumber === 18) {
					return { ...t, state: "Missing" as ToothState };
				}
				if (t.toothNumber === 36) return { ...t, state: "Periodontitis" as ToothState };
				if (t.toothNumber === 16) return { ...t, state: "Caries" as ToothState };
				return t;
			});
		}
		return base;
	});
	const [isSynced, setIsSynced] = useState<boolean>(initialSynced);

	// Theme synchronization with document
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		if (theme === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, [theme]);

	// Handle 1-click apply from Smart OPG AI
	const handleApplyOpgOdontogram = useCallback((teethMap: Record<number, OpgToothSlot>) => {
		setTeethData((prev) => {
			const updated = prev.map((tooth) => {
				const slot = teethMap[tooth.toothNumber];
				if (slot && slot.status) {
					return {
						...tooth,
						state: slot.status,
						clinicalDescriptionRu: slot.clinicalDescriptionRu,
					};
				}
				return tooth;
			});
			return updated;
		});
		setIsSynced(true);
	}, []);

	// Handle quick state change from Odontogram directly
	const handleQuickStateChange = useCallback((targets: number[], state: ToothState) => {
		setTeethData((prev) =>
			prev.map((tooth) => (targets.includes(tooth.toothNumber) ? { ...tooth, state } : tooth))
		);
	}, []);

	// Live gross estimation (integer kopecks converted to rub)
	const liveGrossTotalRub = useMemo(() => {
		let totalRub = 0;
		for (const t of teethData) {
			if (t.state === "Caries") totalRub += 4500;
			if (t.state === "Pulpitis") totalRub += 8500;
			if (t.state === "Periodontitis") totalRub += 11500;
			if (t.state === "Retained") totalRub += 9000; // Атипичное удаление ретенированного зуба
			if (t.state === "Crown") totalRub += 22000;
		}
		return totalRub;
	}, [teethData]);

	const tooth48 = teethData.find((t) => t.toothNumber === 48);

	return (
		<div className="min-h-screen w-full flex flex-col bg-[var(--paper-soft,#0b0f19)] text-[var(--ink,#f8fafc)]">
			{/* Top Bar Navigation for Preview */}
			<header className="h-12 border-b border-[var(--line,#1e293b)] bg-[var(--paper,#0f172a)] px-4 flex items-center justify-between shrink-0 z-40">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs border border-sky-500/30">
							AI
						</div>
						<h1 className="text-xs sm:text-sm font-bold text-[var(--ink,#ffffff)] tracking-wide">
							DENTE · Smart OPG Panoramic AI & Odontogram Red Team
						</h1>
					</div>

					{isSynced && (
						<div
							data-testid="synced-status-banner"
							className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
						>
							<CheckCircle2 size={12} />
							<span>ОПТГ синхронизирована (Форма 043/у)</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					{/* Status badge for Tooth 48 */}
					<div
						data-testid="tooth-48-status-pill"
						className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
							tooth48?.state === "Retained"
								? "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-xs"
								: "bg-slate-800 text-slate-400 border-slate-700"
						}`}
					>
						Зуб 48: {tooth48?.state === "Retained" ? "Ретенция (Р)" : tooth48?.state || "Норма"}
					</div>

					{/* Theme switch */}
					<button
						type="button"
						onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
						className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--line,#334155)] bg-[var(--paper,#1e293b)] text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-hover,#334155)] flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="preview-toggle-theme-btn"
						title="Переключить тему (Светлая / Темная)"
					>
						{theme === "dark" ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-sky-400" />}
						<span className="hidden sm:inline">{theme === "dark" ? "Светлая" : "Темная"}</span>
					</button>

					{/* Trigger OPG Modal */}
					<button
						type="button"
						onClick={() => setIsSmartOpgOpen(true)}
						className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
						data-testid="preview-open-smart-opg-btn"
						title="Открыть окно анализа панорамного снимка ОПТГ"
					>
						<Sparkles size={13} />
						<span>Открыть ОПТГ AI</span>
					</button>
				</div>
			</header>

			{/* Main Workspace: Real OdontogramViewContainer */}
			<main className="flex-1 p-2 sm:p-4 overflow-auto flex flex-col">
				<div className="w-full max-w-7xl mx-auto flex-1 flex flex-col bg-[var(--paper,#0f172a)] border border-[var(--line,#1e293b)] rounded-2xl p-2 sm:p-4 shadow-xl">
					<OdontogramViewContainer
						patientId="patient-opg-inquisition-temur"
						teethData={teethData}
						pediatricMode={false}
						dentitionMode="adult"
						useSurfaces={true}
						liveGrossTotalRub={liveGrossTotalRub}
						onQuickStateChange={handleQuickStateChange}
						onMarkIntactDentition={() => {
							setTeethData(createInitialTeeth());
							setIsSynced(false);
						}}
						onMarkWisdomTeethMissing={() => {
							setTeethData((prev) =>
								prev.map((t) =>
									[18, 28, 38, 48].includes(t.toothNumber) ? { ...t, state: "Missing" as ToothState } : t
								)
							);
						}}
					/>
				</div>
			</main>

			{/* Smart OPG Viewer Modal */}
			<SmartOpgViewerModal
				isOpen={isSmartOpgOpen}
				onClose={() => setIsSmartOpgOpen(false)}
				patientName="Темур"
				imageUrl="/models/sample_opg_temur.png"
				onApplyOdontogram={handleApplyOpgOdontogram}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<SmartOpgInquisitionPreviewApp />);
}
