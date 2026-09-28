/**
 * DENTE CRM — Odontogram 2-Click Quick Guide
 *
 * 1-Page Clinical Cheat Sheet:
 * - How to mark caries, pulpitis, crowns, and missing teeth in 2 clicks.
 * - 1-Click Autonorm (Shift+N) for physiological norm.
 * - Quadrants 1..8 and FDI tooth numbering.
 * - Designed under Apple Clinical HIG tokens without blocking popups.
 */

import React from "react";
import { Check, ShieldAlert, Sparkles, Zap } from "lucide-react";

export const OdontogramGuide: React.FC = () => {
	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500 shrink-0">
					<Sparkles size={16} />
				</div>
				<div>
					<div className="font-semibold text-sm text-[var(--ink)]">
						Одонтограмма за 2 клика: Принцип максимальной скорости
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-0.5">
						Врач фиксирует только патологию. Интактные зубы не требуют ручного прокликивания
						и заполняются нормой в 1 клик.
					</div>
				</div>
			</div>

			{/* 2-Click Workflow */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
						<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[11px] font-bold">
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
						<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[11px] font-bold">
							2
						</span>
						<span>Клик 2: Назначение патологии</span>
					</div>
					<p className="text-[var(--muted)] text-[11px] leading-relaxed">
						В появившейся шторке зуба или клавишей выберите нужный статус.
						Цвет поверхности мгновенно меняется, запись добавляется в историю приема.
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

			{/* Table of Quick Actions & Pathologies */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Справочник горячих статусов зуба</span>
					<span className="text-[10px] text-[var(--muted)]">МКБ-10 / FDI</span>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-[11px] text-left">
						<thead>
							<tr className="border-b border-[var(--line)] text-[var(--muted)]">
								<th className="pb-1.5 font-medium">Статус / Диагноз</th>
								<th className="pb-1.5 font-medium">Клавиша</th>
								<th className="pb-1.5 font-medium">Цвет</th>
								<th className="pb-1.5 font-medium">Клиническое действие</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]/50">
							<tr>
								<td className="py-1.5 font-medium text-amber-600 dark:text-amber-400">Кариес (Caries)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										C
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Янтарный</td>
								<td className="py-1.5 text-[var(--muted)]">Поражение твердых тканей эмали/дентина (К02)</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-rose-600 dark:text-rose-400">Пульпит / Каналы</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										P
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Красный</td>
								<td className="py-1.5 text-[var(--muted)]">Воспаление пульпы, эндодонтия каналов (К04)</td>
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
								<td className="py-1.5 font-medium text-[var(--muted)]">Отсутствует (Адентия/Экстракция)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										X
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Серый крест</td>
								<td className="py-1.5 text-[var(--muted)]">Удален ранее или подлежит удалению</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-emerald-600 dark:text-emerald-400">Пломба (Реставрация)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										F
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Изумрудный</td>
								<td className="py-1.5 text-[var(--muted)]">Ранее поставленная состоятельная пломба</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Autonomous Physician Invariant */}
			<div className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 flex items-center justify-between text-[11px]">
				<div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
					<Zap size={14} className="shrink-0" />
					<span>
						<strong>1-Клик Автонорма (Shift+N):</strong> Заполняет все зубы статусом «Интактен / Норма».
						Затем отметьте только те зубы, которые имеют патологию.
					</span>
				</div>
				<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-teal-600 dark:text-teal-400 font-bold shrink-0">
					Shift + N
				</kbd>
			</div>
		</div>
	);
};
