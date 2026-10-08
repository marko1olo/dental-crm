/**
 * PatientCreationModalView.tsx — Layer 4: Модальное окно создания и первичной регистрации пациента клиники DENTE CRM.
 *
 * КОНТЕКСТ & МАНДАТ:
 * - Сборка всех шагов (контакты, законные представители, документы, медицинские флаги).
 * - Поддержка быстрых транзакционных действий (создать, создать + записать, создать + открыть приём).
 * - Печать бланка договора со строками «________» для зоны ожидания.
 * - Чистый портал в document.body и 100% сохранение стилей и a11y-якорей.
 */

import {
	Calendar,
	Plus,
	Printer,
	Stethoscope,
	UserPlus,
	X,
} from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { PatientContactsRepresentativeStep } from "./PatientContactsRepresentativeStep";
import { PatientMedicalFlagsStep } from "./PatientMedicalFlagsStep";
import { PatientPassportAddressStep } from "./PatientPassportAddressStep";
import type { PatientCreationModalProps } from "./types";
import { usePatientCreationForm } from "./usePatientCreationForm";

export function PatientCreationModalView(props: PatientCreationModalProps) {
	const { isOpen, onClose, updatePatientCoreDraft } = props;

	const {
		fieldRequirements,
		advertisingSource,
		setAdvertisingSource,
		showDocFields,
		setShowDocFields,
		isEmergencyOrPrimary,
		setIsEmergencyOrPrimary,
		isSomaticNorm,
		setIsSomaticNorm,
		isMinorUnder14,
		isChild,
		setIsChildManual,
		parentRole,
		setParentRole,
		parentName,
		setParentName,
		parentPhone,
		setParentPhone,
		nameInputRef,
		potentialDuplicates,
		validationResult,
		patientCreateGuidance,
		handlePrintBlankContract,
		handleCreate,
		handleCreateAndBook,
		handleCreateAndOpenVisit,
		handleQuickCreateKeyDown,
		handleToggleAnonymous,
		newPatientName,
		setNewPatientName,
		effectivePhone,
		setNewPatientPhone,
		effectiveBirthDate,
		setNewPatientBirthDate,
		isPatientCreating,
		setSelectedPatientId,
		patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft,
	} = usePatientCreationForm(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="create-patient-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-patient-modal-title"
			data-testid="patient-creation-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="create-patient-modal-card">
				{/* Modal Header */}
				<header className="create-patient-modal-header">
					<div className="create-patient-modal-title-wrap">
						<div
							className="create-patient-modal-icon-badge"
							aria-hidden="true"
						>
							<UserPlus size={20} />
						</div>
						<div>
							<h2
								id="create-patient-modal-title"
								className="create-patient-modal-title"
							>
								Новый пациент
							</h2>
							<p className="create-patient-modal-subtitle">
								Регистрация медицинской карты пациента
							</p>
						</div>
					</div>
					<button
						type="button"
						className="create-patient-modal-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
						title="Закрыть (Esc)"
					>
						<X size={20} aria-hidden="true" />
					</button>
				</header>

				{/* Modal Body */}
				<div className="create-patient-modal-body">
					{/* Medical Flags, Emergency and Somatic Norm Step */}
					<PatientMedicalFlagsStep
						isEmergencyOrPrimary={isEmergencyOrPrimary}
						onToggleEmergency={() => setIsEmergencyOrPrimary((prev) => !prev)}
						isAnonymous={patientAdministrativeProfileDraft.isAnonymous}
						onToggleAnonymous={handleToggleAnonymous}
						isSomaticNorm={isSomaticNorm}
						onToggleSomaticNorm={() => {
							const nextVal = !isSomaticNorm;
							setIsSomaticNorm(nextVal);
						}}
					/>

					{/* Contacts & Child Representative Step */}
					<PatientContactsRepresentativeStep
						newPatientName={newPatientName}
						onNameChange={setNewPatientName}
						onQuickCreateKeyDown={handleQuickCreateKeyDown}
						nameInputRef={nameInputRef}
						validationErrors={validationResult.errors}
						potentialDuplicates={potentialDuplicates}
						onSelectExistingPatient={(id) => {
							setSelectedPatientId(id);
							onClose();
						}}
						effectivePhone={effectivePhone}
						onPhoneChange={setNewPatientPhone}
						effectiveBirthDate={effectiveBirthDate}
						onBirthDateChange={setNewPatientBirthDate}
						isChild={isChild}
						onToggleChild={() => setIsChildManual((prev) => !prev)}
						parentRole={parentRole}
						onParentRoleChange={setParentRole}
						parentName={parentName}
						onParentNameChange={setParentName}
						parentPhone={parentPhone}
						onParentPhoneChange={setParentPhone}
						onCopyChildPhone={() => setParentPhone(effectivePhone)}
						advertisingSource={advertisingSource}
						onAdvertisingSourceChange={setAdvertisingSource}
						fieldRequirements={fieldRequirements}
						isAnonymous={patientAdministrativeProfileDraft.isAnonymous}
						updatePatientCoreDraft={updatePatientCoreDraft}
					/>

					{/* Passport, SNILS and Insurance Step */}
					<PatientPassportAddressStep
						fieldRequirements={fieldRequirements}
						validationErrors={validationResult.errors}
						isMinorUnder14={isMinorUnder14}
						showDocFields={showDocFields}
						onToggleDocFields={() => setShowDocFields((prev) => !prev)}
						snils={patientAdministrativeProfileDraft.snils || ""}
						onSnilsChange={(snils) =>
							setPatientAdministrativeProfileDraft((prev) => ({
								...prev,
								snils,
							}))
						}
						insurancePolicyNumber={
							patientAdministrativeProfileDraft.insurancePolicyNumber || ""
						}
						onInsurancePolicyNumberChange={(policy) =>
							setPatientAdministrativeProfileDraft((prev) => ({
								...prev,
								insurancePolicyNumber: policy,
							}))
						}
						identityDocument={
							patientAdministrativeProfileDraft.identityDocument || ""
						}
						onIdentityDocumentChange={(identityDocument) =>
							setPatientAdministrativeProfileDraft((prev) => ({
								...prev,
								identityDocument,
							}))
						}
					/>
				</div>

				{/* Modal Footer with Validation Guidance & Action Buttons */}
				<footer className="create-patient-modal-footer">
					{patientCreateGuidance ? (
						<p
							className="quick-create-guidance patient-create-modal-guidance"
							id="patient-create-guidance"
							role="status"
							aria-live="polite"
						>
							{patientCreateGuidance}
						</p>
					) : null}

					<div className="create-patient-modal-actions">
						<button
							type="button"
							className="secondary-button create-patient-cancel-btn"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="button"
							className="secondary-button quick-create-print-blank-contract-btn"
							onClick={handlePrintBlankContract}
							title="Распечатать бланк договора и согласий со строками «________» для ручного заполнения пациентом в зоне ожидания"
							data-testid="patient-creation-print-blank-contract-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Printer size={15} aria-hidden="true" />
							<span>Бланк договора («____»)</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-book-action"
							onClick={handleCreateAndBook}
							disabled={isPatientCreating}
							title="Создать карту и сразу открыть расписание с выбранным пациентом"
							data-testid="patient-creation-submit-and-book-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Calendar size={15} aria-hidden="true" />
							<span>Создать и записать</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-visit-action"
							onClick={handleCreateAndOpenVisit}
							disabled={isPatientCreating}
							title="Создать карту и сразу открыть приём (для дежурного врача)"
							data-testid="patient-creation-submit-and-visit-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Stethoscope size={15} aria-hidden="true" />
							<span>Создать и начать приём</span>
						</button>
						<button
							type="button"
							className="primary-button quick-create-action"
							onClick={handleCreate}
							disabled={isPatientCreating}
							aria-busy={isPatientCreating || undefined}
							aria-describedby={
								patientCreateGuidance ? "patient-create-guidance" : undefined
							}
							title={
								isPatientCreating
									? "Создание карточки..."
									: "Создать медицинскую карту пациента"
							}
							data-testid="patient-creation-submit-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Plus size={18} aria-hidden="true" />
							<span>
								{isPatientCreating ? "Создание..." : "Создать пациента"}
							</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export { PatientCreationModalView as PatientCreationModal };
export { PatientCreationModalView as CreatePatientModal };
export default PatientCreationModalView;
