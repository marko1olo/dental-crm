import React from "react";
import { Printer } from "lucide-react";
import { FranklBehaviorBadge } from "../pediatric";
import type { FranklRating } from "../pediatricDentitionEngine";

export interface PediatricFranklSectionProps {
	rating: FranklRating;
	onChangeRating: (rating: FranklRating) => void;
	onOpenParentMemo: () => void;
}

export const PediatricFranklSection: React.FC<PediatricFranklSectionProps> = ({
	rating,
	onChangeRating,
	onOpenParentMemo,
}) => {
	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<FranklBehaviorBadge
				rating={rating}
				onChange={onChangeRating}
				showStrategies={true}
			/>

			<div className="p-5 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
							Рекомендации родителям
						</span>
						<h4 className="text-base font-extrabold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
							Формирование памятки по детским процедурам
						</h4>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium mt-1">
							Печать памяток по серебрению, герметизации фиссур и витальной пульпотомии (с контролем прикусывания анестезированной губы).
						</p>
					</div>

					<button
						type="button"
						onClick={onOpenParentMemo}
						className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
					>
						<Printer className="w-4 h-4" />
						<span>Открыть генератор памятки</span>
					</button>
				</div>
			</div>
		</div>
	);
};
