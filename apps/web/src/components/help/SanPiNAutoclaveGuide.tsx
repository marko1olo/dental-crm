/**
 * DENTE CRM — Sterilization, Autoclave & Hygiene Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x, 8v
 *
 * 1-Page Clinical Cheat Sheet:
 * - Autoclave cycles (134°C / 2.1 bar, 121°C / 1.1 bar)
 * - Batch numbering formula: [YYYYMMDD]-[CYCLE#]-[AUTOCLAVE_ID]
 * - Pouch label printing (TSPL / ZPL DataMatrix 2D barcodes)
 * - Pre-sterilization quality tests (Azopyram & Phenolphthalein autonorm in 1 click)
 * - Background RPN compliance journals without nurse desktop fatigue
 * - Hotkeys, FAQs, and interactive tour button
 */

import React, { useState } from "react";
import {
	Check,
	CheckCircle2,
	Flame,
	Gamepad2,
	HelpCircle,
	MousePointer,
	Printer,
	QrCode,
	Shield,
	Sparkles,
	TestTube2,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const SanPiNAutoclaveGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [isNormaApplied, setIsNormaApplied] = useState(false);
	const [isLabelPrinted, setIsLabelPrinted] = useState(false);

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
				<div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
					<Shield size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Стерилизация, чистота и автоклав</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300">
							Штатный регламент СанПиН
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Санитарный контроль клиники: паровые автоклавы класса B, печать самоклеящихся этикеток крафт-пакетов
						с 2D-кодом DataMatrix и автоматическое ведение регламентных журналов дезинфекции и контроля качества.
					</div>
				</div>
			</div>

			{/* НАГЛЯДНАЯ СХЕМА ЖУРНАЛА СТЕРИЛИЗАЦИИ (Visual SanPiN Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-blue-500" />
						<span>Интерактивный журнал стерилизации (СанПиН 3.3686-21)</span>
					</div>

					{/* Statutory Autonorm CTA */}
					<button
						type="button"
						onClick={() => setIsNormaApplied(true)}
						className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-500/25 transition-all cursor-pointer"
						title="Заполнить журнал азопирамовых проб по норме СанПиН"
					>
						<Check size={12} />
						<span>{isNormaApplied ? "Журнал соответствует норме" : "Заполнить по норме СанПиН"}</span>
					</button>
				</div>

				{/* Visual Mockup Card */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs space-y-0">
					{/* Cycle Info Bar */}
					<div className="px-3.5 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="font-bold text-xs text-[var(--ink)]">
								Цикл № 24 · Автоклав Melag Vacuklav 40B+
							</span>
							<span className="text-[10px] px-2 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold">
								Класс B (Фракционированный вакуум)
							</span>
						</div>
						<div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
							<CheckCircle2 size={13} />
							<span>Цикл завершён: 134°C · 2.1 bar · 20 мин</span>
						</div>
					</div>

					{/* Indicators Grid */}
					<div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						{/* Indicator 1: Azopyram */}
						<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
							<div className="flex items-center justify-between">
								<span className="font-bold text-[11px] text-[var(--ink)]">Азопирамовая проба</span>
								<TestTube2 size={13} className="text-blue-500" />
							</div>
							<p className="text-[10px] text-[var(--muted)]">Контроль скрытых следов крови</p>
							<div className="pt-1">
								<span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
									<Check size={11} />
									<span>Отрицательно (Норма)</span>
								</span>
							</div>
						</div>

						{/* Indicator 2: Phenolphthalein */}
						<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
							<div className="flex items-center justify-between">
								<span className="font-bold text-[11px] text-[var(--ink)]">Фенолфталеиновая</span>
								<TestTube2 size={13} className="text-purple-500" />
							</div>
							<p className="text-[10px] text-[var(--muted)]">Контроль остатков моющих средств</p>
							<div className="pt-1">
								<span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
									<Check size={11} />
									<span>Отрицательно (Норма)</span>
								</span>
							</div>
						</div>

						{/* Indicator 3: Chemical integrator */}
						<div className="p-2.5 rounded bg-[var(--paper)] border border-[var(--line)] space-y-1">
							<div className="flex items-center justify-between">
								<span className="font-bold text-[11px] text-[var(--ink)]">Химический интегратор</span>
								<Flame size={13} className="text-amber-500" />
							</div>
							<p className="text-[10px] text-[var(--muted)]">Тест-полоска 5 класса внутри пакета</p>
							<div className="pt-1">
								<span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
									<Check size={11} />
									<span>Цвет изменен: Стерильно</span>
								</span>
							</div>
						</div>
					</div>

					{/* Label & Export Action Bar */}
					<div className="px-4 py-2.5 bg-[var(--paper)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-mono text-[var(--muted)]">
								Пакет #ST-2026-1042 · Годен до: 15.06.2026 (+30 дней)
							</span>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setIsLabelPrinted(true)}
								className="px-2.5 py-1 rounded bg-[var(--paper-soft)] border border-[var(--line)] hover:border-blue-500 text-[11px] font-semibold flex items-center gap-1.5 text-[var(--ink)] cursor-pointer"
							>
								<Printer size={13} className="text-blue-500" />
								<span>Печать этикетки крафт-пакета</span>
							</button>
						</div>
					</div>

					{/* Printed Label Simulation */}
					{isLabelPrinted && (
						<div className="p-3 bg-blue-500/10 border-t border-blue-500/20 flex items-center justify-between gap-3 text-[11px] text-[var(--ink)] animate-in fade-in duration-200">
							<div className="flex items-center gap-2.5">
								<QrCode size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<div>
									<div className="font-bold">Этикетка напечатана на принтере TSPL:</div>
									<div className="text-[10px] text-[var(--muted)]">
										Партия: 20260515-024 · Стерилизатор: Melag 40B+ · Медсестра: Смирнова О.Н.
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsLabelPrinted(false)}
								className="text-[10px] underline text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								Закрыть
							</button>
						</div>
					)}
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-blue-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел гарантирует 100% инфекционную безопасность пациентов и юридическую готовность к проверкам надзорных органов.
					Журналы азопирамовой пробы и стерилизации формируются автоматически в соответствии с регламентом без ручного заполнения бумажных тетрадей.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция стерилизационного цикла</span>
					<span className="text-[10px] text-[var(--muted)]">Стандарт ЦСО</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Предстерилизационная очистка (ПСО)</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Проведите дезинфекцию и мойку инструментов. Нажмите «Все пробы отрицательны / норма» для фиксации азопирамовой и фенолфталеиновой проб.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Упаковка и печать этикеток</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Упакуйте лотки в крафт-пакеты. Нажмите «Печать этикеток» на термопринтере (TSPL / ZPL) — наклейки со штрихкодом партии готовы.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Запуск цикла автоклавирования</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Выберите режим (134°C для металла или 121°C для оптики). Результаты химических индикаторов 5 класса фиксируются автоматически.
						</p>
					</div>
				</div>
			</div>

			{/* Режимы автоклава */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Стандартные режимы паровой стерилизации (Класс B)</span>
					<span className="text-[10px] text-[var(--muted)]">Государственные стандарты</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1">
						<div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
							<Flame size={14} />
							<span>Режим 134°C / 2.1 бар (20 мин)</span>
						</div>
						<p className="text-[var(--muted)] text-[10px]">
							Основной режим для металлических боров, турбинных и микромоторных наконечников, пинцетов, зеркал и хирургических наборов.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1">
						<div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
							<Flame size={14} />
							<span>Режим 121°C / 1.1 бар (30 мин)</span>
						</div>
						<p className="text-[var(--muted)] text-[10px]">
							Щадящий режим для полимерных матриц, резиновых изделий, силиконовых оттискных ложек и эндодонтических обтураторов.
						</p>
					</div>
				</div>
			</div>

			{/* Формула партии */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<Printer size={14} className="text-teal-500" />
						<span>Формула номера партии крафт-пакета</span>
					</span>
					<span className="text-[10px] text-[var(--muted)]">DataMatrix 2D</span>
				</div>
				<div className="p-2 rounded bg-[var(--paper-soft)] font-mono text-[11px] text-teal-600 dark:text-teal-400 font-semibold text-center border border-teal-500/20">
					[ГОД_МЕСЯЦ_ДЕНЬ]-[НОМЕР_ЦИКЛА]-[АВТОКЛАВ]
				</div>
				<p className="text-[11px] text-[var(--muted)]">
					Пример: <code>20261002-03-AUTOCLAVE-1</code>. При сканировании штрихкода в кабинете номер партии привязывается к карте пациента у кресла.
				</p>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Стерилизация</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Журнал стерилизации и автоклава:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-blue-600 dark:text-blue-400">
							Ctrl + Alt + S
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Печать этикеток DataMatrix:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-blue-600 dark:text-blue-400">
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
						<strong className="text-[var(--ink)] shrink-0">• Должен ли врач сканировать пакеты на приёме?</strong>
						<span>Нет! Инструменты стерильны по умолчанию. Врач лечит людей, а не работает сканером штрихкодов в дневнике приёма.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Сколько сохраняется стерильность?</strong>
						<span>Комбинированный пакет (бумага/плёнка) — 50 суток при термоспайке. Бумажный крафт-пакет со скрепками — 21 сутки.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как подготовиться к проверке Роспотребнадзора?</strong>
						<span>Нажмите кнопку «Экспорт журнала стерилизации» — система выгружает официальные формы журналов контроля автоклавирования и азопирамовых проб.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-blue-600 dark:text-blue-400" />
						<span>Интерактивный тренажёр: Автоклав и журналы чистоты</span>
					</div>
					<p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
						Узнайте, как формируются официальные санитарные журналы по регламенту СанПиН 3.3686-21 без ручной писанины.
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
