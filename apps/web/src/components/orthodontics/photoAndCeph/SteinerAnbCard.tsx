import React from "react";
import { Activity, CheckCircle2, Sliders } from "lucide-react";
import { ANB_CLASS_OPTIONS, type AnbClass } from "@dental/shared";

export interface SteinerAnbCardProps {
	readonly anbClass: AnbClass;
	readonly setAnbClass: (c: AnbClass) => void;
	readonly anbAngle: number;
	readonly setAnbAngle: (angle: number) => void;
	readonly onSetAnbNorm: () => void;
	readonly onOpenCephModal: () => void;
}

export const SteinerAnbCard: React.FC<SteinerAnbCardProps> = ({
	anbClass,
	setAnbClass,
	anbAngle,
	setAnbAngle,
	onSetAnbNorm,
	onOpenCephModal,
}) => {
	return (
		<div
			data-testid="ortho-anb-class-selector"
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2"
		>
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Activity size={14} className="text-[var(--primary)]" />
					Скелетный класс по Steiner (угол ANB)
				</span>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={onSetAnbNorm}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px]"
						data-testid="anb-class-norm-1click-btn"
						title="Скелетный класс I по Steiner (норма ANB 2° ± 2°)"
					>
						<CheckCircle2 size={13} className="text-[var(--primary)]" />
						<span>Норма (ANB I: 2.0°)</span>
					</button>
					<button
						type="button"
						onClick={onOpenCephModal}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px]"
						data-testid="ortho-open-ceph-analysis-btn"
						title="Открыть боковую ТРГ цефалометрию (расчет углов Steiner, Tweed, Downs, Ricketts)"
					>
						<Sliders size={13} className="text-[var(--primary)]" />
						<span>ТРГ-анализ (Steiner)</span>
					</button>
					<span className="text-[12px] font-bold text-[var(--primary)]">
						{ANB_CLASS_OPTIONS.find((a) => a.id === anbClass)?.shortLabel} ({anbAngle.toFixed(1)}°)
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
				{ANB_CLASS_OPTIONS.map((opt) => {
					const isSelected = anbClass === opt.id;
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => {
								setAnbClass(opt.id);
								setAnbAngle(opt.typicalDegrees);
							}}
							data-testid={`anb-class-${opt.id}-btn`}
							className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-black shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							title={opt.desc}
						>
							<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
							<span className={`text-[10px] truncate w-full ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								{opt.id === "class_1" ? "Норма 2° (0°..4°)" : opt.id === "class_2" ? "Дистальный >4°" : "Мезиальный <0°"}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
