import React from "react";
import { PatientCreationExtraSection } from "./PatientCreationExtraSection";
import { PatientDuplicateAlerts } from "./PatientDuplicateAlerts";
import { PatientNameInputRow } from "./PatientNameInputRow";
import { PatientPhoneOnlyRow } from "./PatientPhoneOnlyRow";
import type { PatientCreationModalBodyProps } from "./types";

export function PatientCreationModalBody({
	form,
	updatePatientCoreDraft,
	onClose,
}: PatientCreationModalBodyProps) {
	return (
		<div className="create-patient-modal-body">
			{/* 1. Поле ФИО (быстрый ввод за 2 клика) */}
			<PatientNameInputRow
				newPatientName={form.newPatientName}
				onNameChange={form.setNewPatientName}
				onQuickCreateKeyDown={form.handleQuickCreateKeyDown}
				nameInputRef={form.nameInputRef}
				fullNameError={form.validationResult.errors?.fullName}
				onPhoneChange={form.setNewPatientPhone}
				onBirthDateChange={form.setNewPatientBirthDate}
				updatePatientCoreDraft={updatePatientCoreDraft}
			/>

			{/* Конфликты дубликатов / тёзок */}
			<PatientDuplicateAlerts
				duplicateConflict={form.duplicateConflict}
				onCreateAsNewDuplicate={form.handleCreateAsNewDuplicate}
				potentialDuplicates={form.potentialDuplicates}
				onSelectExistingPatient={(id) => {
					form.setSelectedPatientId(id);
					onClose();
				}}
			/>

			{/* 2. Поле Телефон (быстрый ввод за 2 клика) */}
			<PatientPhoneOnlyRow
				effectivePhone={form.effectivePhone}
				onPhoneChange={form.setNewPatientPhone}
				onQuickCreateKeyDown={form.handleQuickCreateKeyDown}
				fieldRequirements={form.fieldRequirements}
				isAnonymous={Boolean(form.patientAdministrativeProfileDraft.isAnonymous)}
				phoneError={form.validationResult.errors?.phone}
			/>

			{/* 3. Прогрессивное раскрытие: Дата рождения, ребенок, источник, соматика, паспорт */}
			<PatientCreationExtraSection form={form} updatePatientCoreDraft={updatePatientCoreDraft} />
		</div>
	);
}
