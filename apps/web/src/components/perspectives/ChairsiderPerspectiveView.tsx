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
		colorClass: "bg-red-500/20 text-red-500 hover:bg-red-500/30",
		borderClass: "border-red-500/40",
		badgeClass: "bg-red-500 text-white",
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		colorClass: "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30",
		borderClass: "border-amber-500/40",
		badgeClass: "bg-amber-500 text-white",
	},
	{
		state: "Filled",
		label: "Пломба",
		colorClass: "bg-teal-500/20 text-teal-600 dark:text-teal-400 hover:bg-teal-500/30",
		borderClass: "border-teal-500/40",
		badgeClass: "bg-teal-600 text-white",
	},
	{
		state: "Crown",
		label: "Коронка",
		colorClass: "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30",
		borderClass: "border-blue-500/40",
		badgeClass: "bg-blue-500 text-white",
	},
	{
		state: "Implant",
		label: "Имплантат",
		colorClass: "bg-purple-500/20 text-purple-500 hover:bg-purple-500/30",
		borderClass: "border-purple-500/40",
		badgeClass: "bg-purple-500 text-white",
	},
	{
		state: "Missing",
		label: "Удален",
		colorClass: "bg-zinc-500/20 text-zinc-500 hover:bg-zinc-500/30",
		borderClass: "border-zinc-500/40",
		badgeClass: "bg-zinc-500 text-white",
	},
	{
		state: "Healthy",
		label: "Здоров",
		colorClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30",
		borderClass: "border-emerald-500/40",
		badgeClass: "bg-emerald-600 text-white",
	},
];

const QUICK_PROCEDURE_TEMPLATES = [
	{ id: "anesthesia", label: "Анестезия Артикаин 1:100 000 (1.7 мл)", category: "anesthesia", icon: "💉" },
	{ id: "cofferdam", label: "Изоляция операционного поля (Коффердам)", category: "isolation", icon: "🛡️" },
	{ id: "prep", label: "Препарирование твердых тканей зуба", category: "therapy", icon: "⚡" },
	{ id: "composite", label: "Пломбирование светоотверждаемым композитом", category: "therapy", icon: "✨" },
	{ id: "polishing", label: "Шлифовка и финишная полировка пломбы", category: "therapy", icon: "💎" },
	{ id: "xray", label: "Контрольный радиовизиографический снимок", category: "xray", icon: "📸" },
];

