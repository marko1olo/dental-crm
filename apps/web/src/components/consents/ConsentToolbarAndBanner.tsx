import React from "react";
import type {
	ConsentPackage,
	ConsentPackageKey,
	ConsentSubstitutionContext,
	ConsentTemplate,
	ConsentTemplateKey,
} from "./consentTemplates.js";
import { ConsentModeTabs } from "./toolbar/ConsentModeTabs";
import { ConsentPackageBanner } from "./toolbar/ConsentPackageBanner";
import { ConsentMetaGrid } from "./toolbar/ConsentMetaGrid";

export interface ConsentToolbarAndBannerProps {
	activeMode: "packages" | "single";
	setActiveMode: (mode: "packages" | "single") => void;
	activePackageKey: ConsentPackageKey;
	setActivePackageKey: (key: ConsentPackageKey) => void;
	activeKey: ConsentTemplateKey;
	setActiveKey: (key: ConsentTemplateKey) => void;
	activeDocKey: ConsentTemplateKey;
	setPreviewTemplateKey: (key: ConsentTemplateKey | null) => void;
	allPackages: ConsentPackage[];
	allTemplates: ConsentTemplate[];
	currentPackage: ConsentPackage;
	getConsentTemplate: (key: ConsentTemplateKey) => ConsentTemplate;
	substitutionContext: ConsentSubstitutionContext;
}

export const ConsentToolbarAndBanner: React.FC<ConsentToolbarAndBannerProps> = ({
	activeMode,
	setActiveMode,
	activePackageKey,
	setActivePackageKey,
	activeKey,
	setActiveKey,
	activeDocKey,
	setPreviewTemplateKey,
	allPackages,
	allTemplates,
	currentPackage,
	getConsentTemplate,
	substitutionContext,
}) => {
	return (
		<>
			<ConsentModeTabs
				activeMode={activeMode}
				setActiveMode={setActiveMode}
				activePackageKey={activePackageKey}
				setActivePackageKey={setActivePackageKey}
				activeKey={activeKey}
				setActiveKey={setActiveKey}
				setPreviewTemplateKey={setPreviewTemplateKey}
				allPackages={allPackages}
				allTemplates={allTemplates}
			/>

			{activeMode === "packages" && (
				<ConsentPackageBanner
					currentPackage={currentPackage}
					activeDocKey={activeDocKey}
					setPreviewTemplateKey={setPreviewTemplateKey}
					getConsentTemplate={getConsentTemplate}
				/>
			)}

			<ConsentMetaGrid substitutionContext={substitutionContext} />
		</>
	);
};
