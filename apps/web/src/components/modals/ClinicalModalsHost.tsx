import { DiagnosisSelector } from "../clinical/DiagnosisSelector";
import { OutpatientForm043Editor } from "../documents/forms/OutpatientForm043Editor";
import { ChildToothChart } from "../odontogram/ChildToothChart";
import { ToothStatusPalette } from "../odontogram/ToothStatusPalette";
import { PerioArchGrid } from "../perio/PerioArchGrid";
import { PatientDetailModal } from "../patients/PatientDetailModal";
import { PrescriptionsTab } from "../prescriptions/PrescriptionsTab";
import { AnesthesiaProtocolSection } from "../visit/AnesthesiaProtocolSection";
import { DoctorDesktopHeader as VisitDoctorDesktopHeader } from "../visit/DoctorDesktopHeader";
import { AnesthesiaDosageCalculatorModal } from "../anesthesia/AnesthesiaDosageCalculatorModal";
import { ClinicalProtocolPresets } from "../clinical/ClinicalProtocolPresets";
import { PostOpCareSheetModal } from "../clinical/PostOpCareSheetModal";
import { SomaticAnamnesisCard } from "../clinical/SomaticAnamnesisCard";
import { BoneQualityPanel } from "../dicom/BoneQualityPanel";
import { EndoQuickProtocolsBar } from "../endo/EndoQuickProtocolsBar";
import { StomxToothFormulaView } from "../formula/StomxToothFormulaView";
import { StomxDefectsPalette } from "../formula/StomxDefectsPalette";
import { OrthodonticStudioModal } from "../orthodontics/OrthodonticStudioModal";
import { OrthopedicsChairsidePanel } from "../orthopedics/OrthopedicsChairsidePanel";
import { VisitPediatricProtocolWidget } from "../pediatric/VisitPediatricProtocolWidget";
import { PerioProfileStrip } from "../perio/PerioProfileStrip";
import { RadiologyModule } from "../radiology/RadiologyModule";
import { RadiationDoseSheetModal } from "../radiology/doseSheet/RadiationDoseSheetModal";
import { SterilizationAutoclaveLogModal } from "../sterilization/SterilizationAutoclaveLogModal";
import { TreatmentPlanModal } from "../treatment-plans/TreatmentPlanModal";
import { VisitTimer } from "../visit/VisitTimer";
import { VisitEndoProtocolWidget } from "../visit/endo/VisitEndoProtocolWidget";
import { VisitTherapyProtocolWidget } from "../visit/therapy/VisitTherapyProtocolWidget";
/**
 * ClinicalModalsHost.tsx — On-demand clinical modal layer for dental chairside and specialty care.
 * Mounts specialty dialogs (Surgery, Anesthesia, RVG/CBCT, Orthodontics, Sterilization, Consents)
 * on demand without modal clutter, compliant with Mandates 8c (Universal 3-Tier) & 8e (Doctor Autonomy).
 */

