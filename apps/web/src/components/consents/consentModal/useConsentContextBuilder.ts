import { useMemo } from "react";
import {
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	type ConsentTemplate,
	type ConsentTemplateKey,
	getAllConsentPackages,
	getAllConsentTemplates,
	getConsentPackage,
	getConsentTemplate,
	renderConsentTemplate,
} from "../consentTemplates.js";
import { generateConsentIntegrityHash } from "../signaturePadMath.js";
import {
	detectConsentScopeMismatch,
	type ConsentScopeMismatchResult,
} from "../consentSummaryHelper.js";
import {
	buildConsentSubstitutionContext,
	buildConsentBlankContext,
} from "./consentContextExtractor";
import type { InformedConsentModalProps, VerificationMethod, SignatureStroke, SignaturePoint } from "./types.js";

export function useConsentContextBuilder(
	props: InformedConsentModalProps,
	state: {
		activeMode: "packages" | "single";
		activePackageKey: ConsentPackageKey;
		activeKey: ConsentTemplateKey;
		previewTemplateKey: ConsentTemplateKey | null;
		isPrintingBlank: boolean;
		customDiagnosis: string;
		customTeeth: string;
		verificationMethod: VerificationMethod;
		strokes: SignatureStroke[];
		currentPoints: SignaturePoint[];
		smsOtpCode: string;
	},
) {
	const substitutionContext = useMemo<ConsentSubstitutionContext>(
		() => buildConsentSubstitutionContext(props, state.customDiagnosis, state.customTeeth),
		[props, state.customDiagnosis, state.customTeeth],
	);

	const printBlankContext = useMemo<ConsentSubstitutionContext>(
		() => buildConsentBlankContext(props),
		[props],
	);

	const effectiveContext = state.isPrintingBlank ? printBlankContext : substitutionContext;
	const allPackages = useMemo(() => getAllConsentPackages(), []);
	const allTemplates = useMemo(() => getAllConsentTemplates(true), []);
	const currentPackage = useMemo(() => getConsentPackage(state.activePackageKey), [state.activePackageKey]);

	const activeDocKey = useMemo<ConsentTemplateKey>(() => {
		if (state.activeMode === "packages") {
			if (state.previewTemplateKey && currentPackage.templateKeys.includes(state.previewTemplateKey)) {
				return state.previewTemplateKey;
			}
			return currentPackage.templateKeys[0] || "CONSENT_PERSONAL_DATA";
		}
		return state.activeKey;
	}, [state.activeMode, state.previewTemplateKey, currentPackage, state.activeKey]);

	const currentTemplate = useMemo<ConsentTemplate>(() => getConsentTemplate(activeDocKey), [activeDocKey]);
	const rendered = useMemo(() => renderConsentTemplate(currentTemplate, effectiveContext), [currentTemplate, effectiveContext]);

	const scopeMismatch = useMemo<ConsentScopeMismatchResult>(() => {
		const coveredKeys = state.activeMode === "packages" ? currentPackage.templateKeys : [activeDocKey];
		return detectConsentScopeMismatch({
			signedConsentKeys: coveredKeys,
			treatmentPlanText: state.customDiagnosis || props.diagnosisIcd,
			diagnosisText: state.customDiagnosis || props.diagnosisIcd,
			additionalProcedures: state.customTeeth || props.toothNumbers ? [state.customTeeth || props.toothNumbers || ""] : [],
		});
	}, [state.activeMode, currentPackage.templateKeys, activeDocKey, state.customDiagnosis, props.diagnosisIcd, state.customTeeth, props.toothNumbers]);

	const integrityRecord = useMemo(() => {
		return generateConsentIntegrityHash({
			documentText: rendered.fullTextContent,
			patientInfo: {
				name: substitutionContext.patientName,
				passportOrBirth: substitutionContext.passport || substitutionContext.birthDate,
				phone: substitutionContext.phone,
			},
			timestamp: Date.now(),
			strokes: state.verificationMethod === "tablet_stylus" ? state.strokes : [],
			verificationMethod: state.verificationMethod,
			smsOtpCode: null,
		});
	}, [rendered.fullTextContent, substitutionContext, state.strokes, state.verificationMethod]);

	const isSigningReady = useMemo(() => {
		if (state.verificationMethod === "tablet_stylus") {
			return state.strokes.length > 0 || state.currentPoints.length > 0;
		}
		if (state.verificationMethod === "sms_otp") {
			return Boolean(state.smsOtpCode && state.smsOtpCode.trim().length === 4);
		}
		return true;
	}, [state.verificationMethod, state.strokes.length, state.currentPoints.length, state.smsOtpCode]);

	return {
		substitutionContext,
		effectiveContext,
		allPackages,
		allTemplates,
		currentPackage,
		activeDocKey,
		currentTemplate,
		rendered,
		scopeMismatch,
		integrityRecord,
		isSigningReady,
	};
}
