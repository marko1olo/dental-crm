import React, { Suspense } from "react";
import type {
	ClinicProfileDraft,
	DocumentKind,
	GeneratedDocument,
	Patient,
} from "@dental/shared";
import { PrimaryIntakePackageModal } from "../PrimaryIntakePackageModal";
import { SurgicalPackageModal } from "../SurgicalPackageModal";
import { ClinicalVisitPackageModal } from "../ClinicalVisitPackageModal";
import { TaxAccountingPackageModal } from "../TaxAccountingPackageModal";
import { SanpinRegistryPackageModal } from "../SanpinRegistryPackageModal";
import { AutoclaveLog257Modal } from "../../sanpin/autoclaveLog/AutoclaveLog257Modal";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";
import { EgiszRemdHubModal } from "../../egisz/EgiszRemdHubModal";
import { SickLeaveElnModal } from "../sickLeave/SickLeaveElnModal";
import type { Egisz043uPayload } from "../../egisz/egiszRemdEngine";

export interface DocumentModalsContainerProps {
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
}

export const DocumentModalsContainer: React.FC<DocumentModalsContainerProps> = React.memo(
	function DocumentModalsContainer(props) {
		const {
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
						doctorFullName={activeDoctor?.fullName}
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
						doctorFullName={activeDoctor?.fullName}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						clinicProfileDraft={clinicProfileDraft}
					/>
				)}

				{isTaxAccountingOpen && (
					<TaxAccountingPackageModal
						isOpen={isTaxAccountingOpen}
						onClose={() => setIsTaxAccountingOpen(false)}
						patient={activePatient ?? null}
						taxYear={taxDocumentYear}
						setTaxYear={setTaxDocumentYear}
						payerOptions={typedTaxDocumentPayerOptions}
						selectedPayerKey={selectedTaxDocumentPayerKey}
						onSelectPayerKey={(key) => setTaxDocumentPayerInn(key)}
						existingDocuments={typedActiveDocuments ?? []}
						onCreateDocument={(kind) => void createDocument(kind)}
						onOpenDocument={(id) => void openIssuedDocumentHtml(id)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
						onOpenFnsXmlModal={() => setIsFnsNdflXmlOpen(true)}
					/>
				)}

				{isSanpinRegistryOpen && (
					<SanpinRegistryPackageModal
						isOpen={isSanpinRegistryOpen}
						onClose={() => setIsSanpinRegistryOpen(false)}
						patient={activePatient ?? null}
						existingDocuments={typedActiveDocuments ?? []}
						onOpenSickLeaveEln={() => setIsSickLeaveElnOpen(true)}
						onOpenAutoclaveLog257={() => setIsAutoclaveLogOpen(true)}
						onOpenEgiszRemd={() => setIsEgiszRemdOpen(true)}
						onCreateDocument={(kind) => void createDocument(kind)}
						onSelectDocumentKind={(kind) => setSelectedDocumentKind(kind)}
					/>
				)}

				{isAutoclaveLogOpen && (
					<AutoclaveLog257Modal
						isOpen={isAutoclaveLogOpen}
						onClose={() => setIsAutoclaveLogOpen(false)}
					/>
				)}

				{isFnsNdflXmlOpen && (
					<TaxDeductionCertificateModal
						isOpen={isFnsNdflXmlOpen}
						onClose={() => setIsFnsNdflXmlOpen(false)}
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
			</Suspense>
		);
	},
);
