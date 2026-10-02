/**
 * DENTE CRM — Schedule & Patient Booking Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - 5-Second 1-Click Booking without forced assistant
 * - Chair shift schedule & free window search
 * - Patient visit statuses: planned, confirmed, arrived, in_treatment, completed
 * - Essential speed keys (Space / Enter, F5, Ctrl+K)
 * - Interactive game tour integration
 */

import React from "react";
import {
	Calendar,
	CheckCircle2,
	Clock,
	Gamepad2,
	HelpCircle,
	Search,
	Sparkles,
	UserPlus,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const ScheduleGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
					<Calendar size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Расписание и приём пациентов</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300">
							Запись за 5 секунд
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Главный рабочий экран клиники для управления визитами, сменами врачей и занятостью кресел.
						Позволяет забронировать время за 5 секунд, найти свободное окно и отслеживать приём в реальном времени.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-teal-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел организует непрерывный поток пациентов без очередей и простоев кабинетов.
					Врач и администратор видят текущую смену, историю визитов и статус каждого пациента у кресла в один клик.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для врача и администратора</span>
					<span className="text-[10px] text-[var(--muted)]">3 простых шага</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Выбор свободного окна</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Кликните в свободную ячейку сетки кресла или нажмите кнопку <strong>«+ Запись»</strong> в шапке.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Выбор пациента</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Введите первые буквы фамилии или номер телефона. Новый пациент создается моментально без заполнения 50 полей.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Старт приёма</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Когда пациент пришел, статус переводится в «В кресле». Нажмите клавишу <strong>Space</strong> для входа в приём.
						</p>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Работа без мыши</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Быстрый старт и финиш приёма:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							Space / Enter
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Поиск пациента и команд:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							Ctrl + K
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Обновить расписание:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							F5
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Быстрый переход в кассу:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							F9
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
						<strong className="text-[var(--ink)] shrink-0">• Обязателен ли ассистент?</strong>
						<span>Нет! Согласно Мандату 8e (Автономия врача), запись создается мгновенно без обязательного выбора ассистента.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как перенести запись?</strong>
						<span>Просто перетащите карточку приёма мышью на другое время или другой кабинет.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что если пациент опоздал?</strong>
						<span>Длительность визита можно растянуть или сжать за нижний край карточки прямо на сетке расписания.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-teal-600 dark:text-teal-400" />
						<span>Интерактивный тренажёр: Запись за 1 клик</span>
					</div>
					<p className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
						Запустите пошаговое обучение с подсветкой кнопок и подсказками прямо на живом экране.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
