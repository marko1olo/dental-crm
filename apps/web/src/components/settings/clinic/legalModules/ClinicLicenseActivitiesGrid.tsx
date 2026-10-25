import React from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { CLINICAL_LICENSE_ACTIVITIES } from "./clinicLegalTypes";

interface ClinicLicenseActivitiesGridProps {
	activeActivities: string[];
	toggleActivity: (activityId: string) => void;
}

export const ClinicLicenseActivitiesGrid: React.FC<ClinicLicenseActivitiesGridProps> = ({
	activeActivities,
	toggleActivity,
}) => {
	return (
		<div className="pt-3 border-t border-[var(--line)] space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)]">
					Номенклатурные направления деятельности по лицензии:
				</span>
				<a
					href="https://roszdravnadzor.gov.ru/services/licenses"
					target="_blank"
					rel="noreferrer noopener"
					className="text-[11px] text-[var(--teal)] hover:underline inline-flex items-center gap-1"
				>
					<span>Реестр Росздравнадзора</span>
					<ExternalLink size={11} aria-hidden="true" />
				</a>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{CLINICAL_LICENSE_ACTIVITIES.map((act) => {
					const isChecked = activeActivities.includes(act.id);
					return (
						<button
							key={act.id}
							type="button"
							onClick={() => toggleActivity(act.id)}
							style={{
								border: isChecked ? "1px solid var(--teal)" : "1px solid var(--line)",
								background: isChecked ? "rgba(13, 148, 136, 0.08)" : "var(--paper-soft)",
								padding: "8px 12px",
								borderRadius: "8px",
							}}
							className="text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer text-[var(--ink)]"
						>
							<span>{act.label}</span>
							{isChecked && (
								<CheckCircle2
									size={14}
									className="text-[var(--teal)] shrink-0"
									aria-hidden="true"
								/>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};
