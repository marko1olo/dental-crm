import React from "react";
import { SmartMicrophoneButton } from "../../../SmartMicrophoneButton";
import { appendChipToText } from "../../documentChipText";
import { QuickChipsRow } from "../../QuickChipsRow";
import {
	REFUSAL_REASON_CHIPS,
	REFUSAL_RISK_CHIPS,
	REFUSAL_ALT_CHIPS,
	REFUSAL_WARNING_CHIPS,
} from "./constants";

interface RefusalFieldsSectionProps {
	refusalIntervention: string;
	setRefusalIntervention: (v: string) => void;
	inferredTreatmentArea?: string | null | undefined;
	refusalClinicalIndication: string;
	setRefusalClinicalIndication: (v: string) => void;
	activeVisitComplaint?: string | null | undefined;
	refusalPatientReason: string;
	setRefusalPatientReason: (v: string) => void;
	refusalExplainedRisks: string;
	setRefusalExplainedRisks: (v: string) => void;
	refusalAlternatives: string;
	setRefusalAlternatives: (v: string) => void;
	refusalUrgentWarningSigns: string;
	setRefusalUrgentWarningSigns: (v: string) => void;
}

export const RefusalFieldsSection: React.FC<RefusalFieldsSectionProps> = ({
	refusalIntervention, setRefusalIntervention, inferredTreatmentArea,
	refusalClinicalIndication, setRefusalClinicalIndication, activeVisitComplaint,
	refusalPatientReason, setRefusalPatientReason,
	refusalExplainedRisks, setRefusalExplainedRisks,
	refusalAlternatives, setRefusalAlternatives,
	refusalUrgentWarningSigns, setRefusalUrgentWarningSigns,
}) => (
	<>
		<label>
			Предложенное вмешательство
			<input
				value={refusalIntervention}
				onChange={(e) => setRefusalIntervention(e.target.value)}
				placeholder={inferredTreatmentArea ? `например: лечение или удаление ${inferredTreatmentArea}` : "процедура или вмешательство"}
			/>
		</label>
		<label>
			Клиническое показание
			<textarea
				value={refusalClinicalIndication}
				onChange={(e) => setRefusalClinicalIndication(e.target.value)}
				placeholder={activeVisitComplaint ?? "показания и причина рекомендации врача"}
				rows={2}
			/>
		</label>
		<div className="flex flex-col gap-1">
			<div className="flex justify-between items-center">
				<span className="text-xs font-semibold text-[var(--ink,#334155)]">Причина отказа со слов пациента</span>
				<SmartMicrophoneButton context="general" onResult={(t) => setRefusalPatientReason(refusalPatientReason ? `${refusalPatientReason}, ${t}` : t)} />
			</div>
			<textarea value={refusalPatientReason} onChange={(e) => setRefusalPatientReason(e.target.value)} rows={2} className="mt-0" />
			<QuickChipsRow chips={REFUSAL_REASON_CHIPS} onPick={(chip) => setRefusalPatientReason(appendChipToText(refusalPatientReason, chip))} />
		</div>
		<div className="flex flex-col gap-1">
			<div className="flex justify-between items-center">
				<span className="text-xs font-semibold text-[var(--ink,#334155)]">Разъясненные риски</span>
				<SmartMicrophoneButton context="general" onResult={(t) => setRefusalExplainedRisks(refusalExplainedRisks ? `${refusalExplainedRisks}, ${t}` : t)} />
			</div>
			<textarea value={refusalExplainedRisks} onChange={(e) => setRefusalExplainedRisks(e.target.value)} rows={3} className="mt-0" />
			<QuickChipsRow chips={REFUSAL_RISK_CHIPS} onPick={(chip) => setRefusalExplainedRisks(appendChipToText(refusalExplainedRisks, chip))} />
		</div>
		<div className="flex flex-col gap-1">
			<div className="flex justify-between items-center">
				<span className="text-xs font-semibold text-[var(--ink,#334155)]">Предложенные альтернативы</span>
				<SmartMicrophoneButton context="general" onResult={(t) => setRefusalAlternatives(refusalAlternatives ? `${refusalAlternatives}, ${t}` : t)} />
			</div>
			<textarea value={refusalAlternatives} onChange={(e) => setRefusalAlternatives(e.target.value)} rows={3} className="mt-0" />
			<QuickChipsRow chips={REFUSAL_ALT_CHIPS} onPick={(chip) => setRefusalAlternatives(appendChipToText(refusalAlternatives, chip))} />
		</div>
		<div className="flex flex-col gap-1">
			<div className="flex justify-between items-center">
				<span className="text-xs font-semibold text-[var(--ink,#334155)]">Тревожные признаки</span>
				<SmartMicrophoneButton context="general" onResult={(t) => setRefusalUrgentWarningSigns(refusalUrgentWarningSigns ? `${refusalUrgentWarningSigns}, ${t}` : t)} />
			</div>
			<textarea value={refusalUrgentWarningSigns} onChange={(e) => setRefusalUrgentWarningSigns(e.target.value)} rows={3} className="mt-0" />
			<QuickChipsRow chips={REFUSAL_WARNING_CHIPS} onPick={(chip) => setRefusalUrgentWarningSigns(appendChipToText(refusalUrgentWarningSigns, chip))} />
		</div>
	</>
);
