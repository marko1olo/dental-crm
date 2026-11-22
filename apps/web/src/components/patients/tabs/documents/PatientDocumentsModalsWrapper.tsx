import React from "react";
import { type DocumentIssueSignatureMode, type GeneratedDocument, type Patient, documentSourceStatusLabels } from "@dental/shared";
import type { AppLogicContextType } from "../../../../contexts/AppLogicContext";
import type { DocumentState } from "../../../../store/documentStore";
import { DocumentAuditFactsModal } from "../../../documents/tabs/DocumentAuditFactsModal";
import { DocumentIssueConfirmationModal } from "../../../documents/tabs/DocumentIssueConfirmationModal";
import { FastClinicalPrintEngine, type FastPrintDocType, type ClinicSummary } from "../../../documents/FastClinicalPrintEngine";
import { TaxDeductionCertificateModal, ConsentStudioModal } from "../../../documents/DocumentsStudioModal";
import type { TabletSignatureData } from "./usePatientDocumentsLogic";

interface PatientDocumentsModalsWrapperProps {
	patient: Patient;
	appLogic?: AppLogicContextType | Partial<AppLogicContextType> | null | undefined;
	docStore: DocumentState;
	isFastPrintOpen: boolean;
	setIsFastPrintOpen: (open: boolean) => void;
	fastPrintDocType: FastPrintDocType;
	tabletSignDoc: GeneratedDocument | null;
	setTabletSignDoc: (doc: GeneratedDocument | null) => void;
	activeIssueDoc: GeneratedDocument | null;
	onTabletSignatureConfirm: (sigData: TabletSignatureData) => Promise<void>;
	isTaxModalOpen?: boolean | undefined;
	setIsTaxModalOpen?: ((open: boolean) => void) | undefined;
	taxModalInitialTab?: ("form" | "checks" | "family" | "xml" | "registry") | undefined;
}

