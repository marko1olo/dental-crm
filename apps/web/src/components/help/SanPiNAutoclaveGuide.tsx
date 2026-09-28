/**
 * DENTE CRM — SanPiN 3.3686-21 Autoclave & Sterilization Quick Guide
 *
 * 1-Page Clinical Cheat Sheet:
 * - Autoclave cycles (134°C / 2.1 bar, 121°C / 1.1 bar).
 * - Batch numbering formula: [YYYYMMDD]-[CYCLE#]-[AUTOCLAVE_ID].
 * - Pouch label printing (TSPL / ZPL DataMatrix 2D barcodes).
 * - Azopyram & phenolphthalein tests (1-click autonorm).
 * - Chairside batch attachment to Form 043/u.
 */

import React from "react";
import { CheckCircle2, Flame, Printer, QrCode, Shield, TestTube2 } from "lucide-react";

export const SanPiNAutoclaveGuide: React.FC = () => {
	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 shrink-0">
					<Shield size={16} />
				</div>
				<div>
					<div className="font-semibold text-sm text-[var(--ink)]">
						Журнал стерилизации и маркировка крафт-пакетов
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-0.5">
						Учет стерилизации класса B, 1-клик генерация партий, мгновенная печать термоэтикеток
						со штрихкодом DataMatrix и привязка к истории визита пациента.
					</div>
				</div>
			</div>

			{/* Regimes & Parameters */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Стандартные режимы паровой стерилизации (Автоклав класса B)</span>
					<span className="text-[10px] text-[var(--muted)]">Санитарные стандарты стерилизации</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1">
						<div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
							<Flame size={14} />
							<span>Режим 134°C / 2.1 бар (20 мин)</span>
						</div>
						<p className="text-[var(--muted)] text-[10px]">
							Основной режим для металлических инструментов, турбинных и угловых наконечников,
							хирургических наборов, пинцетов и элеваторов.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1">
						<div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
							<Flame size={14} />
							<span>Режим 121°C / 1.1 бар (30 мин)</span>
						</div>
						<p className="text-[var(--muted)] text-[10px]">
							Щадящий режим для термолабильных изделий, полимерных матриц, резиновых изделий,
							силиконовых оттискных ложек и оптики.
						</p>
					</div>
				</div>
			</div>

			{/* Batch Numbering & Pouch Label Printing */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<Printer size={14} className="text-teal-500" />
						Формула номера партии и этикетка пакета
					</span>
					<span className="text-[10px] text-[var(--muted)]">DataMatrix 2D</span>
				</div>

				<div className="p-2 rounded bg-[var(--paper-soft)] font-mono text-[11px] text-teal-600 dark:text-teal-400 font-semibold text-center border border-teal-500/20">
					[YYYYMMDD]-[НОМЕР_ЦИКЛА]-[ID_АВТОКЛАВА]
				</div>
				<p className="text-[11px] text-[var(--muted)]">
					Пример: <code>20260929-03-AUTOCLAVE-1</code>. На термопринтере (TSPL / ZPL) в 1 клик
					печатается самоклеящаяся этикетка с 2D-кодом DataMatrix.
				</p>

				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] block">Срок стерильности</span>
						<span className="font-semibold text-[var(--ink)]">Комбинированный пакет: 50 суток</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] block">Бумажный крафт</span>
						<span className="font-semibold text-[var(--ink)]">Со скрепками: 21 сутки</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] block">Ответственный</span>
						<span className="font-semibold text-[var(--ink)]">ФИО медсестры / штамп</span>
					</div>
				</div>
			</div>

			{/* Pre-sterilization Quality Tests */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
					<TestTube2 size={14} className="text-purple-500" />
					<span>Предстерилизационная очистка (ПСО): Азопирам и Фенолфталеин</span>
				</div>
				<div className="text-[11px] text-[var(--muted)] space-y-1">
					<p>
						Журнал учета качества ПСО формируется автоматически.
						Кнопка <strong>«✓ Все пробы отрицательны / норма»</strong> фиксирует:
					</p>
					<ul className="list-disc list-inside space-y-0.5 pl-1">
						<li><strong>Азопирамовая проба:</strong> отсутствие следов скрытой крови (отрицательно).</li>
						<li><strong>Фенолфталеиновая проба:</strong> отсутствие остаточных щелочных моющих средств (отрицательно).</li>
					</ul>
				</div>
			</div>

			{/* Chairside Workflow */}
			<div className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 flex items-center justify-between text-[11px]">
				<div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
					<CheckCircle2 size={14} className="shrink-0" />
					<span>
						<strong>Привязка к визиту:</strong> Врач сканирует штрихкод крафт-пакета 2D-сканером у кресла —
						номер партии и дата стерилизации автоматически подтягиваются в медицинскую карту пациента.
					</span>
				</div>
			</div>
		</div>
	);
};
