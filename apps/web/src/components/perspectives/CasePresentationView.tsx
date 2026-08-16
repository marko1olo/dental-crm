import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	ArrowLeft,
	Award,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Crown,
	Download,
	Gem,
	Heart,
	Info,
	MessageSquare,
	Percent,
	Phone,
	Printer,
	QrCode,
	Send,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { showToast } from "../GlobalToast";

interface PlanTier {
	id: "basic" | "optimum" | "premium";
	badge: string;
	title: string;
	subtitle: string;
	isRecommended: boolean;
	accentClass: string;
	badgeClass: string;
	borderClass: string;
	totalRub: number;
	durationWeeks: number;
	warrantyYears: number;
	icon: React.ReactNode;
	features: string[];
	stages: { title: string; desc: string; count: string }[];
}

export function CasePresentationView() {
	const { dashboard } = useAppLogicContext();
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);

	const activePatient = useMemo(() => {
		if (!dashboard?.patients || dashboard.patients.length === 0) return null;
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		return dashboard.patients[0] ?? null;
	}, [dashboard?.patients, selectedPatientId]);

	const [selectedTierId, setSelectedTierId] = useState<"basic" | "optimum" | "premium">("optimum");
	const [installmentMonths, setInstallmentMonths] = useState<number>(12);
	const [isHighCostEligible, setIsHighCostEligible] = useState<boolean>(true); // Код 2 дорогостоящее лечение

	// 3 Defined Clinical Plan Options (Clean patient-facing presentation)
	const planTiers: PlanTier[] = useMemo(
		() => [
			{
				id: "basic",
				badge: "Стандарт",
				title: "Терапевтический минимум",
				subtitle: "Купирование боли, устранение кариеса и базовая функциональность",
				isRecommended: false,
				accentClass: "from-slate-700 to-slate-900",
				badgeClass: "bg-slate-700 text-slate-200 border-slate-600",
				borderClass: "border-slate-700 hover:border-slate-500",
				totalRub: 34500,
				durationWeeks: 2,
				warrantyYears: 1,
				icon: <Shield size={24} className="text-slate-300" />,
				features: [
					"Устранение всех кариозных полостей (3 зуба)",
					"Стандартные светоотверждаемые композиты Filtek",
					"Профессиональная ультразвуковая чистка",
					"Контрольные прицельные снимки",
					"Базовая гарантия клиники 1 год",
				],
				stages: [
					{ title: "Диагностика и гигиена", desc: "Ультразвуковой скейлинг, рентген", count: "1 визит" },
					{ title: "Терапия кариеса", desc: "Пломбирование зубов 16, 24, 36", count: "2 визита" },
				],
			},
			{
				id: "optimum",
				badge: "Выбор клиники",
				title: "Комплексный Оптимум",
				subtitle: "Биомиметическая реставрация, керамические вкладки и защита от рецидивов",
				isRecommended: true,
				accentClass: "from-teal-900/60 to-emerald-950/60",
				badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/40",
				borderClass: "border-teal-500 shadow-xl shadow-teal-500/10",
				totalRub: 98000,
				durationWeeks: 4,
				warrantyYears: 3,
				icon: <Sparkles size={24} className="text-teal-400" />,
				features: [
					"Эндодонтия под микроскопом (зуб 24)",
					"2 керамические вкладки E.max (высокая прочность)",
					"1 коронка из диоксида циркония Prettau (зуб 36)",
					"Комплексная гигиена Air-Flow Prophylaxis Master",
					"3 года расширенной гарантии + бесплатные осмотры",
				],
				stages: [
					{ title: "Санация и эндодонтия", desc: "Лечение каналов под микроскопом", count: "1 визит" },
					{ title: "3D-сканирование и моделирование", desc: "Цифровой слепок CAD/CAM", count: "1 визит" },
					{ title: "Фиксация керамики E.max", desc: "Адгезивная фиксация вкладок и коронки", count: "1 визит" },
				],
			},
			{
				id: "premium",
				badge: "VIP Премиум",
				title: "Тотальная Эстетика & Имплантация",
				subtitle: "Цифровой дизайн улыбки DSD, безметалловая керамика и пожизненная гарантия",
				isRecommended: false,
				accentClass: "from-amber-950/50 to-purple-950/50",
				badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
				borderClass: "border-amber-500/40 hover:border-amber-400",
				totalRub: 215000,
				durationWeeks: 8,
				warrantyYears: 5,
				icon: <Crown size={24} className="text-amber-400" />,
				features: [
					"Навигационная имплантация Straumann (Швейцария)",
					"Индивидуальный циркониевый абатмент",
					"Ультратонкие виниры E.max на фронтальную зону (4 ед.)",
					"Цифровой дизайн улыбки Digital Smile Design",
					"Пожизненная гарантия на имплантат и персональный куратор",
				],
				stages: [
					{ title: "3D Навигационный протокол", desc: "КЛКТ, виртуальная расстановка", count: "1 визит" },
					{ title: "Установка имплантата Straumann", desc: "Малоинвазивный хирургический шаблон", count: "1 визит" },
					{ title: "Фиксация виниров и постоянной коронки", desc: "Тотальная эстетика улыбки", count: "2 визита" },
				],
			},
		],
		[],
	);

	const currentPlan: PlanTier = useMemo(() => {
		return planTiers.find((t) => t.id === selectedTierId) ?? (planTiers[0] as PlanTier);
	}, [planTiers, selectedTierId]);

	// 13% Tax Refund calculations
	const taxRefundAmount = useMemo(() => {
		if (isHighCostEligible) {
			// Код 2 - без ограничения 150 000 руб
			return Math.round(currentPlan.totalRub * 0.13);
		}
		// Код 1 - лимит 150 000 руб (макс возврат 19 500 руб)
		return Math.min(Math.round(currentPlan.totalRub * 0.13), 19500);
	}, [currentPlan.totalRub, isHighCostEligible]);

	const netPriceAfterTax = useMemo(() => {
		return currentPlan.totalRub - taxRefundAmount;
	}, [currentPlan.totalRub, taxRefundAmount]);

	// Installment calculation
	const monthlyPayment = useMemo(() => {
		return Math.round(currentPlan.totalRub / installmentMonths);
	}, [currentPlan.totalRub, installmentMonths]);

	const handlePrintPresentation = () => {
		window.print();
	};

	const handleSendToPatient = () => {
		showToast(`План «${currentPlan.title}» отправлен в Telegram / WhatsApp пациенту`, "success");
	};

	return (
		<div
			data-testid="case-presentation-view"
			className="case-presentation min-h-screen bg-[var(--paper-soft,#090d16)] text-[var(--ink,#f8fafc)] flex flex-col p-4 md:p-8 select-none"
		>
			{/* Top Bar for Patient Presentation */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#111827)] border border-slate-800 rounded-3xl p-5 shadow-2xl">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="h-12 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2 border border-slate-700 active:scale-95 transition-all text-sm cursor-pointer shadow"
						title="Вернуться к рабочему столу клиники"
					>
						<ArrowLeft size={18} />
						<span>Закрыть экран презентации</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-extrabold text-teal-400 bg-teal-950 px-3 py-1 rounded-full border border-teal-500/40">
								Второй экран · Презентация планов лечения
							</span>
						</div>
						<h1 className="text-xl md:text-2xl font-black text-white m-0 mt-1.5 flex items-center gap-2">
							<span>План лечения для:</span>
							<span className="text-teal-300">{activePatient?.fullName || "Уважаемого Пациента"}</span>
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={handlePrintPresentation}
						className="h-12 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-700 cursor-pointer transition-colors"
					>
						<Printer size={16} />
						<span>Распечатать смету</span>
					</button>
					<button
						type="button"
						onClick={handleSendToPatient}
						className="h-12 px-5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/30 border border-teal-400/40 cursor-pointer active:scale-95 transition-all"
					>
						<Send size={16} />
						<span>Отправить в мессенджер</span>
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="mt-6 flex flex-col gap-6 flex-1">
				{/* 3 Tier Comparison Cards */}
				<section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
					{planTiers.map((tier) => {
						const isSelected = selectedTierId === tier.id;
						return (
							<motion.div
								key={tier.id}
								onClick={() => setSelectedTierId(tier.id)}
								whileHover={{ scale: 1.015 }}
								whileTap={{ scale: 0.99 }}
								className={`rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between bg-gradient-to-b ${tier.accentClass} ${
									isSelected ? tier.borderClass : "border-slate-800 opacity-80 hover:opacity-100"
								}`}
							>
								<div>
									<div className="flex items-center justify-between mb-3">
										<span
											className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${tier.badgeClass}`}
										>
											{tier.badge}
										</span>
										<div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60">
											{tier.icon}
										</div>
									</div>

									<h3 className="text-xl font-black text-white m-0 mb-1">{tier.title}</h3>
									<p className="text-xs text-slate-300 m-0 mb-5 leading-relaxed min-h-[36px]">
										{tier.subtitle}
									</p>

									{/* Price Banner */}
									<div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-5 text-center">
										<div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
											Полная стоимость
										</div>
										<div className="text-3xl font-black text-white mt-1">
											{tier.totalRub.toLocaleString("ru-RU")} ₽
										</div>
										<div className="text-xs text-teal-400 font-semibold mt-1 flex items-center justify-center gap-2">
											<span>Срок: {tier.durationWeeks} нед.</span>
											<span>·</span>
											<span>Гарантия: {tier.warrantyYears} года</span>
										</div>
									</div>

									{/* Features List */}
									<div className="space-y-2.5 mb-6">
										<div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
											Что входит в план:
										</div>
										{tier.features.map((feat, idx) => (
											<div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
												<CheckCircle2 size={16} className="text-teal-400 shrink-0 mt-0.5" />
												<span>{feat}</span>
											</div>
										))}
									</div>
								</div>

								{/* Select Option Radio Button */}
								<button
									type="button"
									className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
										isSelected
											? "bg-teal-500 text-slate-950 border-white shadow-lg shadow-teal-500/20"
											: "bg-slate-800 text-slate-300 border-slate-700"
									}`}
								>
									{isSelected ? (
										<>
											<Check size={18} /> Выбранный вариант
										</>
									) : (
										"Выбрать этот вариант"
									)}
								</button>
							</motion.div>
						);
					})}
				</section>

				{/* Financial Calculations: 13% Tax Refund & 0% Installment Schedule */}
				<section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
					{/* 13% Tax Refund Calculator */}
					<div className="lg:col-span-6 bg-[var(--paper,#111827)] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
										<Percent size={22} />
									</div>
									<div>
										<h3 className="text-base font-bold text-white m-0">
											Налоговый вычет 13% (Возврат от государства)
										</h3>
										<p className="text-xs text-slate-400 m-0">
											Официальный возврат НДФЛ через ФНС России
										</p>
									</div>
								</div>
							</div>

							{/* High-cost treatment toggle */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 mb-4 text-xs">
								<span className="text-slate-300">Категория лечения (Справка КНД 1151156):</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setIsHighCostEligible(false)}
										className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
											!isHighCostEligible
												? "bg-teal-600 text-white"
												: "bg-slate-800 text-slate-400 hover:text-white"
										}`}
									>
										Код 1 (Обычное)
									</button>
									<button
										type="button"
										onClick={() => setIsHighCostEligible(true)}
										className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
											isHighCostEligible
												? "bg-teal-600 text-white"
												: "bg-slate-800 text-slate-400 hover:text-white"
										}`}
									>
										Код 2 (Дорогостоящее)
									</button>
								</div>
							</div>

							{/* Calculation Grid */}
							<div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 mb-4">
								<div>
									<div className="text-xs text-emerald-300/80">Сумма возврата на карту:</div>
									<div className="text-2xl font-black text-emerald-400 mt-1">
										+ {taxRefundAmount.toLocaleString("ru-RU")} ₽
									</div>
								</div>
								<div>
									<div className="text-xs text-slate-400">Реальная цена для вас:</div>
									<div className="text-2xl font-black text-white mt-1">
										{netPriceAfterTax.toLocaleString("ru-RU")} ₽
									</div>
								</div>
							</div>
						</div>

						<p className="text-xs text-slate-400 m-0 leading-relaxed">
							💡 Клиника бесплатно подготовит полный пакет документов для налоговой в 1 клик (справка КНД 1151156, копия лицензии, договор).
						</p>
					</div>

					{/* 0% Installment Schedule Calculator */}
					<div className="lg:col-span-6 bg-[var(--paper,#111827)] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
										<Calendar size={22} />
									</div>
									<div>
										<h3 className="text-base font-bold text-white m-0">
											Беспроцентная рассрочка 0%
										</h3>
										<p className="text-xs text-slate-400 m-0">
											Без переплат, скрытых комиссий и банковских процентов
										</p>
									</div>
								</div>
							</div>

							{/* Month Buttons */}
							<div className="mb-4">
								<div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
									Срок рассрочки:
								</div>
								<div className="grid grid-cols-4 gap-2">
									{[3, 6, 12, 24].map((m) => (
										<button
											key={m}
											type="button"
											onClick={() => setInstallmentMonths(m)}
											className={`h-11 rounded-xl font-black text-xs transition-all border cursor-pointer ${
												installmentMonths === m
													? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
													: "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
											}`}
										>
											{m} мес.
										</button>
									))}
								</div>
							</div>

							{/* Monthly Payment Summary */}
							<div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
								<div>
									<div className="text-xs text-purple-300/80">Ежемесячный платёж:</div>
									<div className="text-2xl font-black text-purple-300 mt-0.5">
										{monthlyPayment.toLocaleString("ru-RU")} ₽ / месяц
									</div>
								</div>
								<div className="text-right text-xs text-slate-400">
									<div>Переплата: <strong className="text-emerald-400">0 ₽</strong></div>
									<div>Первый взнос: <strong className="text-white">{monthlyPayment.toLocaleString("ru-RU")} ₽</strong></div>
								</div>
							</div>
						</div>

						<p className="text-xs text-slate-400 m-0 mt-3 leading-relaxed">
							Удобный график платежей без процентов. Оформление за 2 минуты у администратора на ресепшн.
						</p>
					</div>
				</section>
			</main>
		</div>
	);
}
