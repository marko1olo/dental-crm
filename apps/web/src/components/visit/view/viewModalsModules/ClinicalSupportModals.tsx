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
	WarrantyPassportModal,
	type CompletedTreatmentStage,
} from "../../../warranty/WarrantyPassportModal";
import type { WarrantyCertificateData } from "../../../warranty/warrantyRemediationTypes";
import { DoctorMobileShiftModal } from "../../../doctor-portal/DoctorMobileShiftModal";
import { InformedConsentModal } from "../../../consents/InformedConsentModal";
import { PrescriptionModal } from "../../../prescriptions/PrescriptionModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { useVisitStore } from "../../../../store/visit";
import { showToast } from "../../../GlobalToast";

export interface ClinicalSupportPatient {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly phone?: string | undefined;
	readonly passport?: string | undefined;
	readonly snils?: string | undefined;
	readonly address?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly allergies?: readonly string[] | string | undefined;
	readonly chronicDiseases?: readonly string[] | string | undefined;
	readonly [key: string]: unknown;
}

export interface ClinicalSupportDoctor {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly specialty?: string | undefined;
	readonly snils?: string | undefined;
	readonly [key: string]: unknown;
}

export interface ClinicalSupportClinicProfile {
	readonly brandName?: string | undefined;
	readonly address?: string | undefined;
	readonly phone?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly inn?: string | undefined;
	readonly medicalLicenseNumber?: string | undefined;
	readonly [key: string]: unknown;
}

