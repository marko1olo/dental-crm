import React, { Suspense } from "react";
import type {
	DocumentKind,
	GeneratedDocument,
	Patient,
} from "@dental/shared";
import type { ClinicProfileDraft } from "../../../AppHelpers";
import { PrimaryIntakePackageModal } from "../PrimaryIntakePackageModal";
import { SurgicalPackageModal } from "../SurgicalPackageModal";
import { ClinicalVisitPackageModal } from "../ClinicalVisitPackageModal";
import { FnsTaxCertificateModal } from "../FnsTaxCertificateModal";
import { AutoclaveSterilizationLogModal } from "../../sanpin/autoclaveLog/AutoclaveSterilizationLogModal";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";
import { EgiszRemdHubModal } from "../../egisz/EgiszRemdHubModal";
import { SickLeaveElnModal } from "../sickLeave/SickLeaveElnModal";
import type { Egisz043uPayload } from "../../egisz/egiszRemdEngine";
import {
	DocumentA4PrintPreviewModal,
} from "../DocumentA4PrintPreviewModal";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";

export interface DocumentModalsContainerProps {
	isA4PrintPreviewOpen?: boolean;
	setIsA4PrintPreviewOpen?: (open: boolean) => void;
	a4InitialTab?: ProfessionalA4DocumentTab;
	isPrimaryIntakeOpen: boolean;
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	isSurgicalPackageOpen: boolean;
	setIsSurgicalPackageOpen: (open: boolean) => void;
	isClinicalVisitOpen: boolean;
	setIsClinicalVisitOpen: (open: boolean) => void;
	isTaxAccountingOpen: boolean;
	setIsTaxAccountingOpen: (open: boolean) => void;
	isSanpinRegistryOpen: boolean;
	setIsSanpinRegistryOpen: (open: boolean) => void;
	isAutoclaveLogOpen: boolean;
	setIsAutoclaveLogOpen: (open: boolean) => void;
	onOpenAutoclaveLog257?: () => void;
	isFnsNdflXmlOpen: boolean;
	setIsFnsNdflXmlOpen: (open: boolean) => void;
	isEgiszRemdOpen: boolean;
	setIsEgiszRemdOpen: (open: boolean) => void;
	isSickLeaveElnOpen: boolean;
	setIsSickLeaveElnOpen: (open: boolean) => void;
	activePatient?: Patient | null;
	activeDoctor?: { fullName?: string } | null;
	clinicProfileDraft?: ClinicProfileDraft;
	typedActiveDocuments?: GeneratedDocument[];
	createDocument: (kind: DocumentKind) => void | Promise<void>;
	openIssuedDocumentHtml: (id: string) => void | Promise<void>;
	setSelectedDocumentKind: (kind: DocumentKind) => void;
	taxDocumentYear: number;
	setTaxDocumentYear: (year: number) => void;
	typedTaxDocumentPayerOptions: Array<{
		key: string;
		inn: string;
		label: string;
		amountRub: number;
		paymentCount: number;
	}>;
	selectedTaxDocumentPayerKey?: string;
	setTaxDocumentPayerInn: (inn: string) => void;
	egiszInitialPayload?: Egisz043uPayload;
	requestDocumentIssue?: (doc: GeneratedDocument) => void;
}

