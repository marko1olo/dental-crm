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

import React, { useState } from "react";
import {
	BarChart3,
	Calculator,
	CheckCircle2,
	DollarSign,
	Download,
	Gamepad2,
	HelpCircle,
	PieChart,
	Printer,
	Sparkles,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const AnalyticsReportsGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");
	const [doctorRatePercent, setDoctorRatePercent] = useState<number>(30);
	const [isExported, setIsExported] = useState<boolean>(false);

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("reception_admin");
		} else {
			startDoctorTour("reception_admin");
		}
	};

	// Calculated mock figures
	const revenue = selectedPeriod === "today" ? 185000 : selectedPeriod === "week" ? 940000 : 3820000;
	const receiptsCount = selectedPeriod === "today" ? 13 : selectedPeriod === "week" ? 68 : 274;
	const avgCheck = Math.round(revenue / receiptsCount);
	const chairUtilization = selectedPeriod === "today" ? 82 : selectedPeriod === "week" ? 78 : 81;

	// Doctor Barabash T-51 Net Payroll calculations
	const doctorGrossRevenue = selectedPeriod === "today" ? 140000 : selectedPeriod === "week" ? 620000 : 2480000;
	const labDeductionZtl = selectedPeriod === "today" ? 18000 : selectedPeriod === "week" ? 84000 : 320000;
	const netCommissionBase = Math.max(0, doctorGrossRevenue - labDeductionZtl);
	const calculatedPayroll = Math.round((netCommissionBase * doctorRatePercent) / 100);

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

			{/* Interactive Visual Preview: KPI Dashboard & Doctor T-51 Payroll Calculator */}
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs space-y-0">
				{/* Mockup Toolbar Header */}
				<div className="p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<TrendingUp size={15} className="text-indigo-600 dark:text-indigo-400" />
						<span className="font-bold text-xs text-[var(--ink)]">
							Интерактивный дашборд руководителя
						</span>
						<span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
							Касса 54-ФЗ Онлайн
						</span>
					</div>

					<div className="flex items-center gap-1.5">
						<div className="flex items-center rounded-md border border-[var(--line)] bg-[var(--paper)] p-0.5 text-[10px]">
							<button
								type="button"
								onClick={() => setSelectedPeriod("today")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									selectedPeriod === "today"
										? "bg-indigo-600 text-white shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Сегодня
							</button>
							<button
								type="button"
								onClick={() => setSelectedPeriod("week")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									selectedPeriod === "week"
										? "bg-indigo-600 text-white shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Неделя
							</button>
							<button
								type="button"
								onClick={() => setSelectedPeriod("month")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									selectedPeriod === "month"
										? "bg-indigo-600 text-white shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Месяц
							</button>
						</div>

						<button
							type="button"
							onClick={() => {
								setIsExported(true);
								setTimeout(() => setIsExported(false), 2000);
							}}
							className="h-7 px-2 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-[10px] font-semibold inline-flex items-center gap-1 hover:bg-[var(--paper-soft)] cursor-pointer"
							title="Экспорт проводок в 1С Бухгалтерию"
						>
							<Download size={11} />
							<span>{isExported ? "Экспорт готов!" : "1С CommerceML"}</span>
						</button>
					</div>
				</div>

				{/* 4 Primary KPI Cards */}
				<div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[var(--paper)]">
					<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-1">
						<span className="text-[10px] text-[var(--muted)] block font-medium">Выручка клиники</span>
						<div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
							{revenue.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[9px] text-[var(--muted)]">{receiptsCount} закрытых чеков</div>
					</div>

					<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-1">
						<span className="text-[10px] text-[var(--muted)] block font-medium">Средний чек</span>
						<div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
							{avgCheck.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[9px] text-emerald-600 font-semibold">+8% к прошлому периоду</div>
					</div>

					<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-1">
						<span className="text-[10px] text-[var(--muted)] block font-medium">Загрузка кресел</span>
						<div className="text-base font-bold text-teal-600 dark:text-teal-400">
							{chairUtilization}%
						</div>
						<div className="text-[9px] text-[var(--muted)]">23.5 ч из 28 ч фонда</div>
					</div>

					<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-1">
						<span className="text-[10px] text-[var(--muted)] block font-medium">Доходимость первичных</span>
						<div className="text-base font-bold text-purple-600 dark:text-purple-400">
							94%
						</div>
						<div className="text-[9px] text-[var(--muted)]">16 из 17 пациентов</div>
					</div>
				</div>

				{/* Doctor T-51 Piece-Rate Net Payroll Calculator Mockup */}
				<div className="p-3 bg-[var(--paper-soft)] border-t border-[var(--line)] space-y-2.5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
							<Calculator size={14} className="text-indigo-600 dark:text-indigo-400" />
							<span>Расчетная ведомость: Расчёт сдельной зарплаты с вычетом ЗТЛ</span>
						</div>

						<div className="flex items-center gap-1 text-[11px]">
							<span className="text-[var(--muted)]">Ставка врача:</span>
							<div className="inline-flex rounded border border-[var(--line)] bg-[var(--paper)] p-0.5">
								{[25, 30, 35].map((rate) => (
									<button
										key={rate}
										type="button"
										onClick={() => setDoctorRatePercent(rate)}
										className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer transition-all ${
											doctorRatePercent === rate
												? "bg-indigo-600 text-white"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										{rate}%
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
						<table className="w-full text-left text-[11px] border-collapse">
							<thead>
								<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[10px] text-[var(--muted)]">
									<th className="p-2 font-semibold">Сотрудник / Специализация</th>
									<th className="p-2 font-semibold text-right">Грязная выручка</th>
									<th className="p-2 font-semibold text-right">Вычет счетов ЗТЛ</th>
									<th className="p-2 font-semibold text-right">База начисления</th>
									<th className="p-2 font-semibold text-right">К выплате ({doctorRatePercent}%)</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-[var(--line)]/50">
									<td className="p-2 font-semibold text-[var(--ink)]">
										<div>Барабаш С.В.</div>
										<span className="text-[9px] text-[var(--muted)] font-normal">Врач стоматолог-терапевт</span>
									</td>
									<td className="p-2 text-right font-mono text-[var(--ink)]">
										{doctorGrossRevenue.toLocaleString("ru-RU")} ₽
									</td>
									<td className="p-2 text-right font-mono text-rose-600 dark:text-rose-400">
										-{labDeductionZtl.toLocaleString("ru-RU")} ₽
									</td>
									<td className="p-2 text-right font-mono text-[var(--muted)]">
										{netCommissionBase.toLocaleString("ru-RU")} ₽
									</td>
									<td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
										{calculatedPayroll.toLocaleString("ru-RU")} ₽
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<div className="text-[10px] text-[var(--muted)] flex items-center justify-between">
						<span>Автоматическое исключение себестоимости коронок/вкладок зуботехнической лаборатории перед расчётом %</span>
						<span className="font-semibold text-indigo-600 dark:text-indigo-400">Чистая выплата без разногласий</span>
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
