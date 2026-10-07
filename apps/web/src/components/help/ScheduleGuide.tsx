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

import React, { useState } from "react";
import {
	Calendar,
	CheckCircle2,
	Clock,
	Gamepad2,
	HelpCircle,
	MousePointer,
	Plus,
	Search,
	Sparkles,
	User,
	UserPlus,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const ScheduleGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
	const [activeBookingDemo, setActiveBookingDemo] = useState(false);

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
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

			{/* НАГЛЯДНАЯ СХЕМА ИНТЕРФЕЙСА (Visual Component Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-teal-500" />
						<span>Интерактивная карта экрана «Расписание»</span>
					</div>
					<span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
						Кликните в свободную ячейку
					</span>
				</div>

				{/* Visual Mockup Window */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs">
					{/* Mockup Toolbar */}
					<div className="px-3 py-2 border-b border-[var(--line)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-[var(--ink)]">Сетка дня: Сегодня</span>
							<span className="text-[10px] px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
								2 кресла · 5 приёмов
							</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="relative flex items-center">
								<button
									type="button"
									onClick={() => setActiveBookingDemo(true)}
									className="px-2.5 py-1 rounded bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs hover:bg-teal-600 transition-all cursor-pointer relative ring-2 ring-teal-400/40"
									title="Быстрая запись за 5 секунд"
								>
									<Plus size={12} />
									<span>+ Запись (N)</span>
									<span className="absolute -top-1 -right-1 flex h-2 w-2">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
									</span>
								</button>
							</div>
						</div>
					</div>

					{/* Mockup Grid */}
					<div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
						{/* Column 1: Chair 1 */}
						<div className="space-y-2">
							<div className="text-[11px] font-semibold text-[var(--ink)] pb-1 border-b border-[var(--line)] flex items-center justify-between">
								<span>Кресло 1: Терапия (Д-р Барабаш)</span>
								<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● В сети</span>
							</div>

							{/* Appointment 1 */}
							<div className="p-2 rounded border border-emerald-500/30 bg-emerald-500/10 space-y-1">
								<div className="flex items-center justify-between text-[11px]">
									<span className="font-bold text-emerald-800 dark:text-emerald-200">09:00 – 10:30</span>
									<span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
										✓ Завершён
									</span>
								</div>
								<div className="text-[11px] font-semibold text-[var(--ink)]">Барабаш С.В. · Зуб 2.6</div>
								<div className="text-[10px] text-[var(--muted)]">Пульпит, пломбирование каналов · Оплачено 12 500 ₽</div>
							</div>

							{/* Appointment 2 */}
							<div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 space-y-1 relative ring-1 ring-amber-500/30">
								<div className="flex items-center justify-between text-[11px]">
									<span className="font-bold text-amber-800 dark:text-amber-200">10:30 – 12:00</span>
									<span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse">
										● В кресле
									</span>
								</div>
								<div className="text-[11px] font-semibold text-[var(--ink)]">Смирнова Е.А. · Зуб 1.5</div>
								<div className="text-[10px] text-[var(--muted)]">Лечение кариеса, световая пломба</div>
								<div className="pt-0.5 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
									<Clock size={11} />
									<span>Идёт приём: осталось 25 мин (Space: завершить)</span>
								</div>
							</div>

							{/* Free Slot */}
							<button
								type="button"
								onClick={() => {
									setSelectedSlot("12:00");
									setActiveBookingDemo(true);
								}}
								className={`w-full p-2.5 rounded border border-dashed text-left transition-all cursor-pointer ${
									selectedSlot === "12:00"
										? "border-teal-500 bg-teal-500/15"
										: "border-[var(--line)] hover:border-teal-500/60 bg-[var(--paper)]/50 hover:bg-teal-500/5"
								}`}
							>
								<div className="flex items-center justify-between text-[11px]">
									<span className="font-bold text-teal-600 dark:text-teal-400">+ 12:00 – 13:00 (60 мин)</span>
									<span className="text-[10px] text-[var(--muted)]">Свободное окно</span>
								</div>
								<div className="text-[10px] text-[var(--muted)] mt-0.5">Кликните для записи пациента за 5 секунд</div>
							</button>
						</div>

						{/* Column 2: Chair 2 */}
						<div className="space-y-2">
							<div className="text-[11px] font-semibold text-[var(--ink)] pb-1 border-b border-[var(--line)] flex items-center justify-between">
								<span>Кресло 2: Хирургия (Д-р Иванов)</span>
								<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● В сети</span>
							</div>

							{/* Free Slot */}
							<button
								type="button"
								onClick={() => {
									setSelectedSlot("09:00");
									setActiveBookingDemo(true);
								}}
								className={`w-full p-2.5 rounded border border-dashed text-left transition-all cursor-pointer ${
									selectedSlot === "09:00"
										? "border-teal-500 bg-teal-500/15"
										: "border-[var(--line)] hover:border-teal-500/60 bg-[var(--paper)]/50 hover:bg-teal-500/5"
								}`}
							>
								<div className="flex items-center justify-between text-[11px]">
									<span className="font-bold text-teal-600 dark:text-teal-400">+ 09:00 – 10:30 (90 мин)</span>
									<span className="text-[10px] text-[var(--muted)]">Свободное окно</span>
								</div>
								<div className="text-[10px] text-[var(--muted)] mt-0.5">Резерв под хирургию / имплантацию</div>
							</button>

							{/* Appointment 3 */}
							<div className="p-2 rounded border border-blue-500/30 bg-blue-500/10 space-y-1">
								<div className="flex items-center justify-between text-[11px]">
									<span className="font-bold text-blue-800 dark:text-blue-200">10:30 – 11:30</span>
									<span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
										Ожидает приёма
									</span>
								</div>
								<div className="text-[11px] font-semibold text-[var(--ink)]">Кузнецов Д.И. · Зуб 3.8</div>
								<div className="text-[10px] text-[var(--muted)]">Сложное удаление ретинированного зуба</div>
							</div>

							{/* Appointment 4 */}
							<div className="p-2 rounded border border-[var(--line)] bg-[var(--paper)] space-y-1">
								<div className="flex items-center justify-between text-[11px]">
									<span className="font-bold text-[var(--ink)]">11:30 – 13:00</span>
									<span className="text-[10px] text-[var(--muted)]">Плановая запись</span>
								</div>
								<div className="text-[11px] font-semibold text-[var(--ink)]">Попова А.Н. · Консультация</div>
								<div className="text-[10px] text-[var(--muted)]">Первичный осмотр и составление плана</div>
							</div>
						</div>
					</div>

					{/* Simulated 5-Second Booking Feedback Popup */}
					{activeBookingDemo && (
						<div className="p-2.5 bg-teal-500/15 border-t border-teal-500/30 flex items-center justify-between gap-2 text-[11px] text-teal-800 dark:text-teal-200 animate-in fade-in duration-150">
							<div className="flex items-center gap-2">
								<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>
									<strong>Окно забронировано за 5 секунд!</strong> Пациент: Новиков И.В. · Время: {selectedSlot || "12:00"} · Ассистент не требуется.
								</span>
							</div>
							<button
								type="button"
								onClick={() => setActiveBookingDemo(false)}
								className="text-[10px] font-bold underline hover:text-teal-900 dark:hover:text-teal-100 cursor-pointer shrink-0"
							>
								Скрыть
							</button>
						</div>
					)}
				</div>

				{/* Visual Legend / Badges */}
				<div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)] pt-1">
					<span className="font-semibold text-[var(--ink)]">Цветовые маркеры:</span>
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
						● Жёлтый — в кресле прямо сейчас
					</span>
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
						✓ Зеленый — приём успешно закрыт
					</span>
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
						○ Синий — пациент ожидает на ресепшене
					</span>
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
						<span>Нет! Запись создается мгновенно без обязательного выбора ассистента.</span>
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

