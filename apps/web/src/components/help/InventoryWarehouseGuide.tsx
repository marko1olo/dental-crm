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

import React, { useState } from "react";
import {
	AlertTriangle,
	Archive,
	Boxes,
	CheckCircle2,
	Gamepad2,
	HelpCircle,
	Minus,
	MousePointer,
	PackageCheck,
	Plus,
	RefreshCw,
	Sparkles,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const InventoryWarehouseGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [carpoolStock, setCarpoolStock] = useState(48);
	const [compositeStock, setCompositeStock] = useState(-2); // Demonstrates soft overdraft

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
	};

	const handleDeductCarpool = () => {
		setCarpoolStock((prev) => Math.max(0, prev - 1));
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
						Списание происходит строго по техкартам оказанных услуг без отвлечения врача у кресла и без задержек приёма.
					</div>
				</div>
			</div>

			{/* НАГЛЯДНАЯ СХЕМА СКЛАДА (Visual Inventory Table Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-emerald-500" />
						<span>Складская номенклатура (7 калиброванных колонок)</span>
					</div>

					{/* 1-Click Deduct CTA */}
					<button
						type="button"
						onClick={handleDeductCarpool}
						className="px-2.5 py-1 rounded bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center gap-1 hover:bg-teal-500/25 transition-all cursor-pointer"
						title="Списать 1 карпулу анестетика без комиссии"
					>
						<Minus size={11} />
						<span>Списать 1 карпулу</span>
					</button>
				</div>

				{/* Visual Mockup Table Window */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs space-y-0">
					<div className="overflow-x-auto">
						<table className="w-full text-[11px] text-left">
							<thead>
								<tr className="border-b border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] text-[10px] uppercase font-bold tracking-wider">
									<th className="py-2 px-3 font-semibold">Артикул</th>
									<th className="py-2 px-3 font-semibold">Наименование</th>
									<th className="py-2 px-3 font-semibold">Партия FEFO</th>
									<th className="py-2 px-3 font-semibold">Срок годности</th>
									<th className="py-2 px-3 font-semibold">Остаток</th>
									<th className="py-2 px-3 font-semibold">Резерв</th>
									<th className="py-2 px-3 font-semibold text-right">Статус</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]/50 bg-[var(--paper)]">
								{/* Row 1: Carpools */}
								<tr className="hover:bg-[var(--paper-soft)]/60 transition-colors">
									<td className="py-2 px-3 font-mono text-[10px] text-[var(--muted)]">ART-100</td>
									<td className="py-2 px-3 font-medium text-[var(--ink)]">
										Артикаин 1:100 000 с адреналином (карпулы 1.7 мл)
									</td>
									<td className="py-2 px-3">
										<span className="px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono text-[10px]">
											#2411 (FEFO-1)
										</span>
									</td>
									<td className="py-2 px-3 text-[var(--muted)]">12.2026</td>
									<td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
										{carpoolStock} шт
									</td>
									<td className="py-2 px-3 text-[var(--muted)] font-mono">10 шт</td>
									<td className="py-2 px-3 text-right">
										<span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
											✓ В наличии
										</span>
									</td>
								</tr>

								{/* Row 2: Soft Overdraft Demo */}
								<tr className="hover:bg-[var(--paper-soft)]/60 transition-colors bg-amber-500/5">
									<td className="py-2 px-3 font-mono text-[10px] text-[var(--muted)]">CMP-FIL</td>
									<td className="py-2 px-3 font-medium text-[var(--ink)]">
										Filtek Z250 (Универсальный композит шприц 4г, A2)
									</td>
									<td className="py-2 px-3">
										<span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
											#9082
										</span>
									</td>
									<td className="py-2 px-3 text-[var(--muted)]">08.2027</td>
									<td className="py-2 px-3 font-bold text-amber-600 dark:text-amber-400 font-mono">
										{compositeStock} шт
									</td>
									<td className="py-2 px-3 text-[var(--muted)] font-mono">3 шт</td>
									<td className="py-2 px-3 text-right">
										<span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-500/30">
											⚠ Мягкий овердрафт
										</span>
									</td>
								</tr>

								{/* Row 3: Bonding agent */}
								<tr className="hover:bg-[var(--paper-soft)]/60 transition-colors">
									<td className="py-2 px-3 font-mono text-[10px] text-[var(--muted)]">BND-SLP</td>
									<td className="py-2 px-3 font-medium text-[var(--ink)]">
										Single Bond Universal (Адгезив флакон 5мл)
									</td>
									<td className="py-2 px-3">
										<span className="px-1.5 py-0.2 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono text-[10px]">
											#5512
										</span>
									</td>
									<td className="py-2 px-3 text-[var(--muted)]">04.2026</td>
									<td className="py-2 px-3 font-bold text-[var(--ink)] font-mono">
										4 шт
									</td>
									<td className="py-2 px-3 text-[var(--muted)] font-mono">2 шт</td>
									<td className="py-2 px-3 text-right">
										<span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
											✓ В наличии
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* Bottom Notice: Mandate 8e Autonomy */}
					<div className="px-4 py-2 bg-[var(--paper)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
						<div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
							<AlertTriangle size={12} className="shrink-0" />
							<span>Задержка накладной не блокирует операцию: минус фиксируется и закроется при оприходовании</span>
						</div>
						<span className="font-mono">FEFO приоритет списания активен</span>
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
					<span>Принцип мягкого овердрафта склада</span>
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
