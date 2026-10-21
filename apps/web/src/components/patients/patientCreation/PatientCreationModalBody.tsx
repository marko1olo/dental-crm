import React from "react";
import { PatientContactsRepresentativeStep } from "./PatientContactsRepresentativeStep";
import { PatientMedicalFlagsStep } from "./PatientMedicalFlagsStep";
import { PatientPassportAddressStep } from "./PatientPassportAddressStep";
import type { PatientCreationModalBodyProps } from "./types";

export function PatientCreationModalBody({
	form,
	updatePatientCoreDraft,
	onClose,
}: PatientCreationModalBodyProps) {
	return (
		<div className="create-patient-modal-body">
			<PatientMedicalFlagsStep
				isEmergencyOrPrimary={form.isEmergencyOrPrimary}
				onToggleEmergency={() => form.setIsEmergencyOrPrimary((prev) => !prev)}
				isAnonymous={Boolean(form.patientAdministrativeProfileDraft.isAnonymous)}
				onToggleAnonymous={form.handleToggleAnonymous}
				isSomaticNorm={form.isSomaticNorm}
				onToggleSomaticNorm={() => form.setIsSomaticNorm((prev) => !prev)}
			/>

			<PatientContactsRepresentativeStep
				newPatientName={form.newPatientName}
				onNameChange={form.setNewPatientName}
				onQuickCreateKeyDown={form.handleQuickCreateKeyDown}
				nameInputRef={form.nameInputRef}
				validationErrors={form.validationResult.errors}
				potentialDuplicates={form.potentialDuplicates}
				onSelectExistingPatient={(id) => {
					form.setSelectedPatientId(id);
					onClose();
				}}
				effectivePhone={form.effectivePhone}
				onPhoneChange={form.setNewPatientPhone}
				effectiveBirthDate={form.effectiveBirthDate}
				onBirthDateChange={form.setNewPatientBirthDate}
				isChild={form.isChild}
				onToggleChild={() => form.setIsChildManual((prev) => !prev)}
				parentRole={form.parentRole}
				onParentRoleChange={form.setParentRole}
				parentName={form.parentName}
				setParentName={form.setParentName}
				parentPhone={form.parentPhone}
				onParentPhoneChange={form.setParentPhone}
				onCopyChildPhone={() => form.setParentPhone(form.effectivePhone)}
				advertisingSource={form.advertisingSource}
				onAdvertisingSourceChange={form.setAdvertisingSource}
				fieldRequirements={form.fieldRequirements}
				isAnonymous={Boolean(form.patientAdministrativeProfileDraft.isAnonymous)}
				updatePatientCoreDraft={updatePatientCoreDraft}
				duplicateConflict={form.duplicateConflict}
				onCreateAsNewDuplicate={form.handleCreateAsNewDuplicate}
			/>

			<PatientPassportAddressStep
				fieldRequirements={form.fieldRequirements}
				validationErrors={form.validationResult.errors}
				isMinorUnder14={form.isMinorUnder14}
				showDocFields={form.showDocFields}
				onToggleDocFields={() => form.setShowDocFields((prev) => !prev)}
				snils={form.patientAdministrativeProfileDraft.snils || ""}
				onSnilsChange={(snils) => form.setPatientAdministrativeProfileDraft((prev) => ({ ...prev, snils }))}
				insurancePolicyNumber={form.patientAdministrativeProfileDraft.insurancePolicyNumber || ""}
				onInsurancePolicyNumberChange={(policy) =>
					form.setPatientAdministrativeProfileDraft((prev) => ({ ...prev, insurancePolicyNumber: policy }))
				}
				identityDocument={form.patientAdministrativeProfileDraft.identityDocument || ""}
				onIdentityDocumentChange={(doc) =>
					form.setPatientAdministrativeProfileDraft((prev) => ({ ...prev, identityDocument: doc }))
				}
				registrationAddress={form.patientAdministrativeProfileDraft.registrationAddress || ""}
				onRegistrationAddressChange={(addr) =>
					form.setPatientAdministrativeProfileDraft((prev) => ({ ...prev, registrationAddress: addr }))
				}
			/>
		</div>
	);
}
