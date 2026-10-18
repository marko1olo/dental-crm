import { type VisitFlowResult } from "@dental/shared";
import { Zap } from "lucide-react";
import type React from "react";
import "./VisitFlowProgress.css";
import { createFlowSteps } from "./visitFlowProgressModules/visitFlowProgressHelpers";
import { VisitFlowProgressSteps } from "./visitFlowProgressModules/VisitFlowProgressSteps";
import { VisitFlowProgressNotes } from "./visitFlowProgressModules/VisitFlowProgressNotes";
import { VisitFlowProgressOutputs } from "./visitFlowProgressModules/VisitFlowProgressOutputs";

export const VisitFlowProgress: React.FC<{
	result: VisitFlowResult | null | undefined;
}> = ({ result }) => {
	if (!result) return null;

	const steps = createFlowSteps(result);
	const stepNotes = steps.filter((step) => step.msg);

	return (
		<div className="visit-flow-progress" data-testid="visit-flow-progress">
			<div className="vfp-header">
				<h4 className="vfp-title">
					<Zap className="w-4 h-4 text-amber-500 inline-block mr-1.5" />
					Ассистент обработки приема
				</h4>
				<span className={`vfp-badge status-${result.overallStatus ?? "pending"}`}>
					{result.overallStatus === "success"
						? "Готово"
						: result.overallStatus === "partial"
							? "Частично"
							: result.overallStatus === "error"
								? "Ошибка"
								: "Идет разбор"}
				</span>
			</div>

			<VisitFlowProgressSteps steps={steps} />
			<VisitFlowProgressNotes stepNotes={stepNotes} />
			<VisitFlowProgressOutputs result={result} />
		</div>
	);
};
