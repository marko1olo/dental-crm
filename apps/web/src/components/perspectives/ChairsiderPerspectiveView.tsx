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
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "../odontogram/ToothChart";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

const TOOTH_SHORT_CODES: Record<ToothState, { code: string; dotColor: string }> = {
	Healthy: { code: "Зд", dotColor: "#10b981" },
	Caries: { code: "К", dotColor: "#ef4444" },
	Pulpitis: { code: "П", dotColor: "#f59e0b" },
	Periodontitis: { code: "Пер", dotColor: "#dc2626" },
	Filled: { code: "Пл", dotColor: "#0d9488" },
	Crown: { code: "Кр", dotColor: "#3b82f6" },
	Implant: { code: "Имп", dotColor: "#a855f7" },
	Planned_Implant: { code: "ПлИ", dotColor: "#6366f1" },
	Missing: { code: "Отс", dotColor: "#64748b" },
};

const CHAIRSIDE_TOOTH_STATUS_OPTIONS: ReadonlyArray<{
	state: ToothState;
	label: string;
	colorClass: string;
	borderClass: string;
	badgeClass: string;
}> = [
	{
		state: "Caries",
		label: "Кариес",
		colorClass: "bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/25",
		borderClass: "border-red-500/40",
		badgeClass: "bg-red-600 text-white",
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		colorClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25",
		borderClass: "border-amber-500/40",
		badgeClass: "bg-amber-600 text-white",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		colorClass: "bg-orange-500/15 text-orange-800 dark:text-orange-300 hover:bg-orange-500/25",
		borderClass: "border-orange-500/40",
		badgeClass: "bg-orange-600 text-white",
	},
	{
		state: "Filled",
		label: "Пломба",
		colorClass: "bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/25",
		borderClass: "border-teal-500/40",
		badgeClass: "bg-teal-600 text-white",
	},
	{
		state: "Crown",
		label: "Коронка",
		colorClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25",
		borderClass: "border-blue-500/40",
		badgeClass: "bg-blue-600 text-white",
	},
	{
		state: "Implant",
		label: "Имплантат",
		colorClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25",
		borderClass: "border-purple-500/40",
		badgeClass: "bg-purple-600 text-white",
	},
	{
		state: "Missing",
		label: "Удалён",
		colorClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 hover:bg-slate-500/25",
		borderClass: "border-slate-500/40",
		badgeClass: "bg-slate-600 text-white",
	},
	{
		state: "Healthy",
		label: "Здоров",
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

	const [selectedTooth, setSelectedTooth] = useState<number>(16);
	const [toothStates, setToothStates] = useState<Record<number, ToothState>>({});
	const [isLoadingTeeth, setIsLoadingTeeth] = useState(false);
	const [isSavingTooth, setIsSavingTooth] = useState(false);
	const [appliedProcedures, setAppliedProcedures] = useState<string[]>([]);
	const [voiceNotes, setVoiceNotes] = useState<string>("");

	// Adult teeth arrays
	const upperJawTeeth = useMemo(() => [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], []);
	const lowerJawTeeth = useMemo(() => [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38], []);

	const fetchToothStates = useCallback(async () => {
		if (!activePatient?.id) return;
		setIsLoadingTeeth(true);
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states`, {
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					const map: Record<number, ToothState> = {};
					for (const item of data) {
						if (item.toothNumber && item.state) {
							map[item.toothNumber] = item.state as ToothState;
						}
					}
					setToothStates(map);
				}
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

	const handleToothStatusSelect = async (state: ToothState) => {
		if (!activePatient?.id || !selectedTooth) return;
		setIsSavingTooth(true);
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states/batch`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					updates: [
						{
							toothNumber: selectedTooth,
							state,
							surfaces: [],
							diagnosis: TOOTH_STATE_LABELS[state] || state,
						},
					],
				}),
			});

			if (!res.ok) {
				showToast(actionFailureToast("Состояние зуба не обновлено", res.status), "error");
				return;
			}

			setToothStates((prev) => ({
				...prev,
				[selectedTooth]: state,
			}));
			showToast(`Зуб ${selectedTooth}: статус изменен на «${TOOTH_STATE_LABELS[state]}»`, "success");
		} catch (err) {
			logger.error("[ChairsiderPerspective] Save tooth state error", err);
			showToast("Ошибка сохранения статуса зуба", "error");
		} finally {
			setIsSavingTooth(false);
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
				{/* Left: Quick Odontogram Matrix (Large Sterile Buttons) */}
				<section className="lg:col-span-8 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col justify-between shadow-sm">
					<div>
						<div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<h2 className="text-lg font-bold flex items-center gap-2 m-0 text-[var(--ink,#0f172a)] dark:text-slate-100">
								<Stethoscope size={24} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Зубная формула (Выбран зуб #{selectedTooth})</span>
							</h2>
							<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Тач-кнопки ≥56px</span>
						</div>

						{/* Upper Arch */}
						<div className="mb-4">
							<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2">
								Верхняя челюсть (18–28)
							</div>
							<div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2 overflow-x-auto pb-1">
								{upperJawTeeth.map((tNum) => {
									const isSelected = selectedTooth === tNum;
									const toothState = toothStates[tNum] || "Healthy";
									const meta = TOOTH_SHORT_CODES[toothState] || { code: "Зд", dotColor: "#10b981" };
									return (
										<button
											key={tNum}
											type="button"
											onClick={() => setSelectedTooth(tNum)}
											className={`min-h-[56px] min-w-[36px] sm:min-w-[40px] md:min-h-[64px] p-1 rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap ${
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
										</button>
									);
								})}
							</div>
						</div>

						{/* Lower Arch */}
						<div>
							<div className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2">
								Нижняя челюсть (48–38)
							</div>
							<div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2 overflow-x-auto pb-1">
								{lowerJawTeeth.map((tNum) => {
									const isSelected = selectedTooth === tNum;
									const toothState = toothStates[tNum] || "Healthy";
									const meta = TOOTH_SHORT_CODES[toothState] || { code: "Зд", dotColor: "#10b981" };
									return (
										<button
											key={tNum}
											type="button"
											onClick={() => setSelectedTooth(tNum)}
											className={`min-h-[56px] min-w-[36px] sm:min-w-[40px] md:min-h-[64px] p-1 rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 whitespace-nowrap ${
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
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* 1-Tap Tooth Status Action Bar */}
					<div className="mt-6 pt-4 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 mb-3 flex items-center justify-between">
							<span>Быстрое присвоение статуса для зуба #{selectedTooth}:</span>
							{isSavingTooth && (
								<span className="text-teal-600 dark:text-teal-400 text-xs flex items-center gap-1">
									<Loader2 size={14} className="animate-spin" /> Сохранение...
								</span>
							)}
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
							{CHAIRSIDE_TOOTH_STATUS_OPTIONS.map((opt) => (
								<button
									key={opt.state}
									type="button"
									disabled={isSavingTooth}
									onClick={() => void handleToothStatusSelect(opt.state)}
									className={`min-h-[58px] p-2 rounded-xl font-bold text-sm border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm ${opt.colorClass} ${opt.borderClass}`}
								>
									<span>{opt.label}</span>
									<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${opt.badgeClass}`}>
										1 тап
									</span>
								</button>
							))}
						</div>
					</div>
				</section>

				{/* Right: Sterile Actions, CT Launcher & Voice Dictation */}
				<section className="lg:col-span-4 flex flex-col gap-4">
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
		</div>
	);
}