export function ChairsiderPerspectiveView() {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
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
	const [isVoiceRecording, setIsVoiceRecording] = useState(false);

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
			className="chairsider-perspective min-h-screen bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] flex flex-col p-3 md:p-6 select-none"
		>
			{/* Top Sterile Context Bar */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-4 shadow-xl">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[56px] min-w-[56px] px-5 py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-bold flex items-center gap-2 border border-slate-600 active:scale-95 transition-all text-base cursor-pointer shadow-md"
						title="Вернуться к стандартному рабочему столу"
					>
						<ArrowLeft size={24} />
						<span className="hidden sm:inline">Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-md border border-teal-500/30">
								Стерильный планшет у кресла
							</span>
							{activePatient && (
								<span className="text-xs font-semibold text-slate-400">
									ID: #{activePatient.id.slice(0, 8)}
								</span>
							)}
						</div>
						<h1 className="text-xl md:text-2xl font-black text-white m-0 mt-1">
							{activePatient?.fullName || "Пациент не выбран"}
						</h1>
					</div>
				</div>

				{/* Patient Quick Selector & Medical Alerts */}
				<div className="flex items-center gap-3">
					{activePatient?.allergies && (
						<div className="min-h-[56px] px-4 py-2 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-300 font-bold text-sm">
							<AlertCircle size={24} className="text-red-400 animate-pulse shrink-0" />
							<div>
								<div className="text-[10px] uppercase tracking-wider text-red-400">Аллергия / Ограничения:</div>
								<div>{activePatient.allergies}</div>
							</div>
						</div>
					)}

					{/* Patient Switcher Dropdown */}
					{dashboard?.patients && dashboard.patients.length > 1 && (
						<select
							aria-label="Выбор пациента у кресла"
							value={activePatient?.id || ""}
							onChange={(e) => setSelectedPatientId(e.target.value)}
							className="min-h-[56px] px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold text-sm cursor-pointer outline-none focus:border-teal-500"
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
				<section className="lg:col-span-8 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-4 md:p-6 flex flex-col justify-between shadow-xl">
					<div>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-bold flex items-center gap-2 m-0 text-white">
								<Stethoscope size={24} className="text-teal-400" />
								Зубная формула (Выбран зуб {selectedTooth})
							</h2>
							<span className="text-xs text-slate-400">Крупные тач-кнопки ≥56px</span>
						</div>

						{/* Upper Arch */}
						<div className="mb-4">
							<div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
								Верхняя челюсть (18–28)
							</div>
							<div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2">
								{upperJawTeeth.map((tNum) => {
									const isSelected = selectedTooth === tNum;
									const toothState = toothStates[tNum] || "Healthy";
									return (
										<button
											key={tNum}
											type="button"
											onClick={() => setSelectedTooth(tNum)}
											className={`min-h-[56px] md:min-h-[64px] rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 ${
												isSelected
													? "bg-teal-500 text-slate-950 border-white shadow-lg shadow-teal-500/30 scale-105 z-10"
													: "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
											}`}
										>
											<span className="text-sm md:text-base">{tNum}</span>
											<span
												className={`text-[9px] px-1 rounded-sm mt-0.5 max-w-[90%] truncate font-medium ${
													isSelected ? "bg-slate-950 text-teal-300" : "bg-slate-900 text-slate-400"
												}`}
											>
												{TOOTH_STATE_LABELS[toothState] || toothState}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Lower Arch */}
						<div>
							<div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
								Нижняя челюсть (48–38)
							</div>
							<div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2">
								{lowerJawTeeth.map((tNum) => {
									const isSelected = selectedTooth === tNum;
									const toothState = toothStates[tNum] || "Healthy";
									return (
										<button
											key={tNum}
											type="button"
											onClick={() => setSelectedTooth(tNum)}
											className={`min-h-[56px] md:min-h-[64px] rounded-xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 ${
												isSelected
													? "bg-teal-500 text-slate-950 border-white shadow-lg shadow-teal-500/30 scale-105 z-10"
													: "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
											}`}
										>
											<span className="text-sm md:text-base">{tNum}</span>
											<span
												className={`text-[9px] px-1 rounded-sm mt-0.5 max-w-[90%] truncate font-medium ${
													isSelected ? "bg-slate-950 text-teal-300" : "bg-slate-900 text-slate-400"
												}`}
											>
												{TOOTH_STATE_LABELS[toothState] || toothState}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* 1-Tap Tooth Status Action Bar */}
					<div className="mt-6 pt-4 border-t border-slate-700/80">
						<div className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
							<span>Быстрое присвоение статуса для зуба #{selectedTooth}:</span>
							{isSavingTooth && (
								<span className="text-teal-400 text-xs flex items-center gap-1">
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
									className={`min-h-[60px] p-2 rounded-xl font-bold text-sm border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md ${opt.colorClass} ${opt.borderClass}`}
								>
									<span>{opt.label}</span>
									<span className={`text-[10px] px-1.5 py-0.2 rounded-full ${opt.badgeClass}`}>
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
					<div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<Scan size={24} className="text-indigo-400 animate-pulse" />
								<h3 className="text-base font-bold text-white m-0">3D КТ и Рентген</h3>
							</div>
							<span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold border border-indigo-500/30">
								Мгновенный запуск
							</span>
						</div>

						<p className="text-xs text-indigo-200/80 mb-4 leading-relaxed">
							Прямой вывод томограммы и прицельных снимков пациента на рабочий экран у кресла.
						</p>

						<button
							type="button"
							onClick={handleLaunchCT}
							className="min-h-[56px] w-full bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold rounded-xl flex items-center justify-center gap-3 text-base shadow-lg shadow-indigo-600/30 border border-indigo-400/40 cursor-pointer transition-all"
						>
							<Play size={20} />
							<span>Открыть снимок 3D DICOM</span>
						</button>
					</div>

					{/* Hands-Free Voice Dictation Module */}
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<Mic size={22} className="text-teal-400" />
									<h3 className="text-base font-bold text-white m-0">Голосовая диктовка</h3>
								</div>
								<span className="text-xs text-slate-400">Hands-free</span>
							</div>

							<div className="flex items-center gap-4 my-3">
								<div className="relative">
									<SmartMicrophoneButton
										context="visit"
										onResult={handleVoiceResult}
										className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-xl shadow-teal-600/40 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
									/>
								</div>
								<div className="flex-1 text-xs text-slate-300 leading-relaxed">
									Нажмите микрофон и диктуйте формулу или протокол лечения без касания клавиатуры.
								</div>
							</div>

							{voiceNotes && (
								<div className="mt-3 p-3 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-200 leading-relaxed max-h-28 overflow-y-auto">
									<div className="font-bold text-teal-400 mb-1">Распознанный текст:</div>
									{voiceNotes}
								</div>
							)}
						</div>

						{/* Quick Procedure Checklist */}
						<div className="mt-4 pt-3 border-t border-slate-700/80">
							<div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
								Протокол визита в 1 клик
							</div>
							<div className="grid grid-cols-1 gap-1.5">
								{QUICK_PROCEDURE_TEMPLATES.map((proc) => {
									const isApplied = appliedProcedures.includes(proc.id);
									return (
										<button
											key={proc.id}
											type="button"
											onClick={() => toggleProcedure(proc.id)}
											className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer active:scale-98 ${
												isApplied
													? "bg-teal-950/80 text-teal-200 border-teal-500/60 shadow-sm"
													: "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
											}`}
										>
											<span className="flex items-center gap-2">
												<span>{proc.icon}</span>
												<span>{proc.label}</span>
											</span>
											{isApplied ? (
												<Check size={16} className="text-teal-400 shrink-0" />
											) : (
												<Plus size={16} className="text-slate-500 shrink-0" />
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
