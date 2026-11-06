/**
 * apps/web/src/components/documents/studio/DocumentsPackageSelector.tsx
 *
 * Селектор канонических пакетов документов клиники РФ (Мандаты 8e, 8n, 8x).
 * Отображает 4 ключевых пакета и подкатегории согласий без советского канцелярита.
 */

import React from "react";
import {
	CANONICAL_CLINIC_PACKAGES,
	type ConsentSubKind,
	type DocumentPackageKey,
} from "../documentsCatalogData";

export interface DocumentsPackageSelectorProps {
	readonly activePackage: DocumentPackageKey;
	readonly onSelectPackage: (pkgKey: DocumentPackageKey) => void;
	readonly activeConsentSubKind: ConsentSubKind;
	readonly onSelectConsentSubKind: (subKind: ConsentSubKind) => void;
	readonly taxYear?: number;
	readonly onSelectTaxYear?: (year: number) => void;
}

const CONSENT_SUB_KINDS: readonly { id: ConsentSubKind; label: string }[] = [
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "implant", label: "Имплантация" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "anesthesia", label: "Анестезия" },
];

export const DocumentsPackageSelector: React.FC<DocumentsPackageSelectorProps> = ({
	activePackage,
	onSelectPackage,
	activeConsentSubKind,
	onSelectConsentSubKind,
	taxYear = 2026,
	onSelectTaxYear,
}) => {
	return (
		<div>
			<div className="dente-docs-section-label">Канонические пакеты приёма</div>
			<div className="dente-docs-package-list">
				{CANONICAL_CLINIC_PACKAGES.map((pkg) => {
					const isActive = activePackage === pkg.id;
					return (
						<div
							key={pkg.id}
							onClick={() => onSelectPackage(pkg.id)}
							className={`dente-docs-package-card ${isActive ? "is-active" : ""}`}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onSelectPackage(pkg.id);
								}
							}}
						>
							<div className="dente-docs-package-header">
								<span className="dente-docs-package-title">{pkg.titleRu}</span>
								<span className="dente-docs-package-badge">{pkg.badgeRu}</span>
							</div>
							<p className="dente-docs-package-desc">{pkg.descriptionRu}</p>

							{/* Подкатегории для согласий */}
							{pkg.id === "informed_consent" && isActive && (
								<div className="dente-docs-subkind-chips">
									{CONSENT_SUB_KINDS.map((sub) => (
										<button
											key={sub.id}
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onSelectConsentSubKind(sub.id);
											}}
											className={`dente-subkind-chip ${activeConsentSubKind === sub.id ? "is-active" : ""}`}
										>
											{sub.label}
										</button>
									))}
								</div>
							)}

							{/* Экспресс-выбор налогового периода (год 2025/2026) для справки ФНС (Мандат 8n) */}
							{pkg.id === "tax_certificate" && isActive && (
								<div className="dente-docs-subkind-chips" data-testid="tax-year-chips">
									{[2025, 2026].map((yr) => (
										<button
											key={yr}
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onSelectTaxYear?.(yr);
											}}
											className={`dente-subkind-chip ${taxYear === yr ? "is-active" : ""}`}
											title={`Сформировать справку ФНС за ${yr} год`}
										>
											{yr} год
										</button>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

DocumentsPackageSelector.displayName = "DocumentsPackageSelector";
