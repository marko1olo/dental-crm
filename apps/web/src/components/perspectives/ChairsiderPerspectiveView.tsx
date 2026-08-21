import {
	AlertCircle,
	ArrowLeft,
	Check,
	FileCode,
	Loader2,
	Mic,
	Play,
	Plus,
	Scan,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	getToothAnatomicalNameRu,
	generateSoapFromOdontogramFinding,
} from "../../lib/clinicalProtocols043";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppStore } from "../../store/appStore";
import { useImagingStore } from "../../store/imagingStore";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	TOOTH_STATE_LABELS,
	ToothChart,
	type ToothData,
	type ToothState,
} from "../odontogram/ToothChart";
import { PeriodontalChartModule } from "../odontogram/PeriodontalChartModule";
import { EndoCanalLogModal, type EndoToothClinicalData } from "../odontogram/EndoCanalLogModal";
import { DentalLabOrderModal } from "../lab/DentalLabOrderModal";
import { EgiszCdaExportModal } from "../egisz/EgiszCdaExportModal";
import { RadialToothMenu } from "../odontogram/RadialToothMenu";
import "../odontogram/odontogram.css";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

const TOOTH_SHORT_CODES: Record<ToothState, { code: string; dotColor: string }> = {
	Healthy: { code: "Зд", dotColor: "#10b981" },
	Caries: { code: "К", dotColor: "#ef4444" },
	Pulpitis: { code: "П", dotColor: "#dc2626" },
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
		colorClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 hover:bg-rose-500/25",
		borderClass: "border-rose-500/40",
		badgeClass: "bg-rose-600 text-white",
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
		label: "План импл.",
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
	const { dashboard, auth, activeDoctor } = useAppLogicContext();
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
	const [isLabModalOpen, setIsLabModalOpen] = useState(false);
	const [isEgiszModalOpen, setIsEgiszModalOpen] = useState(false);
	const [radialMenuState, setRadialMenuState] = useState<{
		toothNumber: number;
		anchorRect: { x: number; y: number; width: number; height: number };
	} | null>(null);

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

	const handleBatchToothStatus = async (targets: number[], state: ToothState) => {
		if (!activePatient?.id || targets.length === 0) return;
		setIsSavingTooth(true);
		const prevMap = { ...toothStates };
		setToothStates((prev) => {
			const next = { ...prev };
			for (const num of targets) next[num] = state;
			return next;
		});
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states/batch`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumbers: targets,
					state,
				}),
			});
			if (!res.ok) {
				setToothStates(prevMap);
				showToast("Не удалось сохранить статус зубов в БД", "error");
			} else {
				showToast(`Зубы [${targets.join(", ")}]: статус «${TOOTH_STATE_LABELS[state] || state}»`, "success");
			}
		} catch (err) {
			setToothStates(prevMap);
			logger.error("[ChairsiderPerspective] Batch save error", err);
		} finally {
			setIsSavingTooth(false);
		}
	};

	const handleToothClickFromChart = (num: number, rect?: DOMRect, surface?: string) => {
		setSelectedTooth(num);
		if (rect) {
			setRadialMenuState({
				toothNumber: num,
				anchorRect: {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height,
				},
			});
		}
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
	const cleanToothTitle = useMemo(() => {
		if (!selectedTooth) return "";
		const raw = getToothAnatomicalNameRu(selectedTooth);
		const match = raw.match(/^\d+\s*\((.*)\)$/);
		const desc = match ? match[1] : raw;
		return `#${selectedTooth} (${desc})`;
	}, [selectedTooth]);

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

					{/* EGISZ SEMD CDA Export Button */}
					<button
						type="button"
						data-testid="chairsider-egisz-cda-btn"
						onClick={() => setIsEgiszModalOpen(true)}
						className="min-h-[56px] px-3.5 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 font-bold flex items-center gap-2 border border-teal-500/30 active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Открыть СЭМД ЕГИСЗ (CDA R2) валидатор и экспорт"
					>
						<FileCode size={20} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden md:inline">СЭМД ЕГИСЗ</span>
					</button>
				</div>
			</header>

			{/* Main High-Ergonomics Vertical Clinical Workflow */}
			<main className="flex flex-col gap-6 mt-4 flex-1 w-full max-w-full">
				{/* Top Block: Full-Width Dental Arch / Odontogram */}
				<section className="w-full bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col justify-between">
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

							{/* View Mode Switcher: [🦷 Анатомическая дуга | 🔲 Крупные плитки (56px) | 📊 Пародонтограмма] */}
							<div
								role="group"
								aria-label="Режим отображения формулы"
								className="grid grid-cols-3 sm:inline-flex p-1 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 shadow-inner gap-1 w-full sm:w-auto"
							>
								<button
									type="button"
									onClick={() => setViewMode("svg")}
									aria-pressed={viewMode === "svg"}
									className={`min-h-[44px] px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
										viewMode === "svg"
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
									}`}
								>
									<span className="text-base sm:text-sm">🦷</span>
									<span><span className="hidden sm:inline">Анатомическая </span>Дуга</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode("tiles")}
									aria-pressed={viewMode === "tiles"}
									className={`min-h-[44px] px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
										viewMode === "tiles"
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
									}`}
								>
									<span className="text-base sm:text-sm">🔲</span>
									<span>Плитки</span>
								</button>
								<button
									type="button"
									onClick={() => setViewMode("perio")}
									aria-pressed={viewMode === "perio"}
									className={`min-h-[44px] px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
										viewMode === "perio"
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
									}`}
								>
									<span className="text-base sm:text-sm">📊</span>
									<span><span className="sm:hidden">Перио</span><span className="hidden sm:inline">Пародонтограмма</span></span>
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
									onQuickStateChange={handleBatchToothStatus}
									useSurfaces={true}
									hideHeader={true}
									className="border-0 shadow-none p-0 bg-transparent"
								/>
							</div>
						) : (
							<div className="space-y-4">
								{/* Upper Arch */}
								<div>
									<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
										<span>Верхняя челюсть (18–28)</span>
										<span className="text-xs font-bold text-teal-700 dark:text-teal-300">Крупные тач-плитки 64–76px</span>
									</div>
									<div className="grid grid-cols-8 sm:grid-cols-16 gap-2 md:gap-2.5 overflow-x-auto pb-2">
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
													className={`min-h-[64px] min-w-[48px] md:min-h-[76px] md:min-w-[60px] p-1.5 rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
														isSelected
															? "bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-600/30 scale-105 z-10"
															: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													}`}
												>
													<span className="text-sm sm:text-base md:text-lg font-black whitespace-nowrap leading-tight">{tNum}</span>
													<span
														className={`flex items-center justify-center gap-1 mt-0.5 text-[11px] font-bold px-1 rounded-sm whitespace-nowrap leading-none ${
															isSelected ? "text-teal-100" : "text-[var(--ink,#0f172a)] dark:text-slate-300"
														}`}
													>
														<span
															className="w-2 h-2 rounded-full shrink-0"
															style={{ backgroundColor: meta.dotColor }}
														/>
														<span className="whitespace-nowrap">{meta.code}</span>
													</span>
													{surfaces && surfaces.length > 0 && (
														<span className="text-[9px] font-bold leading-tight text-teal-300 dark:text-teal-200 mt-0.5 truncate max-w-full">
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
									<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
										<span>Нижняя челюсть (48–38)</span>
									</div>
									<div className="grid grid-cols-8 sm:grid-cols-16 gap-2 md:gap-2.5 overflow-x-auto pb-2">
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
													className={`min-h-[64px] min-w-[48px] md:min-h-[76px] md:min-w-[60px] p-1.5 rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
														isSelected
															? "bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-600/30 scale-105 z-10"
															: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													}`}
												>
													<span className="text-sm sm:text-base md:text-lg font-black whitespace-nowrap leading-tight">{tNum}</span>
													<span
														className={`flex items-center justify-center gap-1 mt-0.5 text-[11px] font-bold px-1 rounded-sm whitespace-nowrap leading-none ${
															isSelected ? "text-teal-100" : "text-[var(--ink,#0f172a)] dark:text-slate-300"
														}`}
													>
														<span
															className="w-2 h-2 rounded-full shrink-0"
															style={{ backgroundColor: meta.dotColor }}
														/>
														<span className="whitespace-nowrap">{meta.code}</span>
													</span>
													{surfaces && surfaces.length > 0 && (
														<span className="text-[9px] font-bold leading-tight text-teal-300 dark:text-teal-200 mt-0.5 truncate max-w-full">
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
									<span className="text-xs px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-500/30 font-bold">
										{TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}
									</span>
								</span>
								{isSavingTooth && (
									<span className="text-teal-600 dark:text-teal-400 text-xs flex items-center gap-1">
										<Loader2 size={14} className="animate-spin" /> Сохранение...
									</span>
								)}
							</div>
							<div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
								{CHAIRSIDE_TOOTH_STATUS_OPTIONS.map((opt) => {
									const isActive = selectedToothState === opt.state;
									return (
										<button
											key={opt.state}
											type="button"
											disabled={isSavingTooth}
											onClick={() => void handleToothStatusSelect(opt.state)}
											className={`min-h-[64px] p-2 rounded-xl font-bold border flex flex-col items-center justify-between gap-1 transition-all active:scale-95 cursor-pointer shadow-xs min-w-0 w-full overflow-hidden ${opt.colorClass} ${opt.borderClass} ${
												isActive ? "ring-2 ring-teal-500 ring-offset-1 font-black shadow-md" : ""
											}`}
											title={`${opt.label} (${opt.shortCode})`}
										>
											<span className="font-bold text-[11px] sm:text-xs text-center leading-tight truncate max-w-full px-0.5">
												{opt.label}
											</span>
											<span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${opt.badgeClass}`}>
												{opt.shortCode}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}
				</section>

				{/* Bottom Block: Clinical Visit & Documentation Flow (Блок приёма 043/у) */}
				<section className="w-full bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col gap-5">
					{/* Header of Visit Block: Selected tooth info, 043/u protocol header */}
					<div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="flex items-center gap-2.5">
							<span className="text-2xl">📋</span>
							<div>
								<h3 className="text-base md:text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0">
									Клинический приём и документация (Форма 043/у)
								</h3>
								<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
									Выбранный зуб: <span className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">{cleanToothTitle}</span> · Статус: <span className="font-bold text-teal-700 dark:text-teal-300">{TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}</span>
								</div>
							</div>
						</div>

						{/* Optional Surfaces Chips */}
						<div className="flex items-center gap-1.5 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 p-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400 px-1">
								Поверхности:
							</span>
							{(["V", "L", "M", "D", "O"] as const).map((surf) => {
								const isSurfActive = currentSurfaces.includes(surf);
								return (
									<button
										key={surf}
										type="button"
										data-testid={`chairsider-surface-btn-${surf}`}
										onClick={() => toggleSurface(surf)}
										className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center justify-center ${
											isSurfActive
												? "bg-teal-600 text-white border-teal-700 shadow-xs"
												: "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-slate-600"
										}`}
									>
										{surf}
									</button>
								);
							})}
							{currentSurfaces.length > 0 && (
								<button
									type="button"
									data-testid="chairsider-surface-reset-btn"
									onClick={() => handleSurfaceChange([])}
									className="min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer flex items-center justify-center"
								>
									Сброс
								</button>
							)}
						</div>
					</div>

					{/* Quick 1-Tap Action Toolbar for Visit */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						{/* 1. Copy SOAP to 043/u */}
						<button
							type="button"
							data-testid="chairsider-copy-soap-btn"
							onClick={() => {
								const soap = generateSoapFromOdontogramFinding({
									toothNumber: selectedTooth,
									state: selectedToothState,
									surfaces: currentSurfaces,
								});
								const clipText = `Зуб ${selectedTooth} (${cleanToothTitle}): ${soap.diagnosisIcd10Label}.\n${soap.statusLocalis}\n${soap.treatmentDescription}`;
								navigator.clipboard?.writeText?.(clipText);
								showToast(`Протокол для зуба #${selectedTooth} скопирован для Формы 043/у`, "success");
							}}
							className="min-h-[74px] p-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-900 dark:text-teal-200 font-bold flex flex-col justify-between items-stretch border border-teal-500/30 active:scale-98 transition-all cursor-pointer shadow-xs"
							title="Скопировать клинический протокол Формы 043/у в дневник"
						>
							<div className="flex items-center justify-between w-full gap-2">
								<span className="flex items-center gap-1.5 font-bold text-xs text-teal-800 dark:text-teal-300">
									<Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Форма 043/у</span>
								</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-600 text-white font-black shrink-0">
									SOAP
								</span>
							</div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] dark:text-slate-400 text-left mt-1">
								Скопировать в дневник
							</span>
						</button>

						{/* 2. Endo Canal Log */}
						<button
							type="button"
							data-testid="chairsider-endo-canal-log-btn"
							onClick={() => setIsEndoModalOpen(true)}
							className="min-h-[74px] p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200 font-bold flex flex-col justify-between items-stretch border border-rose-500/30 active:scale-98 transition-all cursor-pointer shadow-xs"
							title="Открыть журнал корневых каналов (Форма 043/у)"
						>
							<div className="flex items-center justify-between w-full gap-2">
								<span className="flex items-center gap-1.5 font-bold text-xs text-rose-800 dark:text-rose-300">
									<span className="text-sm shrink-0">📋</span>
									<span>Эндодонтия</span>
								</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black shrink-0">
									Эндо 043/у
								</span>
							</div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] dark:text-slate-400 text-left mt-1">
								Журнал корневых каналов
							</span>
						</button>

						{/* 3. Dental Lab Order */}
						<button
							type="button"
							data-testid="chairsider-lab-order-btn"
							onClick={() => setIsLabModalOpen(true)}
							className="min-h-[74px] p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 font-bold flex flex-col justify-between items-stretch border border-indigo-500/30 active:scale-98 transition-all cursor-pointer shadow-xs"
							title="Оформить цифровой наряд в зуботехническую лабораторию"
						>
							<div className="flex items-center justify-between w-full gap-2">
								<span className="flex items-center gap-1.5 font-bold text-xs text-indigo-800 dark:text-indigo-300">
									<span className="text-sm shrink-0">🦷</span>
									<span>Зуботехника</span>
								</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black shrink-0">
									CAD/CAM
								</span>
							</div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] dark:text-slate-400 text-left mt-1">
								Наряд в лабораторию (ЗТЛ)
							</span>
						</button>

						{/* 4. 3D CT & X-Ray */}
						<button
							type="button"
							data-testid="chairsider-launch-ct-btn"
							onClick={handleLaunchCT}
							className="min-h-[74px] p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-200 font-bold flex flex-col justify-between items-stretch border border-blue-500/30 active:scale-98 transition-all cursor-pointer shadow-xs"
							title="Открыть 3D КТ / КЛКТ / Рентген в DICOM просмотрщике"
						>
							<div className="flex items-center justify-between w-full gap-2">
								<span className="flex items-center gap-1.5 font-bold text-xs text-blue-800 dark:text-blue-300">
									<Scan size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
									<span>Томография / Рентген</span>
								</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-black shrink-0">
									3D DICOM
								</span>
							</div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] dark:text-slate-400 text-left mt-1">
								3D КТ и Рентген-снимок
							</span>
						</button>
					</div>

					{/* Hands-Free Voice Dictation & Quick Procedures in Visit Flow */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
						{/* Voice Dictation & Notes (7 cols) */}
						<div className="lg:col-span-7 flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Mic size={20} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
										Голосовая диктовка и дневник приёма
									</h4>
								</div>
								<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Hands-free</span>
							</div>
							<div className="flex items-start gap-3">
								<SmartMicrophoneButton
									context="visit"
									onResult={handleVoiceResult}
									className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0"
								/>
								<div className="flex-1 flex flex-col gap-2">
									<textarea
										value={voiceNotes}
										onChange={(e) => setVoiceNotes(e.target.value)}
										placeholder="Нажмите микрофон или введите текст клинического протокола (жалобы, объективно, диагноз, лечение)..."
										className="w-full min-h-[90px] p-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 outline-none focus:border-teal-500 resize-y"
									/>
									{voiceNotes && (
										<div className="flex justify-end">
											<button
												type="button"
												onClick={() => {
													navigator.clipboard?.writeText?.(voiceNotes);
													showToast("Текст протокола скопирован в буфер", "success");
												}}
												className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-500 cursor-pointer"
											>
												Скопировать текст
											</button>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Quick Procedures Checklist (5 cols) */}
						<div className="lg:col-span-5 flex flex-col gap-2">
							<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-1">
								Протокол манипуляций в 1 клик
							</div>
							<div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
								{QUICK_PROCEDURE_TEMPLATES.map((proc) => {
									const isApplied = appliedProcedures.includes(proc.id);
									return (
										<button
											key={proc.id}
											type="button"
											onClick={() => toggleProcedure(proc.id)}
											className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer active:scale-98 ${
												isApplied
													? "bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200 border-teal-500/70 shadow-xs"
													: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
											}`}
										>
											<span className="flex items-center gap-2 truncate">
												<span className="text-sm shrink-0">{proc.icon}</span>
												<span className="leading-tight truncate">{proc.label}</span>
											</span>
											{isApplied ? (
												<Check size={16} className="text-teal-600 dark:text-teal-400 shrink-0 ml-1.5" />
											) : (
												<Plus size={16} className="text-[var(--muted,#64748b)] dark:text-slate-400 shrink-0 ml-1.5" />
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

			{/* Dental Lab Order Modal (ЗТЛ) */}
			<DentalLabOrderModal
				isOpen={isLabModalOpen}
				onClose={() => setIsLabModalOpen(false)}
				patientId={activePatient?.id}
				patientName={activePatient?.fullName}
				doctorId={activeDoctor?.id}
				doctorName={activeDoctor?.fullName}
				initialToothFdi={selectedTooth}
				onOrderSaved={(order) => {
					if (order?.toothFdi) {
						showToast(`Наряд ЗТЛ на зуб ${order.toothFdi} сохранен`, "success");
					}
				}}
			/>

			{/* EGISZ SEMD CDA R2 Export & Validator Modal */}
			<EgiszCdaExportModal
				isOpen={isEgiszModalOpen}
				onClose={() => setIsEgiszModalOpen(false)}
				visitId={dashboard?.activeVisit?.id || "00000000-0000-0000-0000-000000000000"}
				patientId={activePatient?.id || ""}
				patientName={activePatient?.fullName}
				patientSnils={activePatient?.administrativeProfile?.snils}
				patientBirthDate={activePatient?.birthDate}
				patientGender={activePatient?.administrativeProfile?.gender || (activePatient?.gender as any)}
				patientPolisOms={activePatient?.administrativeProfile?.omsPolis}
				doctorName={activeDoctor?.fullName}
				diagnosisTooth={selectedTooth}
				diagnosisText={`Зуб ${selectedTooth}: ${TOOTH_STATE_LABELS[selectedToothState] || selectedToothState}`}
				toothStates={toothStates}
				toothSurfaces={toothSurfaces}
				treatmentDescription={appliedProcedures.map((p) => {
					const found = QUICK_PROCEDURE_TEMPLATES.find((t) => t.id === p);
					return found ? `${found.label} (зуб ${selectedTooth})` : p;
				}).join("; ")}
			/>

			{/* Floating 1-Tap Radial Tooth Context Menu on Arch Click */}
			{radialMenuState && (
				<RadialToothMenu
					toothNumber={radialMenuState.toothNumber}
					anchorRect={radialMenuState.anchorRect}
					currentState={toothStates[radialMenuState.toothNumber] || "Healthy"}
					onSelectState={(state) => {
						void handleToothStatusSelect(state);
						setRadialMenuState(null);
					}}
					onOpenEndo={() => {
						setIsEndoModalOpen(true);
						setRadialMenuState(null);
					}}
					onClose={() => setRadialMenuState(null)}
				/>
			)}
		</div>
	);
}
