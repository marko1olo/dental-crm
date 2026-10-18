import React from "react";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";
import { formatKopecksToRub } from "../analyticsWidgetData.js";
import type { LostPatientsKpis } from "./lostPatientTypes";

interface LostPatientsKpiGridProps {
	readonly kpis: LostPatientsKpis;
}

export function LostPatientsKpiGrid({ kpis }: LostPatientsKpiGridProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
			<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
					<span className="flex items-center gap-1.5">
						<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
						В зоне риска
					</span>
					<span className="font-semibold text-[var(--warn-fg)]">
						{kpis.totalRiskPatients} чел
					</span>
				</div>
				<div className="text-xs text-[var(--muted)] flex items-center justify-between">
					<span>6+м: {kpis.due6mCount}</span>
					<span>12+м: {kpis.overdue12mCount}</span>
					<span>24+м: {kpis.critical24mCount}</span>
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
					<span className="flex items-center gap-1.5">
						<ShieldCheck className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
						Recall 6м (Санация)
					</span>
					<span
						className={`px-2 py-0.5 rounded text-xs font-bold ${
							kpis.sanRecall6m >= 65
								? "bg-emerald-500/10 text-[var(--ok-fg)]"
								: kpis.sanRecall6m > 0
									? "bg-amber-500/10 text-[var(--warn-fg)]"
									: "bg-[var(--line)] text-[var(--muted)]"
						}`}
					>
						{kpis.sanRecall6m >= 65 ? "Норма" : kpis.sanRecall6m > 0 ? "Внимание" : "Нет данных"}
					</span>
				</div>
				<div className="text-base font-bold text-[var(--ink)]">
					{kpis.sanRecall6m}% <span className="text-xs font-normal text-[var(--muted)]">возврат на гигиену</span>
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
					<span className="flex items-center gap-1.5">
						<TrendingUp className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
						Recall 12м (Импланты)
					</span>
					<span
						className={`px-2 py-0.5 rounded text-xs font-bold ${
							kpis.implRecall12m >= 60
								? "bg-emerald-500/10 text-[var(--ok-fg)]"
								: kpis.implRecall12m > 0
									? "bg-amber-500/10 text-[var(--warn-fg)]"
									: "bg-[var(--line)] text-[var(--muted)]"
						}`}
					>
						{kpis.implRecall12m >= 60 ? "Норма" : kpis.implRecall12m > 0 ? "Внимание" : "Нет данных"}
					</span>
				</div>
				<div className="text-base font-bold text-[var(--ink)]">
					{kpis.implRecall12m}% <span className="text-xs font-normal text-[var(--muted)]">контроль остеоинтеграции</span>
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
					<span className="flex items-center gap-1.5">
						<TrendingUp className="w-3.5 h-3.5 text-[var(--teal)]" />
						Потенциал возврата
					</span>
					<span className="font-semibold text-[var(--ok-fg)]">
						{kpis.totalRiskPatients} визитов
					</span>
				</div>
				<div className="text-base font-bold text-[var(--ink)]">
					{formatKopecksToRub(kpis.estimatedRecallRevenueKopecks, false)}
				</div>
			</div>
		</div>
	);
}
