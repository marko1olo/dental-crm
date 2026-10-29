import React from "react";
import { CheckCircle2, Plus, Sparkles } from "lucide-react";
import {
	BRACKET_SYSTEMS,
	type OrthodonticStageKind,
	type TargetArch,
} from "../orthoProtocolTypes";

export interface OrthoActivationCardProps {
	readonly stageFilter: OrthodonticStageKind;
	readonly setStageFilter: (stage: OrthodonticStageKind) => void;
	readonly targetArch: TargetArch;
	readonly setTargetArch: (arch: TargetArch) => void;
	readonly bracketSystem: string;
	readonly setBracketSystem: (sys: string) => void;
	readonly bracketSlot: "0.018" | "0.022";
	readonly setBracketSlot: (slot: "0.018" | "0.022") => void;
	readonly alignerStep: number;
	readonly setAlignerStep: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotal: number;
	readonly setAlignerTotal: (total: number) => void;
	readonly alignerDaysPerStep: number;
	readonly setAlignerDaysPerStep: (days: number) => void;
	readonly onApplyExpressNorm: () => void;
}

const STAGES: readonly [OrthodonticStageKind, string][] = [
	["stage_1_diagnostics", "1. Диагностика"],
	["stage_2_leveling", "2. Нивелирование"],
	["stage_3_bite_correction", "3. Коррекция прикуса"],
	["stage_4_detailing", "4. Детализация"],
	["stage_5_retention", "5. Ретенция"],
	["stage_6_aligners", "6. Элайнеры"],
] as const;

const ARCHES: readonly [TargetArch, string][] = [
	["both", "Обе челюсти"],
	["upper", "Вся ВЧ"],
	["lower", "Вся НЧ"],
	["anterior", "Фронт"],
] as const;

export const OrthoActivationCard: React.FC<OrthoActivationCardProps> = ({
	stageFilter,
	setStageFilter,
	targetArch,
	setTargetArch,
	bracketSystem,
	setBracketSystem,
	bracketSlot,
	setBracketSlot,
	alignerStep,
	setAlignerStep,
	alignerTotal,
	setAlignerTotal,
	alignerDaysPerStep,
	setAlignerDaysPerStep,
	onApplyExpressNorm,
}) => {
	return (
		<div className="flex flex-col gap-3">
			{/* 1. Stages Segmented Strip */}
			<div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0 min-w-0">
				{STAGES.map(([key, label]) => {
					const isActive = stageFilter === key;
					return (
						<button
							key={key}
							type="button"
							onClick={() => setStageFilter(key)}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] cursor-pointer transition-all border shrink-0 ${
								isActive
									? "bg-[var(--paper-soft)] text-[var(--teal)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							{label}
						</button>
					);
				})}
			</div>

			{/* 2. Express 1-Click Activation Norm Banner (Mandate 8e) */}
			<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-2.5 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<div className="min-w-0">
						<div className="text-xs font-bold text-[var(--ink)] truncate">
							{stageFilter === "stage_6_aligners"
								? "Смена элайнера без осложнений"
								: "Плановая активация дуги без осложнений"}
						</div>
						<div className="text-[11px] text-[var(--muted)] truncate">
							Фиксация нормы, целостность аппаратуры и дневник в 1 клик
						</div>
					</div>
				</div>
				<button
					type="button"
					onClick={onApplyExpressNorm}
					className="secondary-button min-h-[40px] h-auto py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300 bg-[var(--paper)] hover:bg-teal-500/15 cursor-pointer shadow-xs w-full sm:w-auto text-left"
					data-testid="ortho-express-norm-banner-btn"
					title="Заполнить дневник и протокол визита физиологической нормой в 1 клик"
				>
					<CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="hidden sm:inline">✓ Активация дуги / Смена элайнера без осложнений (Норма)</span>
					<span className="sm:hidden">✓ Активация дуги без осложнений (Норма)</span>
				</button>
			</div>

			{/* 3. Arch Selection Strip */}
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--muted)]">Челюсть:</span>
				{ARCHES.map(([key, label]) => {
					const isActive = targetArch === key;
					return (
						<button
							key={key}
							type="button"
							onClick={() => setTargetArch(key)}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border min-w-[40px] min-h-[40px] transition-all ${
								isActive
									? "bg-[var(--paper-soft)] text-[var(--teal)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							{label}
						</button>
					);
				})}
			</div>

			{/* 4. Bracket System & Slot (or Aligner Controls) */}
			{stageFilter === "stage_6_aligners" ? (
				<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)]">Протокол элайнеротерапии:</span>
						<span className="text-xs font-semibold text-[var(--teal)]">
							Каппа {alignerStep} из {alignerTotal}
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-[var(--muted)]">Текущий сет каппы:</span>
							<div className="flex items-center gap-1.5">
								<input
									type="number"
									min={1}
									max={alignerTotal}
									value={alignerStep}
									onChange={(e) => setAlignerStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
									className="w-16 h-9 px-2 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
								/>
								<button
									type="button"
									onClick={() => setAlignerStep((s) => Math.min(alignerTotal, s + 1))}
									className="secondary-button h-9 px-2 text-xs font-bold rounded-lg flex items-center gap-1 border-[var(--line)]"
									title="Выдать следующий сет элайнера (+1)"
								>
									<Plus size={14} />
									<span>+1 сет</span>
								</button>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-[var(--muted)]">Всего сетов в плане:</span>
							<input
								type="number"
								min={1}
								max={100}
								value={alignerTotal}
								onChange={(e) => setAlignerTotal(Math.max(1, parseInt(e.target.value, 10) || 1))}
								className="w-full h-9 px-2 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-[var(--muted)]">Дней на 1 каппу:</span>
							<input
								type="number"
								min={7}
								max={28}
								value={alignerDaysPerStep}
								onChange={(e) => setAlignerDaysPerStep(Math.max(7, parseInt(e.target.value, 10) || 14))}
								className="w-full h-9 px-2 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)]">Брекет-система и пропись:</span>
						<div className="flex items-center gap-1">
							{(["0.018", "0.022"] as const).map((s) => {
								const isActive = bracketSlot === s;
								return (
									<button
										key={s}
										type="button"
										onClick={() => setBracketSlot(s)}
										className={`px-2 py-0.5 rounded text-[11px] font-bold border min-h-[28px] transition-all ${
											isActive
												? "bg-[var(--paper-soft)] text-[var(--teal)] border-[var(--teal)]"
												: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
										}`}
									>
										{s}
									</button>
								);
							})}
						</div>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
						{BRACKET_SYSTEMS.slice(0, 4).map((b) => {
							const isActive = bracketSystem === b.id;
							return (
								<button
									key={b.id}
									type="button"
									onClick={() => setBracketSystem(b.id)}
									className={`p-2 rounded-lg text-left text-xs font-semibold border cursor-pointer min-h-[44px] transition-all flex flex-col justify-center overflow-hidden min-w-0 ${
										isActive
											? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] font-bold shadow-xs"
											: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<div className="w-full min-w-0 overflow-hidden text-left">
										<div className="font-bold text-[var(--ink)] truncate text-xs">{b.label}</div>
										<div className="text-[10px] text-[var(--muted)] truncate">{b.desc}</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
