import {
	formatKopecksRu,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
} from "@dental/shared";
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
	const [isHighCostEligible, setIsHighCostEligible] = useState<boolean>(true);

	// 3 Defined Clinical Plan Options
	const planTiers: PlanTier[] = useMemo(
		() => [
			{
				id: "basic",
				badge: "Стандарт",
				title: "Терапевтический минимум",
				subtitle: "Купирование боли, устранение кариеса и базовая функциональность",
				isRecommended: false,
				badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
				borderClass: "border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600",
				totalRub: 34500,
				durationWeeks: 2,
				warrantyYears: 1,
				icon: <Shield size={22} className="text-slate-500 dark:text-slate-400" />,
				features: [
					"Устранение всех кариозных полостей (3 зуба)",
					"Светоотверждаемые композиты Filtek",
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
				badge: "Оптимум (Выбор врача)",
				title: "Комплексная реабилитация",
				subtitle: "Имплантация, лечение под микроскопом и безметалловая керамика",
				isRecommended: true,
				badgeClass: "bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border-teal-400/50",
				borderClass: "border-teal-500 ring-2 ring-teal-500/20 shadow-lg shadow-teal-500/10",
				totalRub: 148000,
				durationWeeks: 8,
				warrantyYears: 5,
				icon: <Sparkles size={22} className="text-teal-600 dark:text-teal-400" />,
				features: [
					"Дентальная имплантация Osstem (1 единица)",
					"Циркониевая коронка на винтовой фиксации",
					"Эндодонтия каналов под дентальным микроскопом",
					"Air-Flow гигиена с глицином",
					"Расширенная гарантия клиники 5 лет",
				],
				stages: [
					{ title: "Санация и подготовка", desc: "Лечение каналов зуба 26 под микроскопом", count: "2 визита" },
					{ title: "Хирургический этап", desc: "Установка имплантата с формирователем десны", count: "1 визит" },
					{ title: "Ортопедический этап", desc: "Снятие цифровых слепков и фиксация коронки", count: "2 визита" },
				],
			},
			{
				id: "premium",
				badge: "VIP Премиум",
				title: "Эстетическая реконструкция",
				subtitle: "Премиум имплантаты Straumann SLActive, цирконий E.max и седация",
				isRecommended: false,
				badgeClass: "bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-400/50",
				borderClass: "border-purple-500/80 hover:border-purple-400 dark:border-purple-600 shadow-md",
				totalRub: 295000,
				durationWeeks: 6,
				warrantyYears: 10,
				icon: <Crown size={22} className="text-purple-600 dark:text-purple-400" />,
				features: [
					"Швейцарские имплантаты Straumann Roxolid",
					"Керамические виниры и коронки E.max (4 единицы)",
					"Лечение во сне / Лёгкая седация (Закись азота)",
					"Персональный консьерж и VIP-палата",
					"Пожизненная гарантия на имплантаты",
				],
				stages: [
					{ title: "VIP 3D-моделирование", desc: "Digital Smile Design и виртуальный сетап", count: "1 визит" },
					{ title: "Хирургия в седации", desc: "Атравматичная имплантация Straumann", count: "1 визит" },
					{ title: "Финальная эстетика", desc: "Фиксация безметалловой керамики E.max", count: "2 визита" },
				],
			},
		],
		[],
	);

	const currentPlan: PlanTier = useMemo(() => {
		const found = planTiers.find((t) => t.id === selectedTierId);
		return found ?? planTiers[0]!;
	}, [planTiers, selectedTierId]);

	// 13% Tax Deduction (NDFL) & Installment Calculations with Exact Kopeck Arithmetic
	const planKopecks = useMemo(() => parseKopecks(currentPlan.totalRub), [currentPlan.totalRub]);

	const taxRefundKopecks = useMemo(() => {
		if (isHighCostEligible) {
			// Code 02 (дорогостоящее лечение) — 13% без лимита
			return percentageOfKopecks(planKopecks, 1300);
		}
		// Code 01 (стандартное лечение) — 13% с лимитом базы 150 000 ₽ (максимум 19 500 ₽ вычета)
		const cappedBaseKopecks = Math.min(planKopecks, parseKopecks(150000));
		return percentageOfKopecks(cappedBaseKopecks, 1300);
	}, [planKopecks, isHighCostEligible]);

	const finalPriceWithRefundKopecks = useMemo(
		() => planKopecks - taxRefundKopecks,
		[planKopecks, taxRefundKopecks],
	);

	const monthlyInstallmentKopecks = useMemo(() => {
		const parts = splitKopecks(planKopecks, installmentMonths || 1);
		return parts[0];
	}, [planKopecks, installmentMonths]);

	const handlePrintPresentation = () => {
		window.print();
	};

	const handleSendToPatient = () => {
		showToast(`План «${currentPlan.title}» отправлен пациенту в мессенджер`, "success");
	};

	return (
		<div
			data-testid="case-presentation-view"
			className="case-presentation min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 text-[var(--ink,#0f172a)] dark:text-slate-100 flex flex-col p-4 md:p-8 select-none"
		>
			{/* Top Bar for Patient Presentation */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-5 shadow-sm">
				<div className="flex items-center gap-4 flex-wrap">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[48px] px-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Вернуться к рабочему столу клиники"
					>
						<ArrowLeft size={18} />
						<span>Закрыть экран презентации</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-3 py-0.5 rounded-full border border-teal-500/40">
								Второй экран · Презентация планов лечения
							</span>
						</div>
						<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1 flex items-center gap-2 flex-wrap">
							<span>План лечения для:</span>
							<span className="text-teal-700 dark:text-teal-300">{activePatient?.fullName || "Уважаемого Пациента"}</span>
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					<button
						type="button"
						onClick={handlePrintPresentation}
						className="min-h-[48px] px-4 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs rounded-xl flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer transition-colors shadow-sm active:scale-95"
					>
						<Printer size={16} />
						<span>Распечатать смету</span>
					</button>
					<button
						type="button"
						onClick={handleSendToPatient}
						className="min-h-[48px] px-5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-teal-600/20 border border-teal-500/30 cursor-pointer active:scale-95 transition-all"
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
								whileHover={{ scale: 1.01 }}
								whileTap={{ scale: 0.99 }}
								className={`rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between bg-[var(--paper,#ffffff)] dark:bg-slate-900 shadow-sm ${
									isSelected ? tier.borderClass : "border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-[var(--line-strong,#cbd5e1)] dark:hover:border-slate-700"
								}`}
							>
								<div>
									<div className="flex items-center justify-between mb-3">
										<span
											className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${tier.badgeClass}`}
										>
											{tier.badge}
										</span>
										<div className="p-2 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700">
											{tier.icon}
										</div>
									</div>

									<h3 className="text-xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mb-1">{tier.title}</h3>
									<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mb-5 leading-relaxed min-h-[36px]">
										{tier.subtitle}
									</p>

									{/* Price Banner */}
									<div className="p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-5 text-center">
										<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 uppercase font-bold tracking-wider">
											Полная стоимость
										</div>
										<div className="text-3xl font-black text-[var(--ink,#0f172a)] dark:text-white mt-1">
											{formatKopecksRu(parseKopecks(tier.totalRub))}
										</div>
										<div className="text-xs text-teal-700 dark:text-teal-300 font-semibold mt-1 flex items-center justify-center gap-2">
											<span>Срок: {tier.durationWeeks} нед.</span>
											<span>·</span>
											<span>Гарантия: {tier.warrantyYears} лет</span>
										</div>
									</div>

									{/* Included Features List */}
									<div className="space-y-2.5 mb-6">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)] dark:text-slate-400 tracking-wider">
											Что включено в план:
										</div>
										{tier.features.map((feat, idx) => (
											<div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200">
												<CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
												<span>{feat}</span>
											</div>
										))}
									</div>
								</div>

								{/* Select Button */}
								<button
									type="button"
									className={`w-full min-h-[48px] py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
										isSelected
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#cbd5e1)] dark:border-slate-700"
									}`}
								>
									<span>{isSelected ? "Выбран данный план" : "Выбрать этот вариант"}</span>
									<ChevronRight size={16} />
								</button>
							</motion.div>
						);
					})}
				</section>

				{/* Financial Calculators: 13% Tax Deduction & 0% Installment */}
				<section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
					{/* 13% Tax Deduction (NDFL) Card */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
										<Percent size={20} />
									</div>
									<div>
										<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
											Налоговый вычет 13% (Справка НДФЛ)
										</h3>
										<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">Возврат денег государством от стоимости лечения</p>
									</div>
								</div>
								<span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/40">
									КНД 1151156
								</span>
							</div>

							<div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-4">
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">Вы вернете обратно (13%):</div>
									<div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
										+ {formatKopecksRu(taxRefundKopecks)}
									</div>
								</div>
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">Фактическая цена лечения:</div>
									<div className="text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white mt-0.5">
										{formatKopecksRu(finalPriceWithRefundKopecks)}
									</div>
								</div>
							</div>

							<label className="flex items-center gap-2.5 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 font-semibold cursor-pointer min-h-[44px]">
								<input
									type="checkbox"
									checked={isHighCostEligible}
									onChange={(e) => setIsHighCostEligible(e.target.checked)}
									className="w-4 h-4 rounded border-[var(--line,#cbd5e1)] text-teal-600 focus:ring-teal-500"
								/>
								<span>Дорогостоящее лечение (Код услуги 2 — возврат 13% без лимита в 150 000 ₽)</span>
							</label>
						</div>

						<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center justify-between">
							<span>Справка формируется администратором в 1 клик</span>
							<span className="font-bold text-teal-700 dark:text-teal-300">Форма 2026 года</span>
						</div>
					</div>

					{/* 0% Installment Calculator Card */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-500/30">
										<Calculator size={20} />
									</div>
									<div>
										<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
											Рассрочка без переплат (0%)
										</h3>
										<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">Фиксация стоимости и комфортный график платежей</p>
									</div>
								</div>
								<span className="text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/70 px-3 py-1 rounded-full border border-teal-500/40">
									Без % банку
								</span>
							</div>

							<div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-4">
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">Ежемесячный платёж:</div>
									<div className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">
										{formatKopecksRu(monthlyInstallmentKopecks)} / мес
									</div>
								</div>
								<div className="text-right">
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">Срок рассрочки:</div>
									<div className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-white">{installmentMonths} месяцев</div>
								</div>
							</div>

							{/* Month Buttons */}
							<div className="flex items-center gap-2">
								{[3, 6, 12, 24].map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setInstallmentMonths(m)}
										className={`flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
											installmentMonths === m
												? "bg-teal-600 text-white border-teal-600 shadow-sm"
												: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
										}`}
									>
										{m} мес
									</button>
								))}
							</div>
						</div>

						<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center justify-between">
							<span>Первый взнос: 0 ₽ при оформлении</span>
							<span className="font-bold text-teal-700 dark:text-teal-300">Одобрение за 2 минуты</span>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
