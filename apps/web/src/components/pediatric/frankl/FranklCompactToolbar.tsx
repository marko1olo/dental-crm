import React from "react";
import { Check } from "lucide-react";
import {
	type FranklRating,
	FRANKL_RATINGS,
	FRANKL_SCALE_DEFINITIONS,
	getFranklVectorIcon,
} from "./franklTypes";

interface FranklCompactToolbarProps {
	readonly rating: FranklRating;
	readonly readOnly?: boolean | undefined;
	readonly onChange?: ((rating: FranklRating) => void) | undefined;
	readonly onQuickSelect?: ((rating: FranklRating, note?: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const FranklCompactToolbar: React.FC<FranklCompactToolbarProps> = ({
	rating,
	readOnly = false,
	onChange,
	onQuickSelect,
	className = "",
}) => {
	return (
		<div
			role="toolbar"
			aria-label="Шкала поведения Франкла"
			className={`inline-flex items-center gap-1 p-0.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] min-h-[32px] sm:min-h-[36px] sm:h-9 max-h-9 select-none shrink-0 ${className}`.trim()}
			data-testid="frankl-compact-toolbar"
		>
			<span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] px-1.5 hidden md:inline shrink-0">
				Франкл:
			</span>
			{FRANKL_RATINGS.map((r) => {
				const def = FRANKL_SCALE_DEFINITIONS[r];
				const isSelected = rating === r;
				const RatingIcon = getFranklVectorIcon(r);
				return (
					<button
						key={r}
						type="button"
						onClick={() => {
							if (!readOnly) {
								onChange?.(r);
								onQuickSelect?.(r);
							}
						}}
						className={`min-h-[28px] sm:min-h-[32px] h-7 sm:h-8 px-2 rounded-lg text-xs font-black font-mono flex items-center gap-1 transition-all cursor-pointer select-none active:scale-95 border ${
							isSelected
								? "shadow-xs ring-1 ring-black/10 dark:ring-white/10"
								: "opacity-75 hover:opacity-100 bg-transparent border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						style={{
							backgroundColor: isSelected ? def.badgeBg : undefined,
							borderColor: isSelected ? def.badgeBorder : "transparent",
							color: isSelected ? def.badgeColor : undefined,
						}}
						title={`${def.symbol} — ${def.nameRu}: ${def.descriptionRu}`}
						data-testid={`btn-frankl-${r}`}
					>
						<span data-testid={`frankl-toolbar-btn-${r}`} className="contents">
							<RatingIcon className="w-3.5 h-3.5 shrink-0" />
							<span>{def.symbol}</span>
							{isSelected && <Check className="w-3 h-3 shrink-0 ml-0.5" />}
						</span>
					</button>
				);
			})}
		</div>
	);
};
