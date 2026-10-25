import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { FamilyRelationshipItem } from "./usePatientRepresentativesLogic";
import type { PatientGeneralInfo } from "./types";

interface RepresentativeFamilyQuickPickerProps {
	relationships: FamilyRelationshipItem[];
	disabled?: boolean;
	compact?: boolean;
	onUpdatePatient?: (field: keyof PatientGeneralInfo, value: any) => void;
}

export const RepresentativeFamilyQuickPicker: React.FC<RepresentativeFamilyQuickPickerProps> = ({
	relationships,
	disabled = false,
	compact = false,
	onUpdatePatient,
}) => {
	if (relationships.length === 0) return null;

	return (
		<div
			className={`flex flex-col gap-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)] ${
				compact ? "p-2" : "p-2.5"
			}`}
		>
			<span className="text-[11px] font-bold text-[var(--muted)]">
				Быстрая привязка из членов семьи:
			</span>
			<div className="flex items-center gap-1.5 flex-wrap">
				{relationships.map((rel) => (
					<button
						key={rel.id}
						type="button"
						disabled={disabled}
						onClick={() => {
							onUpdatePatient?.("representativeType", rel.relationshipLabelRu || "Законный представитель");
							onUpdatePatient?.("representativeFullName", rel.relatedPatientName);
							if (rel.relatedPatientPhone) {
								onUpdatePatient?.("representativePhone", rel.relatedPatientPhone);
							}
							if (rel.documentProofNumber) {
								onUpdatePatient?.("representativeDoc", rel.documentProofNumber);
							}
						}}
						className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border border-[var(--teal)]/40 bg-[var(--teal)]/10 text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
						title={`Привязать: ${rel.relatedPatientName} (${rel.relationshipLabelRu})`}
						data-testid={`bind-family-rep-${rel.id}`}
					>
						<CheckCircle2 size={13} className="shrink-0" />
						<span>{rel.relatedPatientName} ({rel.relationshipLabelRu})</span>
					</button>
				))}
			</div>
		</div>
	);
};
