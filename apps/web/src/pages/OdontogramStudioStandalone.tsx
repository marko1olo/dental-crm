import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	CheckSquare,
	Coins,
	Crown,
	Eye,
	EyeOff,
	FileText,
	Flame,
	Hammer,
	Layers,
	Mic,
	Moon,
	Paintbrush,
	RotateCcw,
	Sparkles,
	Square,
	Sun,
	Trash2,
	User,
	Wrench,
	Zap,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import { AnatomicalSvgOdontogram } from "../components/odontogram/AnatomicalSvgOdontogram";
import {
	ToothChart,
	type ToothData,
	type ToothState,
	TOOTH_STATE_LABELS,
} from "../components/odontogram/ToothChart";
import {
	ClassicGostOdontogram,
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../components/odontogram/ClassicGostOdontogram";
import { RadialToothMenu } from "../components/odontogram/RadialToothMenu";
import { OdontogramLiveInvoice } from "../components/odontogram/OdontogramLiveInvoice";
import { VoiceDictationOverlay } from "../components/odontogram/VoiceDictationOverlay";
import { showToast } from "../components/GlobalToast";
import "../components/odontogram/odontogram.css";

const ADULT_UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ALL_ADULT_TEETH = [...ADULT_UPPER_TEETH, ...ADULT_LOWER_TEETH];

const PEDIATRIC_UPPER_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const PEDIATRIC_LOWER_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const ALL_PEDIATRIC_TEETH = [...PEDIATRIC_UPPER_TEETH, ...PEDIATRIC_LOWER_TEETH];

const DEMO_CLINICAL_STATES: Record<number, { state: ToothState; surfaces?: string[] }> = {
	18: { state: "Missing" },
	16: { state: "Caries", surfaces: ["O", "M"] },
	14: { state: "Crown" },
	11: { state: "Filled", surfaces: ["O", "D"] },
	24: { state: "Pulpitis" },
	26: { state: "Crown" },
	28: { state: "Missing" },
	48: { state: "Missing" },
	47: { state: "Implant" },
	46: { state: "Caries", surfaces: ["O"] },
	35: { state: "Planned_Implant" },
	36: { state: "Periodontitis" },
	37: { state: "Filled", surfaces: ["O"] },
	38: { state: "Missing" },
};

function createDefaultTeeth(pediatric = false): ToothData[] {
	const list = pediatric ? ALL_PEDIATRIC_TEETH : ALL_ADULT_TEETH;
	return list.map((n) => {
		const demo = !pediatric ? DEMO_CLINICAL_STATES[n] : undefined;
		return {
			toothNumber: n,
			state: demo ? demo.state : ("Healthy" as ToothState),
			surfaces: demo?.surfaces ?? [],
		};
	});
}

export const OdontogramStudioStandalone: React.FC = () => {
	const [viewMode, setViewMode] = useState<OdontogramViewMode>("anatomical_svg");
	const [teethData, setTeethData] = useState<ToothData[]>(() => createDefaultTeeth(false));
	const [pediatricMode, setPediatricMode] = useState<boolean>(false);
	const [showWisdom, setShowWisdom] = useState<boolean>(true);
	const [showCanals, setShowCanals] = useState<boolean>(false);
	const [quickExtractMode, setQuickExtractMode] = useState<boolean>(false);
	const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
	const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [focusedTooth, setFocusedTooth] = useState<number>(18);
	const [currentTheme, setCurrentTheme] = useState<string>("dark");

	// Radial menu state with anchor rect
	const [radialMenu, setRadialMenu] = useState<{
		toothNumber: number;
		rect: { x: number; y: number; width: number; height: number };
	} | null>(null);

	// Theme toggle
	const toggleTheme = useCallback(() => {
		const next = currentTheme === "dark" ? "light" : "dark";
		setCurrentTheme(next);
		document.documentElement.setAttribute("data-theme", next);
		if (next === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
	}, [currentTheme]);

	// Update single or multiple teeth
	const updateToothState = useCallback(
		(toothNumbers: number[], state: ToothState, surfaces?: readonly string[] | undefined) => {
			if (toothNumbers.length === 0) return;
			setTeethData((prev) => {
				const set = new Set(toothNumbers);
				return prev.map((t): ToothData => {
					if (set.has(t.toothNumber)) {
						const updatedSurfaces = surfaces ? [...surfaces] : state === "Healthy" ? [] : t.surfaces ? [...t.surfaces] : undefined;
						return {
							...t,
							state,
							...(updatedSurfaces !== undefined ? { surfaces: updatedSurfaces } : {}),
						};
					}
					return t;
				});
			});
			showToast(`Зуб ${toothNumbers.join(", ")}: ${state}`, "success", 2000);
		},
		[],
	);

	// Reset all teeth
	const resetAllTeeth = useCallback(() => {
		setTeethData(createDefaultTeeth(pediatricMode));
		setSelectedTeeth([]);
		setRadialMenu(null);
		showToast("Зубная формула сброшена", "info", 2000);
	}, [pediatricMode]);

	// Handle pediatric switch
	const handleTogglePediatric = useCallback(() => {
		const next = !pediatricMode;
		setPediatricMode(next);
		setTeethData(createDefaultTeeth(next));
		setFocusedTooth(next ? 55 : 18);
		setSelectedTeeth([]);
		setRadialMenu(null);
		showToast(
			next ? "Включен детский прикус (51–85)" : "Включен постоянный прикус (11–48)",
			"info",
			2000,
		);
	}, [pediatricMode]);

	// Quadrant and Arch Selection Helpers
	const selectQuadrant = useCallback(
		(q: 1 | 2 | 3 | 4) => {
			let teeth: number[] = [];
			if (pediatricMode) {
				if (q === 1) teeth = [55, 54, 53, 52, 51];
				else if (q === 2) teeth = [61, 62, 63, 64, 65];
				else if (q === 3) teeth = [71, 72, 73, 74, 75];
				else if (q === 4) teeth = [85, 84, 83, 82, 81];
			} else {
				if (q === 1) teeth = [18, 17, 16, 15, 14, 13, 12, 11];
				else if (q === 2) teeth = [21, 22, 23, 24, 25, 26, 27, 28];
				else if (q === 3) teeth = [31, 32, 33, 34, 35, 36, 37, 38];
				else if (q === 4) teeth = [48, 47, 46, 45, 44, 43, 42, 41];
			}
			setSelectedTeeth(teeth);
			if (teeth.length > 0 && teeth[0] !== undefined) {
				setFocusedTooth(teeth[0]);
			}
			showToast(`Выбран квадрант Q${q} (${teeth.length} зубов)`, "info", 1500);
		},
		[pediatricMode],
	);

	const selectArch = useCallback(
		(arch: "upper" | "lower" | "all" | "clear") => {
			if (arch === "clear") {
				setSelectedTeeth([]);
				return;
			}
			let teeth: number[] = [];
			if (arch === "upper") {
				teeth = pediatricMode ? PEDIATRIC_UPPER_TEETH : ADULT_UPPER_TEETH;
				showToast("Выбрана верхняя челюсть", "info", 1500);
			} else if (arch === "lower") {
				teeth = pediatricMode ? PEDIATRIC_LOWER_TEETH : ADULT_LOWER_TEETH;
				showToast("Выбрана нижняя челюсть", "info", 1500);
			} else if (arch === "all") {
				teeth = pediatricMode ? ALL_PEDIATRIC_TEETH : ALL_ADULT_TEETH;
				showToast("Выбраны все зубы", "info", 1500);
			}
			setSelectedTeeth(teeth);
			if (teeth.length > 0 && teeth[0] !== undefined) {
				setFocusedTooth(teeth[0]);
			}
		},
		[pediatricMode],
	);

	// Quick Stamp Brush Mode State (Null = normal selection / radial menu mode)
	const [activeStamp, setActiveStamp] = useState<ToothState | null>(null);

	// Batch Action Handlers (1-Click Fast Presets)
	const handleDeleteAllWisdom = useCallback(() => {
		const wisdoms = [18, 28, 38, 48];
		updateToothState(wisdoms, "Missing");
		showToast("Зубы мудрости (18, 28, 38, 48) удалены", "success", 2000);
	}, [updateToothState, showToast]);


	const handleFullEdentulism = useCallback(() => {
		const targets = pediatricMode ? ALL_PEDIATRIC_TEETH : ALL_ADULT_TEETH;
		updateToothState(targets, "Missing");
		showToast("Полная адентия: все зубы удалены", "error", 2000);
	}, [pediatricMode, updateToothState, showToast]);

	const handleResetAllHealthy = useCallback(() => {
		const targets = pediatricMode ? ALL_PEDIATRIC_TEETH : ALL_ADULT_TEETH;
		updateToothState(targets, "Healthy");
		showToast("Все зубы восстановлены как здоровые (интактные)", "success", 2000);
	}, [pediatricMode, updateToothState, showToast]);

	// Tooth Click Handler
	const handleToothClick = useCallback(
		(num: number, rect: DOMRect, _surface?: string) => {
			setFocusedTooth(num);

			// 1. If Active Stamp Brush Mode is on -> apply stamp immediately in 1 click!
			if (activeStamp) {
				updateToothState([num], activeStamp);
				return;
			}

			// 2. If Quick Extract mode is active -> set Missing
			if (quickExtractMode) {
				updateToothState([num], "Missing");
				return;
			}

			// 3. Normal Mode -> Open Centered Radial Menu HUD
			setRadialMenu({
				toothNumber: num,
				rect: {
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height,
				},
			});
		},
		[activeStamp, quickExtractMode, updateToothState],
	);

	// Keyboard Navigation & 1-Click Fast Keys
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			// Don't intercept when typing in inputs/textareas
			const activeTag = document.activeElement?.tagName;
			if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
				return;
			}

			// Escape: close stamp mode, radial menu or clear selection
			if (e.key === "Escape") {
				if (activeStamp) {
					setActiveStamp(null);
					showToast("Режим кисти-штампа отключен", "info", 1500);
					return;
				}
				if (radialMenu) {
					setRadialMenu(null);
					return;
				}
				if (selectedTeeth.length > 0) {
					setSelectedTeeth([]);
					return;
				}
			}

			// Alt + 1..4: Quadrants
			if (e.altKey && ["1", "2", "3", "4"].includes(e.key)) {
				e.preventDefault();
				const qNum = Number.parseInt(e.key, 10) as 1 | 2 | 3 | 4;
				selectQuadrant(qNum);
				return;
			}

			// Alt + U / L / A: Arch selections
			if (e.altKey && (e.key === "u" || e.key === "г" || e.key === "U" || e.key === "Г")) {
				e.preventDefault();
				selectArch("upper");
				return;
			}
			if (e.altKey && (e.key === "l" || e.key === "д" || e.key === "L" || e.key === "Д")) {
				e.preventDefault();
				selectArch("lower");
				return;
			}
			if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === "a" || e.key === "ф" || e.key === "A" || e.key === "Ф")) {
				e.preventDefault();
				selectArch("all");
				return;
			}

			// Arrow navigation across dental arches
			const navKeys: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
				ArrowLeft: "left",
				ArrowRight: "right",
				ArrowUp: "up",
				ArrowDown: "down",
				Home: "home",
				End: "end",
			};

			if (navKeys[e.key] || e.key === "Tab") {
				let dir: "left" | "right" | "up" | "down" | "home" | "end" = "right";
				if (e.key === "Tab") {
					dir = e.shiftKey ? "left" : "right";
				} else {
					const mapped = navKeys[e.key];
					if (mapped) dir = mapped;
				}

				e.preventDefault();
				const nextTooth = getNextFocusedTooth(focusedTooth, dir, pediatricMode);
				setFocusedTooth(nextTooth);

				if (e.shiftKey && e.key !== "Tab") {
					setSelectedTeeth((prev) =>
						prev.includes(nextTooth)
							? prev.filter((n) => n !== nextTooth)
							: [...prev, nextTooth],
					);
				} else {
					setSelectedTeeth([nextTooth]);
				}

				const nextEl = document.querySelector<HTMLButtonElement>(
					`[data-tooth-id="${nextTooth}"]`,
				);
				nextEl?.focus();
				return;
			}

			// 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З)
			const fastState = getToothStateFromHotkey(e.key);
			if (fastState) {
				e.preventDefault();
				const targets = selectedTeeth.length > 0 ? selectedTeeth : [focusedTooth];
				updateToothState(targets, fastState);
				if (radialMenu) setRadialMenu(null);
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [
		focusedTooth,
		selectedTeeth,
		pediatricMode,
		radialMenu,
		activeStamp,
		updateToothState,
		selectQuadrant,
		selectArch,
		showToast,
	]);

	// Calculate DMFT / КПУ
	const kpu = useMemo(() => {
		let k = 0; // Кариес
		let p = 0; // Пломба
		let u = 0; // Удален
		for (const t of teethData) {
			if (t.state === "Caries" || t.state === "Pulpitis" || t.state === "Periodontitis") k++;
			else if (t.state === "Filled" || t.state === "Crown") p++;
			else if (t.state === "Missing") u++;
		}
		return { k, p, u, total: k + p + u };
	}, [teethData]);

	// Active tooth for radial menu
	const radialToothData = useMemo(() => {
		if (!radialMenu) return null;
		return (
			teethData.find((t) => t.toothNumber === radialMenu.toothNumber) ?? {
				toothNumber: radialMenu.toothNumber,
				state: "Healthy" as ToothState,
				surfaces: [],
			}
		);
	}, [radialMenu, teethData]);

	const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState<boolean>(false);
	const [isHotkeysHelpOpen, setIsHotkeysHelpOpen] = useState<boolean>(false);

	return (
		<div
			className="min-h-screen w-full bg-[var(--canvas,var(--paper-soft))] text-[var(--ink)] flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-200"
			data-testid="odontogram-studio-container"
		>
			{/* Top Bar Header (Clean Strict Medical Header) */}
			<header className="w-full px-4 sm:px-6 py-2.5 bg-[var(--paper-strong,var(--paper))] backdrop-blur-xl border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-xs transition-colors duration-200">
				{/* Medical Title without marketing jargon */}
				<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
					<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 dark:bg-teal-700 flex items-center justify-center text-white shrink-0 shadow-xs">
						<Sparkles size={18} />
					</div>
					<div className="min-w-0">
						<h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--odontogram-ink)] m-0 whitespace-nowrap">
							Зубная формула DENTE
						</h1>
					</div>
				</div>

				{/* Center Mode Switcher Tabs (32-36px compact height, responsive labels) */}
				<div className="flex items-center p-0.5 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] rounded-xl shadow-inner gap-1 max-w-full overflow-x-auto scrollbar-none order-last lg:order-none w-full lg:w-auto justify-start sm:justify-center shrink-0">
					<button
						type="button"
						onClick={() => setViewMode("anatomical_svg")}
						className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
							viewMode === "anatomical_svg"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md"
								: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="3D Векторная анатомическая проекция коронок и корней"
					>
						<Sparkles size={14} className="shrink-0 text-amber-400" />
						<span className="hidden sm:inline whitespace-nowrap font-bold">3D Анатомический</span>
						<span className="sm:hidden whitespace-nowrap font-bold">3D</span>
					</button>

					<button
						type="button"
						onClick={() => setViewMode("compact_clinical")}
						className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
							viewMode === "compact_clinical"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md"
								: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="Клиническая 5-поверхностная полигональная схема"
					>
						<Zap size={14} className="shrink-0 text-cyan-400" />
						<span className="hidden sm:inline whitespace-nowrap font-bold">5-Поверхностный</span>
						<span className="sm:hidden whitespace-nowrap font-bold">5-Пов.</span>
					</button>

					<button
						type="button"
						onClick={() => setViewMode("classic_gost")}
						className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
							viewMode === "classic_gost"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md"
								: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="Сетка Минздрава России ГОСТ 043/у с КПУ-индексами"
					>
						<FileText size={14} className="shrink-0 text-indigo-400" />
						<span className="hidden sm:inline whitespace-nowrap font-bold">ГОСТ 043/у</span>
						<span className="sm:hidden whitespace-nowrap font-bold">ГОСТ</span>
					</button>
				</div>

				{/* Right Quick Controls */}
				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
					<button
						type="button"
						onClick={() => setIsPresetsPanelOpen((prev) => !prev)}
						className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[36px] ${
							isPresetsPanelOpen || activeStamp
								? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 shadow-xs"
								: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)] border-[var(--odontogram-border)]"
						}`}
						title="Открыть панель быстрых пресетов, кистей и легенды"
						data-testid="toggle-presets-panel-btn"
					>
						<Layers size={14} className={isPresetsPanelOpen ? "text-indigo-600" : "text-[var(--odontogram-ink-muted)]"} />
						<span className="hidden md:inline whitespace-nowrap">Клавиши & Пресеты</span>
						<span className="md:hidden whitespace-nowrap">Пресеты</span>
						{activeStamp && (
							<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
						)}
					</button>

					<button
						type="button"
						onClick={toggleTheme}
						className="p-2 rounded-xl bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] transition-all shadow-xs cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
						title={currentTheme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
						aria-label="Сменить тему"
					>
						{currentTheme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
					</button>

					<button
						type="button"
						onClick={resetAllTeeth}
						className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--odontogram-paper)] hover:bg-red-500/10 text-[var(--odontogram-ink-muted)] hover:text-red-500 border border-[var(--odontogram-border)] hover:border-red-500/40 transition-all text-xs font-bold cursor-pointer min-h-[36px]"
						title="Сбросить все зубы к исходному здоровому состоянию"
					>
						<RotateCcw size={14} />
						<span className="hidden sm:inline">Сброс</span>
					</button>

					<button
						type="button"
						onClick={() => setIsInvoiceOpen(!isInvoiceOpen)}
						className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[36px] ${
							isInvoiceOpen
								? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/20"
								: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)] border-[var(--odontogram-border)]"
						}`}
						title="Открыть / скрыть живую смету лечения (Приказ 804н)"
					>
						<Coins size={14} className="text-emerald-500" />
						<span className="hidden sm:inline whitespace-nowrap">Живая смета</span>
						<span className="sm:hidden whitespace-nowrap">Смета</span>
					</button>
				</div>
			</header>

			{/* Collapsible Accordion Drawer: Presets & Rapid Stamps & Legend */}
			{isPresetsPanelOpen && (
				<div className="w-full px-4 sm:px-6 py-3 bg-[var(--odontogram-paper)] border-b border-[var(--odontogram-border-subtle)] flex flex-col gap-2.5 text-xs transition-all animate-in slide-in-from-top-2 duration-150">
					{/* 1. Presets Row */}
					<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full flex-wrap">
						<span className="text-[var(--odontogram-ink-muted)] font-bold mr-1 whitespace-nowrap">Пресеты:</span>

						<button
							type="button"
							onClick={handleDeleteAllWisdom}
							className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold transition-all cursor-pointer min-h-[32px] shrink-0"
							title="Удалить все 4 зуба мудрости (18, 28, 38, 48) в 1 клик"
						>
							<Trash2 size={13} className="text-rose-500 shrink-0" />
							<span className="whitespace-nowrap">Удалить 8-ки</span>
						</button>

						<button
							type="button"
							onClick={handleFullEdentulism}
							className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-300 border border-red-500/40 font-semibold transition-all cursor-pointer min-h-[32px] shrink-0"
							title="Полная адентия: все зубы отсутствуют (под съёмный протез / All-on-4)"
						>
							<span className="whitespace-nowrap">Адентия (Все 0)</span>
						</button>

						<button
							type="button"
							onClick={handleResetAllHealthy}
							className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold transition-all cursor-pointer min-h-[32px] shrink-0"
							title="Восстановить все зубы как здоровые (интактные)"
						>
							<Sparkles size={13} className="text-emerald-500 shrink-0" />
							<span className="whitespace-nowrap">Все здоровы</span>
						</button>

						<div className="h-4 w-[1px] bg-[var(--odontogram-border)] mx-1 shrink-0" />

						<button
							type="button"
							onClick={() => setShowWisdom(!showWisdom)}
							className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer min-h-[32px] shrink-0 ${
								showWisdom
									? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] border-[var(--odontogram-border)] hover:text-[var(--odontogram-ink)]"
							}`}
							title="Показать / скрыть зубы мудрости (18, 28, 38, 48)"
						>
							{showWisdom ? <Eye size={13} className="shrink-0" /> : <EyeOff size={13} className="shrink-0" />}
							<span className="whitespace-nowrap">8-ки</span>
						</button>

						<button
							type="button"
							onClick={() => setShowCanals(!showCanals)}
							className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer min-h-[32px] shrink-0 ${
								showCanals
									? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] border-[var(--odontogram-border)] hover:text-[var(--odontogram-ink)]"
							}`}
							title="Просмотр эндодонтических корневых каналов и пульпарной камеры"
						>
							<Activity size={13} className="shrink-0" />
							<span className="whitespace-nowrap">Каналы</span>
						</button>

						<button
							type="button"
							onClick={handleTogglePediatric}
							className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer min-h-[32px] shrink-0 ${
								pediatricMode
									? "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/40 font-bold"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] border-[var(--odontogram-border)] hover:text-[var(--odontogram-ink)]"
							}`}
							title="Переключить на детский молочный прикус (51–85)"
						>
							<User size={13} className="shrink-0" />
							<span className="whitespace-nowrap">Детский</span>
						</button>

						<button
							type="button"
							onClick={() => setIsVoiceOpen(true)}
							className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 text-violet-700 dark:text-violet-300 border border-violet-500/40 font-semibold transition-all cursor-pointer min-h-[32px] shrink-0"
							title="Голосовая диктовка зубной формулы по стандартам МЗ РФ"
						>
							<Mic size={13} className="text-violet-500 shrink-0" />
							<span className="whitespace-nowrap">Диктовка</span>
						</button>
					</div>

					{/* 2. Rapid Stamps */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[var(--odontogram-ink-muted)] font-bold mr-1 whitespace-nowrap">Кисти быстрых статусов:</span>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Filled" ? null : "Filled")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Filled"
									? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-emerald-500/50"
							}`}
							title="Кисть: Пломба — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
							<span>Пломба</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Caries" ? null : "Caries")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Caries"
									? "bg-red-500 text-white ring-2 ring-red-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-red-500/50"
							}`}
							title="Кисть: Кариес — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
							<span>Кариес</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Missing" ? null : "Missing")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Missing"
									? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-rose-500/50"
							}`}
							title="Кисть: Удален — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-sm" />
							<span>Удален</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Crown" ? null : "Crown")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Crown"
									? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-indigo-500/50"
							}`}
							title="Кисть: Коронка — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm" />
							<span>Коронка</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Planned_Implant" ? null : "Planned_Implant")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Planned_Implant"
									? "bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-cyan-500/50"
							}`}
							title="Кисть: Имплантат — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm" />
							<span>Имплантат</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Pulpitis" ? null : "Pulpitis")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Pulpitis"
									? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-rose-500/50"
							}`}
							title="Кисть: Пульпит — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-sm" />
							<span>Пульпит</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Periodontitis" ? null : "Periodontitis")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Periodontitis"
									? "bg-orange-500 text-white ring-2 ring-orange-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-orange-500/50"
							}`}
							title="Кисть: Периодонтит (Е) — кликайте по зубам для быстрой установки"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" />
							<span>Периодонтит (Е)</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveStamp(activeStamp === "Healthy" ? null : "Healthy")}
							className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[28px] ${
								activeStamp === "Healthy"
									? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md"
									: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-emerald-500/50"
							}`}
							title="Кисть: Здоров (З) — кликайте по зубам для возврата к здоровому"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm" />
							<span>Здоров (З)</span>
						</button>

						{activeStamp && (
							<button
								type="button"
								onClick={() => setActiveStamp(null)}
								className="px-2.5 py-0.5 rounded-full bg-rose-600/15 hover:bg-rose-600/25 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/40 text-[11px] cursor-pointer min-h-[28px] whitespace-nowrap"
								title="Снять активную кисть и вернуться к Радиальному меню (Esc)"
							>
								✕ Снять кисть (Esc)
							</button>
						)}
					</div>

					{/* 3. Clinical Legend */}
					<div className="flex items-center gap-3 flex-wrap pt-1 border-t border-[var(--odontogram-border-subtle)] text-[11px] text-[var(--odontogram-ink-muted)]">
						<span className="font-bold text-[var(--odontogram-ink)]">Легенда:</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Кариес</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Пульпит</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Периодонтит</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)]" /> Пломба</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--brand-500,#3b82f6)]" /> Коронка</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Имплант</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 opacity-50" /> Отсутствует</span>
						<span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Здоров</span>
					</div>
				</div>
			)}

			{/* Active Stamp Banner (Compact Slim Status Ribbon) */}
			{activeStamp && !isPresetsPanelOpen && (
				<div className="w-full px-4 sm:px-6 py-1.5 bg-gradient-to-r from-amber-500/15 via-teal-500/15 to-emerald-500/15 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs transition-all">
					<div className="flex items-center gap-2">
						<Paintbrush size={13} className="text-amber-500 shrink-0" />
						<span className="text-[var(--odontogram-ink)] font-bold">
							Режим кисти: <strong className="text-amber-600 dark:text-amber-300 uppercase">{TOOTH_STATE_LABELS[activeStamp]}</strong>. Клик по зубу красит мгновенно.
						</span>
					</div>
					<button
						type="button"
						onClick={() => setActiveStamp(null)}
						className="px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shrink-0 shadow-xs"
					>
						Снять (Esc)
					</button>
				</div>
			)}

			{/* Main Central Stage — Dominant Workspace Scale (75%+ Viewport Area) */}
			<main className="flex-1 w-full max-w-full p-2 sm:p-4 flex flex-col lg:flex-row gap-3 relative items-stretch">
				{/* Dental Arch Stage Canvas */}
				<div className="flex-1 w-full min-w-0 bg-[var(--odontogram-paper)] border border-[var(--odontogram-border)] rounded-2xl p-2 sm:p-6 shadow-xs flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-200 min-h-[calc(100vh-130px)]">
					{/* Glow accent */}
					<div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
					<div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

					{/* 1. 3D Anatomical Mode */}
					{viewMode === "anatomical_svg" && (
						<div className="w-full flex flex-col items-center justify-center flex-1">
							<AnatomicalSvgOdontogram
								teethData={teethData}
								pediatricMode={pediatricMode}
								showWisdomTeeth={showWisdom}
								showPulpAndCanals={showCanals}
								selectedTeeth={selectedTeeth}
								activeStamp={activeStamp}
								onToothClick={handleToothClick}
								onQuickStateChange={updateToothState}
							/>
						</div>
					)}

					{/* 2. Compact Clinical 5-surface Mode */}
					{viewMode === "compact_clinical" && (
						<div className="w-full flex flex-col items-center justify-center flex-1">
							<ToothChart
								teethData={teethData}
								pediatricMode={pediatricMode}
								selectedTeeth={selectedTeeth}
								activeStamp={activeStamp}
								onToothClick={handleToothClick}
								onQuickStateChange={updateToothState}
							/>
						</div>
					)}

					{/* 3. Classic GOST 043/u Mode */}
					{viewMode === "classic_gost" && (
						<div className="w-full flex flex-col items-center justify-center flex-1">
							<ClassicGostOdontogram
								teethData={teethData}
								pediatricMode={pediatricMode}
								selectedTeeth={selectedTeeth}
								onToothClick={handleToothClick}
								onQuickStateChange={updateToothState}
							/>
						</div>
					)}
				</div>

				{/* Sliding Live Invoice Drawer */}
				{isInvoiceOpen && (
					<>
						{/* Mobile Backdrop */}
						<div
							className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
							onClick={() => setIsInvoiceOpen(false)}
						/>
						<div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm lg:static lg:w-96 lg:shrink-0 lg:sticky lg:top-16 lg:z-30 animate-in slide-in-from-right duration-300 p-3 lg:p-0">
							<OdontogramLiveInvoice
								teethData={teethData}
								isOpen={isInvoiceOpen}
								onClose={() => setIsInvoiceOpen(false)}
							/>
						</div>
					</>
				)}
			</main>

			{/* Radial Menu Portal */}
			{radialMenu && radialToothData && (
				<RadialToothMenu
					toothNumber={radialMenu.toothNumber}
					anchorRect={radialMenu.rect}
					currentState={radialToothData.state}
					onSelectState={(state) => {
						updateToothState([radialMenu.toothNumber], state);
						setRadialMenu(null);
					}}
					onAddToInvoice={() => {
						setIsInvoiceOpen(true);
					}}
					onOpenEndo={() => {
						showToast(`Эндодонтия зуба ${radialMenu.toothNumber}`, "info", 2000);
					}}
					onClose={() => setRadialMenu(null)}
				/>
			)}

			{/* Voice Dictation Overlay */}
			<VoiceDictationOverlay
				isOpen={isVoiceOpen}
				onClose={() => setIsVoiceOpen(false)}
				onDictationSubmit={(text) => {
					setIsVoiceOpen(false);
					showToast(`Распознано: ${text}`, "info", 3000);
				}}
			/>

			{/* Footer Help & Compact Hotkeys Trigger */}
			<footer className="w-full px-4 sm:px-6 py-2 bg-[var(--paper-strong,var(--paper))] border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--odontogram-ink-muted)] transition-colors duration-200">
				{/* Compact Hotkeys Trigger with Popup */}
				<div className="relative group/hotkeys">
					<button
						type="button"
						onClick={() => setIsHotkeysHelpOpen((prev) => !prev)}
						className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] text-xs font-bold transition-all cursor-pointer select-none"
						title="Справка по горячим клавишам"
						data-testid="compact-hotkeys-help-btn"
					>
						<span>⌨️</span>
						<span>Горячие клавиши</span>
					</button>

					{/* Popover on hover/click */}
					{(isHotkeysHelpOpen || true) && (
						<div className="absolute bottom-full left-0 mb-2 hidden group-hover/hotkeys:flex group-focus-within/hotkeys:flex flex-col gap-2 p-3 rounded-xl bg-[var(--odontogram-paper)] border border-[var(--odontogram-border-strong)] shadow-2xl backdrop-blur-xl z-50 text-xs w-80 pointer-events-auto">
							<div className="font-bold text-[var(--odontogram-ink)] border-b border-[var(--odontogram-border-subtle)] pb-1.5 flex items-center justify-between">
								<span>Горячие клавиши формулы</span>
								<span className="text-[10px] text-[var(--odontogram-ink-muted)] font-mono">1-Key Fast Mode</span>
							</div>
							<div className="grid grid-cols-2 gap-1.5 text-[11px]">
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold">←↑→↓</kbd> Навигация</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold">Tab</kbd> След. зуб</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-amber-500">К</kbd> Кариес</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-teal-500">П</kbd> Пломба</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-rose-500">Ф</kbd> Пульпит</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-orange-500">Е</kbd> Периодонтит</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-blue-500">Ц</kbd> Коронка</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-cyan-500">И</kbd> Имплант</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-rose-600">0</kbd> Удален</div>
								<div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold text-emerald-500">З</kbd> Здоров</div>
								<div className="flex items-center gap-1 col-span-2"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold">Alt+1..4</kbd> Квадранты Q1..Q4</div>
								<div className="flex items-center gap-1 col-span-2"><kbd className="px-1.5 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] font-mono font-bold">Esc</kbd> Снять кисть / меню</div>
							</div>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 text-[var(--odontogram-ink-muted)]">
					<span>Стандарты МЗ РФ · ISO 3950 FDI · Форма 043/у</span>
				</div>
			</footer>
		</div>
	);
};