export interface ClinicalSupportDashboard {
	readonly organization?: {
		readonly id?: string | undefined;
		readonly name?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly clinicSettings?: {
		readonly profile?: ClinicalSupportClinicProfile | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly activeVisit?: {
		readonly id?: string | undefined;
		readonly completedServices?: unknown[] | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly [key: string]: unknown;
}

export interface ClinicalSupportVisitNoteForm {
	readonly diagnosis?: string | undefined;
	readonly treatmentDescription?: string | undefined;
	readonly diary?: string | undefined;
	readonly anamnesis?: string | undefined;
	readonly statusLocalis?: string | undefined;
	readonly status?: string | undefined;
	readonly [key: string]: unknown;
}

export interface ClinicalSupportAppointment {
	readonly id?: string | undefined;
	readonly status?: string | undefined;
	readonly completedServices?: readonly unknown[] | undefined;
	readonly services?: readonly unknown[] | undefined;
	readonly [key: string]: unknown;
}

export interface ClinicalSupportModalsProps {
	readonly effectiveActiveModal: string | null;
	readonly isEmergencyModalOpen: boolean;
	readonly setIsEmergencyModalOpen: (v: boolean) => void;
	readonly isVoiceDictationModalOpen: boolean;
	readonly setIsVoiceDictationModalOpen: (v: boolean) => void;
	readonly isWarrantyModalOpen: boolean;
	readonly setIsWarrantyModalOpen: (v: boolean) => void;
	readonly isDoctorShiftModalOpen: boolean;
	readonly setIsDoctorShiftModalOpen: (v: boolean) => void;
	readonly isInformedConsentModalOpen: boolean;
	readonly setIsInformedConsentModalOpen: (v: boolean) => void;
	readonly isPrescriptionModalOpen?: boolean | undefined;
	readonly setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	readonly activePatient?: ClinicalSupportPatient | null | undefined;
	readonly activeDoctor?: ClinicalSupportDoctor | null | undefined;
	readonly dashboard?: ClinicalSupportDashboard | null | undefined;
	readonly patientAge?: string | null | undefined;
	readonly selectedToothForMenu?: number | string | null | undefined;
	readonly visitNoteForm?: ClinicalSupportVisitNoteForm | null | undefined;
	readonly activeAppointment?: ClinicalSupportAppointment | null | undefined;
	readonly setToothState: (code: string, state: unknown) => void;
	readonly appendToEMKField: (field: string, text: string) => void;
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
					initialPatientName={activePatient?.fullName || activePatient?.name || ""}
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

			{/* Warranty Passport Modal (Мандаты 8e, 8k — Авто-заполнение из выполненных услуг визита и 0 ₽ переделка) */}
			{(effectiveActiveModal === "warranty_passport" || isWarrantyModalOpen) && (() => {
				const fromStore = useVisitStore.getState().completedServices || [];
				const fromAppt =
					activeAppointment?.completedServices ||
					activeAppointment?.services ||
					dashboard?.activeVisit?.completedServices ||
					[];
				const sourceList = fromStore.length > 0 ? fromStore : fromAppt;
				const completedStagesForWarranty: CompletedTreatmentStage[] = Array.isArray(sourceList)
					? sourceList.map((rawService: unknown, idx: number) => {
							const s =
								typeof rawService === "object" && rawService !== null
									? (rawService as Record<string, unknown>)
									: {};
							const title =
								(typeof s.name === "string" && s.name) ||
								(typeof s.title === "string" && s.title) ||
								(typeof s.serviceTitle === "string" && s.serviceTitle) ||
								(typeof s.serviceName === "string" && s.serviceName) ||
								"Стоматологическая услуга";
							const tooth = s.tooth ?? s.toothNumber ?? s.toothCode;
							const code = s.code ?? s.code804n ?? s.serviceCode;
							const rawDate = typeof s.date === "string" ? s.date : undefined;
							return {
								stageNumber: idx + 1,
								stageTitle: title,
								serviceTitle: title,
								toothNumber: tooth !== undefined && tooth !== null ? String(tooth) : undefined,
								serviceCode804n: code !== undefined && code !== null ? String(code) : undefined,
								performedAt: rawDate || new Date().toISOString().slice(0, 10),
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
										fullName: activePatient.fullName || activePatient.name,
										birthDate: activePatient.birthDate,
										phone: activePatient.phone,
									}
								: null
						}
						doctorName={activeDoctor?.fullName || activeDoctor?.name}
						doctorId={activeDoctor?.id}
						clinicName={
							dashboard?.clinicSettings?.profile?.brandName ||
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
									serviceId: order.id,
									code: "A16.07.002",
									serviceCode: "A16.07.002",
									name: `Гарантийный случай: ${order.defectTitle} (0 ₽)`,
									title: `Гарантийный случай: ${order.defectTitle} (0 ₽)`,
									price: 0,
									priceRub: 0,
									priceKopecks: 0,
									amountKopecks: 0,
									toothNumber: order.toothNumber,
									quantity: 1,
								});
							} catch (addErr) {
								console.warn("Non-blocking: could not add warranty service to visit store", addErr);
							}
							showToast(`Гарантийный случай ${order.orderNumber} (0 ₽) добавлен в визит`, "success");
						}}
						onCertificateIssued={(passport: WarrantyCertificateData) => {
							const num = passport.certificateId || "Б/Н";
							const months = passport.calculation?.adjustedWarrantyMonths ? ` (${passport.calculation.adjustedWarrantyMonths} мес.)` : "";
							const until = passport.calculation?.warrantyExpirationDate ? ` до ${passport.calculation.warrantyExpirationDate}` : "";
							appendToEMKField(
								"recommendations",
								`Оформлен гарантийный паспорт № ${num}${months}${until}.`,
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
					initialDoctorName={activeDoctor?.fullName || activeDoctor?.name}
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
					visitId={activeAppointment?.id || (dashboard?.activeVisit?.id as string | undefined)}
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
							: undefined
					}
					doctorName={activeDoctor?.fullName || activeDoctor?.name}
					clinicName={
						dashboard?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					}
					licenseNumber={
						dashboard?.clinicSettings?.profile?.medicalLicenseNumber ||
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
					patient={
						activePatient
							? {
									id: activePatient.id,
									fullName: activePatient.fullName || activePatient.name,
									name: activePatient.name,
									birthDate: activePatient.birthDate,
									cardNumber: activePatient.cardNumber,
									medicalCardNumber: activePatient.medicalCardNumber || activePatient.medCardNumber,
									allergies: activePatient.allergies,
									chronicDiseases: activePatient.chronicDiseases,
								}
							: undefined
					}
					patientName={activePatient?.fullName || activePatient?.name}
					allergies={activePatient?.allergies}
					doctorName={activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог"}
					doctorSpecialty={activeDoctor?.specialty || "Врач-стоматолог"}
					clinicName={
						dashboard?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"Медицинская организация"
					}
					clinicAddress={
						dashboard?.clinicSettings?.profile?.address || ""
					}
					clinicPhone={
						dashboard?.clinicSettings?.profile?.phone || ""
					}
					clinicOgrn={dashboard?.clinicSettings?.profile?.ogrn || ""}
					diary={{
						diagnosisIcd10: visitNoteForm?.diagnosis || "",
						notes: visitNoteForm?.treatmentDescription || visitNoteForm?.diary || "",
						anamnesisVitae: visitNoteForm?.anamnesis || "",
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
