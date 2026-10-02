/**
 * DENTE CRM — Odontogram & Dental Formula Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - 2-Click pathology markup (caries, pulpitis, crown, missing, restoration)
 * - 1-Click Autonorm (Shift+N) for intact teeth
 * - FDI numbering (11–48 permanent, 51–85 primary)
 * - Hotkeys, FAQs, and interactive training tour button
 */

import React from "react";
import { Check, Gamepad2, HelpCircle, Sparkles, Zap } from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const OdontogramGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
					<Sparkles size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Зубная формула и одонтограмма</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300">
							Норма в 1 клик (Shift+N)
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Интерактивная зубная дуга по международной номенклатуре FDI (11–48 постоянные, 51–85 молочные).
						Позволяет врачу мгновенно зафиксировать состояние полости рта без рутинного прокликивания каждого здорового зуба.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Zap size={14} className="text-teal-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел служит визуальной основой всего клинического приёма: на основе формулы автоматически формируются план лечения, сметы и дневник визита.
					Врач отмечает только реальную патологию, а физиологическая норма выставляется одним нажатием клавиши.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
						<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[11px] font-bold shrink-0">
							1
						</span>
						<span>Клик 1: Выбор зуба или поверхности</span>
					</div>
					<p className="text-[var(--muted)] text-[11px] leading-relaxed">
						Кликните по номеру зуба (FDI 11–48) или конкретной анатомической поверхности:
						Окклюзионная (O), Вестибулярная (V), Медиальная (M), Дистальная (D), Язычная (L).
					</p>
					<div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
						<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono text-teal-600 dark:text-teal-400 font-bold">
							1..8
						</kbd>
						<span>— быстрый выбор квадранта (1–4 взрослые, 5–8 молочные)</span>
					</div>
				</div>

				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
						<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[11px] font-bold shrink-0">
							2
						</span>
						<span>Клик 2: Назначение патологии</span>
					</div>
					<p className="text-[var(--muted)] text-[11px] leading-relaxed">
						В появившейся шторке зуба или нажатием клавиши выберите статус.
						Цвет поверхности мгновенно меняется, диагноз добавляется в дневник приёма.
					</p>
					<div className="flex flex-wrap gap-1.5 pt-0.5">
						<span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
							Кариес (C)
						</span>
						<span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
							Пульпит (P)
						</span>
						<span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium text-[11px]">
							Коронка (K)
						</span>
						<span className="px-1.5 py-0.5 rounded bg-neutral-500/15 text-[var(--muted)] font-medium text-[11px]">
							Удален (X)
						</span>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши и статусы */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Справочник горячих клавиш и статусов зуба</span>
					<span className="text-[10px] text-[var(--muted)]">Номенклатура FDI / МКБ</span>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-[11px] text-left">
						<thead>
							<tr className="border-b border-[var(--line)] text-[var(--muted)]">
								<th className="pb-1.5 font-medium">Статус / Патология</th>
								<th className="pb-1.5 font-medium">Клавиша</th>
								<th className="pb-1.5 font-medium">Цвет</th>
								<th className="pb-1.5 font-medium">Клиническое действие</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]/50">
							<tr>
								<td className="py-1.5 font-medium text-emerald-600 dark:text-emerald-400">1-Клик Норма (Все интактны)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
										Shift + N
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Белый / Нейтральный</td>
								<td className="py-1.5 text-[var(--muted)]">Заполняет всю формулу физиологической нормой</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-amber-600 dark:text-amber-400">Кариес эмали / дентина</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										C
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Янтарный</td>
								<td className="py-1.5 text-[var(--muted)]">Поражение твердых тканей зуба</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-rose-600 dark:text-rose-400">Пульпит / Эндодонтия</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										P
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Красный</td>
								<td className="py-1.5 text-[var(--muted)]">Воспаление пульпы, обработка и пломбировка каналов</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-blue-600 dark:text-blue-400">Искусственная коронка</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										K
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Синий</td>
								<td className="py-1.5 text-[var(--muted)]">Одиночная коронка или опора мостовидного протеза</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-[var(--muted)]">Отсутствует (Удален)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										X
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Серый крест</td>
								<td className="py-1.5 text-[var(--muted)]">Адентия, экстракция ранее или плановое удаление</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-emerald-600 dark:text-emerald-400">Пломба (Реставрация)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										F
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Изумрудный</td>
								<td className="py-1.5 text-[var(--muted)]">Ранее установленная состоятельная пломба</td>
							</tr>
						</tbody>
					</table>
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
						<strong className="text-[var(--ink)] shrink-0">• Что делать, если все зубы здоровы?</strong>
						<span>Нажмите клавиши <strong>Shift + N</strong> — вся формула заполнится нормой в один миг, отмечайте только больные зубы.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как включить детские молочные зубы?</strong>
						<span>Используйте переключатель «Детский прикус» над формулой или нажмите цифры 5..8 на клавиатуре.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Сохраняются ли данные формулы?</strong>
						<span>Да, изменения фиксируются на лету при каждом клике и автоматически попадают в электронную карту пациента.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-teal-600 dark:text-teal-400" />
						<span>Интерактивный тренажёр: Зубная формула за 2 клика</span>
					</div>
					<p className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
						Запустите интерактивный квест для отработки навыка быстрой маркировки патологий и автонормы.
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
