import React from "react";
import type { BrandColorPalette, DocumentBrandingState } from "../../store/documentBrandingStore";

export interface PremiumPrintClinicHeaderProps {
	branding: DocumentBrandingState;
	palette: BrandColorPalette;
}

export const PremiumPrintClinicHeader: React.FC<PremiumPrintClinicHeaderProps> = ({
	branding,
	palette,
}) => {
	if (branding.headerStyle === "classic_centered") {
		return (
			<header className="doc-header-classic-centered">
				<div className="doc-brand-title">{branding.clinicName}</div>
				{branding.slogan && <div className="doc-brand-slogan">{branding.slogan}</div>}
				{branding.showClinicRequisites && (
					<div className="doc-clinic-meta mt-1">
						{branding.clinicLegalName} • Лицензия: {branding.licenseNumber}
						<br />
						{branding.clinicAddress} • Тел: {branding.clinicPhone} • {branding.clinicWebsite}
					</div>
				)}
			</header>
		);
	}

	if (branding.headerStyle === "minimal_clean") {
		return (
			<header className="doc-header-minimal-clean flex items-center justify-between">
				<div>
					<div className="doc-brand-title">{branding.clinicName}</div>
					<div className="doc-clinic-meta">{branding.clinicAddress}</div>
				</div>
				<div className="text-right doc-clinic-meta">
					Лицензия: {branding.licenseNumber}
					<br />
					Тел: {branding.clinicPhone}
				</div>
			</header>
		);
	}

	return (
		<header className="doc-header-modern-split">
			<div className="flex items-center gap-3">
				{branding.showClinicLogo && (
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-xs shrink-0"
						style={{ backgroundColor: palette.primary }}
					>
						{branding.logoUrl ? (
							<img src={branding.logoUrl} alt={branding.clinicName} className="w-full h-full object-contain rounded-xl" />
						) : (
							<span>D</span>
						)}
					</div>
				)}
				<div>
					<div className="doc-brand-title">{branding.clinicName}</div>
					{branding.slogan && <div className="doc-brand-slogan">{branding.slogan}</div>}
					<div className="doc-clinic-meta mt-0.5">{branding.clinicLegalName}</div>
				</div>
			</div>
			{branding.showClinicRequisites && (
				<div className="text-right doc-clinic-meta">
					<div className="font-semibold text-[var(--doc-primary-dark)]">Лицензия: {branding.licenseNumber}</div>
					<div>{branding.clinicAddress}</div>
					<div>Тел: <strong>{branding.clinicPhone}</strong> • {branding.clinicWebsite}</div>
				</div>
			)}
		</header>
	);
};
