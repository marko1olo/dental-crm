/**
 * DENTE CRM — Medical Record & Visit Diary Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x, 8y
 *
 * 1-Page Clinical Cheat Sheet:
 * - SOAP Diary format: complaints, anamnesis, objective status, therapy
 * - 1-Click physiological norm for healthy somatic status
 * - Voice dictation at chairside (continuous speech recognition)
 * - Printable documents: medical outpatient record, informed consent, acts
 * - Hotkeys (Ctrl+S, F12, F4) & FAQs
 */

import React from "react";
import {
	CheckCircle2,
	FileText,
	Gamepad2,
	HelpCircle,
	Mic,
	Printer,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const MedicalRecordGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
					<FileText size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Медицинская карта и дневник приёма</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300">
							Автосохранение (Ctrl+S)
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Электронная медицинская карта пациента у кресла: жалобы, анамнез, объективный осмотр и протоколы лечения.
						Поддерживает автонорму в 1 клик, диктовку голосом и печать официальных документов в любой момент.
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
					Раздел освобождает врача от бумажной рутины и защищает клинику юридически.
					Врач заполняет приём за 1–2 минуты благодаря готовым шаблонам фраз и автоматическому сохранению каждого введённого слова.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для врача</span>
					<span className="text-[10px] text-[var(--muted)]">Приём у кресла</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Выбор протокола или норма</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Выберите профиль визита (терапия, ортопедия, хирургия, гигиена). Нажмите «✓ Осмотр в норме» для мгновенного заполнения стандартных параметров.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Диктовка или шаблоны</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Используйте голосовой ввод микрофоном у кресла или выберите готовые фразы кликом. Черновик сохраняется на лету без риска потери текста.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Утверждение и печать</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите <strong>F12</strong> для печати бланка приёма или информированного согласия. Документ печатается со штампом черновика или подписи врача.
						</p>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Быстрый ввод</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Мгновенное сохранение дневника:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							Ctrl + S (или Ctrl + Ы)
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Печать карты и согласий:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							F12
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Переход в зубную формулу:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
							F4
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Завершить визит и перейти к оплате:</span>
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
						<strong className="text-[var(--ink)] shrink-0">• Можно ли править закрытый приём?</strong>
						<span>Да! Действует клинический стандарт «Исправленному верить»: врач свободно вносит дополнения с сохранением истории изменений.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Блокирует ли аллергия пациента кнопку сохранения?</strong>
						<span>Никогда! Согласно Мандату 8y, аллергия отображается как пассивная предупреждающая плашка, а врач сохраняет полную автономию.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что если внезапно закрылась вкладка?</strong>
						<span>Все введённые фразы защищены локальным фоновым автосохранением и восстановятся при повторном открытии.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-teal-600 dark:text-teal-400" />
						<span>Интерактивный тренажёр: Дневник приёма и автосохранение</span>
					</div>
					<p className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
						Пройдите обучающий маршрут по быстрому заполнению осмотра и подготовке печатной карты.
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
