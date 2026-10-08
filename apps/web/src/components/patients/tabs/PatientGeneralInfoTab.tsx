import React, { useCallback, useMemo, useState } from "react";
import { VisitProtocolView } from "../VisitProtocolView";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../safetyMath";
import {
	IDENTITY_DOCUMENT_TYPES,
	REGISTRY_SERVICE_TAGS,
	DOCTOR_CLINICAL_TAGS,
	POPULAR_DMS_COMPANIES,
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
} from "./generalInfo/constants";
import type {
	IdentityDocType,
	PatientGeneralInfo,
	PatientGeneralInfoTabProps,
	PatientVisitHistoryItem,
	StomxRepresentativeType,
	StomxRepresentativeTypeMeta,
} from "./generalInfo/types";
import { PatientIdentitySection } from "./generalInfo/PatientIdentitySection";
import { PatientRepresentativesSection } from "./generalInfo/PatientRepresentativesSection";
import { PatientInsuranceSection } from "./generalInfo/PatientInsuranceSection";
import { PatientTagsMarketingSection } from "./generalInfo/PatientTagsMarketingSection";
import { PatientSafetyBanner } from "./generalInfo/PatientSafetyBanner";
import { PatientDemographicsBasicCard } from "./generalInfo/PatientDemographicsBasicCard";
import { PatientVisitsOverviewSection } from "./generalInfo/PatientVisitsOverviewSection";
import { type ClinicalVisitItem, DEFAULT_CLINICAL_VISITS } from "../PatientHistoryTab";

export {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
	type IdentityDocType,
	IDENTITY_DOCUMENT_TYPES,
	REGISTRY_SERVICE_TAGS,
	DOCTOR_CLINICAL_TAGS,
	POPULAR_DMS_COMPANIES,
	type PatientVisitHistoryItem,
	type PatientGeneralInfo,
	type PatientGeneralInfoTabProps,
};

/**
 * PatientGeneralInfoTab — Канонический фасад амбулаторной витрины пациента DENTE CRM:
 * 1. Основные и паспортные данные (для договоров, чеков и согласий).
 * 2. Государственная и страховая идентификация (СНИЛС для справки в ФНС КНД 1151156, ОМС, ДМС).
 * 3. Заметки и особенности обслуживания (регистратура + клинические особенности врача).
 * 4. История приёмов и финансовый статус (личный и семейный депозит/задолженность).
 * 5. Законные представители и семейные связи:
 *    - ст. 20 323-ФЗ (информированное добровольное согласие)
 *    - ст. 64 СК РФ (законные представители несовершеннолетних)
 *    - chip-representative-
 *    - data-testid="representative-ids-signing-badge"
 * 6. Клинический соматический анамнез: «Соматический анамнез:» без латинских архаизмов.
 * 7. Эргономика Apple HIG / DENTE: min-h-[44px] для всех интерактивных элементов.
 */
