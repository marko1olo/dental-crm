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

import React, { useMemo } from "react";
import { EmergencyRescueModal } from "../../../emergency/EmergencyRescueModal";
import {
	VoiceDictationAssistantModal,
	type DictationCommand,
} from "../../../voice/VoiceDictationAssistantModal";
import {
	WarrantyPassportModal,
	type CompletedTreatmentStage,
} from "../../../warranty/WarrantyPassportModal";
import { DoctorMobileShiftModal } from "../../../doctor-portal/DoctorMobileShiftModal";
import { InformedConsentModal } from "../../../consents/InformedConsentModal";
import { PrescriptionModal } from "../../../prescriptions/PrescriptionModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { useVisitStore } from "../../../../store/visit";
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
	isPrescriptionModalOpen?: boolean | undefined;
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
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
	isPrescriptionModalOpen,
	setIsPrescriptionModalOpen,
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

			{/* Warranty Passport Modal (Мандаты 8e, 8k — Авто-заполнение из выполненных услуг визита и 0 ₽ переделка) */}
			{(effectiveActiveModal === "warranty_passport" || isWarrantyModalOpen) && (() => {
				const fromStore = useVisitStore.getState().completedServices || [];
				const fromAppt =
					(activeAppointment as any)?.completedServices ||
					(activeAppointment as any)?.services ||
					(dashboard as any)?.activeVisit?.completedServices ||
					[];
				const sourceList = fromStore.length > 0 ? fromStore : fromAppt;
				const completedStagesForWarranty: CompletedTreatmentStage[] = Array.isArray(sourceList)
					? sourceList.map((s: any, idx: number) => {
							const title =
								s.name || s.title || s.serviceTitle || s.serviceName || "Стоматологическая услуга";
							const tooth = s.tooth || s.toothNumber || s.toothCode;
							const code = s.code || s.code804n || s.serviceCode;
							return {
								stageNumber: idx + 1,
								stageTitle: title,
								serviceTitle: title,
								toothNumber: tooth ? String(tooth) : undefined,
								serviceCode804n: code ? String(code) : undefined,
								performedAt: s.date || new Date().toISOString().slice(0, 10),
							};
						})
					: [];

				const initialTeethForWarranty = Array.from(
					new Set(
						completedStagesForWarranty
							.map((st) => st.toothNumber)
							.filter((t): t is string => Boolean(t)),
					),
				);

				return (
					<WarrantyPassportModal
						isOpen={isWarrantyModalOpen || effectiveActiveModal === "warranty_passport"}
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
						doctorId={activeDoctor?.id}
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
						completedStages={completedStagesForWarranty}
						initialTeeth={initialTeethForWarranty}
						onRemediationCreated={(order) => {
							// 1-клик начисление гарантийной переделки со скидкой 100% (0 ₽) в текущий приём (Мандат 8e)
							try {
								useVisitStore.getState().addCompletedService({
									id: order.id,
									code: "A16.07.002",
									name: `Гарантийный случай: ${order.defectTitle} (0 ₽)`,
									price: 0,
									rub: 0,
									tooth: order.toothNumber,
									quantity: 1,
									isWarranty: true,
									notes: `Гарантийный акт № ${order.orderNumber} (скидка 100%). Списание со склада по факту.`,
								} as any);
							} catch (addErr) {
								console.warn("Non-blocking: could not add warranty service to visit store", addErr);
							}
							showToast(`Гарантийный случай ${order.orderNumber} (0 ₽) добавлен в визит`, "success");
						}}
						onCertificateIssued={(passport: any) => {
							appendToEMKField(
								"recommendations",
								`Оформлен гарантийный паспорт № ${passport.passportNumber || passport.certificateId} (гарантия ${passport.warrantyMonths} мес. до ${passport.warrantyUntilDate || ""}).`,
							);
							showToast("Гарантийный паспорт оформлен и внесен в карту", "success");
						}}
					/>
				);
			})()}

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

			{/* Рецептурный модуль (Приказы 1094н / 107-1/у и 148-1/у-88) — Мандаты 8e, 8x, 8y */}
			{(effectiveActiveModal === "prescription" || isPrescriptionModalOpen) && (
				<PrescriptionModal
					isOpen={true}
					onClose={() => {
						setIsPrescriptionModalOpen?.(false);
						useUiSurfaceStore.getState().closePrimaryModal("prescription");
					}}
					patient={activePatient}
					patientName={activePatient?.fullName || activePatient?.name}
					allergies={activePatient?.allergies}
					doctorName={activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог"}
					doctorSpecialty={activeDoctor?.specialty || "Врач-стоматолог"}
					doctorSnils={activeDoctor?.snils}
					clinicName={
						(dashboard as any)?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"Медицинская организация"
					}
					clinicAddress={
						(dashboard as any)?.clinicSettings?.profile?.address || ""
					}
					clinicPhone={
						(dashboard as any)?.clinicSettings?.profile?.phone || ""
					}
					clinicOgrn={(dashboard as any)?.clinicSettings?.profile?.ogrn || ""}
					clinicInn={(dashboard as any)?.clinicSettings?.profile?.inn || ""}
					medicalLicenseNumber={
						(dashboard as any)?.clinicSettings?.profile?.medicalLicenseNumber || ""
					}
					diary={{
						diagnosisIcd10: visitNoteForm?.diagnosis || "",
						treatmentDescription: visitNoteForm?.treatmentDescription || visitNoteForm?.diary,
						anamnesis: visitNoteForm?.anamnesis,
						statusLocalis: visitNoteForm?.statusLocalis,
					}}
					onInsertToDiary={(prescriptionText) => {
						appendToEMKField("recommendations", prescriptionText);
						showToast("Назначение рецепта добавлено в рекомендации приёма", "success");
					}}
				/>
			)}
		</>
	);
};
