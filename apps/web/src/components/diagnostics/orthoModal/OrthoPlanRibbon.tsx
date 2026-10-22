import React from "react";
import { CheckCircle } from "lucide-react";
import { ORTHODONTIC_STAGE_METADATA, type OrthodonticPhotoSession } from "@dental/shared";

interface OrthoPlanRibbonProps {
	session: OrthodonticPhotoSession;
	completeness: {
		uploadedCount: number;
		completionPercentage: number;
		isComplete: boolean;
		isReadyForConsultation: boolean;
	};
}

export const OrthoPlanRibbon: React.FC<OrthoPlanRibbonProps> = ({ session, completeness }) => {
	const currentStageMeta = ORTHODONTIC_STAGE_METADATA[session.stage];

	return (
		<div className="ortho-plan-ribbon">
			<div className="ortho-plan-info">
				<span className="ortho-plan-badge">{currentStageMeta.shortLabelRu}</span>
				<span className="font-semibold text-xs text-[var(--ink)]">
					{session.treatmentStageTitle || "Ортодонтическое лечение"}
				</span>
			</div>

			<div className="ortho-completeness-meter">
				<div className="ortho-progress-bar">
					<div
						className={`ortho-progress-fill ${completeness.isComplete ? "complete" : ""}`}
						style={{ width: `${completeness.completionPercentage}%` }}
					/>
				</div>
				<span className="ortho-progress-text">
					{completeness.uploadedCount}/8 ({completeness.completionPercentage}%)
				</span>
				{completeness.isReadyForConsultation && (
					<span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
						<CheckCircle size={12} />
						<span>Готов</span>
					</span>
				)}
			</div>
		</div>
	);
};
