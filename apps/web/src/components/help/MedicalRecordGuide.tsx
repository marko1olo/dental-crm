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

import React, { useState } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	FileText,
	Gamepad2,
	HelpCircle,
	Mic,
	MousePointer,
	Printer,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const MedicalRecordGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [isNormaActive, setIsNormaActive] = useState(false);
	const [isDictating, setIsDictating] = useState(false);
	const [isPrintedDemo, setIsPrintedDemo] = useState(false);

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

			{/* НАГЛЯДНАЯ СХЕМА КАРТЫ 043/у (Visual Medical Record Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-teal-500" />
						<span>Интерактивная карта приёма стоматологического больного (043/у)</span>
					</div>
					<span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
						Кликните «✓ Осмотр в норме»
					</span>
				</div>

				{/* Visual Mockup Card */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs space-y-0">
					{/* Header Info Strip */}
					<div className="px-3.5 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="font-bold text-xs text-[var(--ink)]">
								Барабаш С.В. (42 года) · Зуб 2.6
							</span>
							<span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20">
								Терапия
							</span>
							{/* Non-blocking Allergy Badge */}
							<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30">
								<AlertTriangle size={10} />
								<span>Аллергия: Пенициллин (учтено)</span>
							</span>
						</div>

						{/* Autosave Indicator (Mandate 8e) */}
						<div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
							<CheckCircle2 size={13} />
							<span>СОХРАНЕНО (Ctrl+S)</span>
						</div>
					</div>

					{/* 1-Click Action Bar */}
					<div className="px-3.5 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => setIsNormaActive((prev) => !prev)}
								className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									isNormaActive
										? "bg-emerald-600 text-white shadow-xs"
										: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
								}`}
								title="Заполнить осмотр физиологической нормой"
							>
								<Check size={13} />
								<span>{isNormaActive ? "✓ Норма применена" : "✓ Осмотр в норме"}</span>
							</button>

							<button
								type="button"
								onClick={() => setIsDictating((prev) => !prev)}
								className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									isDictating
										? "bg-rose-600 text-white animate-pulse"
										: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-teal-500"
								}`}
								title="Голосовой ввод у кресла через микрофон"
							>
								<Mic size={13} className={isDictating ? "text-white" : "text-teal-500"} />
								<span>{isDictating ? "Слушаю врача..." : "Диктовка голосом"}</span>
							</button>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => {
									setIsPrintedDemo(true);
									setTimeout(() => setIsPrintedDemo(false), 3000);
								}}
								className="px-2.5 py-1 rounded bg-[var(--paper)] border border-[var(--line)] hover:border-teal-500 text-[var(--ink)] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
								title="Печать карты пациента (F12)"
							>
								<Printer size={13} className="text-teal-500" />
								<span>Печать карты (F12)</span>
							</button>
						</div>
					</div>

					{/* SOAP Clinical Sections */}
					<div className="p-3.5 space-y-2.5">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							{/* S: Complaints */}
							<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
								<div className="font-bold text-[10px] text-teal-700 dark:text-teal-300 uppercase tracking-wider">
									S · Жалобы и анамнез
								</div>
								<p className="text-[11px] text-[var(--ink)] leading-relaxed">
									{isNormaActive
										? "Жалоб на момент осмотра не предъявляет. Плановый профилактический визит."
										: "Кратковременные ноющие боли от температурных раздражителей (холодное, горячее) в области 2.6 зуба, быстро проходящие после устранения причины."}
								</p>
							</div>

							{/* O: Objective */}
							<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
								<div className="font-bold text-[10px] text-teal-700 dark:text-teal-300 uppercase tracking-wider">
									O · Объективный статус
								</div>
								<p className="text-[11px] text-[var(--ink)] leading-relaxed">
									{isNormaActive
										? "Слизистая оболочка рта физиологической окраски, влажная. Прикус ортогнатический. Зубной ряд интактен."
										: "На окклюзионной поверхности 2.6 глубокая кариозная полость, заполненная размягченным дентином. Зондирование болезненно по дну."}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							{/* A: Diagnosis */}
							<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
								<div className="font-bold text-[10px] text-teal-700 dark:text-teal-300 uppercase tracking-wider">
									A · Клинический диагноз
								</div>
								<div className="text-[11px] font-bold text-[var(--ink)] flex items-center gap-1.5">
									<span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
										{isNormaActive ? "Z01.2" : "К02.1"}
									</span>
									<span>{isNormaActive ? "Стоматологическое обследование (Здоров)" : "Кариес дентина (средний / глубокий)"}</span>
								</div>
							</div>

							{/* P: Plan & Treatment */}
							<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
								<div className="font-bold text-[10px] text-teal-700 dark:text-teal-300 uppercase tracking-wider">
									P · Протокол лечения
								</div>
								<p className="text-[11px] text-[var(--ink)] leading-relaxed">
									{isNormaActive
										? "Проведена профессиональная гигиена полости рта. Рекомендован осмотр через 6 месяцев."
										: "Анестезия Артикаин 1:100 000 (1.7 мл). Изоляция коффердамом. Препарирование кариозной полости. Адгезивный протокол, реставрация светоотверждаемым композитом."}
								</p>
							</div>
						</div>
					</div>

					{/* Printed Feedback Notice */}
					{isPrintedDemo && (
						<div className="p-2 bg-teal-500/15 border-t border-teal-500/30 flex items-center gap-2 text-[11px] text-teal-800 dark:text-teal-200">
							<Printer size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Бланк Формы 043/у сформирован и отправлен на печать со штампом «Подписано врачом»!</span>
						</div>
					)}
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
						<span>Никогда! Аллергия отображается как пассивная предупреждающая плашка, а врач сохраняет полную автономию.</span>
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