import React, { useState, useEffect } from "react";
import {
	CephalometricAnalysisModal,
	OrthodonticPhotoProtocolModal,
} from "../orthodontics";
import { PediatricMixedDentitionModal } from "../odontogram/PediatricMixedDentitionModal";
import { DentalLabOrderModal } from "../lab/DentalLabOrderModal";
import { DentalLabOrdersHubModal } from "../lab/DentalLabOrdersHubModal";
import { LabTrackingDrawer } from "../lab/LabTrackingDrawer";
import { LabWorkOrderModal } from "../lab/orders/LabWorkOrderModal";
import { ClinicalPhotoProtocolModal } from "../photography/ClinicalPhotoProtocolModal";
import { BeforeAfterComparisonView } from "../photography/BeforeAfterComparisonView";
import { AutoclaveCycleModal } from "../sanpin/autoclave/AutoclaveCycleModal";
import { AutoclaveLog257Modal } from "../sanpin/autoclaveLog/AutoclaveLog257Modal";
import { KraftPackageBarcodeModal } from "../sanpin/kraft/KraftPackageBarcodeModal";
import { MedicalWasteJournalModal } from "../sanpin/waste/MedicalWasteJournalModal";
import { SterilizationJournalModal } from "../sterilization/SterilizationJournalModal";
import { SterilizationStudioModal } from "../sterilization/SterilizationStudioModal";
import { InsurancePreAuthModal } from "../insurance/InsurancePreAuthModal";
import { TreatmentPlanComparatorModal } from "../treatment-plans/comparator/TreatmentPlanComparatorModal";
import { TreatmentPlan3TierComparison } from "../treatment-plans/TreatmentPlan3TierComparison";
import { TreatmentPlanPhased4StageView } from "../treatment-plans/TreatmentPlanPhased4StageView";
import { TreatmentPlanPresenterModal } from "../treatment-plans/TreatmentPlanPresenterModal";
import { TreatmentPlanPriceValidatorModal } from "../treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { InformedConsentModal } from "../consents/InformedConsentModal";
import { ChairsideTabletConsentModal } from "../chairside/ChairsideTabletConsentModal";
import { AnesthesiaProtocolModal } from "../anesthesia/AnesthesiaProtocolModal";
import { AnesthesiaSafetyHubModal } from "../anesthesia/AnesthesiaSafetyHubModal";
import { AnesthesiaQuickBar } from "../anesthesia/AnesthesiaQuickBar";
import { ToothAnesthesiaCalculator } from "../diagnostics/ToothAnesthesiaCalculator";
import { EmergencyAnaphylaxisProtocolModal } from "../anesthesia/EmergencyAnaphylaxisProtocolModal";
import { EmergencyRescueModal } from "../emergency/EmergencyRescueModal";
import { ImagingModal } from "../imaging/ImagingModal";
import { DicomViewerModal } from "../imaging/DicomViewerModal";
import { DicomViewport } from "../imaging/DicomViewport";
import { DirectRvgCaptureModal } from "../radiology/DirectRvgCaptureModal";
import { HotFolderIntakeModal } from "../radiology/HotFolderIntakeModal";
import { RadiologyReferralModal } from "../radiology/RadiologyReferralModal";
import { RadiologyViewerModal } from "../radiology/RadiologyViewerModal";
import { CbctMpr3DStudioModal } from "../radiology/CbctMpr3DStudioModal";
import { ImplantCrossSectionPlanner } from "../radiology/ImplantCrossSectionPlanner";
import { ImplantPassportModal } from "../implants/ImplantPassportModal";
import { SurgeryCockpitModal } from "../surgery/SurgeryCockpitModal";
import { SurgeryProtocolPanel } from "../surgery/SurgeryProtocolPanel";
import { SurgeryVisitCockpit } from "../surgery/SurgeryVisitCockpit";
import { VisitSurgeryProtocolTab } from "../visit/surgery/VisitSurgeryProtocolTab";
import { AnesthesiaAspirationJournalModal } from "../visit/anesthesia/AnesthesiaAspirationJournalModal";
import { NurseCarpuleDisposalModal } from "../inventory/NurseCarpuleDisposalModal";
import { WarrantyPassportModal } from "../warranty/WarrantyPassportModal";
import { PatientMemoPrintModal } from "../visit/PatientMemoPrintModal";
import { ProcedureMaterialDeductionModal } from "../inventory/ProcedureMaterialDeductionModal";
import { VisitOdontogramTab } from "../visit/VisitOdontogramTab";
import { Form043PrintModal } from "../emr/Form043PrintModal";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

interface OpenClinicalModalDetail {
	modalId: string;
	patientId?: string;
	patientName?: string;
	patientPhone?: string;
	patientBirthDate?: string;
	cardNumber?: string;
	doctorName?: string;
	activeTooth?: number;
}

