import { isValidFdiToothNumber } from "@dental/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	ArrowLeft,
	Award,
	Baby,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Heart,
	Layers,
	Loader2,
	Phone,
	Plus,
	Printer,
	Shield,
	Smile,
	Sparkles,
	Star,
	User,
	Users,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	SurfaceSelector,
	TOOTH_STATE_LABELS,
	ToothChart,
	type ToothData,
	type ToothState,
} from "../odontogram/ToothChart";
import "../odontogram/odontogram.css";

const MILK_TOOTH_SHORT_CODES: Record<ToothState, { code: string; dotColor: string }> = {
	Healthy: { code: "Зд", dotColor: "#10b981" },
	Caries: { code: "К", dotColor: "#ef4444" },
	Pulpitis: { code: "П", dotColor: "#a855f7" },
	Periodontitis: { code: "Пер", dotColor: "#f97316" },
	Filled: { code: "Пл", dotColor: "#10b981" },
	Crown: { code: "Кр", dotColor: "#3b82f6" },
	Implant: { code: "Имп", dotColor: "#f59e0b" },
	Planned_Implant: { code: "ПлИ", dotColor: "#6366f1" },
	Missing: { code: "Отс", dotColor: "#64748b" },
};

const PEDIATRIC_STATUS_OPTIONS: ReadonlyArray<{
	state: ToothState;
	label: string;
	shortCode: string;
	colorClass: string;
	borderClass: string;
	badgeClass: string;
}> = [
	{
		state: "Caries",
		label: "Кариес молочного зуба",
		shortCode: "К",
		colorClass: "bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/25",
		borderClass: "border-red-500/40",
		badgeClass: "bg-red-600 text-white",
	},
	{
		state: "Pulpitis",
		label: "Пульпотомия / Пульпит",
		shortCode: "П",
		colorClass: "bg-purple-500/15 text-purple-800 dark:text-purple-300 hover:bg-purple-500/25",
		borderClass: "border-purple-500/40",
		badgeClass: "bg-purple-600 text-white",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит молочного зуба",
		shortCode: "Пер",
		colorClass: "bg-orange-500/15 text-orange-800 dark:text-orange-300 hover:bg-orange-500/25",
		borderClass: "border-orange-500/40",
		badgeClass: "bg-orange-600 text-white",
	},
	{
		state: "Filled",
		label: "Пломба (Стеклоиономер)",
		shortCode: "Пл",
		colorClass: "bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/25",
		borderClass: "border-teal-500/40",
		badgeClass: "bg-teal-600 text-white",
	},
	{
		state: "Crown",
		label: "Коронка (Стальная)",
		shortCode: "Кр",
		colorClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25",
		borderClass: "border-blue-500/40",
		badgeClass: "bg-blue-600 text-white",
	},
	{
		state: "Missing",
		label: "Физиологическая смена (Выпал)",
		shortCode: "Отс",
		colorClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 hover:bg-slate-500/25",
		borderClass: "border-slate-500/40",
		badgeClass: "bg-slate-600 text-white",
	},
	{
		state: "Healthy",
		label: "Здоров",
		shortCode: "Зд",
		colorClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25",
		borderClass: "border-emerald-500/40",
		badgeClass: "bg-emerald-600 text-white",
	},
];

const PEDIATRIC_TEMPLATES = [
	{
		id: "anesthesia",
		title: "Анестезия Артикаин 1:100 000 детская",
		category: "anesthesia",
		price: "1 200 ₽",
		icon: "💉",
	},
	{
		id: "cofferdam",
		title: "Изоляция детским коффердамом (K sanctuary)",
		category: "isolation",
		price: "900 ₽",
		icon: "🛡️",
	},
	{
		id: "fluoride",
		title: "Глубокое фторирование (Эмаль-герметизирующий ликвид)",
		category: "prevention",
		price: "1 800 ₽",
		icon: "🛡️",
	},
	{
		id: "fissure_seal",
		title: "Герметизация фиссур неинвазивная (Clinpro)",
		category: "prevention",
		price: "2 200 ₽",
		icon: "✨",
	},
	{
		id: "pulpotomy",
		title: "Витальная пульпотомия молочного зуба (Biodentine)",
		category: "therapy",
		price: "4 500 ₽",
		icon: "💉",
	},
	{
		id: "steel_crown",
		title: "Фиксация стандартной металлической коронки (3M ESPE)",
		category: "ortho_crown",
		price: "5 500 ₽",
		icon: "👑",
	},
	{
		id: "adapt_visit",
		title: "Адаптационный психологический визит (Игровая форма)",
		category: "psychology",
		price: "1 500 ₽",
		icon: "🎈",
	},
];

