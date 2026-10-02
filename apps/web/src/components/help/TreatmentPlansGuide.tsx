/**
 * DENTE CRM — Treatment Plans & Cost Estimator Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - 3-Tier Treatment Comparison: Optimal vs Base vs Premium
 * - Clinical Stages & Timeline (Therapy, Surgery, Orthopedics, Hygiene)
 * - Doctor autonomy: free discounts (up to 100% for revisions/staff)
 * - Printable patient cost estimates & staged payment schedules
 * - Hotkeys (Ctrl+P, Tab), FAQs, and interactive tour button
 */

import React, { useState } from "react";
import {
	CheckCircle2,
	Clock,
	DollarSign,
	FileSpreadsheet,
	Gamepad2,
	HelpCircle,
	Layers,
	MousePointer,
	Percent,
	Printer,
	Sparkles,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const TreatmentPlansGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [activeTier, setActiveTier] = useState<"base" | "optimal" | "premium">("optimal");

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
	};

	const tierData = {
		base: {
			title: "Базовый протокол",
			total: 45000,
			description: "Устранение острой боли, стандартная композитная реставрация",
			warranty: "1 год гарантии",
			monthly: 7500,
			stages: [
				{ name: "Этап 1: Профгигиена полости рта", price: 3500, done: true },
				{ name: "Этап 2: Лечение кариеса и пломба (композит)", price: 8500, done: false },
				{ name: "Этап 3: Металлокерамическая коронка", price: 33000, done: false },
			],
		},
		optimal: {
			title: "★ Оптимальный (Рекомендован)",
			total: 92000,
			description: "Золотой стандарт СтАР: изоляция коффердамом, вкладка e.max, диоксид циркония",
			warranty: "5 лет гарантии",
			monthly: 15333,
			stages: [
				{ name: "Этап 1: Комплексная профгигиена + AirFlow", price: 5500, done: true },
				{ name: "Этап 2: Эндодонтия под микроскопом + билдап", price: 26500, done: false },
				{ name: "Этап 3: Коронка диоксид циркония Prettau", price: 60000, done: false },
			],
		},
		premium: {
			title: "Премиальный протокол",
			total: 185000,
			description: "Индивидуальный CAD/CAM абатмент, премиальный цирконий с ручным нанесением керамики",
			warranty: "Пожизненная гарантия на конструкцию",
			monthly: 30833,
			stages: [
				{ name: "Этап 1: SPA-гигиена полости рта и реминерализация", price: 8000, done: true },
				{ name: "Этап 2: Эндодонтия Karl Kaps + биокерамика", price: 37000, done: false },
				{ name: "Этап 3: Высокоэстетичный цирконий Katana Multi-Layer", price: 140000, done: false },
			],
		},
	};

	const current = tierData[activeTier];

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
					<FileSpreadsheet size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Планы лечения и сметы</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300">
							3 варианта в 1 клик
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Инструмент наглядного согласования комплексного стоматологического лечения с пациентом.
						Сравнение 3 вариантов спецификаций (Базовый, Оптимальный, Премиум), разделение на клинические этапы и печать прозрачной сметы.
					</div>
				</div>
			</div>

			{/* НАГЛЯДНАЯ СХЕМА ПЛАНА ЛЕЧЕНИЯ (Visual Treatment Plan Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-blue-500" />
						<span>Интерактивное сравнение 3 вариантов плана лечения</span>
					</div>
					<span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
						Конверсия в согласие 85%
					</span>
				</div>

				{/* Visual Mockup Card */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs space-y-0">
					{/* 3-Tier Segmented Selector Header */}
					<div className="p-3 bg-[var(--paper)] border-b border-[var(--line)] space-y-2">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => setActiveTier("base")}
								className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
									activeTier === "base"
										? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/30"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-blue-400/50"
								}`}
							>
								<div className="text-[11px] font-semibold text-[var(--ink)]">Базовый</div>
								<div className="text-sm font-bold text-[var(--ink)]">45 000 ₽</div>
								<div className="text-[10px] text-[var(--muted)]">Стандартный композит</div>
							</button>

							<button
								type="button"
								onClick={() => setActiveTier("optimal")}
								className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
									activeTier === "optimal"
										? "bg-teal-500/15 border-teal-500 ring-1 ring-teal-500/40 shadow-xs"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-teal-400/50"
								}`}
							>
								<div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 flex items-center justify-between">
									<span>★ Оптимальный</span>
									<span className="text-[9px] bg-teal-500 text-white px-1.5 py-0.2 rounded font-semibold">
										Выбор врача
									</span>
								</div>
								<div className="text-sm font-bold text-[var(--ink)]">92 000 ₽</div>
								<div className="text-[10px] text-[var(--muted)]">e.max + цирконий</div>
							</button>

							<button
								type="button"
								onClick={() => setActiveTier("premium")}
								className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
									activeTier === "premium"
										? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/30"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-purple-400/50"
								}`}
							>
								<div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
									Премиум
								</div>
								<div className="text-sm font-bold text-[var(--ink)]">185 000 ₽</div>
								<div className="text-[10px] text-[var(--muted)]">Микроскоп + Katana</div>
							</button>
						</div>
					</div>

					{/* Active Tier Stages Breakdown */}
					<div className="p-3.5 space-y-2.5">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<span className="font-bold text-xs text-[var(--ink)]">{current.title}</span>
								<p className="text-[11px] text-[var(--muted)] mt-0.5">{current.description}</p>
							</div>
							<span className="px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[10px] font-semibold text-teal-600 dark:text-teal-400">
								{current.warranty}
							</span>
						</div>

						{/* Stages List */}
						<div className="space-y-1.5">
							{current.stages.map((stage, idx) => (
								<div
									key={stage.name}
									className="p-2 rounded bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2"
								>
									<div className="flex items-center gap-2">
										<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px]">
											{idx + 1}
										</span>
										<span className="text-[11px] font-medium text-[var(--ink)]">{stage.name}</span>
										{stage.done && (
											<span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[9px]">
												✓ Оплачено
											</span>
										)}
									</div>
									<span className="text-[11px] font-bold text-[var(--ink)] font-mono">
										{stage.price.toLocaleString("ru-RU")} ₽
									</span>
								</div>
							))}
						</div>

						{/* Installments & Discount Banner */}
						<div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
							<div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
								<Clock size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<span>
									Рассрочка 0% без переплат: <strong>{current.monthly.toLocaleString("ru-RU")} ₽ / мес</strong> на 6 месяцев.
								</span>
							</div>
							<span className="text-[10px] text-[var(--muted)]">
								Врач вправе применить скидку до 100% без паролей директора (Мандат 8e)
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-blue-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел повышает согласие пациентов на план лечения с 40% до 85% благодаря прозрачности и праву выбора.
					Пациент видит разницу в материалах и гарантиях, а врач сразу распределяет лечение по визитам с фиксацией стоимости.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для врача</span>
					<span className="text-[10px] text-[var(--muted)]">Формирование сметы</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Генерация по одонтограмме</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите «Создать план». Система автоматически собирает список патологий из зубной формулы и предлагает необходимые услуги.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Сравнение 3 вариантов</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Переключайте сценарии: «Оптимальный» (рекомендация врача), «Базовый» (эконом) и «Премиум» (максимальная эстетика и гарантии).
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Утверждение и этапы</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Утвердите выбранный вариант и разбейте на этапы: санация, хирургия, ортопедия. Распечатайте смету для подписи пациентом.
						</p>
					</div>
				</div>
			</div>

			{/* 3 Варианта плана */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Сравнение 3 сценариев лечения
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1">
						<span className="font-semibold text-neutral-600 dark:text-neutral-300 block">Базовый протокол</span>
						<p className="text-[var(--muted)] text-[10px]">
							Устранение острой боли, купирование воспаления, стандартные композитные материалы.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-teal-500/10 border border-teal-500/30 space-y-1">
						<span className="font-semibold text-teal-700 dark:text-teal-300 block">★ Оптимальный (Рекомендован)</span>
						<p className="text-[var(--muted)] text-[10px]">
							Золотой стандарт современной стоматологии: полное восстановление анатомии, изоляция коффердамом, долговечность.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1">
						<span className="font-semibold text-purple-600 dark:text-purple-400 block">Премиальный протокол</span>
						<p className="text-[var(--muted)] text-[10px]">
							Керамические реставрации, работа под микроскопом, расширенная гарантия и премиальные материалы.
						</p>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Сметный блок</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Печать официальной сметы:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-blue-600 dark:text-blue-400">
							Ctrl + P
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Переключение между сценариями:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-blue-600 dark:text-blue-400">
							Tab
						</kbd>
					</div>
				</div>
			</div>

			{/* 4. Частые вопросы и ошибки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle size={14} className="text-amber-500" />
					<span>Частые вопросы и как избежать затыков</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1.5">
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Может ли врач предоставить скидку?</strong>
						<span>Да! Врач свободен в назначении скидок (вплоть до 100% на переделки и персонал) без ввода мастер-паролей директора.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что делать, если смете больше месяца?</strong>
						<span>Срок составления плана не блокирует оплату и оказание услуг: система предупреждает об изменении цен, но не чинит препятствий.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как настроить оплату частями?</strong>
						<span>В карточке плана включите «Поэтапную оплату» — пациент сможет оплачивать визиты по мере выполнения работ.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-blue-600 dark:text-blue-400" />
						<span>Интерактивный тренажёр: Планы лечения и сметы</span>
					</div>
					<p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
						Научитесь составлять наглядные сравнительные сметы и разбивать лечение по этапам.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
