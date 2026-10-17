/**
 * TreatmentPlanWizard.tsx — визард быстрого составления плана лечения из одонтограммы.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120).
 */

import React from "react";
import type { TreatmentPlanWizardProps } from "./wizard/wizardTypes";
import { useTreatmentPlanWizard } from "./wizard/useTreatmentPlanWizard";
import { WizardHeader } from "./wizard/WizardHeader";
import { WizardStageGroupCard } from "./wizard/WizardStageGroupCard";
import { WizardSummaryFooter } from "./wizard/WizardSummaryFooter";

export * from "./wizard/wizardTypes";

export const TreatmentPlanWizard: React.FC<TreatmentPlanWizardProps> = (props) => {
	const { isOpen, onClose, patientName, className = "" } = props;
	const {
		activeItems,
		stageGroups,
		totalRub,
		doctorDiscountPercent,
		setDoctorDiscountPercent,
		isSubmitting,
		toggleExclude,
		createPlan,
	} = useTreatmentPlanWizard(props);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			data-testid="treatment-plan-wizard-modal"
		>
			<div
				className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden ${className}`.trim()}
			>
				<WizardHeader
					patientName={patientName}
					itemsCount={activeItems.length}
					onClose={onClose}
				/>

				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
					{activeItems.length === 0 ? (
						<div className="p-8 text-center text-xs text-[var(--muted)]">
							В одонтограмме нет невылеченных патологий. План будет содержать первичную консультацию и диагностику.
						</div>
					) : (
						stageGroups.map((group) => (
							<WizardStageGroupCard
								key={group.stageNumber}
								group={group}
								onToggleExclude={toggleExclude}
								isExcluded={(key) => !activeItems.some((it) => `${it.toothNumber}-${it.code}` === key)}
							/>
						))
					)}
				</div>

				<WizardSummaryFooter
					totalRub={totalRub}
					doctorDiscountPercent={doctorDiscountPercent}
					onSetDoctorDiscountPercent={setDoctorDiscountPercent}
					isSubmitting={isSubmitting}
					onSubmit={createPlan}
				/>
			</div>
		</div>
	);
};

export const PlanWizardModal = TreatmentPlanWizard;
export default TreatmentPlanWizard;
