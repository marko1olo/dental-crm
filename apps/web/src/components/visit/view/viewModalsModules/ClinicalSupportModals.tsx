/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Support & Safety Modals Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Модальные окна клинической безопасности и поддержки:
 * - Экстренная помощь (анафилаксия, шок, аптечка)
 * - Голосовой ассистент врача (SOAP-запись)
 * - Гарантийный паспорт на реставрации
 * - Мобильная смена врача (ассистент/кабинет)
 * - Информированное добровольное согласие (ИДС)
 */

import React from "react";
import { EmergencyRescueModal } from "../../../emergency/EmergencyRescueModal";
import {
	VoiceDictationAssistantModal,
	type DictationCommand,
} from "../../../voice/VoiceDictationAssistantModal";
import { WarrantyPassportModal } from "../../../warranty/WarrantyPassportModal";
import { DoctorMobileShiftModal } from "../../../doctor-portal/DoctorMobileShiftModal";
import { InformedConsentModal } from "../../../consents/InformedConsentModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { showToast } from "../../../GlobalToast";

export interface ClinicalSupportModalsProps {
	effectiveActiveModal: string | null;
	isEmergencyModalOpen: boolean;
	setIsEmergencyModalOpen: (v: boolean) => void;
	isVoiceDictationModalOpen: boolean;
	setIsVoiceDictationModalOpen: (v: boolean) => void;
	isWarrantyModalOpen: boolean;
	setIsWarrantyModalOpen: (v: boolean) => void;
	isDoctorShiftModalOpen: boolean;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpen: boolean;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	activePatient: any;
	activeDoctor: any;
	dashboard: any;
	patientAge?: string | null | undefined;
	selectedToothForMenu: any;
	visitNoteForm: any;
	activeAppointment: any;
	setToothState: (code: string, state: any) => void;
	appendToEMKField: (field: string, text: string) => void;
}

