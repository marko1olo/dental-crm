import React from "react";
import { EndoCanalLogModal } from "../../endo/EndoCanalLogModal";
import { DentalLabOrderModal } from "../../lab/DentalLabOrderModal";
import { StagePaymentPlanModal } from "../../treatment-plans/stagePayment/StagePaymentPlanModal";
import { TreatmentPlanPriceValidatorModal } from "../../treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { EmergencyRescueModal } from "../../emergency/EmergencyRescueModal";
import {
	VoiceDictationAssistantModal,
	type DictationCommand,
} from "../../voice/VoiceDictationAssistantModal";
import { WarrantyPassportModal } from "../../warranty/WarrantyPassportModal";
import { DoctorMobileShiftModal } from "../../doctor-portal/DoctorMobileShiftModal";
import { InformedConsentModal } from "../../consents/InformedConsentModal";
import { showToast } from "../../GlobalToast";

export interface VisitViewModalsProps {
	endoModalToothNumber: string | null;
	endoModalToothState?: string;
	isEndoModalOpen: boolean;
	setIsEndoModalOpen: (v: boolean) => void;
	setEndoModalToothNumber: (v: string | null) => void;
	isLabOrderModalOpen: boolean;
	setIsLabOrderModalOpen: (v: boolean) => void;
	labOrderModalToothNumber: string | null;
	setLabOrderModalToothNumber: (v: string | null) => void;
	isStagePaymentModalOpen: boolean;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	isPriceValidatorModalOpen: boolean;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: modal payloads
	priceValidatorPlanPayload: any;
	// biome-ignore lint/suspicious/noExplicitAny: modal payloads
	priceValidatorCatalogList: any;
	isEmergencyModalOpen: boolean;
	setIsEmergencyModalOpen: (v: boolean) => void;
	isVoiceDictationModalOpen: boolean;
	setIsVoiceDictationModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: menu selection
	selectedToothForMenu: any;
	isWarrantyModalOpen: boolean;
	setIsWarrantyModalOpen: (v: boolean) => void;
	isDoctorShiftModalOpen: boolean;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpen: boolean;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: patient & doctor
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard: any;
	patientAge?: string | null;
	appendToEMKField: (field: string, text: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: tooth state
	setToothState: (code: string, state: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: visit note form
	visitNoteForm: any;
	// biome-ignore lint/suspicious/noExplicitAny: active appointment
	activeAppointment: any;
}

export function VisitViewModals({
	endoModalToothNumber,
	endoModalToothState,
	isEndoModalOpen,
	setIsEndoModalOpen,
	setEndoModalToothNumber,
	isLabOrderModalOpen,
	setIsLabOrderModalOpen,
	labOrderModalToothNumber,
	setLabOrderModalToothNumber,
	isStagePaymentModalOpen,
	setIsStagePaymentModalOpen,
	isPriceValidatorModalOpen,
	setIsPriceValidatorModalOpen,
	priceValidatorPlanPayload,
	priceValidatorCatalogList,
	isEmergencyModalOpen,
	setIsEmergencyModalOpen,
	isVoiceDictationModalOpen,
	setIsVoiceDictationModalOpen,
	selectedToothForMenu,
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
	appendToEMKField,
	setToothState,
	visitNoteForm,
	activeAppointment,
}: VisitViewModalsProps) {
	return (
		<>
			{/* Endodontic Root Canal Log Modal */}
			{endoModalToothNumber && (
				<EndoCanalLogModal
					isOpen={isEndoModalOpen}
					onClose={() => {
						setIsEndoModalOpen(false);
						setEndoModalToothNumber(null);
					}}
					toothNumber={Number(endoModalToothNumber)}
					toothState={endoModalToothState}
					patientId={
						activePatient?.id ||
						(typeof dashboard?.activeVisit?.patientId === "string"
							? dashboard.activeVisit.patientId
							: undefined)
					}
					onInsertToProtocol={(protocolText) => {
						appendToEMKField("treatmentPlan", protocolText);
					}}
				/>
			)}

			{/* Dental Lab Order Modal (ЗТЛ) */}
			<DentalLabOrderModal
				isOpen={isLabOrderModalOpen}
				onClose={() => {
					setIsLabOrderModalOpen(false);
					setLabOrderModalToothNumber(null);
				}}
				patientId={
					activePatient?.id ||
					(typeof dashboard?.activeVisit?.patientId === "string"
						? dashboard.activeVisit.patientId
						: undefined)
				}
				patientName={activePatient?.fullName}
				doctorId={activeDoctor?.id}
				doctorName={activeDoctor?.fullName}
				initialToothFdi={labOrderModalToothNumber ?? undefined}
				onOrderSaved={(order) => {
					if (order?.toothFdi && order?.material) {
						appendToEMKField(
							"treatmentPlan",
							`Оформлен наряд ЗТЛ на зуб ${order.toothFdi} (${order.material}, цвет ${order.colorVita || "A2"}).`,
						);
					}
				}}
			/>

			{/* Stage Payment & Milestone Escrow Modal */}
			<StagePaymentPlanModal
				isOpen={isStagePaymentModalOpen}
				onClose={() => setIsStagePaymentModalOpen(false)}
				patientId={activePatient?.id}
				patientName={activePatient?.fullName}
				doctorFullName={activeDoctor?.fullName}
			/>

			{/* Treatment Plan Price Lock & Pricelist Validator Modal */}
			<TreatmentPlanPriceValidatorModal
				isOpen={isPriceValidatorModalOpen}
				onClose={() => setIsPriceValidatorModalOpen(false)}
				planPayload={priceValidatorPlanPayload}
				catalogPricelist={priceValidatorCatalogList}
				onExportWorkOrder={(exportData) => {
					appendToEMKField(
						"treatmentPlan",
						`Сформирован наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽. Фиксация цен: ${exportData.isApprovedByManager ? "Согласовано управляющим" : "По гарантии"}.`,
					);
					showToast(
						`Зуботехнический наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ добавлен в протокол приема.`,
						"success",
					);
				}}
				onExportCompletedAct={(exportData) => {
					appendToEMKField(
						"treatmentPlan",
						`Сформирован акт выполненных работ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽.`,
					);
					showToast(
						`Акт выполненных работ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ готов к подписанию.`,
						"success",
					);
				}}
			/>

			{/* Emergency Rescue / Anaphylaxis Anti-Shock Modal (Мандаты 8c, 8e) */}
			<EmergencyRescueModal
				isOpen={isEmergencyModalOpen}
				onClose={() => setIsEmergencyModalOpen(false)}
				onApplyToDiary={(protocolText) => {
					appendToEMKField("diary", protocolText);
					showToast(
						"Протокол оказания экстренной помощи внесён в дневник 043/у",
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

			{/* AI Voice Dictation Assistant Modal */}
			<VoiceDictationAssistantModal
				isOpen={isVoiceDictationModalOpen}
				onClose={() => setIsVoiceDictationModalOpen(false)}
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
					showToast("SOAP-запись внесена в Форму 043/у", "success");
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

			{/* Warranty Passport Modal */}
			<WarrantyPassportModal
				isOpen={isWarrantyModalOpen}
				onClose={() => setIsWarrantyModalOpen(false)}
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

			{/* Doctor Mobile Shift Modal */}
			<DoctorMobileShiftModal
				isOpen={isDoctorShiftModalOpen}
				onClose={() => setIsDoctorShiftModalOpen(false)}
				initialDoctorId={activeDoctor?.id}
				initialDoctorName={activeDoctor?.fullName}
			/>

			{/* Informed Consent Modal */}
			<InformedConsentModal
				isOpen={isInformedConsentModalOpen}
				onClose={() => setIsInformedConsentModalOpen(false)}
				patient={
					activePatient
						? {
								fullName: activePatient.fullName || activePatient.name,
								birthDate: activePatient.birthDate,
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
		</>
	);
}
