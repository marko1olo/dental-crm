import {
	printBlankConsentPackage,
	printFilledConsentPackage,
	printBlankConsentTemplate,
	printFilledConsentTemplate,
	type ConsentPackageKey,
	type ConsentTemplateKey,
	type ConsentSubstitutionContext,
} from "../consentTemplates.js";

export function executeConsentPrint(params: {
	activeMode: "packages" | "single";
	activePackageKey: ConsentPackageKey;
	activeDocKey: ConsentTemplateKey;
	effectiveContext: ConsentSubstitutionContext;
	isClosedOrSigned: boolean;
	effectiveWatermark: string;
}): void {
	if (params.activeMode === "packages") {
		printFilledConsentPackage(params.activePackageKey, params.effectiveContext, {
			isSigned: params.isClosedOrSigned,
			watermarkText: params.effectiveWatermark,
		});
	} else {
		printFilledConsentTemplate(params.activeDocKey, params.effectiveContext, {
			isSigned: params.isClosedOrSigned,
			watermarkText: params.effectiveWatermark,
		});
	}
}

export function executeConsentBlankPrint(params: {
	activeMode: "packages" | "single";
	activePackageKey: ConsentPackageKey;
	activeDocKey: ConsentTemplateKey;
	clinicProps: {
		clinicName?: string | null | undefined;
		clinicLegalName?: string | null | undefined;
		clinicAddress?: string | null | undefined;
		clinicOgrn?: string | null | undefined;
		licenseNumber?: string | null | undefined;
	};
}): void {
	const blankParams = {
		clinicName: params.clinicProps.clinicName ?? null,
		clinicLegalName: params.clinicProps.clinicLegalName ?? null,
		clinicAddress: params.clinicProps.clinicAddress ?? null,
		clinicOgrn: params.clinicProps.clinicOgrn ?? null,
		licenseNumber: params.clinicProps.licenseNumber ?? null,
	};
	if (params.activeMode === "packages") {
		printBlankConsentPackage(params.activePackageKey, blankParams);
	} else {
		printBlankConsentTemplate(params.activeDocKey, blankParams);
	}
}
