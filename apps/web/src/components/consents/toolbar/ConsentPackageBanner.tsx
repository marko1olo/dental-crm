import { Package } from "lucide-react";
import React from "react";
import {
	type ConsentPackage,
	type ConsentTemplate,
	type ConsentTemplateKey,
	TEMPLATE_SHORT_TITLES,
} from "../consentTemplates.js";

export interface ConsentPackageBannerProps {
	currentPackage: ConsentPackage;
	activeDocKey: ConsentTemplateKey;
	setPreviewTemplateKey: (key: ConsentTemplateKey | null) => void;
	getConsentTemplate: (key: ConsentTemplateKey) => ConsentTemplate;
}

export const ConsentPackageBanner: React.FC<ConsentPackageBannerProps> = ({
	currentPackage,
	activeDocKey,
	setPreviewTemplateKey,
	getConsentTemplate,
}) => {
	return (
		<div className="consent-package-banner">
			<div className="consent-package-banner-title min-w-0 flex-1">
				<Package size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
				<div className="min-w-0 flex-1">
					<div className="font-bold text-sm text-[var(--teal-dark,#0f766e)]">
						{currentPackage.title} ({currentPackage.templateKeys.length} документа в пакете)
					</div>
					<div className="text-xs text-muted">
						{currentPackage.description}
					</div>
				</div>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-xs font-semibold text-muted mr-1">Просмотр бланка:</span>
				{currentPackage.templateKeys.map((k, idx) => {
					const t = getConsentTemplate(k);
					const isSelected = k === activeDocKey;
					return (
						<button
							key={k}
							type="button"
							className={`consent-subdoc-chip min-w-max ${isSelected ? "active" : ""}`}
							onClick={() => setPreviewTemplateKey(k)}
							title={`Просмотреть ${t.title}`}
						>
							<span className="font-semibold opacity-75 shrink-0">{idx + 1}.</span>
							<span className="whitespace-nowrap">{TEMPLATE_SHORT_TITLES[k] || t.title}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
