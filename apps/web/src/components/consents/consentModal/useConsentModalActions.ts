import { executeSigning } from "./consentSigningExecutor.js";
import { downloadConsentAsPdfA } from "./useConsentModalPdfA";
import { executeConsentPrint, executeConsentBlankPrint } from "./useConsentPrintActions";
import { copyPatientSummaryToClipboard } from "./copySummaryAction";
import type { useConsentModalState } from "./useConsentModalState";
import type { useConsentContextBuilder } from "./useConsentContextBuilder";
import type { InformedConsentModalProps, VerificationMethod } from "./types.js";

export function useConsentModalActions(
	props: InformedConsentModalProps,
	state: ReturnType<typeof useConsentModalState>,
	builder: ReturnType<typeof useConsentContextBuilder>,
	isClosedOrSigned: boolean,
	effectiveWatermark: string,
) {
	const handleDownloadPdfA = () => {
		downloadConsentAsPdfA({
			verificationMethod: state.verificationMethod,
			strokes: state.strokes,
			effectiveContext: builder.effectiveContext,
			substitutionContext: builder.substitutionContext,
			patient: props.patient,
			paperScanFile: state.paperScanFile,
			integrityHash: builder.integrityRecord.hash,
			rendered: builder.rendered,
			currentTemplate: builder.currentTemplate,
			clinicPhone: props.clinicPhone || "",
		});
	};

	const handleCopyHash = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(builder.integrityRecord.hash);
			state.setCopiedHash(true);
			setTimeout(() => state.setCopiedHash(false), 2000);
		}
	};

	const handleCopyPatientSummary = () => {
		return copyPatientSummaryToClipboard({
			activeMode: state.activeMode,
			patient: props.patient,
			substitutionContext: builder.substitutionContext,
			doctorName: props.doctorName,
			doctorSpecialty: props.doctorSpecialty,
			effectiveDoctorName: builder.effectiveContext.doctorName,
			clinicName: props.clinicName,
			clinicLegalName: props.clinicLegalName,
			clinicPhone: props.clinicPhone,
			customTeeth: state.customTeeth,
			toothNumbers: props.toothNumbers,
			customDiagnosis: state.customDiagnosis,
			diagnosisIcd: props.diagnosisIcd,
			activePackageKey: state.activePackageKey,
			activeDocKey: builder.activeDocKey,
			integrityHash: builder.integrityRecord.hash,
		});
	};

	const handlePrint = () => {
		executeConsentPrint({
			activeMode: state.activeMode,
			activePackageKey: state.activePackageKey,
			activeDocKey: builder.activeDocKey,
			effectiveContext: builder.effectiveContext,
			isClosedOrSigned,
			effectiveWatermark,
		});
	};

	const handlePrintBlank = () => {
		executeConsentBlankPrint({
			activeMode: state.activeMode,
			activePackageKey: state.activePackageKey,
			activeDocKey: builder.activeDocKey,
			clinicProps: props,
		});
	};

	const handleConfirmSign = async (forcedMethod?: VerificationMethod) => {
		if (state.isSubmitting) return;
		state.setIsSubmitting(true);
		try {
			await executeSigning({
				effectiveMethod: forcedMethod || state.verificationMethod,
				strokes: state.strokes,
				currentPoints: state.currentPoints,
				smsOtpCode: state.smsOtpCode,
				paperScanFile: state.paperScanFile,
				substitutionContext: builder.substitutionContext,
				effectiveContext: builder.effectiveContext,
				patient: props.patient,
				patientId: props.patientId || props.patient?.id,
				visitId: props.visitId,
				integrityRecord: builder.integrityRecord,
				activeMode: state.activeMode,
				currentPackage: builder.currentPackage,
				activeDocKey: builder.activeDocKey,
				currentTemplate: builder.currentTemplate,
				rendered: builder.rendered,
				onConsentSigned: props.onConsentSigned,
				onPackageSigned: props.onPackageSigned,
				onConsentConfirmed: props.onConsentConfirmed,
				onClose: props.onClose,
			});
		} finally {
			state.setIsSubmitting(false);
		}
	};

	return {
		handleDownloadPdfA,
		handleCopyHash,
		handleCopyPatientSummary,
		handlePrint,
		handlePrintBlank,
		handleConfirmSign,
	};
}
