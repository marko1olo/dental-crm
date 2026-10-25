import React from "react";
import { Users } from "lucide-react";
import { usePatientRepresentativesLogic } from "./usePatientRepresentativesLogic";
import { RepresentativeAlertBanner } from "./RepresentativeAlertBanner";
import { RepresentativeFamilyQuickPicker } from "./RepresentativeFamilyQuickPicker";
import { RepresentativeRelationshipChips } from "./RepresentativeRelationshipChips";
import { RepresentativeFormInputs } from "./RepresentativeFormInputs";
import { RepresentativeFullModeExtras } from "./RepresentativeFullModeExtras";
import type { PatientRepresentativesSectionProps } from "./types";

export const PatientRepresentativesSection: React.FC<PatientRepresentativesSectionProps> = React.memo(
	function PatientRepresentativesSection({
		patient,
		onUpdatePatient,
		disabled = false,
		mode = "compact",
	}) {
		const { familyRelationships, isMinorChild, selectedRep } = usePatientRepresentativesLogic(patient);

		if (mode === "full") {
			return (
				<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs">
					<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
								<Users className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-sm font-black m-0 text-[var(--ink)]">
									Законный представитель / Член семьи
								</h3>
								<p className="text-[11px] text-[var(--muted)] m-0">
									Правовая основа подписания согласий и доступ к семейному счету
								</p>
							</div>
						</div>
						<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
							Семейный статус
						</span>
					</div>

					<RepresentativeAlertBanner isMinorChild={isMinorChild} selectedRep={selectedRep} />

					<RepresentativeFamilyQuickPicker
						relationships={familyRelationships}
						disabled={disabled}
						onUpdatePatient={onUpdatePatient}
					/>

					<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--glass-border)] flex flex-col gap-2.5">
						<RepresentativeRelationshipChips
							patient={patient}
							disabled={disabled}
							onUpdatePatient={onUpdatePatient}
						/>

						{(patient?.representativeType || isMinorChild) && (
							<RepresentativeFormInputs
								patient={patient}
								disabled={disabled}
								onUpdatePatient={onUpdatePatient}
							/>
						)}
					</div>

					<RepresentativeFullModeExtras
						patient={patient}
						disabled={disabled}
						onUpdatePatient={onUpdatePatient}
					/>
				</div>
			);
		}

		return (
			<div
				className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]"
				style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}
			>
				<RepresentativeAlertBanner
					isMinorChild={isMinorChild}
					selectedRep={selectedRep}
					compact
				/>

				<RepresentativeFamilyQuickPicker
					relationships={familyRelationships}
					disabled={disabled}
					compact
					onUpdatePatient={onUpdatePatient}
				/>

				<RepresentativeRelationshipChips
					patient={patient}
					disabled={disabled}
					onUpdatePatient={onUpdatePatient}
				/>

				{(patient?.representativeType || isMinorChild) && (
					<RepresentativeFormInputs
						patient={patient}
						disabled={disabled}
						compact
						onUpdatePatient={onUpdatePatient}
					/>
				)}
			</div>
		);
	},
);

export default PatientRepresentativesSection;
