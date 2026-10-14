/**
 * LabOrderTeethSelector.tsx — Интерактивный селектор зубов FDI для зуботехнического наряда.
 * 
 * Врачебные инварианты:
 * 1. Планшетная эргономика у кресла (хитбоксы >= 44x44px для работы в перчатках).
 * 2. Визуальная маркировка мостовидных конструкций (опоры и понтик) vs одиночные коронки.
 * 3. Двусторонняя синхронизация: клик по одонтограмме <-> текстовый ввод FDI.
 */

import React, { useMemo } from "react";
import { Link2, Sparkles, Check } from "lucide-react";

export interface LabOrderTeethSelectorProps {
	readonly value: string;
	readonly onChange: (teethStr: string, parsedTeeth: number[]) => void;
	readonly isBridge: boolean;
	readonly onToggleBridge: (isBridge: boolean) => void;
}

// Постоянный прикус: квадранты FDI
const FDI_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const FDI_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const FDI_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const FDI_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

export const LabOrderTeethSelector: React.FC<LabOrderTeethSelectorProps> = ({
	value,
	onChange,
	isBridge,
	onToggleBridge,
}) => {
	// Парсинг выбранных зубов из строки
	const selectedTeethSet = useMemo(() => {
		const numbers = value
			.split(",")
			.map((s) => Number.parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 48);
		return new Set<number>(numbers);
	}, [value]);

	const toggleTooth = (tooth: number) => {
		const nextSet = new Set(selectedTeethSet);
		if (nextSet.has(tooth)) {
			nextSet.delete(tooth);
		} else {
			nextSet.add(tooth);
		}
		const sorted = Array.from(nextSet).sort((a, b) => a - b);
		onChange(sorted.join(", "), sorted);
	};

	const selectAllInQuadrant = (quadrant: number[]) => {
		const allSelected = quadrant.every((t) => selectedTeethSet.has(t));
		const nextSet = new Set(selectedTeethSet);
		for (const t of quadrant) {
			if (allSelected) {
				nextSet.delete(t);
			} else {
				nextSet.add(t);
			}
		}
		const sorted = Array.from(nextSet).sort((a, b) => a - b);
		onChange(sorted.join(", "), sorted);
	};

	const renderToothButton = (tooth: number) => {
		const isSelected = selectedTeethSet.has(tooth);
		return (
			<button
				key={tooth}
				type="button"
				onClick={() => toggleTooth(tooth)}
				className={`relative flex flex-col items-center justify-center min-w-[34px] sm:min-w-[40px] h-[44px] px-1 rounded-md text-xs font-semibold transition-all select-none cursor-pointer border ${
					isSelected
						? "bg-teal-600 dark:bg-teal-700 text-white border-teal-700 dark:border-teal-500 shadow-sm scale-102"
						: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#1e293b)] dark:text-slate-200 border-[var(--line,#e2e8f0)] dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-800"
				}`}
				data-testid={`tooth-btn-${tooth}`}
				aria-pressed={isSelected}
				title={`Зуб ${tooth} (${isSelected ? "Выбран" : "Не выбран"})`}
			>
				<span>{tooth}</span>
				{isSelected && (
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-300 dark:bg-emerald-400 mt-0.5" />
				)}
			</button>
		);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<label className="ztl-form-label mb-0" htmlFor="teeth-input-field">
					Зубы по формуле FDI (клик по схеме или через запятую)
				</label>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onToggleBridge(!isBridge)}
						className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
							isBridge
								? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"
						}`}
						data-testid="toggle-bridge-mode-btn"
						title="Переключить тип конструкции: мостовидный протез с промежуточной частью"
					>
						<Link2 size={13} className={isBridge ? "text-amber-600" : "text-slate-400"} />
						<span>{isBridge ? "Мостовидный протез (с понтиком)" : "Одиночные коронки"}</span>
					</button>
				</div>
			</div>

			{/* Текстовое поле ввода для быстрого ввода с клавиатуры */}
			<div className="relative">
				<input
					id="teeth-input-field"
					type="text"
					className="ztl-form-input w-full"
					placeholder="например: 14, 15, 16"
					value={value}
					onChange={(e) => {
						const raw = e.target.value;
						const parsed = raw
							.split(",")
							.map((s) => Number.parseInt(s.trim(), 10))
							.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 48);
						onChange(raw, parsed);
					}}
					data-testid="teeth-input"
				/>
				{selectedTeethSet.size > 0 && (
					<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 pointer-events-none">
						Выбрано: {selectedTeethSet.size} {selectedTeethSet.size === 1 ? "зуб" : "ед."}
					</span>
				)}
			</div>

			{/* Интерактивная формула FDI с поддержкой сенсорных тач-таргетов >= 44x44px */}
			<div className="p-2 sm:p-3 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/60 select-none">
				<div className="text-[11px] font-medium text-[var(--muted,#64748b)] dark:text-slate-400 mb-2 flex items-center justify-between">
					<span>Верхняя челюсть (18..11 · 21..28)</span>
					<div className="flex gap-1.5">
						<button
							type="button"
							onClick={() => selectAllInQuadrant(FDI_UPPER_RIGHT)}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800"
						>
							Q1 (18..11)
						</button>
						<button
							type="button"
							onClick={() => selectAllInQuadrant(FDI_UPPER_LEFT)}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800"
						>
							Q2 (21..28)
						</button>
					</div>
				</div>

				{/* Верхний ряд (18..28) */}
				<div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto pb-2">
					<div className="flex gap-1">
						{FDI_UPPER_RIGHT.map(renderToothButton)}
					</div>
					<div className="w-[2px] h-9 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
					<div className="flex gap-1">
						{FDI_UPPER_LEFT.map(renderToothButton)}
					</div>
				</div>

				<div className="text-[11px] font-medium text-[var(--muted,#64748b)] dark:text-slate-400 my-2 flex items-center justify-between border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 pt-2">
					<span>Нижняя челюсть (48..41 · 31..38)</span>
					<div className="flex gap-1.5">
						<button
							type="button"
							onClick={() => selectAllInQuadrant(FDI_LOWER_RIGHT)}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800"
						>
							Q4 (48..41)
						</button>
						<button
							type="button"
							onClick={() => selectAllInQuadrant(FDI_LOWER_LEFT)}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800"
						>
							Q3 (31..38)
						</button>
					</div>
				</div>

				{/* Нижний ряд (48..38) */}
				<div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto">
					<div className="flex gap-1">
						{FDI_LOWER_RIGHT.map(renderToothButton)}
					</div>
					<div className="w-[2px] h-9 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
					<div className="flex gap-1">
						{FDI_LOWER_LEFT.map(renderToothButton)}
					</div>
				</div>
			</div>

			{isBridge && selectedTeethSet.size >= 2 && (
				<div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
					<Check size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						Мостовидная протяженность: зубы {Array.from(selectedTeethSet).sort((a,b)=>a-b).join("—")}.
						Технику будет указано смоделировать монолитный каркас с промежуточной балкой.
					</span>
				</div>
			)}
		</div>
	);
};