export const ClinicalSupportModals: React.FC<ClinicalSupportModalsProps> = ({
	effectiveActiveModal,
	isEmergencyModalOpen,
	setIsEmergencyModalOpen,
	isVoiceDictationModalOpen,
	setIsVoiceDictationModalOpen,
	isWarrantyModalOpen,
	setIsWarrantyModalOpen,
	isDoctorShiftModalOpen,
	setIsDoctorShiftModalOpen,
	isInformedConsentModalOpen,
	setIsInformedConsentModalOpen,
	activePatient,
	activeDoctor,
	dashboard,
	patientAge,
	selectedToothForMenu,
	visitNoteForm,
	activeAppointment,
	setToothState,
	appendToEMKField,
}) => {
	return (
		<>
			{/* Emergency Rescue / Anaphylaxis Anti-Shock Modal (Мандаты 8c, 8e) */}
			{(effectiveActiveModal === "emergency_rescue" || isEmergencyModalOpen) && (
				<EmergencyRescueModal
					isOpen={true}
					onClose={() => {
						setIsEmergencyModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("emergency_rescue");
					}}
					onApplyToDiary={(protocolText) => {
						appendToEMKField("diary", protocolText);
						showToast(
							"Протокол оказания экстренной помощи внесён в дневник приёма",
							"warning",
						);
					}}
					initialPatientName={activePatient?.fullName || ""}
					initialPatientAgeYears={
						patientAge
							? Number.parseInt(patientAge, 10) || undefined
							: undefined
					}
					doctorFullName={
						activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог"
					}
					medCardNumber={
						activePatient?.medCardNumber ||
						activePatient?.cardNumber ||
						activePatient?.id ||
						""
					}
					clinicName={
						dashboard?.organization?.name || "Стоматологическая клиника"
					}
				/>
			)}

			{/* AI Voice Dictation Assistant Modal */}
			{effectiveActiveModal === "voice_dictation" && (
				<VoiceDictationAssistantModal
					isOpen={isVoiceDictationModalOpen}
					onClose={() => {
						setIsVoiceDictationModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("voice_dictation");
					}}
					activeToothNumber={
						selectedToothForMenu?.code
							? Number.parseInt(selectedToothForMenu.code, 10) || null
							: null
					}
					onApplySoapNote={(soap) => {
						if (soap.subjective) appendToEMKField("complaints", soap.subjective);
						if (soap.objective)
							appendToEMKField("objectiveInspection", soap.objective);
						if (soap.assessment) appendToEMKField("diagnosis", soap.assessment);
						if (soap.plan) appendToEMKField("treatmentPlan", soap.plan);
						if (soap.recommendations)
							appendToEMKField("recommendations", soap.recommendations);
						showToast("SOAP-запись внесена в медицинскую карту", "success");
					}}
					onApplyCommand={(cmd: DictationCommand) => {
						if (cmd.toothNumber && cmd.clinicalStatus) {
							setToothState(String(cmd.toothNumber), cmd.clinicalStatus as any);
						}
						if (cmd.soapText || cmd.summary) {
							appendToEMKField(
								"objectiveInspection",
								cmd.soapText || cmd.summary,
							);
						}
					}}
					onApplyAllCommands={(cmds: DictationCommand[]) => {
						for (const cmd of cmds) {
							if (cmd.toothNumber && cmd.clinicalStatus) {
								setToothState(String(cmd.toothNumber), cmd.clinicalStatus as any);
							}
							if (cmd.soapText || cmd.summary) {
								appendToEMKField(
									"objectiveInspection",
									cmd.soapText || cmd.summary,
								);
							}
						}
						showToast(`Применено команд: ${cmds.length}`, "success");
					}}
				/>
			)}

			{/* Warranty Passport Modal */}
			{effectiveActiveModal === "warranty_passport" && (
				<WarrantyPassportModal
					isOpen={isWarrantyModalOpen}
					onClose={() => {
						setIsWarrantyModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("warranty_passport");
					}}
					patient={
						activePatient
							? {
									id: activePatient.id,
									fullName: activePatient.fullName,
									birthDate: activePatient.birthDate,
									phone: activePatient.phone,
								}
							: null
					}
					doctorName={activeDoctor?.fullName}
					clinicName={
						(
							dashboard as {
								clinicSettings?: { profile?: { brandName?: string } };
							} | null
						)?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					}
					initialDiagnosis={
						visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование"
					}
					onCertificateIssued={(passport: any) => {
						appendToEMKField(
							"recommendations",
							`Оформлен гарантийный паспорт № ${passport.passportNumber || passport.certificateId} (гарантия ${passport.warrantyMonths} мес. до ${passport.warrantyUntilDate}).`,
						);
						showToast("Гарантийный паспорт оформлен", "success");
					}}
				/>
			)}

			{/* Doctor Mobile Shift Modal */}
			{effectiveActiveModal === "doctor_mobile_shift" && (
				<DoctorMobileShiftModal
					isOpen={isDoctorShiftModalOpen}
					onClose={() => {
						setIsDoctorShiftModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("doctor_mobile_shift");
					}}
					initialDoctorId={activeDoctor?.id}
					initialDoctorName={activeDoctor?.fullName}
				/>
			)}

			{/* Informed Consent Modal */}
			{effectiveActiveModal === "informed_consent" && (
				<InformedConsentModal
					isOpen={isInformedConsentModalOpen}
					onClose={() => {
						setIsInformedConsentModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("informed_consent");
					}}
					patientId={activePatient?.id}
					visitId={activeAppointment?.id || dashboard?.activeVisit?.id}
					patient={
						activePatient
							? {
									id: activePatient.id,
									fullName: activePatient.fullName || activePatient.name,
									birthDate: activePatient.birthDate,
									phone: activePatient.phone,
									passport: activePatient.passport,
									snils: activePatient.snils,
									address: activePatient.address,
									cardNumber: activePatient.cardNumber || activePatient.medCardNumber || activePatient.id,
								}
							: null
					}
					doctorName={activeDoctor?.fullName || activeDoctor?.name}
					clinicName={
						(
							dashboard as {
								clinicSettings?: { profile?: { brandName?: string } };
							} | null
						)?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					}
					licenseNumber={
						(
							dashboard as {
								clinicSettings?: { profile?: { medicalLicenseNumber?: string } };
							} | null
						)?.clinicSettings?.profile?.medicalLicenseNumber ||
						"ЛО41-01137-77/00368421"
					}
					diagnosisIcd={
						visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование"
					}
					toothNumbers={
						typeof selectedToothForMenu === "number"
							? String(selectedToothForMenu)
							: undefined
					}
					isSigned={
						activeAppointment?.status === "completed" ||
						activeAppointment?.status === "signed" ||
						visitNoteForm?.status === "signed"
					}
					status={activeAppointment?.status}
					onConsentConfirmed={(payload) => {
						appendToEMKField(
							"recommendations",
							`Пациент ознакомлен и подписал ${payload.consentType} (${payload.intervention}, область: ${payload.toothOrArea || "по плану"}).`,
						);
						showToast(
							"Информированное согласие прикреплено к протоколу приёма",
							"success",
						);
					}}
				/>
			)}
		</>
	);
};
