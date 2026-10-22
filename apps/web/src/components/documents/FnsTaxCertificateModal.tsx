import React from "react";
import {
	type FnsTaxCertificateModalProps,
	useFnsTaxCertificateState,
	FnsTaxCertificateHeader,
	FnsTaxCertificateControls,
	FnsTaxCertificateSummary,
	FnsTaxCertificatePreview,
} from "./fnsTaxCertificate";

export type { FnsTaxCertificateModalProps };

export const FnsTaxCertificateModal: React.FC<FnsTaxCertificateModalProps> = ({
	isOpen,
	onClose,
	patient,
	clinicProfileDraft,
	payments = [],
	initialYear = new Date().getFullYear(),
	onPrint,
	onDownloadPdf,
}) => {
	const state = useFnsTaxCertificateState({
		isOpen,
		patient,
		clinicProfileDraft,
		payments,
		initialYear,
		onPrint,
		onClose,
	});

	if (!isOpen) return null;

	const handleDownloadPdf = () => {
		if (onDownloadPdf) {
			onDownloadPdf();
			return;
		}
		state.handlePrint();
	};

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="fns-tax-certificate-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Справка для налогового вычета (ФНС) · 13% НДФЛ"
		>
			<div className="relative w-full max-w-[880px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				<FnsTaxCertificateHeader
					patient={patient}
					selectedYear={state.selectedYear}
					isLoadingPreview={state.isLoadingPreview}
					isIssuingDoc={state.isIssuingDoc}
					totalNetRub={state.aggregated.totalNetRub}
					onSaveToRegistry={state.handleCreateAndIssueTaxDocument}
					onPrint={state.handlePrint}
					onDownloadPdf={handleDownloadPdf}
					onClose={onClose}
				/>

				<FnsTaxCertificateControls
					selectedYear={state.selectedYear}
					setSelectedYear={state.setSelectedYear}
					relationship={state.relationship}
					setRelationship={state.setRelationship}
					effectiveInn={state.effectiveInn}
					setTaxpayerInn={state.setTaxpayerInn}
					isInnValid={state.isInnValid}
					taxpayerFullName={state.taxpayerFullName}
					setTaxpayerFullName={state.setTaxpayerFullName}
					taxpayerBirthDate={state.taxpayerBirthDate}
					setTaxpayerBirthDate={state.setTaxpayerBirthDate}
				/>

				<FnsTaxCertificateSummary
					code01Rub={state.aggregated.code01Rub}
					eligibleCode01Rub={state.aggregated.eligibleCode01Rub}
					code02Rub={state.aggregated.code02Rub}
					estimatedRefund13Rub={state.aggregated.estimatedRefund13Rub}
				/>

				<FnsTaxCertificatePreview
					selectedYear={state.selectedYear}
					patient={patient}
					clinic={state.clinic}
					relationship={state.relationship}
					taxpayerFullName={state.taxpayerFullName}
					effectiveInn={state.effectiveInn}
					aggregated={state.aggregated}
				/>
			</div>
		</div>
	);
};

FnsTaxCertificateModal.displayName = "FnsTaxCertificateModal";
