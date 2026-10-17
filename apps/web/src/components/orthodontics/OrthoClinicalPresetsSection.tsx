import React from "react";
import { CheckCircle2, Layers, RotateCcw, Sparkles, Zap } from "lucide-react";
import { AlignerTray, BracesBracket, DentalArticulator } from "../icons/DentalIcons";
import type { OrthoClinicalPresetId } from "./orthoProtocolTypes";

export interface OrthoClinicalPresetsSectionProps {
	readonly activePreset: OrthoClinicalPresetId | null;
	readonly onPresetActivation: () => void;
	readonly onPresetWireChange: () => void;
	readonly onPresetBonding: () => void;
	readonly onPresetDebonding: () => void;
	readonly onPresetLeveling?: (() => void) | undefined;
	readonly onPresetSprings?: (() => void) | undefined;
	readonly onPresetSeparationRings?: (() => void) | undefined;
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
	onPresetLeveling = () => {},
	onPresetSprings = () => {},
	onPresetSeparationRings = () => {},
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
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<Zap size={14} className="text-[var(--primary)]" />
					Клинические пресеты
				</span>
				<span className="text-[12px] font-medium text-[var(--muted)]">
					Мгновенное заполнение параметров и дневника приёма
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onPresetActivation}
					data-testid="ortho-preset-routine-activation"
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "activation"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "activation"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
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
									? "text-white/80"
									: "text-[var(--muted)]"
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
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "wire_change"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "wire_change"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
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
									? "text-white/80"
									: "text-[var(--muted)]"
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
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "bonding"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "bonding"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
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
									? "text-white/80"
									: "text-[var(--muted)]"
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
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "debonding"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "debonding"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
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
									? "text-white/80"
									: "text-[var(--muted)]"
							}`}
						>
							(+ установка несъемного ретейнера)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetLeveling}
					data-testid="ortho-preset-leveling"
					title="Смена дуг: плановое нивелирование (NiTi .014 ВЧ + CuNiTi .016x.022 НЧ + эластики Class II)"
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "leveling"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "leveling"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
						}`}
					>
						<Sparkles size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Смена дуг: нивелирование
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "leveling"
									? "text-white/80"
									: "text-[var(--muted)]"
							}`}
						>
							NiTi .014 + CuNiTi .016x.022 + Class II
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetSprings}
					data-testid="ortho-preset-springs"
					title="Активация пружин (раскрывающие Open-Coil / закрывающие Closed-Coil)"
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "springs"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "springs"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
						}`}
					>
						<Zap size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Активация пружин
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "springs"
									? "text-white/80"
									: "text-[var(--muted)]"
							}`}
						>
							Open / Closed Coil на дуге SS
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetSeparationRings}
					data-testid="ortho-preset-separation-rings"
					title="Сепарация под бандажные кольца (межзубные сепараторы 16, 26, 36, 46)"
					className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
						activePreset === "separation"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<div
						className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
							activePreset === "separation"
								? "bg-white/20 text-white"
								: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
						}`}
					>
						<Layers size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight">
							Сепарация под кольца
						</div>
						<div
							className={`text-[11.5px] truncate leading-tight ${
								activePreset === "separation"
									? "text-white/80"
									: "text-[var(--muted)]"
							}`}
						>
							Эластические сепараторы моляров
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetAlignerLabOrder}
					data-testid="ortho-preset-aligner-lab-order"
					className="h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					<div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]">
						<AlignerTray size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-[var(--ink)]">
							Наряд ЗТЛ (Элайнеры / Каппа)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted)]">
							{`(шаг ${alignerStep} из ${alignerTotal}, срок 5-7 дней)`}
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetRetainerLabOrder}
					data-testid="ortho-preset-retainer-lab-order"
					className="h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					<div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]">
						<CheckCircle2 size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-[var(--ink)]">
							Наряд ЗТЛ (Ретейнер / Каппа)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted)]">
							(ретенционная каппа / дуга)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetPlateLabOrder}
					data-testid="ortho-preset-plate-lab-order"
					className="h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					<div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]">
						<Layers size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-[var(--ink)]">
							Наряд ЗТЛ (Пластинка с винтом)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted)]">
							(расширяющий аппарат Хааса / Бертони)
						</div>
					</div>
				</button>

				<button
					type="button"
					onClick={onPresetSplintLabOrder}
					data-testid="ortho-preset-splint-lab-order"
					className="h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					<div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]">
						<DentalArticulator size={13} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-bold leading-tight text-[var(--ink)]">
							Наряд ЗТЛ (Окклюзионный сплинт)
						</div>
						<div className="text-[11.5px] truncate leading-tight text-[var(--muted)]">
							(миорелаксирующий / шина ВНЧС)
						</div>
					</div>
				</button>
			</div>

			<div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs">
				<CheckCircle2 size={15} className="text-[var(--primary)] shrink-0" />
				<span className="text-[12px] font-medium text-[var(--ink)]">
					Клинический регламент: Истечение 30 дней плана не ограничивает ортодонтические манипуляции, заказ капп/элайнеров в лаборатории или оплату.
				</span>
			</div>
		</div>
	);
};
