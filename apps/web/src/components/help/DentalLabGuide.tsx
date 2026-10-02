/**
 * DENTE CRM — Dental Laboratory (ZTL) Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - Laboratory work orders for crowns, veneers, bridges, and removable prosthetics
 * - VITA Classical (A1–D4) and 3D Master shade guide selector
 * - Fitting and delivery dates synchronization with schedule
 * - Cost breakdown & lab invoice reconciliation
 * - Hotkeys (Ctrl+L), FAQs, and interactive tour button
 */

import React, { useState } from "react";
import {
	CheckCircle2,
	Clock,
	Gamepad2,
	HelpCircle,
	MousePointer,
	Palette,
	Send,
	Sparkles,
	Truck,
	Wrench,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const DentalLabGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [selectedShade, setSelectedShade] = useState("A2");
	const [activeStage, setActiveStage] = useState(2); // 0-based: 2 is Milling/Sintering

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
	};

	const shades = [
		{ code: "A1", hex: "#fef3c7", desc: "Светлый оттенок, молодой дентин" },
		{ code: "A2", hex: "#fde68a", desc: "Универсальный стандарт СтАР" },
		{ code: "A3", hex: "#fcd34d", desc: "Теплый естественный оттенок" },
		{ code: "A3.5", hex: "#fbbf24", desc: "Насыщенный дентин шейки" },
		{ code: "B1", hex: "#fef9c3", desc: "Ультрасветлый отбеленный" },
		{ code: "B2", hex: "#fef08a", desc: "Желтоватый естественный" },
	];

	const stages = [
		{ title: "Цифровой скан STL", status: "Выполнено" },
		{ title: "CAD Моделирование", status: "Одобрено" },
		{ title: "Фрезеровка и синтеризация", status: "В работе прямо сейчас" },
		{ title: "Глазурование и окрашивание", status: "В плане" },
		{ title: "Сдача пациенту", status: "Готовность: 3 дня" },
	];

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
					<Wrench size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Зуботехническая лаборатория (ЗТЛ)</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
							Наряды и шкала VITA
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Управление заказами на изготовление коронок, виниров, мостовидных и съёмных протезов.
						Контроль этапов примерки, выбор цвета зубов по международным шкалам и учёт взаиморасчётов с техниками.
					</div>
				</div>
			</div>

			{/* НАГЛЯДНАЯ СХЕМА НАРЯДА ЗТЛ (Visual Dental Lab Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-amber-500" />
						<span>Интерактивный заказ-наряд в зуботехническую лабораторию</span>
					</div>
					<span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
						Шкала VITA Classic
					</span>
				</div>

				{/* Visual Mockup Card */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs space-y-0">
					{/* Header Info */}
					<div className="px-3.5 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="font-bold text-xs text-[var(--ink)]">
								Наряд № 1042 · Зуб 2.6
							</span>
							<span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
								Диоксид циркония Prettau
							</span>
							<span className="text-[10px] text-[var(--muted)]">Пациент: Барабаш С.В.</span>
						</div>
						<div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-bold">
							<Clock size={13} />
							<span>Срок сдачи: 15 мая (3 дня)</span>
						</div>
					</div>

					{/* VITA Shade Selector Bar */}
					<div className="p-3 bg-[var(--paper)] border-b border-[var(--line)] space-y-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
								<Palette size={13} className="text-amber-500" />
								<span>Выбор оттенка зуба по VITA Classic:</span>
							</span>
							<span className="text-[10px] text-[var(--muted)]">
								Выбран цвет: <strong className="text-[var(--ink)]">{selectedShade}</strong>
							</span>
						</div>

						<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
							{shades.map((sh) => (
								<button
									key={sh.code}
									type="button"
									onClick={() => setSelectedShade(sh.code)}
									className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
										selectedShade === sh.code
											? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30 scale-102"
											: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-amber-400/50"
									}`}
								>
									{/* Color Swatch Dot */}
									<div
										className="w-full h-3 rounded-xs mb-1 border border-black/20"
										style={{ backgroundColor: sh.hex }}
									/>
									<span className="font-bold text-xs text-[var(--ink)]">{sh.code}</span>
								</button>
							))}
						</div>
					</div>

					{/* Stepper Stages Timeline */}
					<div className="p-3.5 space-y-2.5">
						<span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
							Технологическая цепочка наряда:
						</span>

						<div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
							{stages.map((st, idx) => {
								const isDone = idx < activeStage;
								const isCurrent = idx === activeStage;
								return (
									<button
										key={st.title}
										type="button"
										onClick={() => setActiveStage(idx)}
										className={`p-2 rounded-md border text-left transition-all cursor-pointer space-y-1 ${
											isCurrent
												? "border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/30"
												: isDone
													? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
													: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] opacity-70"
										}`}
									>
										<div className="flex items-center justify-between text-[10px] font-bold">
											<span>Шаг {idx + 1}</span>
											{isDone && <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />}
											{isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
										</div>
										<div className="text-[11px] font-semibold leading-tight text-[var(--ink)]">
											{st.title}
										</div>
										<div className="text-[9px] font-medium opacity-80">{st.status}</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Bottom Autonomy Status */}
					<div className="px-4 py-2 bg-[var(--paper)] border-t border-[var(--line)] flex items-center justify-between text-[10px] text-[var(--muted)]">
						<span>Задержка наряда ЗТЛ не блокирует оказание терапевтических услуг пациенту (Мандат 8e)</span>
						<span className="font-semibold text-emerald-600 dark:text-emerald-400">Техник: Лаборатория «ДенталАрт»</span>
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-amber-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел исключает путаницу с доставкой работ и сорванные примерки.
					Врач отправляет наряд технику в 2 клика с фото и точными параметрами, а администратор точно знает дату готовности изделия к визиту пациента.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для ортопеда</span>
					<span className="text-[10px] text-[var(--muted)]">Оформление наряда</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Создание наряда из визита</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							В приёме выберите зуб и нажмите «Наряд в лабораторию». Укажите тип конструкции: металлокерамика, диоксид циркония, e.max, винир.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Цвет по шкале VITA</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Выберите оттенок (например, A2, A3, B1) и прикрепите фотографии зубов при естественном освещении для точного попадания в цвет.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Сроки примерки и сдачи</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Укажите дату примерки каркаса и окончательной фиксации. Заказ автоматически синхронизируется с расписанием врача.
						</p>
					</div>
				</div>
			</div>

			{/* Этапы и статусы заказа */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Статусы наряда в лабораторию
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold block w-fit mb-1">
							1. Отправлен
						</span>
						<p className="text-[var(--muted)] text-[10px]">Слепки переданы курьеру или отправлен цифровой скан STL.</p>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold block w-fit mb-1">
							2. В работе
						</span>
						<p className="text-[var(--muted)] text-[10px]">Техник моделирует каркас и наносит керамику.</p>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-semibold block w-fit mb-1">
							3. Примерка
						</span>
						<p className="text-[var(--muted)] text-[10px]">Работа доставлена в клинику на промежуточный этап.</p>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold block w-fit mb-1">
							4. Готов / Сдан
						</span>
						<p className="text-[var(--muted)] text-[10px]">Коронка зафиксирована во рту пациента.</p>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Лаборатория</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Быстрый наряд в лабораторию:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-amber-600 dark:text-amber-400">
							Ctrl + L
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Шкала расцветок VITA:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-amber-600 dark:text-amber-400">
							V
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
						<strong className="text-[var(--ink)] shrink-0">• Как не пропустить визит на примерку?</strong>
						<span>В расписании клиники карточка визита подсвечивается специальным значком зуботехнического наряда с указанием статуса доставки.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Учитывается ли стоимость лаборатории в зарплате врача?</strong>
						<span>Да, при сдельной оплате программа автоматически вычитает фактическую стоимость услуг техника из начисленной врачу выручки.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Можно ли прикрепить цифровой скан 3Shape / Medit?</strong>
						<span>Да, 3D-файлы оптических слепков (STL / PLY) прикрепляются прямо к наряду без ограничений по размеру.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-amber-600 dark:text-amber-400" />
						<span>Интерактивный тренажёр: Заказ коронок и шкала VITA</span>
					</div>
					<p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
						Отработайте оформление электронного наряда в лабораторию с выбором цвета и установкой даты примерки.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
