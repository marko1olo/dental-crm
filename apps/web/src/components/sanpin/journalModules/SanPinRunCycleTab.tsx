import React from "react";
import { CheckCircle2, UserCheck } from "lucide-react";

const PRESET_PACK_COUNTS = [4, 8, 12, 16, 24] as const;

export interface SanPinRunCycleTabProps {
	readonly selectedAutoclaveId: string;
	readonly setSelectedAutoclaveId: (val: string) => void;
	readonly selectedRegime: "standard_134" | "delicate_121" | "quick_134";
	readonly setSelectedRegime: (val: "standard_134" | "delicate_121" | "quick_134") => void;
	readonly packagesCount: number;
	readonly setPackagesCount: (val: number) => void;
	readonly itemsSummaryInput: string;
	readonly setItemsSummaryInput: (val: string) => void;
	readonly operatorName: string;
	readonly setOperatorName: (val: string) => void;
	readonly isBatchSubmitting: boolean;
	readonly onSubmitBatch: () => void;
}

export const SanPinRunCycleTab: React.FC<SanPinRunCycleTabProps> = ({
	selectedAutoclaveId,
	setSelectedAutoclaveId,
	selectedRegime,
	setSelectedRegime,
	packagesCount,
	setPackagesCount,
	itemsSummaryInput,
	setItemsSummaryInput,
	operatorName,
	setOperatorName,
	isBatchSubmitting,
	onSubmitBatch,
}) => {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
				<div>
					<h4 className="text-sm sm:text-base font-bold m-0 text-[var(--ink)]">Провести цикл автоклава</h4>
					<p className="text-xs text-[var(--ink-muted)] m-0 mt-0.5">Пакетная стерилизация смены с фоновым списанием расходников</p>
				</div>
				<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--teal-surface)] text-[var(--primary)]">Класс B</span>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="cycle-autoclave-select" className="text-xs font-semibold text-[var(--ink)]">Автоклав клиники:</label>
				<select
					id="cycle-autoclave-select"
					value={selectedAutoclaveId}
					onChange={(e) => setSelectedAutoclaveId(e.target.value)}
					className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs sm:text-sm font-medium text-[var(--ink)]"
				>
					<option value="АК-01">АК-01 — Melag Vacuklav 23 B+ (22 л, Класс B, ЦСО №1)</option>
					<option value="АК-02">АК-02 — W&H Lina 17 (17 л, Класс B, ЦСО №2)</option>
				</select>
			</div>

			<div className="space-y-1.5">
				<span className="text-xs font-semibold text-[var(--ink)]">Режим стерилизации:</span>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => setSelectedRegime("standard_134")}
						className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${selectedRegime === "standard_134" ? "border-[var(--primary)] bg-[var(--teal-surface)] shadow-xs" : "border-[var(--line)]"}`}
					>
						<strong className="text-xs text-[var(--ink)]">134°C • Универсальный</strong>
						<span className="text-[11px] text-[var(--ink-muted)]">2.1 бар • 5 мин • Упакованные инструменты</span>
					</button>
					<button
						type="button"
						onClick={() => setSelectedRegime("delicate_121")}
						className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${selectedRegime === "delicate_121" ? "border-[var(--primary)] bg-[var(--teal-surface)] shadow-xs" : "border-[var(--line)]"}`}
					>
						<strong className="text-xs text-[var(--ink)]">121°C • Резина и пластик</strong>
						<span className="text-[11px] text-[var(--ink-muted)]">1.15 бар • 20 мин • Деликатный</span>
					</button>
					<button
						type="button"
						onClick={() => setSelectedRegime("quick_134")}
						className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${selectedRegime === "quick_134" ? "border-[var(--primary)] bg-[var(--teal-surface)] shadow-xs" : "border-[var(--line)]"}`}
					>
						<strong className="text-xs text-[var(--ink)]">134°C • Экспресс</strong>
						<span className="text-[11px] text-[var(--ink-muted)]">2.1 бар • 3 мин • Быстрая обработка</span>
					</button>
				</div>
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--ink)]">Количество крафт-пакетов:</span>
					<strong className="text-xs text-[var(--primary)]">{packagesCount} упаковок</strong>
				</div>
				<div className="grid grid-cols-5 gap-2">
					{PRESET_PACK_COUNTS.map((cnt) => (
						<button
							key={cnt}
							type="button"
							onClick={() => setPackagesCount(cnt)}
							className={`py-2 text-xs font-bold rounded-xl border transition-colors min-h-[44px] cursor-pointer touch-manipulation ${packagesCount === cnt ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
						>
							{cnt} шт.
						</button>
					))}
				</div>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="cycle-items-input" className="text-xs font-semibold text-[var(--ink)]">Содержимое партии инструментов:</label>
				<input
					id="cycle-items-input"
					type="text"
					value={itemsSummaryInput}
					onChange={(e) => setItemsSummaryInput(e.target.value)}
					className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs sm:text-sm text-[var(--ink)]"
					placeholder="Лотки смотровые, зеркала, боры, турбинные наконечники"
				/>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="cycle-operator-input" className="text-xs font-semibold text-[var(--ink)]">Ответственный сотрудник (медсестра ЦСО):</label>
				<div className="relative">
					<input
						id="cycle-operator-input"
						type="text"
						value={operatorName}
						onChange={(e) => setOperatorName(e.target.value)}
						className="w-full h-10 px-3 pr-9 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs sm:text-sm text-[var(--ink)]"
					/>
					<UserCheck size={16} className="absolute right-3 top-3 text-[var(--ink-muted)] pointer-events-none" />
				</div>
			</div>

			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2">
				<span className="text-xs font-semibold text-[var(--ink-muted)]">Фоновое списание со склада:</span>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<div className="text-[11px] text-[var(--ink-muted)]">Крафт-пакеты (100×200)</div>
						<strong className="text-[var(--primary)]">-{packagesCount} шт</strong>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<div className="text-[11px] text-[var(--ink-muted)]">Индикатор 5 класса</div>
						<strong className="text-[var(--primary)]">-1 шт</strong>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] col-span-2 sm:col-span-1">
						<div className="text-[11px] text-[var(--ink-muted)]">Статус списания</div>
						<strong className="text-[var(--success)]">Автоматически в бэке</strong>
					</div>
				</div>
			</div>

			<div className="pt-2 flex items-center justify-end">
				<button
					type="button"
					onClick={onSubmitBatch}
					aria-busy={isBatchSubmitting}
					data-testid="primary-batch-sterilization-btn"
					className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-xl font-bold text-sm text-white bg-[var(--primary)] shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation hover:opacity-95 active:scale-[0.99] transition-all"
					title="Запустить автоклавирование смены (2 цикла 134°C + контроль очистки)"
				>
					<CheckCircle2 size={16} className="text-white" />
					<span>{isBatchSubmitting ? "Проведение смены..." : "Запустить автоклавирование смены (2 цикла 134°C + контроль очистки)"}</span>
				</button>
			</div>
		</div>
	);
};
