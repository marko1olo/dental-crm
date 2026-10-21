/**
 * apps/web/src/components/treatment-plans/actHeader/ActClinicHeader.tsx
 *
 * Шапка клиники в Акте: современная разметка с логотипом и делегирование в классический/минимальный вид.
 */

import React from "react";
import { Building2 } from "lucide-react";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore";
import { ActClassicCenteredHeader, ActMinimalCleanHeader } from "./ActClassicAndMinimalHeader";

export interface ActClinicHeaderProps {
	readonly headerStyle: "modern_split" | "classic_centered" | "minimal_clean";
	readonly palette: DocumentBrandColorPalette;
	readonly clinicName: string;
	readonly slogan?: string | undefined;
	readonly showClinicLogo: boolean;
	readonly logoUrl?: string | null | undefined;
	readonly showClinicRequisites: boolean;
	readonly legalName: string;
	readonly inn: string;
	readonly kpp: string;
	readonly ogrn: string;
	readonly address: string;
	readonly license: string;
	readonly phone: string;
	readonly website: string;
	readonly email: string;
}

export const ActClinicHeader: React.FC<ActClinicHeaderProps> = (props) => {
	const {
		headerStyle,
		palette,
		clinicName,
		slogan,
		showClinicLogo,
		logoUrl,
		showClinicRequisites,
		legalName,
		inn,
		kpp,
		ogrn,
		address,
		license,
		phone,
		website,
	} = props;

	if (headerStyle === "classic_centered") {
		return <ActClassicCenteredHeader {...props} />;
	}

	if (headerStyle === "minimal_clean") {
		return <ActMinimalCleanHeader {...props} />;
	}

	return (
		<header
			className="doc-header-modern-split flex items-start justify-between border-b-2 pb-4 mb-4"
			style={{ borderColor: palette.primary }}
		>
			<div className="flex items-center gap-3.5">
				{showClinicLogo && (
					<div
						className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-sm shrink-0 border border-white/20"
						style={{ backgroundColor: palette.primary }}
					>
						{logoUrl ? (
							<img src={logoUrl} alt={clinicName} className="w-full h-full object-contain rounded-2xl" />
						) : (
							<Building2 className="w-8 h-8 text-white" />
						)}
					</div>
				)}
				<div>
					<div className="doc-brand-title text-xl font-black tracking-tight" style={{ color: palette.primaryDark }}>
						{clinicName}
					</div>
					{slogan && (
						<div className="doc-brand-slogan text-xs text-slate-500 font-semibold uppercase tracking-wider">
							{slogan}
						</div>
					)}
					<div className="doc-clinic-meta text-xs font-semibold text-slate-700 mt-0.5">{legalName}</div>
				</div>
			</div>
			{showClinicRequisites && (
				<div className="text-right doc-clinic-meta text-[11px] leading-tight text-slate-600 max-w-sm">
					<div className="font-bold text-slate-900" style={{ color: palette.primaryDark }}>
						Лицензия: {license}
					</div>
					<div className="mt-0.5">ИНН: {inn} • КПП: {kpp} • ОГРН: {ogrn}</div>
					<div className="mt-0.5">{address}</div>
					<div className="mt-0.5">Тел: <strong>{phone}</strong> • {website}</div>
				</div>
			)}
		</header>
	);
};
