/**
 * PatientContactsRepresentativeStep.tsx — Контакты, умный голосовой ввод, опекуны/представители и рекламный источник.
 */

import React from "react";
import { PatientAdvertisingSourceSelect } from "./PatientAdvertisingSourceSelect";
import { PatientChildRepresentativeSection } from "./PatientChildRepresentativeSection";
import { PatientDuplicateAlerts } from "./PatientDuplicateAlerts";
import { PatientNameInputRow } from "./PatientNameInputRow";
import { PatientPhoneBirthRow } from "./PatientPhoneBirthRow";
import type { PatientContactsRepresentativeStepProps } from "./types";

export function PatientContactsRepresentativeStep({
	newPatientName,
	onNameChange,
	onQuickCreateKeyDown,
	nameInputRef,
	validationErrors,
	potentialDuplicates,
	onSelectExistingPatient,
	effectivePhone,
	onPhoneChange,
	effectiveBirthDate,
	onBirthDateChange,
	isChild,
	onToggleChild,
	parentRole,
	onParentRoleChange,
	parentName,
	setParentName: onParentNameChange,
	parentPhone,
	onParentPhoneChange,
	onCopyChildPhone,
	advertisingSource,
	onAdvertisingSourceChange,
	fieldRequirements,
	isAnonymous,
	updatePatientCoreDraft,
	duplicateConflict,
	onCreateAsNewDuplicate,
}: PatientContactsRepresentativeStepProps) {
	return (
		<>
			<PatientNameInputRow
				newPatientName={newPatientName}
				onNameChange={onNameChange}
				onQuickCreateKeyDown={onQuickCreateKeyDown}
				nameInputRef={nameInputRef}
				fullNameError={validationErrors.fullName}
				onPhoneChange={onPhoneChange}
				onBirthDateChange={onBirthDateChange}
				updatePatientCoreDraft={updatePatientCoreDraft}
			/>

			<PatientDuplicateAlerts
				duplicateConflict={duplicateConflict}
				onCreateAsNewDuplicate={onCreateAsNewDuplicate}
				potentialDuplicates={potentialDuplicates}
				onSelectExistingPatient={onSelectExistingPatient}
			/>

			<PatientPhoneBirthRow
				effectivePhone={effectivePhone}
				onPhoneChange={onPhoneChange}
				effectiveBirthDate={effectiveBirthDate}
				onBirthDateChange={onBirthDateChange}
				onQuickCreateKeyDown={onQuickCreateKeyDown}
				isChild={isChild}
				onToggleChild={onToggleChild}
				fieldRequirements={fieldRequirements}
				isAnonymous={isAnonymous}
				phoneError={validationErrors.phone}
				birthDateError={validationErrors.birthDate}
			/>

			{isChild && (
				<PatientChildRepresentativeSection
					parentRole={parentRole}
					onParentRoleChange={onParentRoleChange}
					parentName={parentName}
					onParentNameChange={onParentNameChange}
					parentPhone={parentPhone}
					onParentPhoneChange={onParentPhoneChange}
					onCopyChildPhone={onCopyChildPhone}
					hasEffectivePhone={Boolean(effectivePhone)}
				/>
			)}

			<PatientAdvertisingSourceSelect
				advertisingSource={advertisingSource}
				onAdvertisingSourceChange={onAdvertisingSourceChange}
				requireAdvertisingSource={fieldRequirements.requireAdvertisingSource}
				error={validationErrors.advertisingSource}
			/>
		</>
	);
}
