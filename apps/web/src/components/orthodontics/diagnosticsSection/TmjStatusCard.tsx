import React from "react";
import { CheckCircle2 } from "lucide-react";
import { DentalArticulator } from "../../icons/DentalIcons";
import type { TmjStatus } from "@dental/shared";

export interface TmjStatusCardProps {
	readonly tmjStatus: TmjStatus;
	readonly setTmjStatus: (s: TmjStatus) => void;
	readonly onSetTmjNorm: () => void;
}

const TMJ_OPTIONS = [
	{ id: "norm" as const, label: "Норма", desc: "Безболезненно, шума нет" },
	{ id: "clicking" as const, label: "Щелчок ВНЧС", desc: "Суставной щелчок" },
	{ id: "pain" as const, label: "Боль / пальпация", desc: "Болезненность пальпации" },
	{ id: "deviation" as const, label: "Девиация", desc: "Смещение челюсти" },
	{ id: "splint" as const, label: "Сплинт-шина", desc: "Окклюзионная сплинт-терапия" },
];

export const TmjStatusCard: React.FC<TmjStatusCardProps> = ({
	tmjStatus,
	setTmjStatus,
	onSetTmjNorm,
}) => {
	const currentLabel = tmjStatus === "norm" ? "Норма" : tmjStatus === "clicking" ? "Щелчки" : tmjStatus === "pain" ? "Пальпация +" : tmjStatus === "deviation" ? "Девиация" : "Сплинт";

	return (
		<div
			data-testid="ortho-gnathology-tmj-selector"
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2"
		>
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<DentalArticulator size={14} className="text-[var(--primary)]" />
					Гнатология и статус ВНЧС
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onSetTmjNorm}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] transition shadow-xs cursor-pointer min-h-[36px]"
						data-testid="tmj-norm-1click-btn"
						title="Пальпация безболезненная, девиации нет, шум отсутствует"
					>
						<CheckCircle2 size={13} />
						<span>Норма ВНЧС</span>
					</button>
					<span className="text-xs font-bold text-[var(--primary)]">
						{currentLabel}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
				{TMJ_OPTIONS.map((opt) => {
					const isSelected = tmjStatus === opt.id;
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => setTmjStatus(opt.id)}
							data-testid={`tmj-status-${opt.id}-btn`}
							className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition cursor-pointer ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							title={opt.desc}
						>
							<span className="text-xs font-bold leading-tight">{opt.label}</span>
							<span className={`text-[10px] truncate w-full ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								{opt.desc}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
