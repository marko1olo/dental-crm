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
		(toothNumbers: number[], state: ToothState, surfaces?: string[]) => {
			if (toothNumbers.length === 0) return;
			setTeethData((prev) => {
				const set = new Set(toothNumbers);
				return prev.map((t) => {
					if (set.has(t.toothNumber)) {
						return {
							...t,
							state,
							surfaces: surfaces ?? (state === "Healthy" ? [] : (t.surfaces ?? [])),
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

	const handleDeleteMaxilla = useCallback(() => {
		const targets = pediatricMode ? PEDIATRIC_UPPER_TEETH : ADULT_UPPER_TEETH;
		updateToothState(targets, "Missing");
		showToast("Все зубы верхней челюсти удалены", "warning", 2000);
	}, [pediatricMode, updateToothState, showToast]);

	const handleDeleteMandible = useCallback(() => {
		const targets = pediatricMode ? PEDIATRIC_LOWER_TEETH : ADULT_LOWER_TEETH;
		updateToothState(targets, "Missing");
		showToast("Все зубы нижней челюсти удалены", "warning", 2000);
	}, [pediatricMode, updateToothState, showToast]);

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

	return (
		<div
			className="min-h-screen w-full bg-[var(--canvas,var(--paper-soft))] text-[var(--ink)] flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-200"
			data-testid="odontogram-studio-container"
		>
			{/* Top Bar Header */}
			<header className="w-full px-4 sm:px-6 py-3.5 bg-[var(--paper-strong,var(--paper))] backdrop-blur-xl border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-xs transition-colors duration-200">
				{/* Logo & Title */}
				<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
					<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
						<Sparkles className="text-white" size={20} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h1 className="text-base sm:text-lg font-black tracking-tight text-[var(--odontogram-ink)] m-0 truncate">
								DENTE <span className="text-cyan-500 font-light">ODONTOGRAM PRO</span>
							</h1>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0">
								Studio v2.7
							</span>
						</div>
						<p className="text-[11px] sm:text-xs text-[var(--odontogram-ink-muted)] m-0 hidden sm:block truncate">
							Интерактивная векторная зубная формула · 1-Click Fast Keys · Стрелочная навигация · Живая смета (804н)
						</p>
					</div>
				</div>

				{/* Center Mode Switcher Tabs */}
				<div className="flex items-center p-1 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] rounded-xl shadow-inner gap-1 max-w-full overflow-x-auto scrollbar-none order-last lg:order-none w-full lg:w-auto justify-start sm:justify-center">
					<button
						type="button"
						onClick={() => setViewMode("anatomical_svg")}
						className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] ${
							viewMode === "anatomical_svg"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md"
								: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="3D Векторная анатомическая проекция коронок и корней"
					>
						<Sparkles size={14} className="shrink-0" />
						<span className="hidden sm:inline">3D Анатомический</span>
						<span className="sm:hidden">3D Схема</span>
					</button>

					<button
						type="button"
						onClick={() => setViewMode("compact_clinical")}
						className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] ${
							viewMode === "compact_clinical"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md"
								: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="Клиническая 5-поверхностная полигональная схема"
					>
						<Zap size={14} className="shrink-0" />
						<span className="hidden sm:inline">5-Поверхностный</span>
						<span className="sm:hidden">5-Поверхн.</span>
					</button>

					<button
						type="button"
						onClick={() => setViewMode("classic_gost")}
						className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] ${
							viewMode === "classic_gost"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md"
								: "bg-transparent text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="Сетка Минздрава России ГОСТ 043/у с КПУ-индексами"
					>
						<FileText size={14} className="shrink-0" />
						<span>ГОСТ 043/у</span>
					</button>
				</div>

				{/* Right Quick Controls */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={toggleTheme}
						className="p-2.5 rounded-xl bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] transition-all shadow-xs cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
						title={currentTheme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
						aria-label="Сменить тему"
					>
						{currentTheme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
					</button>

					<button
						type="button"
						onClick={resetAllTeeth}
						className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--odontogram-paper)] hover:bg-red-500/10 text-[var(--odontogram-ink-muted)] hover:text-red-500 border border-[var(--odontogram-border)] hover:border-red-500/40 transition-all text-xs font-bold cursor-pointer min-h-[44px]"
						title="Сбросить все зубы к исходному здоровому состоянию"
					>
						<RotateCcw size={15} />
						<span className="hidden sm:inline">Сброс</span>
					</button>

					<button
						type="button"
						onClick={() => setIsInvoiceOpen(!isInvoiceOpen)}
						className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer min-h-[44px] ${
							isInvoiceOpen
								? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/20"
								: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] hover:bg-[var(--odontogram-surface-hover)] border-[var(--odontogram-border)]"
						}`}
						title="Открыть / скрыть живую смету лечения (Приказ 804н)"
					>
						<Coins size={16} className="text-emerald-500" />
						<span>Живая смета</span>
					</button>
				</div>
			</header>

			{/* Fast Action Sub-Toolbar 1: Layers & Batch Presets */}
			<div className="w-full px-4 sm:px-6 py-2 bg-[var(--odontogram-paper)] border-b border-[var(--odontogram-border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs transition-colors duration-200">
				{/* Layer Toggles & 1-Click Fast Presets */}
				<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full shrink-0">
					<span className="text-[var(--odontogram-ink-muted)] font-medium mr-0.5 hidden sm:inline whitespace-nowrap">Пресеты:</span>

					<button
						type="button"
						onClick={handleDeleteAllWisdom}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold transition-all cursor-pointer min-h-[34px] shrink-0"
						title="Удалить все 4 зуба мудрости (18, 28, 38, 48) в 1 клик"
					>
						<Trash2 size={13} className="text-rose-500" />
						<span className="whitespace-nowrap">Удалить 8-ки</span>
					</button>

					<button
						type="button"
						onClick={handleDeleteMaxilla}
						className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--odontogram-surface)] hover:bg-rose-500/15 text-[var(--odontogram-ink)] hover:text-rose-600 border border-[var(--odontogram-border)] font-semibold transition-all cursor-pointer min-h-[34px] shrink-0"
						title="Удалить все зубы верхней челюсти (18–28)"
					>
						<span className="whitespace-nowrap">В/Ч (0)</span>
					</button>

					<button
						type="button"
						onClick={handleDeleteMandible}
						className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--odontogram-surface)] hover:bg-rose-500/15 text-[var(--odontogram-ink)] hover:text-rose-600 border border-[var(--odontogram-border)] font-semibold transition-all cursor-pointer min-h-[34px] shrink-0"
						title="Удалить все зубы нижней челюсти (48–38)"
					>
						<span className="whitespace-nowrap">Н/Ч (0)</span>
					</button>

					<button
						type="button"
						onClick={handleFullEdentulism}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-300 border border-red-500/40 font-semibold transition-all cursor-pointer min-h-[34px] shrink-0"
						title="Полная адентия: все зубы отсутствуют (под съёмный протез / All-on-4)"
					>
						<span className="whitespace-nowrap">Адентия (Все 0)</span>
					</button>

					<button
						type="button"
						onClick={handleResetAllHealthy}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold transition-all cursor-pointer min-h-[34px] shrink-0"
						title="Восстановить все зубы как здоровые (интактные)"
					>
						<Sparkles size={13} className="text-emerald-500" />
						<span className="whitespace-nowrap">Все здоровы</span>
					</button>

					<div className="h-4 w-[1px] bg-[var(--odontogram-border)] mx-1 shrink-0" />

					<button
						type="button"
						onClick={() => setShowWisdom(!showWisdom)}
						className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer min-h-[34px] shrink-0 ${
							showWisdom
								? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] border-[var(--odontogram-border)] hover:text-[var(--odontogram-ink)]"
						}`}
						title="Показать / скрыть зубы мудрости (18, 28, 38, 48)"
					>
						{showWisdom ? <Eye size={13} /> : <EyeOff size={13} />}
						<span className="whitespace-nowrap">8-ки</span>
					</button>

					<button
						type="button"
						onClick={() => setShowCanals(!showCanals)}
						className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer min-h-[34px] shrink-0 ${
							showCanals
								? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] border-[var(--odontogram-border)] hover:text-[var(--odontogram-ink)]"
						}`}
						title="Просмотр эндодонтических корневых каналов и пульпарной камеры"
					>
						<Activity size={13} />
						<span className="whitespace-nowrap">Каналы</span>
					</button>

					<button
						type="button"
						onClick={handleTogglePediatric}
						className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer min-h-[34px] shrink-0 ${
							pediatricMode
								? "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/40 font-bold"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] border-[var(--odontogram-border)] hover:text-[var(--odontogram-ink)]"
						}`}
						title="Переключить на детский молочный прикус (51–85)"
					>
						<User size={13} />
						<span className="whitespace-nowrap">Детский</span>
					</button>

					<button
						type="button"
						onClick={() => setIsVoiceOpen(true)}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 text-violet-700 dark:text-violet-300 border border-violet-500/40 font-semibold transition-all cursor-pointer min-h-[34px] shrink-0"
						title="Голосовая диктовка зубной формулы по стандартам МЗ РФ"
					>
						<Mic size={13} className="text-violet-500" />
						<span className="whitespace-nowrap">Диктовка</span>
					</button>
				</div>

				{/* Quadrant Quick Selection & Live DMFT / КПУ Counter */}
				<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full shrink-0">
					<span className="text-[var(--odontogram-ink-muted)] font-medium mr-0.5 hidden sm:inline whitespace-nowrap">
						Выбор:
					</span>

					<button
						type="button"
						onClick={() => selectQuadrant(1)}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать 1-й квадрант (18–11 / 55–51, Alt+1)"
					>
						Q1
					</button>
					<button
						type="button"
						onClick={() => selectQuadrant(2)}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать 2-й квадрант (21–28 / 61–65, Alt+2)"
					>
						Q2
					</button>
					<button
						type="button"
						onClick={() => selectQuadrant(3)}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать 3-й квадрант (31–38 / 71–75, Alt+3)"
					>
						Q3
					</button>
					<button
						type="button"
						onClick={() => selectQuadrant(4)}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать 4-й квадрант (48–41 / 85–81, Alt+4)"
					>
						Q4
					</button>

					<button
						type="button"
						onClick={() => selectArch("upper")}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-medium text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать верхнюю челюсть (Alt+U)"
					>
						В/ч
					</button>
					<button
						type="button"
						onClick={() => selectArch("lower")}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-medium text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать нижнюю челюсть (Alt+L)"
					>
						Н/ч
					</button>
					<button
						type="button"
						onClick={() => selectArch("all")}
						className="px-2 py-1 rounded-md bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-medium text-[11px] cursor-pointer min-h-[30px]"
						title="Выбрать все зубы (Ctrl+A)"
					>
						Все
					</button>

					{selectedTeeth.length > 0 && (
						<button
							type="button"
							onClick={() => selectArch("clear")}
							className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[11px] cursor-pointer min-h-[30px]"
							title="Снять выделение (Escape)"
						>
							Сброс ({selectedTeeth.length})
						</button>
					)}
				</div>

				{/* 2. Rapid Stamps (Кисти быстрых состояний) */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={() => setActiveStamp(activeStamp === "Filled" ? null : "Filled")}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer min-h-[34px] ${
							activeStamp === "Filled"
								? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-md scale-105"
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
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer min-h-[34px] ${
							activeStamp === "Caries"
								? "bg-red-500 text-white ring-2 ring-red-400 shadow-md scale-105"
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
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer min-h-[34px] ${
							activeStamp === "Missing"
								? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-md scale-105"
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
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer min-h-[34px] ${
							activeStamp === "Crown"
								? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md scale-105"
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
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer min-h-[34px] ${
							activeStamp === "Planned_Implant"
								? "bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 shadow-md scale-105"
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
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer min-h-[34px] ${
							activeStamp === "Pulpitis"
								? "bg-purple-600 text-white ring-2 ring-purple-400 shadow-md scale-105"
								: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] hover:border-purple-500/50"
						}`}
						title="Кисть: Пульпит — кликайте по зубам для быстрой установки"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-sm" />
						<span>Пульпит</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveStamp(activeStamp === "Periodontitis" ? null : "Periodontitis")}
						className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[30px] ${
							activeStamp === "Periodontitis"
								? "bg-orange-500 text-white ring-2 ring-orange-400 shadow-md scale-105"
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
						className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer min-h-[30px] ${
							activeStamp === "Healthy"
								? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md scale-105"
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
							className="px-2.5 py-1 rounded-full bg-rose-600/15 hover:bg-rose-600/25 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/40 text-[11px] cursor-pointer min-h-[30px] whitespace-nowrap"
							title="Снять активную кисть и вернуться к Радиальному меню (Esc)"
						>
							✕ Снять кисть (Esc)
						</button>
					)}
				</div>

				<div className="text-[11px] text-[var(--odontogram-ink-muted)] hidden md:block whitespace-nowrap">
					{activeStamp ? (
						<span className="text-amber-500 font-bold">● Режим кисти: 1 клик = 1 зуб</span>
					) : (
						<span>● Обычный режим: клик открывает радиальное меню</span>
					)}
				</div>
			</div>

			{/* Active Stamp Banner */}
			{activeStamp && (
				<div className="w-full px-4 sm:px-6 py-2 bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-emerald-500/15 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs transition-all animate-pulse">
					<div className="flex items-center gap-2">
						<Paintbrush size={15} className="text-amber-500 shrink-0" />
						<span className="text-[var(--odontogram-ink)]">
							Активен режим штампа: <strong className="text-amber-600 dark:text-amber-300 uppercase font-black">{TOOTH_STATE_LABELS[activeStamp]}</strong>. Кликайте прямо по зубам в формуле для мгновенного окрашивания.
						</span>
					</div>
					<button
						type="button"
						onClick={() => setActiveStamp(null)}
						className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shrink-0 shadow-xs"
					>
						Снять кисть (Esc)
					</button>
				</div>
			)}

			{/* Main Central Stage */}
			<main className="flex-1 w-full max-w-[1600px] mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-4 relative items-start">
				{/* Dental Arch Stage Canvas */}
				<div className="flex-1 w-full min-w-0 bg-[var(--odontogram-paper)] border border-[var(--odontogram-border)] rounded-2xl p-2 sm:p-4 shadow-xs flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-200">
					{/* Glow accent */}
					<div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
					<div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

					{/* 1. 3D Anatomical Mode */}
					{viewMode === "anatomical_svg" && (
						<div className="w-full flex flex-col items-center">
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
						<div className="w-full flex flex-col items-center">
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
						<div className="w-full">
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

				{/* Sliding Live Invoice Drawer (Desktop Sticky, Mobile Slide-over Overlay) */}
				{isInvoiceOpen && (
					<>
						{/* Mobile Backdrop */}
						<div
							className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
							onClick={() => setIsInvoiceOpen(false)}
						/>
						<div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm lg:static lg:w-96 lg:shrink-0 lg:sticky lg:top-24 lg:z-30 animate-in slide-in-from-right duration-300 p-3 lg:p-0">
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

			{/* Footer Help & Standards Bar */}
			<footer className="w-full px-4 sm:px-6 py-3 bg-[var(--odontogram-paper)] border-t border-[var(--odontogram-border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--odontogram-ink-muted)] transition-colors duration-200">
				<div className="hidden md:flex items-center gap-2.5 flex-wrap">
					<span className="font-semibold text-[var(--odontogram-ink)]">Горячие клавиши:</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono">
						←↑→↓ / Tab
					</span>
					<span>Навигация</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						К
					</span>
					<span>Кариес</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						П
					</span>
					<span>Пломба</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						Ф
					</span>
					<span>Пульпит</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						Е
					</span>
					<span>Периодонтит</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						Ц
					</span>
					<span>Коронка</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						И
					</span>
					<span>Имплант</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						0
					</span>
					<span>Удален</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						З
					</span>
					<span>Здоров</span>
					<span className="px-2 py-0.5 rounded bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] text-[var(--odontogram-ink)] font-mono font-bold">
						Alt+1..4
					</span>
					<span>Квадранты</span>
				</div>
				<div className="flex items-center gap-2 text-[var(--odontogram-ink-muted)]">
					<span>Стандарты МЗ РФ · ISO 3950 FDI · СанПиН 2.6.1.1192-03</span>
				</div>
			</footer>
		</div>
	);
};
