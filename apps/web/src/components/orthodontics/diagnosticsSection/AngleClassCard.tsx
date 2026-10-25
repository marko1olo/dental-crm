import React from "react";
import { Activity, CheckCircle2 } from "lucide-react";
import { ANGLE_CLASS_OPTIONS, type AngleClass } from "@dental/shared";

export interface AngleClassCardProps {
	readonly angleClass: AngleClass;
	readonly setAngleClass: (c: AngleClass) => void;
	readonly onSetAngleClassNorm: () => void;
}

export const AngleClassCard: React.FC<AngleClassCardProps> = ({
	angleClass,
	setAngleClass,
	onSetAngleClassNorm,
}) => {
	return (
		<div
			data-testid="ortho-angle-class-selector"
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2"
		>
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Activity size={14} className="text-[var(--primary)]" />
					Прикус по Энглю
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onSetAngleClassNorm}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] transition shadow-xs cursor-pointer min-h-[36px]"
						data-testid="angle-class-norm-1click-btn"
						title="Класс I по Энглю / Физиологический прикус (Норма СтАР)"
					>
						<CheckCircle2 size={13} />
						<span>Норма (Класс I)</span>
					</button>
					<span className="text-xs font-bold text-[var(--primary)]">
						{ANGLE_CLASS_OPTIONS.find((a) => a.id === angleClass)?.shortLabel}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
				{ANGLE_CLASS_OPTIONS.map((opt) => {
					const isSelected = angleClass === opt.id;
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => setAngleClass(opt.id)}
							data-testid={`angle-class-${opt.id}-btn`}
							className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition cursor-pointer ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							title={opt.desc}
						>
							<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
							<span className={`text-[10px] truncate w-full ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								{opt.id === "class_1" ? "Нейтральный" : opt.id === "class_2_div_1" ? "Протрузия" : opt.id === "class_2_div_2" ? "Ретрузия" : "Мезиальный"}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
