import React from "react";
import { PatientAdvertisingSourceSelect } from "./PatientAdvertisingSourceSelect";
import { PatientBirthDateRow } from "./PatientBirthDateRow";
import { PatientChildRepresentativeSection } from "./PatientChildRepresentativeSection";
import { PatientMedicalFlagsStep } from "./PatientMedicalFlagsStep";
import { PatientPassportAddressStep } from "./PatientPassportAddressStep";

export interface PatientCreationExtraFieldsProps {
	readonly form: any;
}

export const PatientCreationExtraFields: React.FC<PatientCreationExtraFieldsProps> = ({ form }) => {
	return (
		<div className="flex flex-col gap-3 mt-2">
			<PatientBirthDateRow
				effectiveBirthDate={form.effectiveBirthDate}
				onBirthDateChange={form.setNewPatientBirthDate}
				onQuickCreateKeyDown={form.handleQuickCreateKeyDown}
				isChild={form.isChild}
				onToggleChild={() => form.setIsChildManual((prev: boolean) => !prev)}
				fieldRequirements={form.fieldRequirements}
				birthDateError={form.validationResult.errors?.birthDate}
			/>

			{form.isChild && (
				<PatientChildRepresentativeSection
					parentRole={form.parentRole}
					onParentRoleChange={form.setParentRole}
					parentName={form.parentName}
					onParentNameChange={form.setParentName}
					parentPhone={form.parentPhone}
					onParentPhoneChange={form.setParentPhone}
					onCopyChildPhone={() => form.setParentPhone(form.effectivePhone)}
					hasEffectivePhone={Boolean(form.effectivePhone)}
				/>
			)}

			<PatientAdvertisingSourceSelect
				advertisingSource={form.advertisingSource}
				onAdvertisingSourceChange={form.setAdvertisingSource}
				requireAdvertisingSource={form.fieldRequirements.requireAdvertisingSource}
				error={form.validationResult.errors?.advertisingSource}
			/>

			<PatientMedicalFlagsStep
				isEmergencyOrPrimary={form.isEmergencyOrPrimary}
				onToggleEmergency={() => form.setIsEmergencyOrPrimary((prev: boolean) => !prev)}
				isAnonymous={Boolean(form.patientAdministrativeProfileDraft.isAnonymous)}
				onToggleAnonymous={form.handleToggleAnonymous}
				isSomaticNorm={form.isSomaticNorm}
				onToggleSomaticNorm={() => form.setIsSomaticNorm((prev: boolean) => !prev)}
			/>

			<PatientPassportAddressStep
				fieldRequirements={form.fieldRequirements}
				validationErrors={form.validationResult.errors}
				isMinorUnder14={form.isMinorUnder14}
				showDocFields={form.showDocFields}
				onToggleDocFields={() => form.setShowDocFields((prev: boolean) => !prev)}
				snils={form.patientAdministrativeProfileDraft.snils || ""}
				onSnilsChange={(snils) => form.setPatientAdministrativeProfileDraft((prev: any) => ({ ...prev, snils }))}
				insurancePolicyNumber={form.patientAdministrativeProfileDraft.insurancePolicyNumber || ""}
				onInsurancePolicyNumberChange={(policy) =>
					form.setPatientAdministrativeProfileDraft((prev: any) => ({ ...prev, insurancePolicyNumber: policy }))
				}
				identityDocument={form.patientAdministrativeProfileDraft.identityDocument || ""}
				onIdentityDocumentChange={(doc) =>
					form.setPatientAdministrativeProfileDraft((prev: any) => ({ ...prev, identityDocument: doc }))
				}
				registrationAddress={form.patientAdministrativeProfileDraft.registrationAddress || ""}
				onRegistrationAddressChange={(addr) =>
					form.setPatientAdministrativeProfileDraft((prev: any) => ({ ...prev, registrationAddress: addr }))
				}
			/>
		</div>
	);
};