export function PediatricPerspectiveView() {
	const { dashboard, auth } = useAppLogicContext();
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const activePatient = useMemo(() => {
		if (!dashboard?.patients || dashboard.patients.length === 0) return null;
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		return dashboard.patients[0] ?? null;
	}, [dashboard?.patients, selectedPatientId]);

	// View mode: SVG anatomical arc vs 56px touch tiles
	const [viewMode, setViewMode] = useState<"svg" | "tiles">("svg");

	const [selectedTooth, setSelectedTooth] = useState<number>(54);
	const [toothStates, setToothStates] = useState<Record<number, ToothState>>({});
	const [toothSurfaces, setToothSurfaces] = useState<Record<number, string[]>>({});
	const [isLoadingTeeth, setIsLoadingTeeth] = useState(false);
	const [isSavingTooth, setIsSavingTooth] = useState(false);
	const [appliedTemplates, setAppliedTemplates] = useState<string[]>([]);
	const [isMixedDentition, setIsMixedDentition] = useState(false);
	const [isFairyModalOpen, setIsFairyModalOpen] = useState(false);

	// Milk Teeth FDI
	const upperMilkTeeth = useMemo(
		() =>
			isMixedDentition
				? [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26]
				: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
		[isMixedDentition],
	);

	const lowerMilkTeeth = useMemo(
		() =>
			isMixedDentition
				? [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36]
				: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
		[isMixedDentition],
	);

	// Format teethData for ToothChart SVG engine
	const teethData: ToothData[] = useMemo(() => {
		const result: ToothData[] = [];
		const allTeeth = [...upperMilkTeeth, ...lowerMilkTeeth];
		for (const tNum of allTeeth) {
			const state = toothStates[tNum] || "Healthy";
			const surfaces = toothSurfaces[tNum];
			result.push({
				toothNumber: tNum,
				state,
				...(surfaces && surfaces.length > 0 ? { surfaces } : {}),
			});
		}
		return result;
	}, [toothStates, toothSurfaces, upperMilkTeeth, lowerMilkTeeth]);

	const fetchToothStates = useCallback(async () => {
		if (!activePatient?.id) return;
		setIsLoadingTeeth(true);
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states`, {
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (res.ok) {
				const body = await res.json();
				const stateList: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }> =
					Array.isArray(body)
						? body
						: body?.states && Array.isArray(body.states)
							? body.states
							: [];

				const stateMap: Record<number, ToothState> = {};
				const surfaceMap: Record<number, string[]> = {};
				for (const item of stateList) {
					if (item.toothNumber && item.state) {
						stateMap[item.toothNumber] = item.state;
						if (Array.isArray(item.surfaces) && item.surfaces.length > 0) {
							surfaceMap[item.toothNumber] = item.surfaces;
						}
					}
				}
				setToothStates(stateMap);
				setToothSurfaces(surfaceMap);
			}
		} catch (err) {
			logger.error("[PediatricPerspective] Failed to load tooth states", err);
		} finally {
			setIsLoadingTeeth(false);
		}
	}, [activePatient?.id, auth]);

	useEffect(() => {
		void fetchToothStates();
	}, [fetchToothStates]);

	// Current tooth active surfaces
	const currentSurfaces = useMemo(() => {
		return toothSurfaces[selectedTooth] || [];
	}, [toothSurfaces, selectedTooth]);

	const handleSurfaceChange = (newSurfaces: string[]) => {
		setToothSurfaces((prev) => ({
			...prev,
			[selectedTooth]: newSurfaces,
		}));
	};

	const toggleSurface = (surface: string) => {
		const existing = toothSurfaces[selectedTooth] || [];
		const updated = existing.includes(surface)
			? existing.filter((s) => s !== surface)
			: [...existing, surface];
		handleSurfaceChange(updated);
	};

	const handleToothStatusSelect = async (state: ToothState) => {
		if (!activePatient?.id || !selectedTooth) return;
		setIsSavingTooth(true);

		const previousState = toothStates[selectedTooth] || "Healthy";
		const previousSurfaces = toothSurfaces[selectedTooth] ? [...toothSurfaces[selectedTooth]] : [];
		const activeSurfaces = toothSurfaces[selectedTooth] || [];

		// Optimistic update
		setToothStates((prev) => ({
			...prev,
			[selectedTooth]: state,
		}));

		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states/batch`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumbers: [selectedTooth],
					state,
					surfaces: activeSurfaces.length > 0 ? activeSurfaces : undefined,
				}),
			});

			if (!res.ok) {
				// Rollback
				setToothStates((prev) => ({
					...prev,
					[selectedTooth]: previousState,
				}));
				setToothSurfaces((prev) => ({
					...prev,
					[selectedTooth]: previousSurfaces,
				}));
				showToast(actionFailureToast("Состояние зуба не сохранено", res.status), "error");
				return;
			}

			showToast(
				`Зуб #${selectedTooth}: статус установлен «${TOOTH_STATE_LABELS[state] || state}»${
					activeSurfaces.length > 0 ? ` (${activeSurfaces.join(", ")})` : ""
				}`,
				"success",
			);
		} catch (err) {
			// Rollback
			setToothStates((prev) => ({
				...prev,
				[selectedTooth]: previousState,
			}));
			setToothSurfaces((prev) => ({
				...prev,
				[selectedTooth]: previousSurfaces,
			}));
			logger.error("[PediatricPerspective] Save tooth error", err);
			showToast("Ошибка сохранения статуса", "error");
		} finally {
			setIsSavingTooth(false);
		}
	};

	const handlePrintFairyCertificate = () => {
		setIsFairyModalOpen(true);
	};

	const handleToothClickFromChart = (num: number, _rect: DOMRect, surface?: string) => {
		setSelectedTooth(num);
		if (surface) {
			toggleSurface(surface);
		}
	};

	const toggleTemplate = (templateId: string) => {
		setAppliedTemplates((prev) =>
			prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId],
		);
		const t = PEDIATRIC_TEMPLATES.find((item) => item.id === templateId);
		if (t) {
			showToast(`Добавлено: ${t.title}`, "success");
		}
	};

	const selectedToothState = toothStates[selectedTooth] || "Healthy";
	const selectedToothMeta = MILK_TOOTH_SHORT_CODES[selectedToothState] || { code: "Зд", dotColor: "#10b981" };
	const selectedToothName = getToothAnatomicalNameRu(selectedTooth);

	return (
		<div
			data-testid="pediatric-perspective-view"
			className="pediatric-perspective min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 text-[var(--ink,#0f172a)] dark:text-slate-100 flex flex-col p-3 md:p-6 select-none"
		>
			{/* Header: Pediatric Mode Banner */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 shadow-sm">
				<div className="flex items-center gap-4 flex-wrap">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Вернуться к стандартному виду"
					>
						<ArrowLeft size={20} />
						<span className="hidden sm:inline">Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs uppercase tracking-widest font-bold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/70 px-2.5 py-0.5 rounded-md border border-pink-500/40 flex items-center gap-1">
								<Baby size={14} /> Детский приём · {isMixedDentition ? "Сменный прикус" : "Молочный прикус (51–85)"}
							</span>
							{activePatient && (
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400">
									Детская карта #{activePatient.id ? activePatient.id.slice(0, 6) : "—"}
								</span>
							)}
						</div>
						<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1 flex items-center gap-2 flex-wrap">
							<span>{activePatient?.fullName || "Ребёнок (Пациент не выбран)"}</span>
							<span className="text-sm font-bold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/50 px-2.5 py-0.5 rounded-full border border-pink-500/30">
								🧸 Детский возраст
							</span>
						</h1>
					</div>
				</div>

				{/* Mixed Dentition Toggle */}
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setIsMixedDentition((prev) => !prev)}
						className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer shadow-sm ${
							isMixedDentition
								? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
								: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
						}`}
					>
						<Sparkles size={16} />
						<span>{isMixedDentition ? "Сменный прикус (Вкл. моляры 16, 26, 46, 36)" : "Только молочные (51–85)"}</span>
					</button>
				</div>
			</header>

			{/* Main Grid: Pediatric Formula (Left) + Parent Link & Templates (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Pediatric Tooth Chart & 1-Tap Status */}
				<section className="lg:col-span-7 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
					<div>
						{/* View Mode Toggle & Header */}
						<div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Smile size={22} className="text-pink-600 dark:text-pink-400 shrink-0" />
								<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
									Формула молочных зубов (FDI)
								</h2>
								{isLoadingTeeth && (
									<span className="text-xs text-pink-600 dark:text-pink-400 flex items-center gap-1">
										<Loader2 size={14} className="animate-spin" /> Загрузка...
									</span>
								)}
							</div>

							{/* View Mode Switcher: [🦷 Анатомическая дуга (SVG) | 🔲 Крупные плитки (56px)] */}
							<div
								role="group"
								aria-label="Режим отображения детской формулы"
								className="inline-flex p-1 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 shadow-inner"
							>
								<button
									type="button"
									onClick={() => setViewMode("svg")}
									aria-pressed={viewMode === "svg"}
									className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
										viewMode === "svg"
											? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-300"
									}`}
								>
									<span>🦷 Анатомическая дуга (SVG)</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode("tiles")}
									aria-pressed={viewMode === "tiles"}
									className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
										viewMode === "tiles"
											? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-300"
									}`}
								>
									<span>🔲 Крупные плитки (56px)</span>
								</button>
							</div>
						</div>

						{/* Rendering Branch: Anatomical SVG Arc vs Touch Tiles Matrix */}
						{viewMode === "svg" ? (
							<div className="w-full overflow-x-auto pb-2">
								<ToothChart
									teethData={teethData}
									pediatricMode={!isMixedDentition}
									mixedDentition={isMixedDentition}
									topTeeth={upperMilkTeeth}
									bottomTeeth={lowerMilkTeeth}
									selectedTeeth={[selectedTooth]}
									onToothClick={handleToothClickFromChart}
									useSurfaces={true}
									hideHeader={true}
									className="border-0 shadow-none p-0 bg-transparent"
								/>
							</div>
						) : (
							<div className="space-y-4">
								{/* Upper Milk Arch (55–65) */}
								<div>
									<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
										<span>Верхняя челюсть (55–51 | 61–65)</span>
										{isMixedDentition && <span className="text-purple-700 dark:text-purple-300 font-bold">+ моляры 16, 26</span>}
									</div>
									<div
										className={`grid gap-2 overflow-x-auto pb-1 ${
											isMixedDentition ? "grid-cols-6 sm:grid-cols-12" : "grid-cols-5 sm:grid-cols-10"
										}`}
									>
										{upperMilkTeeth.map((tNum) => {
											const isSelected = selectedTooth === tNum;
											const state = toothStates[tNum] || "Healthy";
											const meta = MILK_TOOTH_SHORT_CODES[state] || { code: "Зд", dotColor: "#10b981" };
											const surfaces = toothSurfaces[tNum];
											return (
												<button
													key={tNum}
													type="button"
													onClick={() => setSelectedTooth(tNum)}
													className={`min-h-[58px] min-w-[44px] p-1 rounded-2xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap ${
														isSelected
															? "bg-pink-600 text-white border-pink-700 shadow-lg shadow-pink-600/30 scale-105 z-10"
															: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													}`}
												>
													<span className="text-xs sm:text-sm md:text-base font-black whitespace-nowrap leading-tight">{tNum}</span>
													<span
														className={`flex items-center justify-center gap-1 mt-0.5 text-[10px] font-bold px-0.5 rounded-sm whitespace-nowrap leading-none ${
															isSelected ? "text-pink-100" : "text-[var(--ink,#0f172a)] dark:text-slate-300"
														}`}
													>
														<span
															className="w-1.5 h-1.5 rounded-full shrink-0"
															style={{ backgroundColor: meta.dotColor }}
														/>
														<span className="whitespace-nowrap">{meta.code}</span>
													</span>
													{surfaces && surfaces.length > 0 && (
														<span className="text-[8px] leading-tight text-pink-300 dark:text-pink-200 mt-0.5 truncate max-w-full">
															{surfaces.join("")}
														</span>
													)}
												</button>
											);
										})}
									</div>
								</div>

								{/* Lower Milk Arch (85–75) */}
								<div>
									<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
										<span>Нижняя челюсть (85–81 | 71–75)</span>
										{isMixedDentition && <span className="text-purple-700 dark:text-purple-300 font-bold">+ моляры 46, 36</span>}
									</div>
									<div
										className={`grid gap-2 overflow-x-auto pb-1 ${
											isMixedDentition ? "grid-cols-6 sm:grid-cols-12" : "grid-cols-5 sm:grid-cols-10"
										}`}
									>
										{lowerMilkTeeth.map((tNum) => {
											const isSelected = selectedTooth === tNum;
											const state = toothStates[tNum] || "Healthy";
											const meta = MILK_TOOTH_SHORT_CODES[state] || { code: "Зд", dotColor: "#10b981" };
											const surfaces = toothSurfaces[tNum];
											return (
												<button
													key={tNum}
													type="button"
													onClick={() => setSelectedTooth(tNum)}
													className={`min-h-[58px] min-w-[44px] p-1 rounded-2xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap ${
														isSelected
															? "bg-pink-600 text-white border-pink-700 shadow-lg shadow-pink-600/30 scale-105 z-10"
															: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													}`}
												>
													<span className="text-xs sm:text-sm md:text-base font-black whitespace-nowrap leading-tight">{tNum}</span>
													<span
														className={`flex items-center justify-center gap-1 mt-0.5 text-[10px] font-bold px-0.5 rounded-sm whitespace-nowrap leading-none ${
															isSelected ? "text-pink-100" : "text-[var(--ink,#0f172a)] dark:text-slate-300"
														}`}
													>
														<span
															className="w-1.5 h-1.5 rounded-full shrink-0"
															style={{ backgroundColor: meta.dotColor }}
														/>
														<span className="whitespace-nowrap">{meta.code}</span>
													</span>
													{surfaces && surfaces.length > 0 && (
														<span className="text-[8px] leading-tight text-pink-300 dark:text-pink-200 mt-0.5 truncate max-w-full">
															{surfaces.join("")}
														</span>
													)}
												</button>
											);
										})}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* 1-Tap Pediatric Tooth Status Bar */}
					<div className="mt-6 pt-4 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 mb-3 flex items-center justify-between flex-wrap gap-2">
							<span className="flex items-center gap-2">
								<span>Быстрое присвоение статуса для зуба #{selectedTooth}:</span>
								<span className="text-xs px-2 py-0.5 rounded bg-pink-50 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border border-pink-500/30">
									{TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}
								</span>
							</span>
							{isSavingTooth && (
								<span className="text-pink-600 dark:text-pink-400 text-xs flex items-center gap-1">
									<Loader2 size={14} className="animate-spin" /> Сохранение...
								</span>
							)}
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
							{PEDIATRIC_STATUS_OPTIONS.map((opt) => {
								const isActive = selectedToothState === opt.state;
								return (
									<button
										key={opt.state}
										type="button"
										disabled={isSavingTooth}
										onClick={() => void handleToothStatusSelect(opt.state)}
										className={`min-h-[58px] p-2 rounded-xl font-bold text-xs border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm ${opt.colorClass} ${opt.borderClass} ${
											isActive ? "ring-2 ring-pink-500 ring-offset-1 font-black" : ""
										}`}
									>
										<span className="text-center leading-tight line-clamp-1">{opt.label}</span>
										<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${opt.badgeClass}`}>
											{opt.shortCode}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</section>

				{/* Right: Selected Tooth Inspector & Parent Profile & Templates */}
				<section className="lg:col-span-5 flex flex-col gap-5">
					{/* Selected Tooth Detailed Inspector */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div>
								<div className="text-xs uppercase tracking-wider text-pink-700 dark:text-pink-300 font-black">
									Инспектор детского зуба FDI
								</div>
								<h3 className="text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0">
									Зуб #{selectedTooth}
								</h3>
							</div>
							<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-xs font-bold">
								<span
									className="w-2.5 h-2.5 rounded-full"
									style={{ backgroundColor: selectedToothMeta.dotColor }}
								/>
								<span>{TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}</span>
							</div>
						</div>

						<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-4 leading-relaxed">
							{selectedToothName}
						</p>

						{/* Surface Selector Matrix */}
						<div className="p-3 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-2">
							<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-2 flex items-center justify-between">
								<span>Поверхности кариеса / пломбы (СИЦ):</span>
								<span className="text-[11px] text-pink-700 dark:text-pink-300 font-mono font-bold">
									{currentSurfaces.length > 0 ? currentSurfaces.join(", ") : "Вся коронка"}
								</span>
							</div>

							<div className="flex items-center justify-center my-2">
								<SurfaceSelector
									selected={currentSurfaces}
									onChange={handleSurfaceChange}
									size={96}
								/>
							</div>

							{/* Quick Surface Toggle Badges */}
							<div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700">
								{(["V", "L", "M", "D", "O"] as const).map((surf) => {
									const isSurfActive = currentSurfaces.includes(surf);
									return (
										<button
											key={surf}
											type="button"
											onClick={() => toggleSurface(surf)}
											className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
												isSurfActive
													? "bg-pink-600 text-white border-pink-700 shadow-sm"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-600 hover:bg-pink-50 dark:hover:bg-slate-600"
											}`}
										>
											{surf}
										</button>
									);
								})}
								<button
									type="button"
									onClick={() => handleSurfaceChange(["V", "L", "M", "D", "O"])}
									className="min-h-[44px] min-w-[44px] px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-600 hover:bg-slate-100 cursor-pointer"
								>
									Все
								</button>
								<button
									type="button"
									onClick={() => handleSurfaceChange([])}
									className="min-h-[44px] min-w-[44px] px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-red-600 dark:text-red-400 border border-[var(--line,#cbd5e1)] dark:border-slate-600 hover:bg-red-50 cursor-pointer"
								>
									Сброс
								</button>
							</div>
						</div>
					</div>

					{/* Parent / Legal Representative Link Card (323-FZ) */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Users size={20} className="text-pink-600 dark:text-pink-400 shrink-0" />
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
									Законный представитель (323-ФЗ)
								</h3>
							</div>
							<span className="text-[10px] bg-pink-50 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold px-2 py-0.5 rounded border border-pink-500/30">
								ИДС подписано
							</span>
						</div>

						<div className="p-3 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl flex items-center justify-between shadow-sm">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-950/80 border border-pink-400 text-pink-700 dark:text-pink-300 flex items-center justify-center font-bold text-sm shrink-0">
									МА
								</div>
								<div>
									<div className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-white">
										Иванова Мария Алексеевна (Мать)
									</div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-2 mt-0.5">
										<span className="flex items-center gap-1">
											<Phone size={12} /> +7 (916) 234-56-78
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Pediatric Treatment Templates in 1-Click */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2">
									<Layers size={20} className="text-pink-600 dark:text-pink-400 shrink-0" />
									<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
										Детские клинические шаблоны
									</h3>
								</div>
								<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Прейскурант</span>
							</div>

							<div className="space-y-2 max-h-56 overflow-y-auto pr-1">
								{PEDIATRIC_TEMPLATES.map((tmpl) => {
									const isApplied = appliedTemplates.includes(tmpl.id);
									return (
										<button
											key={tmpl.id}
											type="button"
											onClick={() => toggleTemplate(tmpl.id)}
											className={`w-full min-h-[52px] p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer active:scale-98 shadow-sm ${
												isApplied
													? "bg-pink-50 dark:bg-pink-950/70 text-pink-800 dark:text-pink-200 border-pink-500/70 shadow-sm"
													: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
											}`}
										>
											<div className="flex items-center gap-2.5">
												<span className="text-base">{tmpl.icon}</span>
												<div>
													<div className="font-bold text-[var(--ink,#0f172a)] dark:text-white leading-tight">{tmpl.title}</div>
													<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">{tmpl.price}</div>
												</div>
											</div>
											{isApplied ? (
												<Check size={18} className="text-pink-600 dark:text-pink-400 shrink-0 ml-2" />
											) : (
												<Plus size={18} className="text-[var(--muted,#64748b)] dark:text-slate-400 shrink-0 ml-2" />
											)}
										</button>
									);
								})}
							</div>
						</div>

						{/* Tooth Fairy Bravery Certificate Generator */}
						<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<button
								type="button"
								onClick={handlePrintFairyCertificate}
								className="w-full min-h-[48px] bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 cursor-pointer active:scale-95 transition-all border border-pink-300/40"
							>
								<Award size={18} />
								<span>Напечатать грамоту от Зубной Феи 🧚✨</span>
							</button>
						</div>
					</div>
				</section>
			</main>

			{/* Tooth Fairy Bravery Certificate Modal */}
			<AnimatePresence>
				{isFairyModalOpen && (
					<div
						role="dialog"
						aria-modal="true"
						className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: 20 }}
							className="relative w-full max-w-lg bg-gradient-to-b from-pink-50 via-purple-50 to-white dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 rounded-3xl p-6 md:p-8 border-4 border-pink-300 dark:border-pink-500/50 shadow-2xl text-center"
						>
							<button
								type="button"
								onClick={() => setIsFairyModalOpen(false)}
								className="absolute top-4 right-4 p-2 rounded-full hover:bg-pink-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
							>
								<X size={20} />
							</button>

							<div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-3xl shadow-lg shadow-pink-400/30">
								🧚✨
							</div>

							<span className="text-xs uppercase tracking-widest font-black text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-3 py-1 rounded-full border border-pink-300 dark:border-pink-700">
								Королевство Зубных Фей
							</span>

							<h2 className="text-2xl font-black text-purple-950 dark:text-pink-200 mt-3 mb-1">
								ГРАМОТА ЗА СМЕЛОСТЬ
							</h2>

							<p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
								Настоящим удостоверяется, что юный герой:
							</p>

							<div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border-2 border-dashed border-pink-400 dark:border-pink-500/60 mb-4">
								<div className="text-lg font-black text-pink-700 dark:text-pink-300">
									{activePatient?.fullName || "Супер-Пациент"}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									проявил(а) выдающееся мужество и отвагу в кресле стоматолога!
								</div>
							</div>

							<div className="flex items-center justify-around text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-b border-pink-200 dark:border-slate-700 mb-6">
								<div>
									<span className="font-bold">Дата:</span> {new Date().toLocaleDateString("ru-RU")}
								</div>
								<div>
									<span className="font-bold">Печать:</span> 🌟 Золотой Зубик
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => window.print()}
									className="flex-1 min-h-[48px] bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 cursor-pointer active:scale-95 transition-all"
								>
									<Printer size={18} />
									<span>Распечатать грамоту (PDF)</span>
								</button>
								<button
									type="button"
									onClick={() => setIsFairyModalOpen(false)}
									className="min-h-[48px] px-5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
								>
									Закрыть
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}
