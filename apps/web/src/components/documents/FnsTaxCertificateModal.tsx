import React from "react";
import { Download, FileCheck, Printer } from "lucide-react";
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
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="fns-tax-certificate-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Справка для налогового вычета (ФНС) · 13% НДФЛ"
		>
			<div className="relative w-full max-w-[880px] max-h-[92dvh] sm:max-h-[90vh] bg-[var(--paper)] text-[var(--ink)] rounded-t-[24px] sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col overflow-hidden">
				{/* Apple HIG Tactile Drag Handle (Mobile only, 36x5px) */}
				<div
					className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
					onClick={onClose}
					aria-label="Закрыть свайпом"
				>
					<div className="w-9 h-[5px] rounded-full bg-[var(--line-strong,#94a3b8)]" />
				</div>

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

				<div className="overflow-y-auto flex-1">
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

				{/* Mobile Sticky Thumb Bar (Natural Thumb Zone, Apple HIG, Mandates 8e, 8am, 8ze) */}
				<div
					className="sm:hidden p-3 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
					data-testid="tax-cert-mobile-thumb-bar"
				>
					<button
						type="button"
						onClick={state.handlePrint}
						className="primary-button w-full min-h-[44px] h-11 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] transition-transform"
						data-testid="tax-cert-mobile-print-btn"
						title={
							state.aggregated.totalNetRub === 0
								? "Распечатать бланк справки со строками _______ (Мандат 8e)"
								: "Распечатать справку для налогового вычета"
						}
					>
						<Printer size={16} aria-hidden="true" />
						<span>Печать справки</span>
					</button>

					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={handleDownloadPdf}
							className="secondary-button min-h-[44px] h-10 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
							data-testid="tax-cert-mobile-pdf-btn"
							title={state.aggregated.totalNetRub === 0 ? "Экспорт бланка справки в PDF (Мандат 8e)" : "Экспорт в PDF"}
						>
							<Download size={14} aria-hidden="true" />
							<span>PDF</span>
						</button>

						{patient?.id && (
							<button
								type="button"
								onClick={state.handleCreateAndIssueTaxDocument}
								disabled={state.isIssuingDoc}
								className="secondary-button min-h-[44px] h-10 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98] transition-transform"
								data-testid="tax-cert-mobile-save-registry-btn"
								title="Зарегистрировать справку в реестре документов клиники"
							>
								<FileCheck size={14} aria-hidden="true" />
								<span>{state.isIssuingDoc ? "Сохранение..." : "В реестр"}</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

FnsTaxCertificateModal.displayName = "FnsTaxCertificateModal";
