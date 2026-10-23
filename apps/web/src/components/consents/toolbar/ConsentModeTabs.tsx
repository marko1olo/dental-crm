import { FileText, Layers } from "lucide-react";
import React from "react";
import {
	type ConsentPackage,
	type ConsentPackageKey,
	type ConsentTemplate,
	type ConsentTemplateKey,
	PACKAGE_SHORT_TITLES,
	TEMPLATE_SHORT_TITLES,
} from "../consentTemplates.js";

export interface ConsentModeTabsProps {
	activeMode: "packages" | "single";
	setActiveMode: (mode: "packages" | "single") => void;
	activePackageKey: ConsentPackageKey;
	setActivePackageKey: (key: ConsentPackageKey) => void;
	activeKey: ConsentTemplateKey;
	setActiveKey: (key: ConsentTemplateKey) => void;
	setPreviewTemplateKey: (key: ConsentTemplateKey | null) => void;
	allPackages: ConsentPackage[];
	allTemplates: ConsentTemplate[];
}

export const ConsentModeTabs: React.FC<ConsentModeTabsProps> = ({
	activeMode,
	setActiveMode,
	activePackageKey,
	setActivePackageKey,
	activeKey,
	setActiveKey,
	setPreviewTemplateKey,
	allPackages,
	allTemplates,
}) => {
	return (
		<div className="consent-toolbar-row">
			<div className="consent-mode-segmented dente-segmented-bar">
				<button
					type="button"
					className={`consent-mode-btn dente-segmented-item ${activeMode === "packages" ? "active" : ""}`}
					onClick={() => {
						setActiveMode("packages");
						setPreviewTemplateKey(null);
					}}
					data-testid="tab-mode-packages"
					aria-pressed={activeMode === "packages"}
				>
					<Layers size={13} />
					<span>Пакеты согласий</span>
				</button>
				<button
					type="button"
					className={`consent-mode-btn dente-segmented-item ${activeMode === "single" ? "active" : ""}`}
					onClick={() => setActiveMode("single")}
					data-testid="tab-mode-single"
					aria-pressed={activeMode === "single"}
				>
					<FileText size={13} />
					<span>Отдельные согласия</span>
				</button>
			</div>

			<nav
				className="consent-tabs-scroll min-w-0"
				aria-label={activeMode === "packages" ? "Пакеты согласий" : "Шаблоны согласий"}
			>
				{activeMode === "packages"
					? allPackages.map((pkg) => {
							const isActive = pkg.key === activePackageKey;
							const titleText = PACKAGE_SHORT_TITLES[pkg.key] || pkg.title;
							return (
								<button
									key={pkg.key}
									type="button"
									className={`consent-tab-btn shrink-0 flex-shrink-0 min-w-max ${isActive ? "active" : ""}`}
									onClick={() => {
										setActivePackageKey(pkg.key);
										setPreviewTemplateKey(null);
									}}
									aria-selected={isActive}
									data-testid={`pkg-tab-${pkg.key}`}
									title={titleText}
								>
									<span className="whitespace-nowrap">{titleText}</span>
								</button>
							);
					  })
					: allTemplates.map((tpl) => {
							const isActive = tpl.key === activeKey;
							const titleText = TEMPLATE_SHORT_TITLES[tpl.key] || tpl.title;
							return (
								<button
									key={tpl.key}
									type="button"
									className={`consent-tab-btn shrink-0 flex-shrink-0 min-w-max ${isActive ? "active" : ""}`}
									onClick={() => setActiveKey(tpl.key)}
									aria-selected={isActive}
									data-testid={`tpl-tab-${tpl.key}`}
									title={titleText}
								>
									<span className="whitespace-nowrap">{titleText}</span>
								</button>
							);
					  })}
			</nav>
		</div>
	);
};
