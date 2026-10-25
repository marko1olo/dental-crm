import React from "react";
import { ArrowRight, Save } from "lucide-react";

export interface CephTab1BottomActionsProps {
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onNavigateToMetrics: () => void;
}

export function CephTab1BottomActions({
	onSaveConsultationWithoutCeph,
	onNavigateToMetrics,
}: CephTab1BottomActionsProps) {
	return (
		<div className="mt-3 pt-3 border-t border-slate-800 shrink-0 flex flex-col gap-2">
			<button
				type="button"
				onClick={onSaveConsultationWithoutCeph}
				data-testid="tab1-save-consultation-without-ceph-btn"
				className="w-full h-9 py-1.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
				title="Сохранить предварительную консультацию ортодонта в карту без ожидания расстановки всех 16 точек"
			>
				<Save size={15} />
				<span>Сохранить консультацию без полного ТРГ-расчета</span>
			</button>
			<button
				type="button"
				onClick={onNavigateToMetrics}
				className="w-full h-10 py-2 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all bg-[var(--teal)] hover:brightness-105 text-white cursor-pointer"
				data-testid="tab1-to-metrics-btn"
			>
				<span>Перейти к расчету углов (Steiner, Tweed, Downs, McNamara)</span>
				<ArrowRight size={16} />
			</button>
		</div>
	);
}
