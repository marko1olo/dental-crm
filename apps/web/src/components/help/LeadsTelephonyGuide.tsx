/**
 * DENTE CRM — Leads, Calls & Telephony Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - Real-time incoming call popup with instant patient recognition
 * - 1-Click fast lead card creation for unknown phone numbers
 * - 4-Stage Kanban Funnel: New -> Qualified -> Consultation -> Arrived
 * - 1-Click scheduling directly from call card
 * - Hotkeys (Alt+P, Ctrl+Alt+L), FAQs, and interactive tour button
 */

import React from "react";
import {
	CheckCircle2,
	Clock,
	Gamepad2,
	HelpCircle,
	Kanban,
	PhoneCall,
	PhoneForwarded,
	PhoneIncoming,
	Sparkles,
	UserPlus,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const LeadsTelephonyGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("reception_admin");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
					<PhoneCall size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Лиды, звонки и телефония</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300">
							Всплытие звонка и Канбан
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Интегрированный модуль входящих обращений клиники: моментальное определение звонящего пациента,
						автокарточка нового лида и 4-колоночный канбан для записи на консультацию без потери входящих заявок.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-rose-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел гарантирует, что ни один потенциальный пациент не потеряется после звонка или заявки с сайта.
					Администратор видит имя звонящего ещё до снятия трубки, сразу открывает историю лечения или записывает нового пациента за 5 секунд.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для администратора</span>
					<span className="text-[10px] text-[var(--muted)]">Обработка звонка</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Всплытие входящего звонка</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							При звонке на экране появляется компактная плашка с именем пациента или кнопкой «Создать карточку» для нового номера.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Квалификация в канбане</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Обращение автоматически попадает в колонку «Новые». Перемещайте карточку в «Квалифицированные» или «Консультация».
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Мгновенная запись</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите «Записать на приём» прямо в карточке звонка — программа откроет расписание и подставит данные пациента.
						</p>
					</div>
				</div>
			</div>

			{/* 4 Колонки воронки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					4 этапа воронки обращений (Канбан)
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">1. Новые</span>
						<p className="text-[var(--muted)] text-[10px]">Входящие звонки и заявки с сайта, ожидающие первого ответа.</p>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">2. Квалификация</span>
						<p className="text-[var(--muted)] text-[10px]">Уточнены жалобы, бюджет и желаемый врач стоматолог.</p>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1">3. Консультация</span>
						<p className="text-[var(--muted)] text-[10px]">Пациент записан на дату и время в расписании клиники.</p>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">4. Дошли (Приём)</span>
						<p className="text-[var(--muted)] text-[10px]">Пациент переступил порог клиники и сел в кресло врача.</p>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Телефония</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Открыть карточку текущего звонка:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-rose-600 dark:text-rose-400">
							Alt + P
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Канбан воронки обращений:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-rose-600 dark:text-rose-400">
							Ctrl + Alt + L
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
						<strong className="text-[var(--ink)] shrink-0">• Какие АТС поддерживаются?</strong>
						<span>Любые популярные провайдеры: UIS / CoMagic, Mango Telecom, Zadarma, Ростелеком, Мегафон и Asterisk.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Можно ли прослушать запись разговора?</strong>
						<span>Да, аудиозапись разговора прикрепляется к карточке пациента и обращению, доступна для прослушивания в 1 клик.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Мешает ли плашка звонка врачу на приёме?</strong>
						<span>Нет! Согласно правилу системной тишины, плашка входящего звонка отображается деликатно в служебном углу и не перекрывает активный приём.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-rose-600 dark:text-rose-400" />
						<span>Интерактивный тренажёр: Звонки и воронка лидов</span>
					</div>
					<p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
						Отработайте приём звонка, создание карточки пациента и запись на консультацию за 15 секунд.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
