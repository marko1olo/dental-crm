import React from "react";
import { Activity, User } from "lucide-react";
import { formatShortPatientName } from "./drawerTypes";
import type { CopilotContextState } from "../CopilotContextSync";

interface CopilotDrawerContextBarProps {
	uiContext: CopilotContextState;
}

export const CopilotDrawerContextBar: React.FC<CopilotDrawerContextBarProps> = ({ uiContext }) => {
	return (
		<div className="copilot-context-bar" data-testid="copilot-context-bar">
			<span
				className="copilot-context-chip active-view"
				title={`Активный экран: ${uiContext.viewLabel || uiContext.view}`}
			>
				<Activity size={12} />
				<span>{uiContext.viewLabel || uiContext.view}</span>
			</span>

			{uiContext.activeTooth !== null && uiContext.activeTooth !== undefined && (
				<span
					className="copilot-context-chip"
					title={`Выбранный зуб FDI: ${uiContext.activeTooth}`}
				>
					<span>{`Зуб #${uiContext.activeTooth}`}</span>
				</span>
			)}

			{uiContext.patientId && (
				<span
					className="copilot-context-chip"
					title={
						uiContext.patientName
							? `Пациент: ${uiContext.patientName}`
							: `Пациент ID: ${uiContext.patientId}`
					}
				>
					<User size={12} style={{ flexShrink: 0 }} />
					<span>
						{formatShortPatientName(uiContext.patientName) ??
							`Пациент #${uiContext.patientId.slice(0, 6)}`}
					</span>
				</span>
			)}

			{uiContext.activeDoctor && (
				<span
					className="copilot-context-chip doctor"
					title={`Лечащий врач: ${uiContext.activeDoctor}`}
				>
					<span>{uiContext.activeDoctor}</span>
				</span>
			)}
		</div>
	);
};
