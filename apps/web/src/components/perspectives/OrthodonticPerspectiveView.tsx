import { AnimatePresence, motion } from "framer-motion";
import {
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
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

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
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
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
	const [systemType, setSystemType] = useState<"aligners" | "brackets">("aligners");
	const [sliderPosition, setSliderPosition] = useState<number>(50);
	const [activeAngle, setActiveAngle] = useState<"frontal" | "occlusal_up" | "occlusal_low" | "profile">("frontal");

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
				date: "15.04.2026",
				stageLabel: "Активация капп №11–24",
				amountRub: 8500,
				status: "due",
			},
			{
				id: "sub-5",
				date: "15.05.2026",
				stageLabel: "Ежемесячный осмотр и контроль",
				amountRub: 8500,
				status: "scheduled",
			},
		],
		[],
	);

	const progressPercent = Math.round((currentAligner / totalAligners) * 100);
	const weeksRemaining = Math.max(0, (totalAligners - currentAligner) * 2);

	const handleNextAligner = () => {
		if (currentAligner < totalAligners) {
			const next = currentAligner + 1;
			setCurrentAligner(next);
			showToast(`Переход на каппу #${next} зафиксирован`, "success");
		}
	};

	const handlePrevAligner = () => {
		if (currentAligner > 1) {
			const prev = currentAligner - 1;
			setCurrentAligner(prev);
			showToast(`Возврат к каппе #${prev}`, "info");
		}
	};

	return (
		<div
			data-testid="orthodontic-perspective-view"
			className="orthodontic-perspective min-h-screen bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] flex flex-col p-3 md:p-6"
		>
			{/* Top Bar */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-4 shadow-xl">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[50px] px-4 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-bold flex items-center gap-2 border border-slate-600 active:scale-95 transition-all text-sm cursor-pointer shadow-md"
					>
						<ArrowLeft size={20} />
						<span>Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-md border border-teal-500/30">
								Ортодонтия · Таймлайн & Фотопротокол
							</span>
							<span className="text-xs font-semibold text-slate-400">
								{systemType === "aligners" ? "Элайнеры (36 капп)" : "Брекеты Damon Q"}
							</span>
						</div>
						<h1 className="text-xl md:text-2xl font-black text-white m-0 mt-1">
							{activePatient?.fullName || "Пациент не выбран"}
						</h1>
					</div>
				</div>

				{/* System selector */}
				<div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
					<button
						type="button"
						onClick={() => setSystemType("aligners")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							systemType === "aligners"
								? "bg-teal-600 text-white shadow"
								: "text-slate-400 hover:text-white"
						}`}
					>
						Элайнеры
					</button>
					<button
						type="button"
						onClick={() => setSystemType("brackets")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							systemType === "brackets"
								? "bg-teal-600 text-white shadow"
								: "text-slate-400 hover:text-white"
						}`}
					>
						Брекеты
					</button>
				</div>
			</header>

			{/* Main Grid: Aligner Progress & Timeline (Left) + Before/After & Subscriptions (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Aligner Tracker & Interactive Stages Timeline */}
				<section className="lg:col-span-7 flex flex-col gap-5">
					{/* Progress Tracker Card */}
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<Smile size={22} className="text-teal-400" />
								<h2 className="text-lg font-bold text-white m-0">Трекер элайнеров</h2>
							</div>
							<span className="text-xs font-bold text-teal-400 bg-teal-950 px-2.5 py-1 rounded-full border border-teal-500/30">
								{progressPercent}% пройдено
							</span>
						</div>

						{/* Big Aligner Number & Controls */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-4">
							<div>
								<div className="text-xs text-slate-400 uppercase tracking-wider">Текущая каппа</div>
								<div className="text-3xl sm:text-4xl font-black text-white mt-1">
									{currentAligner}{" "}
									<span className="text-xl font-medium text-slate-400">/ {totalAligners}</span>
								</div>
								<div className="text-xs text-teal-300 mt-1 flex items-center gap-1.5">
									<Clock size={13} />
									<span>Режим: 22 ч/сутки · Смена через 4 дня</span>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handlePrevAligner}
									disabled={currentAligner <= 1}
									className="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
								>
									<ChevronLeft size={16} /> Назад
								</button>
								<button
									type="button"
									onClick={handleNextAligner}
									disabled={currentAligner >= totalAligners}
									className="h-12 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-teal-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all border border-teal-400/30"
								>
									Следующая каппа <ChevronRight size={16} />
								</button>
							</div>
						</div>

						{/* Progress Bar */}
						<div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${progressPercent}%` }}
								className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
							/>
						</div>
						<div className="flex justify-between text-xs text-slate-400 font-medium">
							<span>Старт: Каппа 1</span>
							<span>
								Осталось примерно {countLabel(weeksRemaining, "неделя", "недели", "недель")}
							</span>
							<span>Финал: Каппа {totalAligners}</span>
						</div>
					</div>

					{/* Ortho Stages Timeline */}
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
						<div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
							<div className="flex items-center gap-2">
								<Layers size={22} className="text-teal-400" />
								<h3 className="text-base font-bold text-white m-0">Клинический таймлайн лечения</h3>
							</div>
							<span className="text-xs text-slate-400">5 этапов</span>
						</div>

						<div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1">
							{stages.map((stg) => {
								const isCompleted = stg.status === "completed";
								const isActive = stg.status === "active";
								return (
									<div
										key={stg.number}
										className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
											isActive
												? "bg-teal-950/40 border-teal-500/60 shadow-lg shadow-teal-500/10"
												: isCompleted
													? "bg-slate-800/50 border-slate-700/80 opacity-90"
													: "bg-slate-900/40 border-slate-800 opacity-60"
										}`}
									>
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
												isCompleted
													? "bg-emerald-500 text-slate-950"
													: isActive
														? "bg-teal-500 text-slate-950 animate-pulse"
														: "bg-slate-800 text-slate-400"
											}`}
										>
											{isCompleted ? <Check size={16} /> : stg.number}
										</div>

										<div className="flex-1">
											<div className="flex items-center justify-between gap-2">
												<h4 className="text-sm font-bold text-white m-0">{stg.title}</h4>
												<span className="text-xs text-slate-400 font-semibold">{stg.date}</span>
											</div>
											<p className="text-xs text-slate-300 m-0 mt-1 leading-relaxed">
												{stg.description}
											</p>
											<div className="mt-2 flex items-center gap-2">
												<span className="text-[10px] uppercase font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
													{stg.alignerRange}
												</span>
												{isActive && (
													<span className="text-[10px] uppercase font-bold bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
														Текущий этап
													</span>
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
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex flex-col">
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
							<div className="flex items-center gap-2">
								<Camera size={22} className="text-teal-400" />
								<h3 className="text-base font-bold text-white m-0">Фотопротокол До / После</h3>
							</div>
							<span className="text-xs text-slate-400">Сплит-сравнение</span>
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
									className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										activeAngle === angle.id
											? "bg-teal-600 text-white"
											: "bg-slate-800 text-slate-400 hover:text-white"
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
									className="h-full bg-slate-900 border-r-2 border-teal-400 overflow-hidden relative"
								>
									<div className="absolute inset-0 flex flex-col items-center justify-center p-4">
										<span className="text-xs font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30 mb-2">
											До лечения (Скученность)
										</span>
										{/* Stylized Arch Curve */}
										<svg width="120" height="90" viewBox="0 0 120 90" aria-label="Схема до лечения">
											<path
												d="M 15 80 Q 25 15, 60 15 Q 95 15, 105 80"
												fill="none"
												stroke="#f43f5e"
												strokeWidth="6"
												strokeDasharray="6 3"
											/>
										</svg>
									</div>
								</div>

								{/* Right Side: After */}
								<div className="flex-1 h-full bg-slate-950 overflow-hidden relative">
									<div className="absolute inset-0 flex flex-col items-center justify-center p-4">
										<span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 mb-2">
											Прогноз / Результат
										</span>
										{/* Stylized Perfect Arch */}
										<svg width="120" height="90" viewBox="0 0 120 90" aria-label="Схема результата">
											<path
												d="M 15 80 Q 25 15, 60 15 Q 95 15, 105 80"
												fill="none"
												stroke="#10b981"
												strokeWidth="6"
											/>
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
								className="absolute top-0 bottom-0 w-1 bg-teal-400 z-10 pointer-events-none flex items-center justify-center"
							>
								<div className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white">
									<Sliders size={14} />
								</div>
							</div>
						</div>

						<p className="text-[11px] text-slate-400 text-center m-0 mt-2">
							Передвигайте ползунок для оценки динамики расширения зубного ряда и выравнивания
						</p>
					</div>

					{/* Subscription & Monthly Billing Tracker */}
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
								<div className="flex items-center gap-2">
									<CreditCard size={22} className="text-teal-400" />
									<h3 className="text-base font-bold text-white m-0">
										Абонементные платежи (Активации)
									</h3>
								</div>
								<span className="text-xs font-bold text-emerald-400">8 500 ₽ / мес</span>
							</div>

							<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
								{subscriptionLedger.map((sub) => (
									<div
										key={sub.id}
										className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs"
									>
										<div>
											<div className="font-bold text-white">{sub.stageLabel}</div>
											<div className="text-[11px] text-slate-400">{sub.date}</div>
										</div>
										<div className="text-right">
											<div className="font-bold text-white">
												{sub.amountRub.toLocaleString("ru-RU")} ₽
											</div>
											{sub.status === "paid" && (
												<span className="text-[10px] text-emerald-400 font-semibold">
													Оплачено ({sub.receiptNumber})
												</span>
											)}
											{sub.status === "due" && (
												<span className="text-[10px] text-amber-400 font-bold">
													К оплате сегодня
												</span>
											)}
											{sub.status === "scheduled" && (
												<span className="text-[10px] text-slate-500 font-medium">
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
							className="mt-4 w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 cursor-pointer active:scale-95 transition-all border border-teal-400/30"
						>
							<DollarSign size={16} />
							<span>Провести оплату активации (8 500 ₽)</span>
						</button>
					</div>
				</section>
			</main>
		</div>
	);
}
