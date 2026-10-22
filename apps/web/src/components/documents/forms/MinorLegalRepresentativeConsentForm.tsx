import React from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	type MinorLegalRepresentativeConsentFormProps,
	resolveValue,
	useMinorConsentState,
	MinorConsentActionsBar,
	MinorConsentRepresentativeFields,
	MinorConsentChildFields,
	MinorConsentCheckboxes,
} from "./minorConsent";

export type { MinorLegalRepresentativeConsentFormProps };

export const MinorLegalRepresentativeConsentForm = React.memo(
	function MinorLegalRepresentativeConsentForm(props: MinorLegalRepresentativeConsentFormProps) {
		const s = useMinorConsentState(props);

		return (
			<DocumentPayloadCard
				title="Согласие законного представителя (педиатрия)"
				description="Информированное согласие на стоматологическое лечение несовершеннолетнего гражданина РФ до 15 лет (до 18 лет при наркологических расстройствах)."
			>
				<MinorConsentActionsBar
					onApplyPreset={s.applyPediatricPreset}
					onPrintConsent={s.handlePrintMinorConsent}
					onPrintBlank={s.handlePrintBlankMinorConsent}
				/>

				<MinorConsentRepresentativeFields
					minorRepresentativeName={s.minorRepresentativeName}
					setMinorRepresentativeName={s.setMinorRepresentativeName}
					namePlaceholder={resolveValue(props.minorRepresentativeNameValue) || "ФИО родителя, опекуна, усыновителя"}
					minorRepresentativeRelation={s.minorRepresentativeRelation}
					setMinorRepresentativeRelation={s.setMinorRepresentativeRelation}
					minorRepresentativeDocument={s.minorRepresentativeDocument}
					setMinorRepresentativeDocument={s.setMinorRepresentativeDocument}
					minorRepresentativeAuthority={s.minorRepresentativeAuthority}
					setMinorRepresentativeAuthority={s.setMinorRepresentativeAuthority}
					minorRepresentativePhone={s.minorRepresentativePhone}
					setMinorRepresentativePhone={s.setMinorRepresentativePhone}
					phonePlaceholder={resolveValue(props.minorRepresentativePhoneValue) || "+7 (___) ___-__-__"}
				/>

				<MinorConsentChildFields
					childFullName={s.minorConsentPatientFullName}
					setChildFullName={s.setMinorConsentPatientFullName}
					childFullNamePlaceholder={resolveValue(props.minorConsentPatientFullNameValue) || "ФИО несовершеннолетнего пациента"}
					childBirthDate={s.minorConsentPatientBirthDate}
					setChildBirthDate={s.setMinorConsentPatientBirthDate}
					childBirthDatePlaceholder={resolveValue(props.minorConsentPatientBirthDateValue) || "ГГГГ-ММ-ДД"}
					interventionScope={s.minorConsentInterventionScope}
					setInterventionScope={s.setMinorConsentInterventionScope}
					interventionPlaceholder={resolveValue(props.minorConsentInterventionScopeValue) || "первичный осмотр, рентген, лечение временных/постоянных зубов, адаптация"}
					diagnosisOrIndication={s.minorConsentDiagnosisOrIndication}
					setDiagnosisOrIndication={s.setMinorConsentDiagnosisOrIndication}
					diagnosisPlaceholder={resolveValue(props.minorConsentDiagnosisOrIndicationValue) || "кариес, пульпит временного зуба, профилактика"}
					risks={s.minorConsentRisks}
					setRisks={s.setMinorConsentRisks}
					alternatives={s.minorConsentAlternatives}
					setAlternatives={s.setMinorConsentAlternatives}
					doctorFullName={s.minorConsentDoctorFullName}
					setDoctorFullName={s.setMinorConsentDoctorFullName}
					doctorPlaceholder={props.activeDoctorFullName ?? "детский врач-стоматолог"}
					signedAt={s.minorConsentSignedAt}
					setSignedAt={s.setMinorConsentSignedAt}
				/>

				<MinorConsentCheckboxes
					minorConsentIdentityVerified={s.minorConsentIdentityVerified}
					setMinorConsentIdentityVerified={s.setMinorConsentIdentityVerified}
					minorConsentAuthorityVerified={s.minorConsentAuthorityVerified}
					setMinorConsentAuthorityVerified={s.setMinorConsentAuthorityVerified}
					minorConsentExplained={s.minorConsentExplained}
					setMinorConsentExplained={s.setMinorConsentExplained}
					minorConsentStored={s.minorConsentStored}
					setMinorConsentStored={s.setMinorConsentStored}
					minorConsentAgeExplanation={s.minorConsentAgeExplanation}
					setMinorConsentAgeExplanation={s.setMinorConsentAgeExplanation}
				/>
			</DocumentPayloadCard>
		);
	},
);

MinorLegalRepresentativeConsentForm.displayName = "MinorLegalRepresentativeConsentForm";
