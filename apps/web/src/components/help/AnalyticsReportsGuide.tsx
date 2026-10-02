/**
 * DENTE CRM — Analytics, Reports & Payroll Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - Real-time clinic revenue, daily cash totals, average ticket
 * - Chair utilization and appointment show rate metrics
 * - Doctor piece-rate payroll calculation (T-51) with ZTL lab cost deduction
 * - Exportable financial and administrative summaries
 * - Hotkeys, FAQs, and interactive tour button
 */

import React from "react";
import {
	BarChart3,
	Calculator,
	CheckCircle2,
	DollarSign,
	Gamepad2,
	HelpCircle,
	PieChart,
	Printer,
	Sparkles,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const AnalyticsReportsGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
					<BarChart3 size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Аналитика, отчёты и зарплаты</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
							Финансовый дашборд
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Управленческий и финансовый учёт клиники в реальном времени: выручка дня, средний чек, загрузка кресел,
						конверсия первичных пациентов и автоматический расчёт сдельной заработной платы врачей.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-indigo-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел даёт руководителю и владельцу полную финансовую прозрачность клиники без задержек бухгалтерии.
					Позволяет за секунды увидеть эффективность каждого кресла, рентабельность направлений и начисленные зарплаты без ручного сведения таблиц.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для управляющего и бухгалтера</span>
					<span className="text-[10px] text-[var(--muted)]">Контроль финансов</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Выбор периода отчёта</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Выберите дату смены, текущую неделю или месяц. Все показатели рассчитываются на лету по закрытым кассовым чекам.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Анализ KPI и загрузки кресел</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Оцените ключевые метрики: процент занятости кресел (в норме 70–85%), средний чек терапевта/ортопеда и доходимость первичных.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Расчёт зарплаты (Сделка %)</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Откройте зарплатную ведомость: программа автоматически умножает выручку на персональный процент врача и вычитает счета лаборатории.
						</p>
					</div>
				</div>
			</div>

			{/* Ключевые показатели */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Основные финансовые и клинические метрики
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] text-[10px] block">Выручка клиники</span>
						<span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">День / Месяц</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] text-[10px] block">Средний чек</span>
						<span className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs">По отделениям</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] text-[10px] block">Загрузка кресел</span>
						<span className="font-semibold text-teal-600 dark:text-teal-400 text-xs">Часы / Смены</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] text-[10px] block">Зарплатная ведомость</span>
						<span className="font-semibold text-purple-600 dark:text-purple-400 text-xs">Сделка Т-51</span>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Аналитика</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Открыть раздел аналитики:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-indigo-600 dark:text-indigo-400">
							Ctrl + Alt + A
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Печать финансовой сводки:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-indigo-600 dark:text-indigo-400">
							Ctrl + P
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
						<strong className="text-[var(--ink)] shrink-0">• Видят ли врачи чужие зарплаты?</strong>
						<span>Нет! Система изолирует финансовые права: врач на личном рабочем столе видит только свои показатели и начисления.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как учитываются расходы на зуботехническую лабораторию?</strong>
						<span>Стоимость наряда автоматически списывается из базы начисления зарплаты врача согласно правилам клиники.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Можно ли выгрузить данные в 1С Бухгалтерию?</strong>
						<span>Да, кнопка «Экспорт в 1С» формирует стандартный файл CommerceML для бесшовной загрузки проводок.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-indigo-600 dark:text-indigo-400" />
						<span>Интерактивный тренажёр: Аналитика и отчёты</span>
					</div>
					<p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
						Изучите структуру дашборда выручки, загрузки кресел и расчёта сдельной оплаты труда.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
