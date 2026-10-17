import React from "react";
import { Calendar, CheckCircle2, Clock, Shield, Sparkles, Star } from "lucide-react";
import { formatWarrantyYearsText, type TreatmentPlanTier } from "../types";
import { formatServiceLifeYearsText } from "./tierCardTypes";

export interface TierCardDetailsProps {
	readonly tier: TreatmentPlanTier;
}

export const TierCardDetails: React.FC<TierCardDetailsProps> = ({ tier }) => {
	return (
		<>
			<div className="grid grid-cols-3 gap-1.5 text-xs py-1 border-y border-[var(--line,var(--border,#cbd5e1))]/40 my-1">
				<div className="flex flex-col justify-between">
					<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
						<Shield size={11} /> Гарантия
					</span>
					<strong className="text-[11px] text-[var(--ink,#0f172a)] truncate mt-0.5" title={formatWarrantyYearsText(tier.warrantyYears)}>
						{formatWarrantyYearsText(tier.warrantyYears)}
					</strong>
				</div>

				<div className="flex flex-col justify-between">
					<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
						<Clock size={11} /> Срок службы
					</span>
					<strong className="text-[11px] text-[var(--ink,#0f172a)] truncate mt-0.5" title={formatServiceLifeYearsText(tier.serviceLifeYears, tier.tierId)}>
						{formatServiceLifeYearsText(tier.serviceLifeYears, tier.tierId)}
					</strong>
				</div>

				<div className="flex flex-col justify-between">
					<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
						<Calendar size={11} /> Сроки
					</span>
					<strong className="text-[11px] text-[var(--ink,#0f172a)] mt-0.5">
						{tier.durationVisits} виз. ({tier.durationWeeks} нед.)
					</strong>
				</div>
			</div>

			{tier.materialsHeadline && (
				<div className="p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))]/60 text-[11px] text-[var(--ink,#0f172a)] leading-snug">
					<div className="text-[10px] font-bold text-[var(--teal,var(--brand-primary))] uppercase tracking-wider mb-0.5">
						Клинические материалы
					</div>
					<div className="font-semibold">{tier.materialsHeadline}</div>
				</div>
			)}

			<div className="space-y-1.5 pt-1.5 border-t border-[var(--border,#cbd5e1)]/60">
				<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 m-0">
					<Sparkles size={13} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Материалы и технологии</span>
				</h4>
				<ul className="space-y-1 text-xs text-[var(--muted,#64748b)] m-0 list-none p-0">
					{(tier.materialsList ?? []).map((mat, i) => (
						<li key={i} className="flex items-start gap-2 text-[11px] leading-tight">
							<CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
							<span className="text-[var(--ink,#0f172a)]">{mat}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="space-y-1 pt-1.5 border-t border-[var(--border,#cbd5e1)]/60">
				<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 m-0">
					<Star size={13} className="text-amber-500" />
					<span>Преимущества для пациента</span>
				</h4>
				<ul className="space-y-0.5 text-[11px] text-[var(--muted,#64748b)] m-0 list-none p-0">
					{tier.keyAdvantages.map((adv, idx) => (
						<li key={idx} className="flex items-start gap-1.5">
							<span className="text-amber-500 font-bold">•</span>
							<span>{adv}</span>
						</li>
					))}
				</ul>
			</div>
		</>
	);
};