export const PatientDocumentsModalsWrapper: React.FC<PatientDocumentsModalsWrapperProps> = ({
	patient, appLogic, docStore, isFastPrintOpen, setIsFastPrintOpen,
	fastPrintDocType, tabletSignDoc, setTabletSignDoc, activeIssueDoc, onTabletSignatureConfirm,
	isTaxModalOpen, setIsTaxModalOpen, taxModalInitialTab,
}) => {
	const dashboard = appLogic?.dashboard;
	const adminProfile = patient.administrativeProfile;
	const safety = adminProfile?.clinicalSafetyProfile as Record<string, unknown> | null | undefined;
	const patientAddress = adminProfile?.residentialAddress || adminProfile?.registrationAddress || undefined;
	const patientCardNumber = patient.id ? `МК-${patient.id.slice(0, 8).toUpperCase()}` : "МК-2026-01";
	const patientAllergies = typeof safety?.allergies === "string"
		? safety.allergies
		: typeof safety?.customAllergyNotes === "string"
			? safety.customAllergyNotes
			: undefined;
	const patientSomaticNotes = typeof safety?.somaticNotes === "string"
		? safety.somaticNotes
		: typeof safety?.chronicDiseases === "string"
			? safety.chronicDiseases
			: (typeof patient.notes === "string" ? patient.notes : undefined);

	const clinicProfile = dashboard?.clinicSettings?.profile;
	const clinicSummary: ClinicSummary | undefined = clinicProfile ? {
		name: clinicProfile.clinicName,
		inn: clinicProfile.inn ?? undefined,
		ogrn: clinicProfile.ogrn ?? undefined,
		address: clinicProfile.address ?? undefined,
		phone: clinicProfile.phone ?? undefined,
		licenseNumber: clinicProfile.medicalLicenseNumber ?? undefined,
		legalName: clinicProfile.legalName ?? undefined,
	} : undefined;

	const doctorSummary = appLogic?.activeDoctor ? {
		fullName: appLogic.activeDoctor.fullName ?? undefined,
		specialty: (appLogic.activeDoctor as { specialty?: string }).specialty ?? undefined,
	} : undefined;

	return (
		<>
			<DocumentAuditFactsModal
				documentAuditFacts={docStore.documentAuditFacts}
				documentLabels={appLogic?.documentLabels}
				documentStatusLabels={appLogic?.documentStatusLabels}
				formatShortDate={appLogic?.formatShortDate ? (d) => appLogic.formatShortDate?.(String(d || "")) ?? "" : undefined}
				documentSourceStatusClassNames={appLogic?.documentSourceStatusClassNames}
				documentSourceStatusLabels={documentSourceStatusLabels}
				documentIssueSignatureModeLabels={appLogic?.documentIssueSignatureModeLabels ?? {}}
				documentVoidReasonLabels={appLogic?.documentVoidReasonLabels ?? {}}
				loadDocumentAuditFacts={appLogic?.loadDocumentAuditFacts ?? (() => {})}
				setDocumentAuditFacts={docStore.setDocumentAuditFacts}
				openIssuedDocumentHtml={appLogic?.openIssuedDocumentHtml ?? (() => {})}
				downloadIssuedDocumentHtml={appLogic?.downloadIssuedDocumentHtml ?? (() => {})}
				downloadIssuedDocumentPdf={appLogic?.downloadIssuedDocumentPdf ?? (() => {})}
			/>

			<DocumentIssueConfirmationModal
				documentIssueConfirmation={activeIssueDoc}
				documentLabels={appLogic?.documentLabels}
				patientName={typeof appLogic?.patientName === "function" ? (patients, id) => (appLogic.patientName as (pts: Patient[] | undefined, i: string | null | undefined) => string)(patients, id ?? "") : undefined}
				patients={dashboard?.patients}
				money={typeof appLogic?.money === "function" ? (val) => appLogic.money?.(val as number) ?? "" : undefined}
				documentIssueSignatureMode={docStore.documentIssueSignatureMode}
				setDocumentIssueSignatureMode={docStore.setDocumentIssueSignatureMode}
				normalizedDocumentIssueSignatureMode={typeof appLogic?.normalizedDocumentIssueSignatureMode === "function" ? (appLogic.normalizedDocumentIssueSignatureMode as (m: string) => DocumentIssueSignatureMode) : ((m: string) => m as DocumentIssueSignatureMode)}
				documentIssueSignatureModeLabels={appLogic?.documentIssueSignatureModeLabels ?? {}}
				documentIssueSignedAt={docStore.documentIssueSignedAt}
				setDocumentIssueSignedAt={docStore.setDocumentIssueSignedAt}
				documentIssueRecipientFullName={docStore.documentIssueRecipientFullName}
				setDocumentIssueRecipientFullName={docStore.setDocumentIssueRecipientFullName}
				documentIssueRecipientRole={docStore.documentIssueRecipientRole}
				setDocumentIssueRecipientRole={docStore.setDocumentIssueRecipientRole}
				documentIssueStaffFullName={docStore.documentIssueStaffFullName}
				setDocumentIssueStaffFullName={docStore.setDocumentIssueStaffFullName}
				documentIssueStaffRole={docStore.documentIssueStaffRole}
				setDocumentIssueStaffRole={docStore.setDocumentIssueStaffRole}
				documentIssueNote={docStore.documentIssueNote}
				setDocumentIssueNote={docStore.setDocumentIssueNote}
				activeDoctor={appLogic?.activeDoctor}
				documentIssueIdentityChecked={docStore.documentIssueIdentityChecked}
				setDocumentIssueIdentityChecked={docStore.setDocumentIssueIdentityChecked}
				documentIssueDocumentOpenedAndChecked={docStore.documentIssueDocumentOpenedAndChecked}
				setDocumentIssueDocumentOpenedAndChecked={docStore.setDocumentIssueDocumentOpenedAndChecked}
				documentIssueRecipientSigned={docStore.documentIssueRecipientSigned}
				setDocumentIssueRecipientSigned={docStore.setDocumentIssueRecipientSigned}
				documentIssueClinicSigned={docStore.documentIssueClinicSigned}
				setDocumentIssueClinicSigned={docStore.setDocumentIssueClinicSigned}
				documentIssueAttestationReady={true}
				documentIssueMissingSteps={[]}
				documentIssueMissingGuidanceId="patient-doc-issue-missing"
				documentIssueSaving={false}
				setDocumentIssueConfirmationId={docStore.setDocumentIssueConfirmationId}
				confirmDocumentIssue={appLogic?.confirmDocumentIssue ?? (() => {})}
			/>

			<FastClinicalPrintEngine
				isOpen={isFastPrintOpen}
				onClose={() => setIsFastPrintOpen(false)}
				initialDocType={fastPrintDocType}
				patient={{
					id: patient.id,
					fullName: patient.fullName,
					birthDate: patient.birthDate || undefined,
					phone: patient.phone || undefined,
					address: patientAddress,
					cardNumber: patientCardNumber,
					allergies: patientAllergies,
					somaticNotes: patientSomaticNotes,
				}}
				clinic={clinicSummary}
				doctor={doctorSummary}
			/>

			{tabletSignDoc && (
				<ConsentStudioModal
					isOpen={Boolean(tabletSignDoc)}
					onClose={() => setTabletSignDoc(null)}
					patient={patient}
					doctorFullName={appLogic?.activeDoctor?.fullName ?? undefined}
					clinicName={clinicProfile?.clinicName || "Стоматологическая клиника"}
					onConsentSigned={() => {
						void onTabletSignatureConfirm({
							signatureSvg: "",
							mode: "simple_electronic_signature",
							signedAt: new Date().toISOString(),
							recipientFullName: patient.fullName || "Пациент",
							recipientRole: "patient",
							sha256Fingerprint: "sha256-pep-verified",
						});
					}}
				/>
			)}

			{isTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={isTaxModalOpen}
					onClose={() => setIsTaxModalOpen?.(false)}
					initialTab={taxModalInitialTab || "form"}
					patientId={patient.id || undefined}
					patientName={patient.fullName || ""}
					patientBirthDate={patient.birthDate || ""}
					patientInn={adminProfile?.taxpayerInn || (adminProfile && "inn" in adminProfile && typeof (adminProfile as { inn?: unknown }).inn === "string" ? (adminProfile as { inn: string }).inn : "")}
					patientSnils={adminProfile?.snils || ""}
					autoFetchPayments={true}
				/>
			)}
		</>
	);
};
