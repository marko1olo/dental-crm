import React from "react";
import { CheckCircle2, Layers, RotateCcw, Zap } from "lucide-react";
import { AlignerTray, BracesBracket, DentalArticulator } from "../icons/DentalIcons";

export interface OrthoClinicalPresetsSectionProps {
	readonly activePreset: "activation" | "wire_change" | "bonding" | "debonding" | null;
	readonly onPresetActivation: () => void;
	readonly onPresetWireChange: () => void;
	readonly onPresetBonding: () => void;
	readonly onPresetDebonding: () => void;
	readonly onPresetAlignerLabOrder: () => void;
	readonly onPresetRetainerLabOrder: () => void;
	readonly onPresetPlateLabOrder: () => void;
	readonly onPresetSplintLabOrder: () => void;
	readonly alignerStep: number;
	readonly alignerTotal: number;
}

export const OrthoClinicalPresetsSection: React.FC<OrthoClinicalPresetsSectionProps> = ({
	activePreset,
	onPresetActivation,
	onPresetWireChange,
	onPresetBonding,
	onPresetDebonding,
	onPresetAlignerLabOrder,
	onPresetRetainerLabOrder,
	onPresetPlateLabOrder,
	onPresetSplintLabOrder,
	alignerStep,
	alignerTotal,
}) => {
	return (
		<div
			data-testid="ortho-quick-presets-panel"
			className="bg-amber-500/10 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-500/30 flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
					<Zap size={14} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
					Клинические пресеты
				</span>
				<span className="text-[12px] font-medium text-amber-800/80 dark:text-amber-300/80">
					Мгновенное заполнение параметров и дневника приёма
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onPresetActivation}
					data-testid="ortho-preset-routine-activation"
					className={`h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "activation"
							? "bg-[var(--teal,#0d9488)] text-white border-teal-700 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-amber-500/50 text-[var(--ink,#0f172a)] dark:text-slate-100 hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
							activePreset === "activation"
								? "bg-white/20 text-white"
								: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
						}`}
					>
						<RotateCcw size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Плановая активация
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "activation"
									? "text-teal-100"
									: "text-[var(--muted,#64748b)] dark:text-slate-400"
							}`}
						>
							(смена лигатур / эластиков, дуги сохранены)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetWireChange}
					data-testid="ortho-preset-wire-change"
					title="Замена ортодонтической дуги (NiTi / ТМА / Сталь)"
					className={`h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "wire_change"
							? "bg-[var(--teal,#0d9488)] text-white border-teal-700 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-amber-500/50 text-[var(--ink,#0f172a)] dark:text-slate-100 hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
							activePreset === "wire_change"
								? "bg-white/20 text-white"
								: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
						}`}
					>
						<Zap size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Замена ортодонтической дуги
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "wire_change"
									? "text-teal-100"
									: "text-[var(--muted,#64748b)] dark:text-slate-400"
							}`}
						>
							Смена дуг: NiTi верх 0.016 / низ 0.014, норма
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetBonding}
					data-testid="ortho-preset-bracket-bonding"
					className={`h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "bonding"
							? "bg-[var(--teal,#0d9488)] text-white border-teal-700 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-amber-500/50 text-[var(--ink,#0f172a)] dark:text-slate-100 hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
							activePreset === "bonding"
								? "bg-white/20 text-white"
								: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
						}`}
					>
						<BracesBracket size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Фиксация брекет-системы
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "bonding"
									? "text-teal-100"
									: "text-[var(--muted,#64748b)] dark:text-slate-400"
							}`}
						>
							(1 челюсть)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetDebonding}
					data-testid="ortho-preset-debonding-retainer"
					className={`h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "debonding"
							? "bg-[var(--teal,#0d9488)] text-white border-teal-700 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-amber-500/50 text-[var(--ink,#0f172a)] dark:text-slate-100 hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
							activePreset === "debonding"
								? "bg-white/20 text-white"
								: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
						}`}
					>
						<CheckCircle2 size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Снятие брекет-системы
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "debonding"
									? "text-teal-100"
									: "text-[var(--muted,#64748b)] dark:text-slate-400"
							}`}
						>
							(+ установка несъемного ретейнера)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetAlignerLabOrder}
					data-testid="ortho-preset-aligner-lab-order"
					className="h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-teal-500/40 hover:border-teal-500 text-[var(--ink,#0f172a)] dark:text-slate-100"
				>
					<div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
						<AlignerTray size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-teal-700 dark:text-teal-300">
							Наряд ЗТЛ (Элайнеры / Каппа)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted,#64748b)] dark:text-slate-400">
							{`(шаг ${alignerStep} из ${alignerTotal}, срок 5-7 дней)`}
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetRetainerLabOrder}
					data-testid="ortho-preset-retainer-lab-order"
					className="h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-teal-500/40 hover:border-teal-500 text-[var(--ink,#0f172a)] dark:text-slate-100"
				>
					<div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
						<CheckCircle2 size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-teal-700 dark:text-teal-300">
							Наряд ЗТЛ (Ретейнер / Каппа)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted,#64748b)] dark:text-slate-400">
							(ретенционная каппа / дуга)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetPlateLabOrder}
					data-testid="ortho-preset-plate-lab-order"
					className="h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-teal-500/40 hover:border-teal-500 text-[var(--ink,#0f172a)] dark:text-slate-100"
				>
					<div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
						<Layers size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-teal-700 dark:text-teal-300">
							Наряд ЗТЛ (Пластинка с винтом)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted,#64748b)] dark:text-slate-400">
							(расширяющий аппарат Хааса / Бертони)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetSplintLabOrder}
					data-testid="ortho-preset-splint-lab-order"
					className="h-[44px] px-3 py-1.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-teal-500/40 hover:border-teal-500 text-[var(--ink,#0f172a)] dark:text-slate-100"
				>
					<div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
						<DentalArticulator size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-teal-700 dark:text-teal-300">
							Наряд ЗТЛ (Окклюзионный сплинт)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted,#64748b)] dark:text-slate-400">
							(миорелаксирующий / шина ВНЧС)
						</div>
					</div>
				</button>
			</div>

			<div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/20 text-xs">
				<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span className="text-[12px] font-medium text-teal-900 dark:text-teal-200">
					Мандат 8e: Истечение 30 дней плана НЕ БЛОКИРУЕТ ортодонтические манипуляции, заказ капп/элайнеров в ЗТЛ или оплату.
				</span>
			</div>
		</div>
	);
};