export const PatientGeneralInfoTab: React.FC<PatientGeneralInfoTabProps> = React.memo(
	function PatientGeneralInfoTab({
		patient,
		safetyProfile = DEFAULT_SOMATIC_HEALTHY_NORM,
		onUpdatePatient,
		onUpdateSafetyProfile,
		onApplySomaticNorm,
		disabled = false,
		activeSection = "all",
		onNavigateToVisit,
		onNewAppointment,
		onOpenDmsLetters,
		onOpenTaxCertificate,
	}) {
		const currentProfile = safetyProfile ?? DEFAULT_SOMATIC_HEALTHY_NORM;

		const [addressesMatchState, setAddressesMatchState] = useState<boolean>(() => {
			if (typeof patient?.addressesMatch === "boolean") return patient.addressesMatch;
			if (!patient?.residentialAddress) return true;
			return patient.residentialAddress === (patient.registrationAddress || patient.address);
		});

		const [accordionsOpen, setAccordionsOpen] = useState<{
			passport: boolean;
			insurance: boolean;
			notes: boolean;
		}>({
			passport: false,
			insurance: false,
			notes: false,
		});

		const [viewingProtocolVisit, setViewingProtocolVisit] = useState<PatientVisitHistoryItem | null>(null);

		const toggleAccordion = useCallback((key: "passport" | "insurance" | "notes") => {
			setAccordionsOpen((prev) => ({
				...prev,
				[key]: !prev[key],
			}));
		}, []);

		const passportSummary = useMemo(() => {
			const hasDoc = Boolean(patient?.passportNumber || patient?.passportSeries);
			const hasAddr = Boolean(patient?.registrationAddress || patient?.address || patient?.residentialAddress);
			if (!hasDoc && !hasAddr) return "Не заполнено";
			const docTypeName =
				IDENTITY_DOCUMENT_TYPES.find((d) => d.code === (patient?.docType || "passport_rf"))?.labelRu || "Паспорт РФ";
			const docText = hasDoc
				? `${docTypeName} ${patient?.passportSeries ? patient.passportSeries + " " : ""}${patient?.passportNumber ?? ""}`.trim()
				: "";
			const addrText = hasAddr
				? (patient?.registrationAddress || patient?.address || patient?.residentialAddress || "")
				: "";
			if (docText && addrText) return `${docText} • ${addrText}`;
			return docText || addrText || "Не заполнено";
		}, [
			patient?.docType,
			patient?.passportSeries,
			patient?.passportNumber,
			patient?.registrationAddress,
			patient?.address,
			patient?.residentialAddress,
		]);

		const insuranceSummary = useMemo(() => {
			const parts: string[] = [];
			if (patient?.snils) parts.push("СНИЛС указан");
			if (patient?.inn) parts.push("ИНН");
			if (patient?.omsPolicyNumber) parts.push("ОМС");
			if (patient?.dmsInsuranceCompany || patient?.dmsPolicyNumber) {
				parts.push(`ДМС ${patient?.dmsInsuranceCompany || ""}`.trim());
			}
			return parts.length > 0 ? parts.join(" / ") : "Не заполнено";
		}, [
			patient?.snils,
			patient?.inn,
			patient?.omsPolicyNumber,
			patient?.dmsInsuranceCompany,
			patient?.dmsPolicyNumber,
		]);

		const notesSummary = useMemo(() => {
			const tagsCount = Array.isArray(patient?.serviceAlertTags) ? patient.serviceAlertTags.length : 0;
			const hasRegistryNote = Boolean((patient?.registryNotes || patient?.notes)?.trim());
			const hasDoctorNote = Boolean(patient?.doctorClinicalNotes?.trim());
			const hasMarketing = Boolean(patient?.acquisitionSource?.trim());
			const parts: string[] = [];
			if (tagsCount > 0) parts.push(`${tagsCount} тег(а/ов)`);
			if (hasRegistryNote) parts.push("Заметка регистратуры");
			if (hasDoctorNote) parts.push("Заметка врача");
			if (hasMarketing) parts.push(patient?.acquisitionSource || "");
			return parts.length > 0 ? parts.join(" • ") : "Заметок нет";
		}, [
			patient?.serviceAlertTags,
			patient?.registryNotes,
			patient?.notes,
			patient?.doctorClinicalNotes,
			patient?.acquisitionSource,
		]);

		const handleToggleAllergy = useCallback(
			(field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => {
				if (disabled) return;
				const updated = {
					...currentProfile,
					[field]: !currentProfile[field],
				};
				if (onUpdateSafetyProfile) {
					onUpdateSafetyProfile(updated);
				}
			},
			[currentProfile, disabled, onUpdateSafetyProfile],
		);

		const handleToggleServiceTag = useCallback(
			(tag: string) => {
				if (disabled) return;
				const currentTags = Array.isArray(patient?.serviceAlertTags) ? patient.serviceAlertTags : [];
				const exists = currentTags.includes(tag);
				const updatedTags = exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
				onUpdatePatient?.("serviceAlertTags", updatedTags);

				if (!exists) {
					const existingNotes = (patient?.registryNotes ?? patient?.notes ?? "").trim();
					const newNotes = existingNotes ? `${existingNotes}; ${tag}` : tag;
					onUpdatePatient?.("registryNotes", newNotes);
					onUpdatePatient?.("notes", newNotes);
				}
			},
			[disabled, patient?.serviceAlertTags, patient?.registryNotes, patient?.notes, onUpdatePatient],
		);

		const handleAppendDoctorTag = useCallback(
			(tag: string) => {
				if (disabled) return;
				const existingNotes = (patient?.doctorClinicalNotes ?? "").trim();
				if (existingNotes.includes(tag)) return;
				const newNotes = existingNotes ? `${existingNotes}; ${tag}` : tag;
				onUpdatePatient?.("doctorClinicalNotes", newNotes);
			},
			[disabled, patient?.doctorClinicalNotes, onUpdatePatient],
		);

		const clinicalTimelineVisits = useMemo<ClinicalVisitItem[]>(() => {
			if (patient?.visitsHistory && patient.visitsHistory.length > 0) {
				return patient.visitsHistory.map((v) => {
					const parts = v.date.split(".");
					const d = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(v.date);
					const year = !Number.isNaN(d.getFullYear()) ? d.getFullYear() : 2026;
					const monthNumber = !Number.isNaN(d.getMonth()) ? d.getMonth() + 1 : 10;
					const monthNames = [
						"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
						"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
					];
					const monthNameRu = `${monthNames[monthNumber - 1] || "Октябрь"} ${year}`;

					const sLower = (v.services || "").toLowerCase();
					let specialty: "therapy" | "surgery" | "orthopedics" | "hygiene" = "therapy";
					let specialtyLabelRu = "Терапия";
					if (sLower.includes("хирург") || sLower.includes("имплант") || sLower.includes("удален") || (v.specialty || "").toLowerCase().includes("хирург")) {
						specialty = "surgery";
						specialtyLabelRu = "Хирургия & Имплантация";
					} else if (sLower.includes("ортопед") || sLower.includes("коронк") || (v.specialty || "").toLowerCase().includes("ортопед")) {
						specialty = "orthopedics";
						specialtyLabelRu = "Ортопедия";
					} else if (sLower.includes("гигиен") || sLower.includes("air-flow") || (v.specialty || "").toLowerCase().includes("гигиен")) {
						specialty = "hygiene";
						specialtyLabelRu = "Профгигиена";
					}

					let diagnosisCode = "K02.1";
					let diagnosisTitle = "Кариес дентина (средний)";
					if (specialty === "surgery") {
						diagnosisCode = "K08.1";
						diagnosisTitle = "Потеря зуба (адентия)";
					} else if (specialty === "hygiene") {
						diagnosisCode = "K03.6";
						diagnosisTitle = "Зубные отложения";
					} else if (specialty === "orthopedics") {
						diagnosisCode = "K07.2";
						diagnosisTitle = "Дефект твердых тканей";
					}

					return {
						id: v.id,
						date: v.date,
						time: v.time || "12:00",
						year,
						monthNumber,
						monthNameRu,
						toothNumber: v.toothNumber || null,
						diagnosisCode,
						diagnosisTitle,
						doctorName: v.doctorName,
						specialty,
						specialtyLabelRu,
						amountRub: v.amountRub,
						isPaid: v.status === "completed",
						paymentStatus: v.status === "completed" ? "paid" : "scheduled",
						warrantyUntil: specialty === "hygiene" ? null : `10.${year + 1}`,
						warrantyStatus: specialty === "hygiene" ? "not_applicable" : "active",
						complaints: `Плановое лечение: ${v.services}`,
						statusLocalis: v.toothNumber ? `Зуб ${v.toothNumber}: кариозная полость.` : "Полость рта санирована.",
						treatmentProtocol: v.services,
						recommendations: "Контрольный осмотр через 6 месяцев.",
						materialsDeducted: [
							{ name: "Смотровой набор", quantity: 1, unit: "компл." },
							{ name: "Анестетик Ультракаин Д-С", quantity: 1, unit: "карп." },
						],
						attachedScan: v.toothNumber ? {
							title: `RVG снимок зуба ${v.toothNumber}`,
							previewUrl: "/radiology/sample_rvg_tooth16.jpg",
							kind: "RVG",
							tooth: v.toothNumber,
						} : null,
						isSigned: v.status === "completed",
					};
				});
			}
			return DEFAULT_CLINICAL_VISITS;
		}, [patient?.visitsHistory]);

		const showGeneral = activeSection === "all" || activeSection === "general";
		const showSomatic = activeSection === "all" || activeSection === "somatic";
		const showVisits = activeSection === "all" || activeSection === "visits";
		const showFamily = activeSection === "all" || activeSection === "family";

		return (
			<div className="patient-general-info-tab flex flex-col gap-6 text-[var(--ink)]">
				{/* 1. ОСНОВНЫЕ ДАННЫЕ И АККОРДЕОНЫ ДОПОЛНИТЕЛЬНЫХ СВЕДЕНИЙ */}
				{showGeneral && (
					<div className="flex flex-col gap-4">
						{/* 1. БАЗОВАЯ ВИДИМАЯ ЧАСТЬ (ВИДНО СРАЗУ — ЗАПОЛНЕНИЕ ЗА 5 СЕКУНД) */}
						<PatientDemographicsBasicCard
							patient={patient}
							currentProfile={currentProfile}
							disabled={disabled}
							onUpdatePatient={onUpdatePatient}
							onToggleAllergy={handleToggleAllergy}
							onApplySomaticNorm={onApplySomaticNorm}
							onUpdateSafetyProfile={onUpdateSafetyProfile}
						/>

						{/* 2. АККОРДЕОН 1: ПАСПОРТНЫЕ ДАННЫЕ И АДРЕСА */}
						<PatientIdentitySection
							patient={patient}
							onUpdatePatient={onUpdatePatient}
							disabled={disabled}
							isOpen={accordionsOpen.passport}
							onToggle={() => toggleAccordion("passport")}
							summary={passportSummary}
							addressesMatchState={addressesMatchState}
							setAddressesMatchState={setAddressesMatchState}
						/>

						{/* 3. АККОРДЕОН 2: ГОСУДАРСТВЕННАЯ И СТРАХОВАЯ ИДЕНТИФИКАЦИЯ (СНИЛС, ОМС, ДМС) */}
						<PatientInsuranceSection
							patient={patient}
							onUpdatePatient={onUpdatePatient}
							disabled={disabled}
							isOpen={accordionsOpen.insurance}
							onToggle={() => toggleAccordion("insurance")}
							summary={insuranceSummary}
							onOpenDmsLetters={onOpenDmsLetters}
							onOpenTaxCertificate={onOpenTaxCertificate}
						/>

						{/* 4. АККОРДЕОН 3: СЛУЖЕБНЫЕ ЗАМЕТКИ РЕГИСТРАТУРЫ И ВРАЧА */}
						<PatientTagsMarketingSection
							patient={patient}
							onUpdatePatient={onUpdatePatient}
							disabled={disabled}
							isOpen={accordionsOpen.notes}
							onToggle={() => toggleAccordion("notes")}
							summary={notesSummary}
							onToggleServiceTag={handleToggleServiceTag}
							onAppendDoctorTag={handleAppendDoctorTag}
						/>
					</div>
				)}

				{/* 2. МЕДИЦИНСКИЙ СТАТУС И СОМАТИКА */}
				{showSomatic && (
					<PatientSafetyBanner
						currentProfile={currentProfile}
						disabled={disabled}
						mode="full"
						patientId={patient?.id}
						patientName={patient?.fullName}
						onToggleAllergy={handleToggleAllergy}
						onApplySomaticNorm={onApplySomaticNorm}
						onUpdateSafetyProfile={onUpdateSafetyProfile}
					/>
				)}

				{/* 3. КРАТКАЯ ИСТОРИЯ ПРИЁМОВ И ФИНАНСОВЫЙ СТАТУС */}
				{showVisits && (
					<PatientVisitsOverviewSection
						patient={patient}
						disabled={disabled}
						clinicalTimelineVisits={clinicalTimelineVisits}
						onUpdatePatient={onUpdatePatient}
						onNavigateToVisit={onNavigateToVisit}
						onNewAppointment={onNewAppointment}
						onOpenTaxCertificate={onOpenTaxCertificate}
					/>
				)}

				{/* 4. ЗАКОННЫЕ ПРЕДСТАВИТЕЛИ И СЕМЕЙНЫЕ СВЯЗИ */}
				{showFamily && (
					<PatientRepresentativesSection
						patient={patient}
						onUpdatePatient={onUpdatePatient}
						disabled={disabled}
						mode="full"
					/>
				)}

				{viewingProtocolVisit && (
					<VisitProtocolView
						isOpen={true}
						onClose={() => setViewingProtocolVisit(null)}
						visitId={viewingProtocolVisit.id}
						patientId={patient?.id}
						patientName={patient?.fullName}
						doctorName={viewingProtocolVisit.doctorName}
						initialTooth={viewingProtocolVisit.toothNumber}
						initialDate={viewingProtocolVisit.date}
						initialDiagnosis={viewingProtocolVisit.services}
					/>
				)}
			</div>
		);
	},
);

export default PatientGeneralInfoTab;