export const ClinicalModalsHost: React.FC = () => {
	const [activeModal, setActiveModal] = useState<string | null>(null);
	const [modalData, setModalData] = useState<OpenClinicalModalDetail | null>(null);
	const appLogic = useOptionalAppLogicContext();

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<OpenClinicalModalDetail>).detail;
			if (detail?.modalId) {
				setActiveModal(detail.modalId);
				setModalData(detail);
			}
		};
		window.addEventListener("dente-open-clinical-modal", handleOpen);
		return () => window.removeEventListener("dente-open-clinical-modal", handleOpen);
	}, []);

	const close = () => {
		setActiveModal(null);
		setModalData(null);
	};

	if (!activeModal) return null;

	const patientId = modalData?.patientId ?? appLogic?.activePatient?.id ?? "";
	const patientName = modalData?.patientName ?? appLogic?.activePatient?.fullName ?? appLogic?.activePatient?.name ?? "";
	const patientPhone = modalData?.patientPhone ?? appLogic?.activePatient?.phone ?? "";
	const patientBirthDate = modalData?.patientBirthDate ?? appLogic?.activePatient?.birthDate ?? "";
	const cardNumber = modalData?.cardNumber ?? appLogic?.activePatient?.cardNumber ?? appLogic?.activePatient?.medicalCardNumber ?? "";
	const doctorFullName = modalData?.doctorName ?? appLogic?.activeDoctor?.fullName ?? appLogic?.activeDoctor?.name ?? "Врач";
	const activeTooth = modalData?.activeTooth ?? 46;

	return (
		<>
			{activeModal === "pediatric" && (
				<PediatricMixedDentitionModal isOpen={true} onClose={close} initialAge={7.5}  {...({} as any)} />
			)}
			{activeModal === "ceph" && (
				<CephalometricAnalysisModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "ortho_photo" && (
				<OrthodonticPhotoProtocolModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dental_lab_order" && (
				<DentalLabOrderModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dental_lab_orders_hub" && (
				<DentalLabOrdersHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "lab_tracking" && (
				<LabTrackingDrawer isOpen={true} onClose={close} order={null as any}  {...({} as any)} />
			)}
			{activeModal === "lab_work_order" && (
				<LabWorkOrderModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "clinical_photo" && (
				<ClinicalPhotoProtocolModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "before_after" && (
				<BeforeAfterComparisonView beforePhotoUrl="" afterPhotoUrl=""  {...({} as any)} />
			)}
			{activeModal === "autoclave_cycle" && (
				<AutoclaveCycleModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "autoclave_log257" && (
				<AutoclaveLog257Modal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "kraft_barcode" && (
				<KraftPackageBarcodeModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "medical_waste" && (
				<MedicalWasteJournalModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "sterilization_journal" && (
				<SterilizationJournalModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "sterilization_studio" && (
				<SterilizationStudioModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "insurance_preauth" && (
				<InsurancePreAuthModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "plan_comparator" && (
				<TreatmentPlanComparatorModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "plan_3tier" && (
				<TreatmentPlan3TierComparison {...({} as any)} />
			)}
			{activeModal === "plan_phased4" && (
				<TreatmentPlanPhased4StageView stages={[]}  {...({} as any)} />
			)}
			{activeModal === "plan_presenter" && (
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={close}
					patientName={patientName}
					patientId={patientId}
					patientPhone={patientPhone}
					patientBirthDate={patientBirthDate}
					doctorFullName={doctorFullName}
				 {...({} as any)} />
			)}
			{activeModal === "plan_validator" && (
				<TreatmentPlanPriceValidatorModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "informed_consent" && (
				<InformedConsentModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "chairside_consent" && (
				<ChairsideTabletConsentModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "anesthesia_protocol" && (
				<AnesthesiaProtocolModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "anesthesia_safety_hub" && (
				<AnesthesiaSafetyHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "anesthesia_quick_bar" && (
				<AnesthesiaQuickBar {...({} as any)} />
			)}
			{activeModal === "tooth_anesthesia_calc" && (
				<ToothAnesthesiaCalculator  {...({} as any)} />
			)}
			{activeModal === "emergency_anaphylaxis" && (
				<EmergencyAnaphylaxisProtocolModal
					isOpen={true}
					onClose={close}
					patientName={patientName}
					doctorName={doctorFullName}
				 {...({} as any)} />
			)}
			{activeModal === "emergency_rescue" && (
				<EmergencyRescueModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "imaging" && (
				<ImagingModal
					isOpen={true}
					onClose={close}
					patientName={patientName}
					modality="RVG"
					toothFdiCode={String(activeTooth)}
				 {...({} as any)} />
			)}
			{activeModal === "dicom_viewer" && (
				<DicomViewerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dicom_viewport" && (
				<DicomViewport  {...({} as any)} />
			)}
			{activeModal === "rvg_capture" && (
				<DirectRvgCaptureModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "hot_folder" && (
				<HotFolderIntakeModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "radiology_referral" && (
				<RadiologyReferralModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "radiology_viewer" && (
				<RadiologyViewerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "cbct_3d_studio" && (
				<CbctMpr3DStudioModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "implant_cross_section" && (
				<ImplantCrossSectionPlanner  {...({} as any)} />
			)}
			{activeModal === "implant_passport" && (
				<ImplantPassportModal
					isOpen={true}
					onClose={close}
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorFullName}
					initialTooth={activeTooth}
				 {...({} as any)} />
			)}
			{activeModal === "surgery_cockpit" && (
				<SurgeryCockpitModal
					isOpen={true}
					onClose={close}
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorFullName}
					initialTooth={activeTooth}
				 {...({} as any)} />
			)}
			{activeModal === "surgery_protocol_panel" && (
				<SurgeryProtocolPanel patientName={patientName} toothFdi={activeTooth}  {...({} as any)} />
			)}
			{activeModal === "surgery_visit_cockpit" && (
				<SurgeryVisitCockpit
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorFullName}
					activeTooth={activeTooth}
				 {...({} as any)} />
			)}
			{activeModal === "surgery_protocol_tab" && (
				<VisitSurgeryProtocolTab
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorFullName}
					activeTooth={activeTooth}
				 {...({} as any)} />
			)}
			{activeModal === "anesthesia_aspiration" && (
				<AnesthesiaAspirationJournalModal
					isOpen={true}
					onClose={close}
					initialPatientFullName={patientName}
					initialToothNumber={String(activeTooth)}
				 {...({} as any)} />
			)}
			{activeModal === "nurse_carpule_disposal" && (
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={close}
					initialDoctorName={doctorFullName}
					initialNurseName="Медсестра ЦСО"
				 {...({} as any)} />
			)}
			{activeModal === "warranty_passport" && (
				<WarrantyPassportModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_memo" && (
				<PatientMemoPrintModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "procedure_material_deduction" && (
				<ProcedureMaterialDeductionModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "visit_odontogram_tab" && (
				<VisitOdontogramTab
					activePatient={patientId ? ({
						id: patientId,
						fullName: patientName,
						phone: patientPhone,
						birthDate: patientBirthDate,
						cardNumber,
					} as any) : null}
					activeAppointment={null}
					dashboard={null as any}
				 {...({} as any)} />
			)}
			{activeModal === "form_043_print" && (
				<Form043PrintModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
		
			{activeModal === "anesthesia_dosage" && (
				<AnesthesiaDosageCalculatorModal isOpen={true} onClose={close} patientWeightKg={70}  {...({} as any)} />
			)}
			{activeModal === "clinical_protocol_presets" && (
				<ClinicalProtocolPresets {...({} as any)} />
			)}
			{activeModal === "post_op_care_sheet" && (
				<PostOpCareSheetModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "somatic_anamnesis" && (
				<SomaticAnamnesisCard patientId={patientId}  {...({} as any)} />
			)}
			{activeModal === "bone_quality" && (
				<BoneQualityPanel  {...({} as any)} />
			)}
			{activeModal === "endo_quick_protocols" && (
				<EndoQuickProtocolsBar {...({} as any)} />
			)}
			{activeModal === "stomx_formula" && (
				<>
					<StomxToothFormulaView patientId={patientId} {...({} as any)} />
					<StomxDefectsPalette {...({} as any)} />
				</>
			)}
			{activeModal === "orthodontic_studio" && (
				<OrthodonticStudioModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "orthopedics_chairside" && (
				<OrthopedicsChairsidePanel  {...({} as any)} />
			)}
			{activeModal === "visit_pediatric_protocol" && (
				<VisitPediatricProtocolWidget  {...({} as any)} />
			)}
			{activeModal === "perio_profile" && (
				<PerioProfileStrip  {...({} as any)} />
			)}
			{activeModal === "radiology_module" && (
				<RadiologyModule  {...({} as any)} />
			)}
			{activeModal === "radiation_dose_sheet" && (
				<RadiationDoseSheetModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "sterilization_autoclave_log" && (
				<SterilizationAutoclaveLogModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "treatment_plan_modal" && (
				<TreatmentPlanModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "visit_timer" && (
				<VisitTimer  {...({} as any)} />
			)}
			{activeModal === "visit_endo_protocol" && (
				<VisitEndoProtocolWidget  {...({} as any)} />
			)}
			{activeModal === "visit_therapy_protocol" && (
				<VisitTherapyProtocolWidget  {...({} as any)} />
			)}
			{activeModal === "diagnosis_selector" && (
				<DiagnosisSelector {...({} as any)} />
			)}
			{activeModal === "outpatient_form_043_editor" && (
				<OutpatientForm043Editor  {...({} as any)} />
			)}
			{activeModal === "child_tooth_chart" && (
				<ChildToothChart  {...({} as any)} />
			)}
			{activeModal === "tooth_status_palette" && (
				<ToothStatusPalette selectedTooth={16}  {...({} as any)} />
			)}
			{activeModal === "perio_arch_grid" && (
				<PerioArchGrid arch="upper" teeth={[]}  {...({} as any)} />
			)}
			{activeModal === "patient_detail_modal" && (
				<PatientDetailModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "prescriptions_tab" && (
				<PrescriptionsTab  {...({} as any)} />
			)}
			{activeModal === "anesthesia_protocol_section" && (
				<AnesthesiaProtocolSection  {...({} as any)} />
			)}
			{activeModal === "visit_doctor_desktop_header" && (
				<VisitDoctorDesktopHeader  {...({} as any)} />
			)}
		</>
	);
};
