/**
 * DENTE CRM — Inventory & Materials Warehouse Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8ab
 *
 * 1-Page Clinical Cheat Sheet:
 * - Silent Background Auto-Deduction via service tech cards (Bill of Materials)
 * - Soft Negative Overdraft: never interrupts or blocks doctor at chairside
 * - Expiration tracking via FEFO (First-Expired, First-Out)
 * - Restock thresholds and 1-click inventory reconciliation
 * - Hotkeys (Ctrl+I), FAQs, and interactive tour button
 */

import React from "react";
import {
	AlertTriangle,
	Archive,
	Boxes,
	CheckCircle2,
	Gamepad2,
	HelpCircle,
	PackageCheck,
	RefreshCw,
	Sparkles,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const InventoryWarehouseGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
					<Boxes size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Склад и списание материалов</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
							Мягкий овердрафт
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Фоновый автоматический учёт стоматологических материалов, анестетиков, боров и перчаток.
						Списание происходит строго по техкартам оказанных услуг без отвлечения врача у кресла и без блокировок.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-emerald-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел гарантирует точную себестоимость лечения и своевременный дозаказ препаратов без рутины.
					Врач лечит пациента, а склад работает в фоновом режиме: при списании учитываются партии и сроки годности (FEFO).
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция складского учёта</span>
					<span className="text-[10px] text-[var(--muted)]">Автоматический цикл</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Приход по накладной</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Введите номер накладной или загрузите электронный документ. Партии препаратов и сроки годности сохраняются автоматически.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Фоновое автосписание</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							При закрытии визита пациента программа списывает расходники по нормам услуги (техкарте). Врач не кликает лишних кнопок.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Контроль минимального остатка</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Когда запас карпул или композита падает ниже порога, система тихо формирует список закупки для старшей медсестры или снабжения.
						</p>
					</div>
				</div>
			</div>

			{/* Принцип мягкого овердрафта (Мандат 8ab) */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
					<CheckCircle2 size={14} className="text-emerald-500" />
					<span>Принцип мягкого овердрафта (Zero Warehouse Invasion — Мандат 8ab)</span>
				</div>
				<p className="text-[11px] text-[var(--muted)] leading-relaxed">
					Если по программе на складе числится ноль анестетиков или перчаток (например, накладную еще не успели оприходовать),
					<strong> программа НИКОГДА не прерывает врача и не блокирует сохранение дневника приёма!</strong>
					Расходник списывается в мягкий минус в фоновом бэк-офисе, а при оприходовании баланс выравнивается автоматически.
				</p>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Склад</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Быстрый просмотр остатков:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-emerald-600 dark:text-emerald-400">
							Ctrl + I
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Инвентаризация и поиск по штрихкоду:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-emerald-600 dark:text-emerald-400">
							F8
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
						<strong className="text-[var(--ink)] shrink-0">• Должен ли врач списывать ватные валики вручную?</strong>
						<span>Нет! Ручное списание мелочей категорически запрещено. Всё списывается автоматически согласно техкарте услуги.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что означает правило FEFO?</strong>
						<span>Система списывает сначала партии с наиболее близким сроком годности (First Expired, First Out), предотвращая просрочку на полках.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как провести инвентаризацию?</strong>
						<span>В разделе склада нажмите «Сверить остатки» — программа сформирует удобную ведомость для распечатки или проверки сканером.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-emerald-600 dark:text-emerald-400" />
						<span>Интерактивный тренажёр: Склад и мягкий овердрафт</span>
					</div>
					<p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
						Узнайте, как работает фоновое списание материалов и почему склад никогда не останавливает приём.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