export const DocumentModalsContainer: React.FC<DocumentModalsContainerProps> = React.memo(
	function DocumentModalsContainer(props) {
		const {
			isA4PrintPreviewOpen,
			setIsA4PrintPreviewOpen,
			a4InitialTab,
			isPrimaryIntakeOpen,
			setIsPrimaryIntakeOpen,
			isSurgicalPackageOpen,
			setIsSurgicalPackageOpen,
			isClinicalVisitOpen,
			setIsClinicalVisitOpen,
			isTaxAccountingOpen,
			setIsTaxAccountingOpen,
			isSanpinRegistryOpen,
			setIsSanpinRegistryOpen,
			isAutoclaveLogOpen,
			setIsAutoclaveLogOpen,
			isFnsNdflXmlOpen,
			setIsFnsNdflXmlOpen,
			isEgiszRemdOpen,
			setIsEgiszRemdOpen,
			isSickLeaveElnOpen,
			setIsSickLeaveElnOpen,
			activePatient,
			activeDoctor,
			clinicProfileDraft,
			typedActiveDocuments,
			createDocument,
			openIssuedDocumentHtml,
			setSelectedDocumentKind,
			taxDocumentYear,
			setTaxDocumentYear,
			typedTaxDocumentPayerOptions,
			selectedTaxDocumentPayerKey,
			setTaxDocumentPayerInn,
			egiszInitialPayload,
			requestDocumentIssue,
		} = props;

		return (
			<Suspense fallback={null}>
				{isPrimaryIntakeOpen && (
					<PrimaryIntakePackageModal
						isOpen={isPrimaryIntakeOpen}
						onClose={() => setIsPrimaryIntakeOpen(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName}
						clinicProfileDraft={clinicProfileDraft}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						onOpenAutoclaveLog257={() => setIsAutoclaveLogOpen(true)}
					/>
				)}

				{isSurgicalPackageOpen && (
					<SurgicalPackageModal
						isOpen={isSurgicalPackageOpen}
						onClose={() => setIsSurgicalPackageOpen(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						clinicProfileDraft={clinicProfileDraft}
					/>
				)}

				{isClinicalVisitOpen && (
					<ClinicalVisitPackageModal
						isOpen={isClinicalVisitOpen}
						onClose={() => setIsClinicalVisitOpen(false)}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						clinicProfileDraft={clinicProfileDraft}
					/>
				)}

				{isTaxAccountingOpen && (
					<FnsTaxCertificateModal
						isOpen={isTaxAccountingOpen}
						onClose={() => setIsTaxAccountingOpen(false)}
						patient={activePatient ?? null}
						clinicProfileDraft={clinicProfileDraft}
						initialYear={taxDocumentYear}
					/>
				)}

				{(isAutoclaveLogOpen || isSanpinRegistryOpen) && (
					<AutoclaveSterilizationLogModal
						isOpen={isAutoclaveLogOpen || isSanpinRegistryOpen}
						onClose={() => {
							setIsAutoclaveLogOpen(false);
							setIsSanpinRegistryOpen(false);
						}}
					/>
				)}

				{isFnsNdflXmlOpen && (
					<TaxDeductionCertificateModal
						isOpen={isFnsNdflXmlOpen}
						onClose={() => setIsFnsNdflXmlOpen(false)}
						patientName={activePatient?.fullName ?? undefined}
						patientBirthDate={activePatient?.birthDate ?? undefined}
						patientInn={(activePatient as { inn?: string | null } | undefined)?.inn ?? undefined}
						patientSnils={(activePatient as { snils?: string | null } | undefined)?.snils ?? undefined}
						patientId={activePatient?.id}
						clinicName={clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName}
						clinicInn={clinicProfileDraft?.inn}
						clinicKpp={clinicProfileDraft?.kpp}
						clinicOgrn={clinicProfileDraft?.ogrn}
						clinicLicenseNumber={clinicProfileDraft?.medicalLicenseNumber}
						clinicLicenseDate={clinicProfileDraft?.medicalLicenseIssuedAt}
						clinicAddress={clinicProfileDraft?.address}
						chiefDoctorName={activeDoctor?.fullName}
						selectedYear={taxDocumentYear}
					/>
				)}

				{isEgiszRemdOpen && (
					<EgiszRemdHubModal
						isOpen={isEgiszRemdOpen}
						onClose={() => setIsEgiszRemdOpen(false)}
						initialTab="xml"
						initialXmlPayload={egiszInitialPayload}
					/>
				)}

				{isSickLeaveElnOpen && (
					<SickLeaveElnModal
						isOpen={isSickLeaveElnOpen}
						onClose={() => setIsSickLeaveElnOpen(false)}
						initialPatientName={activePatient?.fullName}
					/>
				)}

				{isA4PrintPreviewOpen && setIsA4PrintPreviewOpen && (
					<DocumentA4PrintPreviewModal
						isOpen={isA4PrintPreviewOpen}
						onClose={() => setIsA4PrintPreviewOpen(false)}
						initialTab={a4InitialTab || "contract"}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						clinicProfileDraft={clinicProfileDraft}
						existingDocuments={typedActiveDocuments}
					/>
				)}
			</Suspense>
		);
	},
);
