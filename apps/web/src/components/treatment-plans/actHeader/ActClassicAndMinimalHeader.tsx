/**
 * apps/web/src/components/treatment-plans/actHeader/ActClassicAndMinimalHeader.tsx
 *
 * Стили классической по центру и минималистичной шапки клиники.
 */

import React from "react";
import type { ActClinicHeaderProps } from "./ActClinicHeader";

export const ActClassicCenteredHeader: React.FC<ActClinicHeaderProps> = ({
	palette,
	clinicName,
	slogan,
	showClinicRequisites,
	legalName,
	inn,
	kpp,
	ogrn,
	address,
	license,
	phone,
	website,
	email,
}) => {
	return (
		<header
			className="doc-header-classic-centered border-b-2 pb-4 mb-4"
			style={{ borderColor: palette.primary }}
		>
			<div className="doc-brand-title text-xl font-extrabold" style={{ color: palette.primaryDark }}>
				{clinicName}
			</div>
			{slogan && (
				<div className="doc-brand-slogan text-xs text-slate-500 uppercase tracking-widest mt-1">
					{slogan}
				</div>
			)}
			{showClinicRequisites && (
				<div className="doc-clinic-meta text-[11px] text-slate-600 mt-2 leading-relaxed">
					<strong>{legalName}</strong> • ИНН: {inn} / КПП: {kpp} • ОГРН: {ogrn}
					<br />
					Лицензия на осуществление мед. деятельности: <strong>{license}</strong>
					<br />
					Адрес: {address} • Тел: <strong>{phone}</strong> • {website} • {email}
				</div>
			)}
		</header>
	);
};

export const ActMinimalCleanHeader: React.FC<ActClinicHeaderProps> = ({
	clinicName,
	legalName,
	inn,
	address,
	license,
	phone,
	website,
}) => {
	return (
		<header className="doc-header-minimal-clean flex items-start justify-between border-b pb-3 mb-4 border-slate-300">
			<div>
				<div className="doc-brand-title text-lg font-black text-slate-900">{clinicName}</div>
				<div className="doc-clinic-meta text-[11px] text-slate-600">
					{legalName} • ИНН: {inn} • {address}
				</div>
			</div>
			<div className="text-right doc-clinic-meta text-[11px] text-slate-600">
				<div>Лицензия: {license}</div>
				<div>Тел: <strong>{phone}</strong> • {website}</div>
			</div>
		</header>
	);
};
