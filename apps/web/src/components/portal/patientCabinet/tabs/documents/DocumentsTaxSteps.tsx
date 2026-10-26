import React from "react";
import { Building2, CreditCard, FileText } from "lucide-react";
import type { PatientTaxDeductionCalculation } from "../../patientCabinetEngine";

export interface DocumentsTaxStepsProps {
	readonly taxDeductionCalc: PatientTaxDeductionCalculation;
}

export const DocumentsTaxSteps: React.FC<DocumentsTaxStepsProps> = ({ taxDeductionCalc }) => {
	return (
		<div className="pc-tax-guide-section">
			<strong className="pc-tax-guide-heading">
				Как получить возврат 13% от государства:
			</strong>
			<div className="pc-tax-steps-grid">
				{taxDeductionCalc.guideSteps.map((step) => {
					const StepVectorIcon =
						step.icon === "Building2"
							? Building2
							: step.icon === "CreditCard"
								? CreditCard
								: FileText;

					return (
						<div
							key={step.stepNumber}
							className="pc-tax-step-card"
							data-testid={`tax-step-${step.stepNumber}`}
						>
							<div className="pc-tax-step-title">
								<span className="pc-step-icon-wrapper">
									<StepVectorIcon size={18} />
								</span>
								<span>{step.titleRu}</span>
							</div>
							<p className="pc-tax-step-desc">{step.descriptionRu}</p>
						</div>
					);
				})}
			</div>
		</div>
	);
};
