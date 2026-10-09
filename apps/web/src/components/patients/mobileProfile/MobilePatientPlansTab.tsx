/**
 * DENTE CRM — Mobile Patient Plans Tab (Планы лечения)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Interactive Treatment Plans Cards & Stage Breakdown.
 */

import type { Dashboard, Patient } from "@dental/shared";
import { Activity, CheckCircle2, ChevronRight, Clock, Plus } from "lucide-react";
import React, { useMemo } from "react";
import { showToast } from "../../GlobalToast";

export interface MobilePatientPlansTabProps {
	patient: Patient;
	dashboard?: Dashboard | null | undefined;
	money: (amountRub: number) => string;
	onOpenPlan?: ((planId: string) => void) | undefined;
	onCreatePlan?: (() => void) | undefined;
}

export const MobilePatientPlansTab: React.FC<MobilePatientPlansTabProps> = ({
	patient,
	dashboard,
	money,
	onOpenPlan,
	onCreatePlan,
}) => {
	const patientPlans = useMemo(() => {
		const all = (dashboard?.treatmentPlans ?? (dashboard as any)?.plans ?? []) as any[];
		return all.filter((p) => String(p?.patientId) === String(patient.id));
	}, [dashboard, patient.id]);

	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-plans">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
					Планы лечения ({patientPlans.length})
				</h3>
				<button
					type="button"
					onClick={() => {
						if (onCreatePlan) onCreatePlan();
						else showToast("Создание плана лечения доступно в приёме врача", "info");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
					data-testid="mobile-btn-create-plan"
				>
					<Plus size={13} />
					<span>Новый план</span>
				</button>
			</div>

			{patientPlans.length === 0 ? (
				<div className="p-8 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center gap-2">
					<Activity size={32} className="text-[var(--muted)] opacity-50" />
					<p className="text-xs text-[var(--muted)] m-0">
						Планы лечения для пациента пока не составлены.
					</p>
					<span className="text-[11px] text-[var(--muted)]">
						Врач может составить комплексный план во время приёма.
					</span>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{patientPlans.map((plan: any) => {
						const isApproved = plan.status === "approved" || plan.status === "completed";
						return (
							<div
								key={plan.id}
								className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2"
								data-testid={`mobile-plan-card-${plan.id}`}
							>
								<div className="flex items-center justify-between gap-2">
									<h4 className="text-xs font-bold text-[var(--ink)] m-0 truncate">
										{plan.title || plan.name || "План комплексного лечения"}
									</h4>
									<span
										className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
											isApproved
												? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
												: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
										}`}
									>
										{isApproved ? "Согласован" : "Черновик"}
									</span>
								</div>

								<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line-subtle,#f1f5f9)]">
									<div className="font-mono font-bold text-teal-700 dark:text-teal-400">
										{money(Number(plan.totalCostRub ?? plan.totalRub ?? 0))}
									</div>
									<button
										type="button"
										onClick={() => {
											if (onOpenPlan) onOpenPlan(plan.id);
											else showToast(`Открыт план: ${plan.title || "План"}`, "info");
										}}
										className="text-xs font-bold text-[var(--teal)] inline-flex items-center gap-0.5 cursor-pointer hover:underline"
									>
										<span>Подробнее</span>
										<ChevronRight size={13} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
