import { isValidFdiToothNumber } from "@dental/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	AlertCircle,
	ArrowLeft,
	Camera,
	Check,
	CheckCircle2,
	ChevronRight,
	Eye,
	FileText,
	Heart,
	Layers,
	Loader2,
	Mic,
	MicOff,
	Play,
	Plus,
	RotateCcw,
	Scan,
	Shield,
	Sparkles,
	Stethoscope,
	Volume2,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppStore } from "../../store/appStore";
import { useImagingStore } from "../../store/imagingStore";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useVisitStore } from "../../store/visitStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	SurfaceSelector,
	TOOTH_STATE_LABELS,
	ToothChart,
	type ToothData,
	type ToothState,
} from "../odontogram/ToothChart";
import { PeriodontalChartModule } from "../odontogram/PeriodontalChartModule";
import {
	type EndoCanalData,
	EndoCanalLogModal,
	type EndoToothClinicalData,
} from "../odontogram/EndoCanalLogModal";
import "../odontogram/odontogram.css";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

const TOOTH_SHORT_CODES: Record<ToothState, { code: string; dotColor: string }> = {
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

const CHAIRSIDE_TOOTH_STATUS_OPTIONS: ReadonlyArray<{
	state: ToothState;
	label: string;
	shortCode: string;
	colorClass: string;
	borderClass: string;
	badgeClass: string;
}> = [
	{
		state: "Caries",
		label: "Кариес",
		shortCode: "К",
		colorClass: "bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/25",
		borderClass: "border-red-500/40",
		badgeClass: "bg-red-600 text-white",
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		shortCode: "П",
		colorClass: "bg-purple-500/15 text-purple-800 dark:text-purple-300 hover:bg-purple-500/25",
		borderClass: "border-purple-500/40",
		badgeClass: "bg-purple-600 text-white",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		shortCode: "Пер",
		colorClass: "bg-orange-500/15 text-orange-800 dark:text-orange-300 hover:bg-orange-500/25",
		borderClass: "border-orange-500/40",
		badgeClass: "bg-orange-600 text-white",
	},
	{
		state: "Filled",
		label: "Пломба",
		shortCode: "Пл",
		colorClass: "bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/25",
		borderClass: "border-teal-500/40",
		badgeClass: "bg-teal-600 text-white",
	},
	{
		state: "Crown",
		label: "Коронка",
		shortCode: "Кр",
		colorClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25",
		borderClass: "border-blue-500/40",
		badgeClass: "bg-blue-600 text-white",
	},
	{
		state: "Implant",
		label: "Имплантат",
		shortCode: "Имп",
		colorClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25",
		borderClass: "border-amber-500/40",
		badgeClass: "bg-amber-600 text-white",
	},
	{
		state: "Planned_Implant",
		label: "Имплант (План)",
		shortCode: "ПлИ",
		colorClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25",
		borderClass: "border-indigo-500/40",
		badgeClass: "bg-indigo-600 text-white",
	},
	{
		state: "Missing",
		label: "Удалён",
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

const QUICK_PROCEDURE_TEMPLATES = [
	{ id: "anesthesia", label: "Анестезия Артикаин 1:100 000 (1.7 мл)", category: "anesthesia", icon: "💉" },
	{ id: "cofferdam", label: "Изоляция операционного поля (Коффердам)", category: "isolation", icon: "🛡️" },
	{ id: "prep", label: "Препарирование твёрдых тканей зуба", category: "therapy", icon: "⚡" },
	{ id: "composite", label: "Пломбирование светоотверждаемым композитом", category: "therapy", icon: "✨" },
	{ id: "fluoridation", label: "Глубокое фторирование эмали и дентина", category: "prevention", icon: "🔬" },
	{ id: "polishing", label: "Шлифовка и финишная полировка пломбы", category: "therapy", icon: "💎" },
	{ id: "xray", label: "Контрольный радиовизиографический снимок", category: "xray", icon: "📸" },
];

export function ChairsiderPerspectiveView() {
	const { dashboard, auth } = useAppLogicContext();
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const setImagingViewerSessionReady = useImagingStore((s) => s.setImagingViewerSessionReady);

	const activePatient = useMemo(() => {
		if (!dashboard?.patients || dashboard.patients.length === 0) return null;
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		return dashboard.patients[0] ?? null;
	}, [dashboard?.patients, selectedPatientId]);

	// View mode: SVG anatomical arc vs 56px touch tiles vs Florida Probe Periodontogram
	const [viewMode, setViewMode] = useState<"svg" | "tiles" | "perio">("svg");

	const [selectedTooth, setSelectedTooth] = useState<number>(16);
	const [toothStates, setToothStates] = useState<Record<number, ToothState>>({});
	const [toothSurfaces, setToothSurfaces] = useState<Record<number, string[]>>({});
	const [toothClinicalData, setToothClinicalData] = useState<
		Record<number, EndoToothClinicalData>
	>({});
	const [isLoadingTeeth, setIsLoadingTeeth] = useState(false);
	const [isSavingTooth, setIsSavingTooth] = useState(false);
	const [appliedProcedures, setAppliedProcedures] = useState<string[]>([]);
	const [voiceNotes, setVoiceNotes] = useState<string>("");
	const [isEndoModalOpen, setIsEndoModalOpen] = useState(false);

	// Adult teeth arrays for FDI
	const upperJawTeeth = useMemo(() => [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], []);
	const lowerJawTeeth = useMemo(() => [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38], []);

	// Format teethData for ToothChart SVG engine
	const teethData: ToothData[] = useMemo(() => {
		const result: ToothData[] = [];
		const allTeeth = [...upperJawTeeth, ...lowerJawTeeth];
		for (const tNum of allTeeth) {
			const state = toothStates[tNum] || "Healthy";
			const surfaces = toothSurfaces[tNum];
			const clinicalData = toothClinicalData[tNum];
			result.push({
				toothNumber: tNum,
				state,
				...(surfaces && surfaces.length > 0 ? { surfaces } : {}),
				...(clinicalData ? { clinicalData } : {}),
			});
		}
		return result;
	}, [toothStates, toothSurfaces, toothClinicalData, upperJawTeeth, lowerJawTeeth]);

	const fetchToothStates = useCallback(async () => {
		if (!activePatient?.id) return;
		setIsLoadingTeeth(true);
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states`, {
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (res.ok) {
				const body = await res.json();
				const stateList: Array<{
					toothNumber: number;
					state: ToothState;
					surfaces?: string[];
					notes?: string;
					clinicalData?: EndoToothClinicalData;
				}> =
					Array.isArray(body)
						? body
						: body?.states && Array.isArray(body.states)
							? body.states
							: [];

				const stateMap: Record<number, ToothState> = {};
				const surfaceMap: Record<number, string[]> = {};
				const clinicalMap: Record<number, EndoToothClinicalData> = {};
				for (const item of stateList) {
					if (item.toothNumber && item.state) {
						stateMap[item.toothNumber] = item.state;
						if (Array.isArray(item.surfaces) && item.surfaces.length > 0) {
							surfaceMap[item.toothNumber] = item.surfaces;
						}
						if (
							item.clinicalData &&
							typeof item.clinicalData === "object" &&
							Array.isArray(item.clinicalData.canals)
						) {
							clinicalMap[item.toothNumber] = item.clinicalData;
						}
					}
				}
				setToothStates(stateMap);
				setToothSurfaces(surfaceMap);
				setToothClinicalData(clinicalMap);
			}
		} catch (err) {
			logger.error("[ChairsiderPerspective] Failed to load tooth states", err);
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
				showToast(actionFailureToast("Состояние зуба не обновлено", res.status), "error");
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
			logger.error("[ChairsiderPerspective] Save tooth state error", err);
			showToast("Ошибка сохранения статуса зуба", "error");
		} finally {
			setIsSavingTooth(false);
		}
	};

	const handleToothClickFromChart = (num: number, _rect: DOMRect, surface?: string) => {
		setSelectedTooth(num);
		if (surface) {
			toggleSurface(surface);
		}
	};

	const handleLaunchCT = () => {
		setImagingViewerSessionReady(true);
		setCurrentView("imaging");
		window.location.hash = "imaging";
		showToast("Запуск 3D КТ / Панорамного просмотрщика...", "info");
	};

	const toggleProcedure = (procId: string) => {
		setAppliedProcedures((prev) =>
			prev.includes(procId) ? prev.filter((id) => id !== procId) : [...prev, procId],
		);
		const proc = QUICK_PROCEDURE_TEMPLATES.find((p) => p.id === procId);
		if (proc) {
			showToast(`Протокол: ${proc.label}`, "success");
		}
	};

	const handleVoiceResult = (text: string) => {
		if (!text) return;
		setVoiceNotes((prev) => (prev ? `${prev}. ${text}` : text));
		showToast("Голосовая заметка добавлена", "success");
	};

	const selectedToothState = toothStates[selectedTooth] || "Healthy";
	const selectedToothMeta = TOOTH_SHORT_CODES[selectedToothState] || { code: "Зд", dotColor: "#10b981" };
	const selectedToothName = getToothAnatomicalNameRu(selectedTooth);

	return (
		<div
			data-testid="chairsider-perspective-view"
			className="chairsider-perspective min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 text-[var(--ink,#0f172a)] dark:text-slate-100 flex flex-col p-3 md:p-6 select-none"
		>
			{/* Top Sterile Context Bar */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 shadow-sm">
				<div className="flex items-center gap-4 flex-wrap">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[56px] min-w-[56px] px-4 py-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Вернуться к стандартному рабочему столу"
					>
						<ArrowLeft size={20} />
						<span className="hidden sm:inline">Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2.5 py-0.5 rounded-md border border-teal-500/40">
								Стерильный планшет у кресла
							</span>
							{activePatient && (
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400">
									ID: #{activePatient.id ? activePatient.id.slice(0, 8) : "—"}
								</span>
							)}
						</div>
						<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1">
							{activePatient?.fullName || "Пациент не выбран"}
						</h1>
					</div>
				</div>

				{/* Patient Quick Selector & Medical Alerts */}
				<div className="flex items-center gap-3 flex-wrap">
					{activePatient?.allergies && (
						<div className="min-h-[56px] px-3.5 py-2 bg-red-50 dark:bg-red-950/50 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-800 dark:text-red-200 font-bold text-sm">
							<AlertCircle size={22} className="text-red-500 shrink-0" />
							<div>
								<div className="text-[10px] uppercase tracking-wider text-red-700 dark:text-red-300 font-black">
									Аллергия / Ограничения:
								</div>
								<div className="text-xs">{activePatient.allergies}</div>
							</div>
						</div>
					)}

					{/* Patient Switcher Dropdown */}
					{dashboard?.patients && dashboard.patients.length > 1 && (
						<select
							aria-label="Выбор пациента у кресла"
							value={activePatient?.id || ""}
							onChange={(e) => setSelectedPatientId(e.target.value)}
							className="min-h-[56px] px-4 py-2 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl text-[var(--ink,#0f172a)] dark:text-slate-100 font-semibold text-sm cursor-pointer outline-none focus:border-teal-500"
						>
							{dashboard.patients.map((p) => (
								<option key={p.id} value={p.id}>
									{p.fullName}
								</option>
							))}
						</select>
					)}
				</div>
			</header>

			{/* Main High-Ergonomics Touch Matrix */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 flex-1">
				{/* Left: Odontogram Canvas / Matrix */}
				<section className="lg:col-span-8 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col justify-between shadow-sm">
					<div>
						{/* View Mode Toggle & Header */}
						<div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Stethoscope size={24} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<h2 className="text-lg font-bold m-0 text-[var(--ink,#0f172a)] dark:text-slate-100">
									Зубная формула (FDI)
								</h2>
								{isLoadingTeeth && (
									<span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1">
										<Loader2 size={14} className="animate-spin" /> Загрузка...
									</span>
								)}
							</div>

							{/* View Mode Switcher: [🦷 Анатомическая дуга (SVG) | 🔲 Крупные плитки (56px) | 📊 Пародонтограмма] */}
							<div
								role="group"
								aria-label="Режим отображения формулы"
								className="inline-flex p-1 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 shadow-inner flex-wrap gap-1"
							>
								<button
									type="button"
									onClick={() => setViewMode("svg")}
									aria-pressed={viewMode === "svg"}
									className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
										viewMode === "svg"
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
									}`}
								>
									<span>🦷 Анатомическая дуга</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode("tiles")}
									aria-pressed={viewMode === "tiles"}
									className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
										viewMode === "tiles"
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
									}`}
								>
									<span>🔲 Плитки (56px)</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode("perio")}
									aria-pressed={viewMode === "perio"}
									className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
										viewMode === "perio"
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
									}`}
								>
									<span>📊 Пародонтограмма</span>
								</button>
							</div>
						</div>

						{/* Rendering Branch: Anatomical SVG Arc vs Touch Tiles Matrix vs Florida Probe */}
						{viewMode === "perio" ? (
							<div className="w-full overflow-x-auto pb-2">
								<PeriodontalChartModule
									patientId={activePatient?.id || ""}
									doctorId={dashboard?.currentDoctor?.id || null}
								/>
							</div>
						) : viewMode === "svg" ? (
							<div className="w-full overflow-x-auto pb-2">
								<ToothChart
									teethData={teethData}
									selectedTeeth={[selectedTooth]}
									onToothClick={handleToothClickFromChart}
									useSurfaces={true}
									hideHeader={true}
									className="border-0 shadow-none p-0 bg-transparent"
								/>
							</div>
						) : (
							<div className="space-y-4">
								{/* Upper Arch */}
								<div>
									<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
										<span>Верхняя челюсть (18–28)</span>
										<span className="text-[11px] font-normal">Тач-кнопки ≥56px</span>
									</div>
									<div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2 overflow-x-auto pb-1">
										{upperJawTeeth.map((tNum) => {
											const isSelected = selectedTooth === tNum;
											const toothState = toothStates[tNum] || "Healthy";
											const meta = TOOTH_SHORT_CODES[toothState] || { code: "Зд", dotColor: "#10b981" };
											const surfaces = toothSurfaces[tNum];
											return (
												<button
													key={tNum}
													type="button"
													onClick={() => setSelectedTooth(tNum)}
													className={`min-h-[56px] min-w-[44px] md:min-h-[64px] p-1 rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap ${
														isSelected
															? "bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-600/30 scale-105 z-10"
															: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													}`}
												>
													<span className="text-xs sm:text-sm md:text-base font-black whitespace-nowrap leading-tight">{tNum}</span>
													<span
														className={`flex items-center justify-center gap-1 mt-0.5 text-[10px] font-bold px-0.5 rounded-sm whitespace-nowrap leading-none ${
															isSelected ? "text-teal-100" : "text-[var(--ink,#0f172a)] dark:text-slate-300"
														}`}
													>
														<span
															className="w-1.5 h-1.5 rounded-full shrink-0"
															style={{ backgroundColor: meta.dotColor }}
														/>
														<span className="whitespace-nowrap">{meta.code}</span>
													</span>
													{surfaces && surfaces.length > 0 && (
														<span className="text-[8px] leading-tight text-teal-300 dark:text-teal-200 mt-0.5 truncate max-w-full">
															{surfaces.join("")}
														</span>
													)}
												</button>
											);
										})}
									</div>
								</div>

								{/* Lower Arch */}
								<div>
									<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
										<span>Нижняя челюсть (48–38)</span>
									</div>
									<div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2 overflow-x-auto pb-1">
										{lowerJawTeeth.map((tNum) => {
											const isSelected = selectedTooth === tNum;
											const toothState = toothStates[tNum] || "Healthy";
											const meta = TOOTH_SHORT_CODES[toothState] || { code: "Зд", dotColor: "#10b981" };
											const surfaces = toothSurfaces[tNum];
											return (
												<button
													key={tNum}
													type="button"
													onClick={() => setSelectedTooth(tNum)}
													className={`min-h-[56px] min-w-[44px] md:min-h-[64px] p-1 rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap ${
														isSelected
															? "bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-600/30 scale-105 z-10"
															: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													}`}
												>
													<span className="text-xs sm:text-sm md:text-base font-black whitespace-nowrap leading-tight">{tNum}</span>
													<span
														className={`flex items-center justify-center gap-1 mt-0.5 text-[10px] font-bold px-0.5 rounded-sm whitespace-nowrap leading-none ${
															isSelected ? "text-teal-100" : "text-[var(--ink,#0f172a)] dark:text-slate-300"
														}`}
													>
														<span
															className="w-1.5 h-1.5 rounded-full shrink-0"
															style={{ backgroundColor: meta.dotColor }}
														/>
														<span className="whitespace-nowrap">{meta.code}</span>
													</span>
													{surfaces && surfaces.length > 0 && (
														<span className="text-[8px] leading-tight text-teal-300 dark:text-teal-200 mt-0.5 truncate max-w-full">
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

					{/* 1-Tap Tooth Status Action Bar (Bottom Quick Controls - hidden in perio mode) */}
					{viewMode !== "perio" && (
						<div className="mt-6 pt-4 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 mb-3 flex items-center justify-between flex-wrap gap-2">
								<span className="flex items-center gap-2">
									<span>Быстрое присвоение статуса для зуба #{selectedTooth}:</span>
									<span className="text-xs px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-500/30">
										{TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}
									</span>
								</span>
								{isSavingTooth && (
									<span className="text-teal-600 dark:text-teal-400 text-xs flex items-center gap-1">
										<Loader2 size={14} className="animate-spin" /> Сохранение...
									</span>
								)}
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
								{CHAIRSIDE_TOOTH_STATUS_OPTIONS.map((opt) => {
									const isActive = selectedToothState === opt.state;
									return (
										<button
											key={opt.state}
											type="button"
											disabled={isSavingTooth}
											onClick={() => void handleToothStatusSelect(opt.state)}
											className={`min-h-[58px] p-2 rounded-xl font-bold text-xs border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm ${opt.colorClass} ${opt.borderClass} ${
												isActive ? "ring-2 ring-teal-500 ring-offset-1 font-black" : ""
											}`}
										>
											<span className="whitespace-nowrap">{opt.label}</span>
											<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${opt.badgeClass}`}>
												{opt.shortCode}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}
				</section>

				{/* Right: Selected Tooth Inspector, Surfaces, CT Launcher & Dictation */}
				<section className="lg:col-span-4 flex flex-col gap-4">
					{/* Selected Tooth Detailed Inspector */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div>
								<div className="text-xs uppercase tracking-wider text-teal-700 dark:text-teal-300 font-black">
									Инспектор зуба FDI
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
						<div className="p-3 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-4">
							<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-2 flex items-center justify-between">
								<span>Поверхности поражения / пломбы:</span>
								<span className="text-[11px] text-teal-700 dark:text-teal-300 font-mono font-bold">
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
													? "bg-teal-600 text-white border-teal-700 shadow-sm"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-slate-600"
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

						{/* Endo Canal Log Quick Access when Pulpitis / Periodontitis */}
						{(selectedToothState === "Pulpitis" || selectedToothState === "Periodontitis") && (
							<div className="pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700">
								<button
									type="button"
									data-testid="chairsider-endo-canal-log-btn"
									onClick={() => setIsEndoModalOpen(true)}
									className="min-h-[52px] w-full p-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 text-purple-900 dark:text-purple-200 border-2 border-purple-500/60 font-black flex items-center justify-between transition-all active:scale-98 cursor-pointer shadow-sm"
								>
									<span className="flex items-center gap-2.5">
										<span className="text-xl">📋</span>
										<span className="flex flex-col text-left">
											<span className="text-xs font-black">Журнал корневых каналов</span>
											<span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">
												MB1, MB2, DB, P · Апекслокатор · MAF
											</span>
										</span>
									</span>
									<span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-black shadow-sm">
										Эндо 043/у
									</span>
								</button>
							</div>
						)}
					</div>

					{/* Single-Tap CT / 3D Launcher */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<Scan size={24} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">3D КТ и Рентген</h3>
							</div>
							<span className="text-xs bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-semibold border border-teal-500/30">
								Мгновенный запуск
							</span>
						</div>

						<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-4 leading-relaxed">
							Прямой вывод томограммы и прицельных снимков пациента на рабочий экран у кресла.
						</p>

						<button
							type="button"
							onClick={handleLaunchCT}
							className="min-h-[56px] w-full bg-teal-600 hover:bg-teal-500 active:scale-98 text-white font-bold rounded-xl flex items-center justify-center gap-3 text-base shadow-lg shadow-teal-600/20 border border-teal-500/40 cursor-pointer transition-all"
						>
							<Play size={20} />
							<span>Открыть снимок 3D DICOM</span>
						</button>
					</div>

					{/* Hands-Free Voice Dictation Module */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2">
									<Mic size={22} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">Голосовая диктовка</h3>
								</div>
								<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Hands-free</span>
							</div>

							<div className="flex items-center gap-4 my-3">
								<div className="relative shrink-0">
									<SmartMicrophoneButton
										context="visit"
										onResult={handleVoiceResult}
										className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-xl shadow-teal-600/30 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
									/>
								</div>
								<div className="flex-1 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 leading-relaxed">
									Нажмите микрофон и диктуйте формулу или протокол лечения без касания клавиатуры.
								</div>
							</div>

							{voiceNotes && (
								<div className="mt-3 p-3 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 leading-relaxed max-h-28 overflow-y-auto">
									<div className="font-bold text-teal-700 dark:text-teal-300 mb-1">Распознанный текст:</div>
									{voiceNotes}
								</div>
							)}
						</div>

						{/* Quick Procedure Checklist */}
						<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2">
								Протокол визита в 1 клик
							</div>
							<div className="grid grid-cols-1 gap-2">
								{QUICK_PROCEDURE_TEMPLATES.map((proc) => {
									const isApplied = appliedProcedures.includes(proc.id);
									return (
										<button
											key={proc.id}
											type="button"
											onClick={() => toggleProcedure(proc.id)}
											className={`min-h-[56px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer active:scale-98 ${
												isApplied
													? "bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200 border-teal-500/70 shadow-sm"
													: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
											}`}
										>
											<span className="flex items-center gap-2">
												<span className="text-sm">{proc.icon}</span>
												<span className="leading-tight">{proc.label}</span>
											</span>
											{isApplied ? (
												<Check size={18} className="text-teal-600 dark:text-teal-400 shrink-0 ml-2" />
											) : (
												<Plus size={18} className="text-[var(--muted,#64748b)] dark:text-slate-400 shrink-0 ml-2" />
											)}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* Endodontic Root Canal Log Modal */}
			<EndoCanalLogModal
				isOpen={isEndoModalOpen}
				onClose={() => setIsEndoModalOpen(false)}
				toothNumber={selectedTooth}
				toothState={TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}
				patientId={activePatient?.id}
				initialCanals={toothClinicalData[selectedTooth]?.canals}
				initialIrrigation={toothClinicalData[selectedTooth]?.irrigation}
				initialRadiologyControl={toothClinicalData[selectedTooth]?.radiologyControl}
				onSaveCanals={async (canals, clinicalData) => {
					if (!activePatient?.id) return;
					setToothClinicalData((prev) => ({
						...prev,
						[selectedTooth]: clinicalData,
					}));
					const activeSurfaces = toothSurfaces[selectedTooth] || [];
					try {
						const res = await fetch(
							`/api/patients/${activePatient.id}/tooth-states/batch`,
							{
								method: "POST",
								headers: auth.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								}),
								body: JSON.stringify({
									toothNumbers: [selectedTooth],
									state: selectedToothState,
									surfaces: activeSurfaces.length > 0 ? activeSurfaces : undefined,
									clinicalData,
								}),
							},
						);
						if (!res.ok) {
							showToast("Не удалось сохранить параметры каналов в БД", "error");
						}
					} catch (err) {
						logger.error("[ChairsiderPerspective] Save endo canals error", err);
					}
				}}
				onInsertToProtocol={(protocolText) => {
					handleVoiceResult(protocolText);
				}}
			/>
		</div>
	);
}
