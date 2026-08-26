import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Calendar,
	Camera,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	CreditCard,
	DollarSign,
	Eye,
	Layers,
	Plus,
	RotateCw,
	Save,
	Sliders,
	Smile,
	Sparkles,
	TrendingUp,
	Upload,
	Users,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { showToast } from "../GlobalToast";
import { CephalometricAnalysisModal } from "../orthodontics/CephalometricAnalysisModal";

interface OrthoStage {
	number: number;
	title: string;
	description: string;
	status: "completed" | "active" | "planned";
	date: string;
	alignerRange: string;
}

interface SubscriptionPayment {
	id: string;
	date: string;
	stageLabel: string;
	amountRub: number;
	status: "paid" | "due" | "scheduled";
	receiptNumber?: string;
}

export function OrthodonticPerspectiveView() {
	const { dashboard } = useAppLogicContext();
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

	// Ortho aligner state
	const [currentAligner, setCurrentAligner] = useState<number>(14);
	const [totalAligners, setTotalAligners] = useState<number>(36);
	const [sliderPosition, setSliderPosition] = useState<number>(50);
	const [activeAngle, setActiveAngle] = useState<"frontal" | "occlusal_up" | "occlusal_low" | "profile">("frontal");
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);

	// Clinical Timeline Stages
	const stages: OrthoStage[] = useMemo(
		() => [
			{
				number: 1,
				title: "Диагностика и 3D-сетап",
				description: "КЛКТ, расчет ТРГ в боковой проекции, интраоральное 3D-сканирование челюстей",
				status: "completed",
				date: "12.01.2026",
				alignerRange: "Диагностика",
			},
			{
				number: 2,
				title: "Фиксация аттачментов & Каппы 1–10",
				description: "Установка композитных аттачментов, сепарация контактных пунктов, выдача первого сета",
				status: "completed",
				date: "26.01.2026",
				alignerRange: "Каппы 1–10",
			},
			{
				number: 3,
				title: "Активация & Каппы 11–24",
				description: "Контроль трекинга зубов, проверка окклюзионных контактов, выдача второго сета элайнеров",
				status: "active",
				date: "15.04.2026",
				alignerRange: "Каппы 11–24",
			},
			{
				number: 4,
				title: "Финальная детализация & Каппы 25–36",
				description: "Юстировка торка резцов, коррекция микро-ротаций",
				status: "planned",
				date: "20.08.2026",
				alignerRange: "Каппы 25–36",
			},
			{
				number: 5,
				title: "Снятие & Ретенционный период",
				description: "Снятие аттачментов, фиксация несъемных проволочных ретейнеров, ночные ретенционные каппы",
				status: "planned",
				date: "10.12.2026",
				alignerRange: "Ретенция",
			},
		],
		[],
	);

	// Subscription & Installment Ledger
	const subscriptionLedger: SubscriptionPayment[] = useMemo(
		() => [
			{
				id: "sub-1",
				date: "26.01.2026",
				stageLabel: "Активация капп №1–10",
				amountRub: 8500,
				status: "paid",
				receiptNumber: "ФД-40192",
			},
			{
				id: "sub-2",
				date: "28.02.2026",
				stageLabel: "Ежемесячный осмотр и контроль",
				amountRub: 8500,
				status: "paid",
				receiptNumber: "ФД-41203",
			},
			{
				id: "sub-3",
				date: "30.03.2026",
				stageLabel: "Ежемесячный осмотр и контроль",
				amountRub: 8500,
				status: "paid",
				receiptNumber: "ФД-42091",
			},
			{
				id: "sub-4",
				date: "30.04.2026",
				stageLabel: "Активация капп №11–24",
				amountRub: 8500,
				status: "due",
			},
			{
				id: "sub-5",
				date: "30.05.2026",
				stageLabel: "Ежемесячный осмотр и контроль",
				amountRub: 8500,
				status: "scheduled",
			},
		],
		[],
	);

	const progressPercent = Math.round((currentAligner / (totalAligners || 1)) * 100);
	const alignersRemaining = Math.max(0, totalAligners - currentAligner);
	const weeksRemaining = Math.round(alignersRemaining * 1.5);

	const handleNextAligner = () => {
		if (currentAligner < totalAligners) {
			setCurrentAligner((prev) => prev + 1);
			showToast(`Переход на каппу №${currentAligner + 1}`, "success");
		}
	};

	const handlePrevAligner = () => {
		if (currentAligner > 1) {
			setCurrentAligner((prev) => prev - 1);
			showToast(`Возврат к каппе №${currentAligner - 1}`, "info");
		}
	};

	return (
		<div
			data-testid="orthodontic-perspective-view"
			className="orthodontic-perspective min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 text-[var(--ink,#0f172a)] dark:text-slate-100 flex flex-col p-3 md:p-6 select-none"
		>
			{/* Top Bar */}
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
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-2.5 py-0.5 rounded-md border border-[var(--teal,var(--brand-primary))]/40">
								Ортодонтия & Элайнеры
							</span>
							{activePatient && (
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400">
									Карта #{activePatient.id ? activePatient.id.slice(0, 6) : "—"}
								</span>
							)}
						</div>
						<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1">
							{activePatient?.fullName || "Пациент не выбран"}
						</h1>
					</div>
				</div>

				{/* Top Right Actions: TRG Analysis & Patient Selector */}
				<div className="flex items-center gap-3 flex-wrap">
					<button
						type="button"
						onClick={() => setIsCephModalOpen(true)}
						data-testid="open-ceph-analysis-btn"
						className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold flex items-center gap-2 shadow-md shadow-[var(--teal,var(--brand-primary))]/20 active:scale-95 transition-all text-sm cursor-pointer border border-[var(--teal,var(--brand-primary))]/30"
						title="Открыть цефалометрический анализ ТРГ в боковой проекции"
					>
						<Activity size={18} />
						<span>Расчет ТРГ (Цефалометрия)</span>
					</button>

					{/* Patient Selector */}
					{dashboard?.patients && dashboard.patients.length > 1 && (
						<select
							aria-label="Выбор ортодонтического пациента"
							value={activePatient?.id || ""}
							onChange={(e) => setSelectedPatientId(e.target.value)}
							className="min-h-[48px] px-4 py-2 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl text-[var(--ink,#0f172a)] dark:text-slate-100 font-semibold text-sm cursor-pointer outline-none focus:border-[var(--teal,var(--brand-primary))]"
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

			{/* Main Grid: Aligner Tracker & Timeline (Left) + Before/After & Ledger (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Aligner Tracker & Clinical Stages */}
				<section className="lg:col-span-7 flex flex-col gap-5">
					{/* Progress Tracker Card */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Smile size={22} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">Трекер элайнеров</h2>
							</div>
							<span className="text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-2.5 py-1 rounded-full border border-[var(--teal,var(--brand-primary))]/40">
								{progressPercent}% пройдено
							</span>
						</div>

						{/* Big Aligner Number & Controls */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-4">
							<div>
								<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider font-bold">Текущая каппа</div>
								<div className="text-3xl sm:text-4xl font-black text-[var(--ink,#0f172a)] dark:text-white mt-1">
									{currentAligner}{" "}
									<span className="text-xl font-medium text-[var(--muted,#64748b)] dark:text-slate-400">/ {totalAligners}</span>
								</div>
								<div className="text-xs text-[var(--teal-dark,var(--teal))] mt-1 flex items-center gap-1.5 font-semibold">
									<Clock size={13} />
									<span>Режим: 22 ч/сутки · Смена через 4 дня</span>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handlePrevAligner}
									disabled={currentAligner <= 1}
									className="min-h-[48px] px-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-600 disabled:opacity-40 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs border border-[var(--line,#cbd5e1)] dark:border-slate-600 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
								>
									<ChevronLeft size={16} /> Назад
								</button>
								<button
									type="button"
									onClick={handleNextAligner}
									disabled={currentAligner >= totalAligners}
									className="min-h-[48px] px-5 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-[var(--teal,var(--brand-primary))]/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all border border-[var(--teal,var(--brand-primary))]/30"
								>
									Следующая каппа <ChevronRight size={16} />
								</button>
							</div>
						</div>

						{/* Progress Bar */}
						<div className="h-3 bg-[var(--surface-muted,#e2e8f0)] dark:bg-slate-800 rounded-full overflow-hidden mb-2">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${progressPercent}%` }}
								className="h-full bg-gradient-to-r from-[var(--teal,var(--brand-primary))] to-emerald-500 rounded-full"
							/>
						</div>
						<div className="flex justify-between text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">
							<span>Старт: Каппа 1</span>
							<span>
								Осталось примерно {countLabel(weeksRemaining, "неделя", "недели", "недель")}
							</span>
							<span>Финал: Каппа {totalAligners}</span>
						</div>
					</div>

					{/* Ortho Stages Timeline */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
						<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Layers size={22} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">Клинический таймлайн лечения</h3>
							</div>
							<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">5 этапов</span>
						</div>

						<div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1">
							{stages.map((stg) => {
								const isCompleted = stg.status === "completed";
								const isActive = stg.status === "active";
								return (
									<div
										key={stg.number}
										className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 shadow-sm ${
											isActive
												? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))]/70 shadow-sm"
												: isCompleted
													? "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border-[var(--line,#cbd5e1)] dark:border-slate-700"
													: "bg-[var(--surface-muted,#f8fafc)] dark:bg-slate-800/40 border-[var(--line,#e2e8f0)] dark:border-slate-800 opacity-75"
										}`}
									>
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
												isCompleted
													? "bg-emerald-600 text-white"
													: isActive
														? "bg-[var(--teal,var(--brand-primary))] text-white"
														: "bg-[var(--line,#cbd5e1)] dark:bg-slate-700 text-[var(--muted,#64748b)] dark:text-slate-400"
											}`}
										>
											{isCompleted ? <Check size={16} /> : stg.number}
										</div>

										<div className="flex-1">
											<div className="flex items-center justify-between gap-2">
												<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">{stg.title}</h4>
												<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-semibold">{stg.date}</span>
											</div>
											<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-300 m-0 mt-1 leading-relaxed">
												{stg.description}
											</p>
											<div className="mt-2 flex items-center gap-2 flex-wrap">
												<span className="text-[10px] uppercase font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200">
													{stg.alignerRange}
												</span>
												{isActive && (
													<span className="text-[10px] uppercase font-bold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] px-2 py-0.5 rounded border border-[var(--teal,var(--brand-primary))]/30">
														Текущий этап
													</span>
												)}
												{stg.number === 1 && (
													<button
														type="button"
														onClick={() => setIsCephModalOpen(true)}
														className="text-[11px] font-bold text-[var(--teal-dark,var(--teal))] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--teal-soft,var(--paper-soft))] px-2 py-0.5 rounded border border-[var(--teal,var(--brand-primary))]/30"
													>
														<Activity size={12} />
														<span>Открыть расчет ТРГ</span>
													</button>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</section>

				{/* Right: Before/After Comparison & Subscription Billing */}
				<section className="lg:col-span-5 flex flex-col gap-5">
					{/* Before / After Photo Comparison Studio */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Camera size={22} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">Фотопротокол До / После</h3>
							</div>
							<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Сплит-сравнение</span>
						</div>

						{/* Angle Selector */}
						<div className="grid grid-cols-4 gap-1.5 mb-3">
							{(
								[
									{ id: "frontal", label: "Фас" },
									{ id: "occlusal_up", label: "Верх" },
									{ id: "occlusal_low", label: "Низ" },
									{ id: "profile", label: "Профиль" },
								] as const
							).map((angle) => (
								<button
									key={angle.id}
									type="button"
									onClick={() => setActiveAngle(angle.id)}
									className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
										activeAngle === angle.id
											? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
											: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
									}`}
								>
									{angle.label}
								</button>
							))}
						</div>

						{/* Interactive Split View (Vector Dental Arch Graphic) */}
						<div className="relative h-60 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
							{/* Dental Arch Graphic (Before vs After) */}
							<div className="absolute inset-0 flex">
								{/* Left Side: Before */}
								<div
									style={{ width: `${sliderPosition}%` }}
									className="h-full bg-slate-900 border-r-2 border-[var(--teal,var(--brand-primary))] overflow-hidden relative"
								>
									<div className="absolute inset-0 flex flex-col items-center justify-center p-4">
										<span className="text-xs font-bold text-rose-300 bg-rose-950/90 px-2.5 py-0.5 rounded border border-rose-500/40 mb-2">
											До лечения (Скученность)
										</span>
										{/* Stylized Arch Curve */}
										<svg width="140" height="100" viewBox="0 0 140 100" aria-label="Схема до лечения">
											<path
												d="M 20 90 Q 25 20, 70 20 Q 115 20, 120 90"
												fill="none"
												stroke="#f43f5e"
												strokeWidth="5"
												strokeDasharray="6 4"
											/>
											{/* Individual crowded teeth points */}
											{[
												{ cx: 25, cy: 80 },
												{ cx: 32, cy: 55 },
												{ cx: 48, cy: 30 },
												{ cx: 65, cy: 22 },
												{ cx: 78, cy: 26 },
												{ cx: 95, cy: 35 },
												{ cx: 110, cy: 60 },
												{ cx: 116, cy: 82 },
											].map((pt, i) => (
												<circle key={i} cx={pt.cx} cy={pt.cy} r="4" fill="#fb7185" />
											))}
										</svg>
									</div>
								</div>

								{/* Right Side: After */}
								<div className="flex-1 h-full bg-slate-950 overflow-hidden relative">
									<div className="absolute inset-0 flex flex-col items-center justify-center p-4">
										<span className="text-xs font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded border border-emerald-500/40 mb-2">
											Прогноз / Результат
										</span>
										{/* Stylized Perfect Arch */}
										<svg width="140" height="100" viewBox="0 0 140 100" aria-label="Схема результата">
											<path
												d="M 20 90 Q 30 15, 70 15 Q 110 15, 120 90"
												fill="none"
												stroke="#10b981"
												strokeWidth="5"
											/>
											{/* Harmonious teeth points */}
											{[
												{ cx: 22, cy: 85 },
												{ cx: 30, cy: 60 },
												{ cx: 45, cy: 35 },
												{ cx: 60, cy: 20 },
												{ cx: 80, cy: 20 },
												{ cx: 95, cy: 35 },
												{ cx: 110, cy: 60 },
												{ cx: 118, cy: 85 },
											].map((pt, i) => (
												<circle key={i} cx={pt.cx} cy={pt.cy} r="4" fill="#34d399" />
											))}
										</svg>
									</div>
								</div>
							</div>

							{/* Slider Thumb Control */}
							<input
								type="range"
								min="0"
								max="100"
								value={sliderPosition}
								onChange={(e) => setSliderPosition(Number(e.target.value))}
								aria-label="Слайдер сравнения до и после"
								className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
							/>
							<div
								style={{ left: `${sliderPosition}%` }}
								className="absolute top-0 bottom-0 w-1 bg-[var(--teal,var(--brand-primary))] z-10 pointer-events-none flex items-center justify-center"
							>
								<div className="w-8 h-8 rounded-full bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shadow-lg border-2 border-white">
									<Sliders size={14} />
								</div>
							</div>
						</div>

						<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 text-center m-0 mt-2">
							Передвигайте ползунок для оценки динамики расширения зубного ряда и выравнивания
						</p>
					</div>

					{/* Subscription & Monthly Billing Tracker */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2">
									<CreditCard size={22} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
										Абонементные платежи (Активации)
									</h3>
								</div>
								<span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">8 500 ₽ / мес</span>
							</div>

							<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
								{subscriptionLedger.map((sub) => (
									<div
										key={sub.id}
										className="p-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-between text-xs shadow-sm"
									>
										<div>
											<div className="font-bold text-[var(--ink,#0f172a)] dark:text-white">{sub.stageLabel}</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400">{sub.date}</div>
										</div>
										<div className="text-right">
											<div className="font-bold text-[var(--ink,#0f172a)] dark:text-white">
												{sub.amountRub.toLocaleString("ru-RU")} ₽
											</div>
											{sub.status === "paid" && (
												<span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
													Оплачено ({sub.receiptNumber})
												</span>
											)}
											{sub.status === "due" && (
												<span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
													К оплате сегодня
												</span>
											)}
											{sub.status === "scheduled" && (
												<span className="text-[10px] text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">
													Запланировано
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>

						<button
							type="button"
							onClick={() => showToast("Счет на очередную активацию 8 500 ₽ выставлен", "success")}
							className="mt-4 w-full min-h-[44px] bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[var(--teal,var(--brand-primary))]/20 cursor-pointer active:scale-95 transition-all border border-[var(--teal,var(--brand-primary))]/30"
						>
							<DollarSign size={16} />
							<span>Провести оплату активации (8 500 ₽)</span>
						</button>
					</div>
				</section>
			</main>

			{/* Cephalometric Analysis Modal */}
			<CephalometricAnalysisModal
				isOpen={isCephModalOpen}
				onClose={() => setIsCephModalOpen(false)}
				patientId={activePatient?.id}
				patientName={activePatient?.fullName}
			/>
		</div>
	);
}
