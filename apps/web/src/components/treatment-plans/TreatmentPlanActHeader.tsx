/**
 * TreatmentPlanActHeader.tsx — Официальная шапка, реквизиты клиники и паспорта пациента
 * для печатной формы Акта сдачи-приемки оказанных стоматологических услуг.
 */

import { Building2, FileText } from "lucide-react";
import type React from "react";
import type { DocumentBrandColorPalette } from "../../store/documentBrandingStore";
import type { CompletedWorksActAndWriteOffData } from "./types";

export interface TreatmentPlanActHeaderProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly headerStyle: "modern_split" | "classic_centered" | "minimal_clean";
	readonly showClinicLogo: boolean;
	readonly logoUrl?: string | null | undefined;
	readonly showClinicRequisites: boolean;
	readonly clinicName: string;
	readonly slogan?: string;
	readonly legalName: string;
	readonly inn: string;
	readonly kpp: string;
	readonly ogrn: string;
	readonly address: string;
	readonly license: string;
	readonly phone: string;
	readonly website: string;
	readonly email: string;
	readonly patientDob: string;
	readonly patientGenderText: string;
	readonly patientPass: string;
	readonly patientRegAddress: string;
	readonly patientContactPhone: string;
	readonly patientSnilsVal: string;
	readonly patientOmsVal: string;
	readonly patientMedCard: string;
	readonly doctorSpec: string;
	readonly doctorSnilsVal: string;
	readonly contractDateFormatted: string;
}

export const TreatmentPlanActHeader: React.FC<TreatmentPlanActHeaderProps> = ({
	actData,
	palette,
	headerStyle,
	showClinicLogo,
	logoUrl,
	showClinicRequisites,
	clinicName,
	slogan,
	legalName,
	inn,
	kpp,
	ogrn,
	address,
	license,
	phone,
	website,
	email,
	patientDob,
	patientGenderText,
	patientPass,
	patientRegAddress,
	patientContactPhone,
	patientSnilsVal,
	patientOmsVal,
	patientMedCard,
	doctorSpec,
	doctorSnilsVal,
	contractDateFormatted,
}) => {
	return (
		<>
			{/* ── 1. Official Header with Clinic Details & Accreditation ── */}
			{headerStyle === "classic_centered" ? (
				<header
					className="doc-header-classic-centered border-b-2 pb-4 mb-4"
					style={{ borderColor: palette.primary }}
				>
					<div
						className="doc-brand-title text-xl font-extrabold"
						style={{ color: palette.primaryDark }}
					>
						{actData.clinicName || clinicName}
					</div>
					{slogan && (
						<div className="doc-brand-slogan text-xs text-slate-500 uppercase tracking-widest mt-1">
							{slogan}
						</div>
					)}
					{showClinicRequisites && (
						<div className="doc-clinic-meta text-[11px] text-slate-600 mt-2 leading-relaxed">
							<strong>{legalName}</strong> • ИНН: {inn} / КПП: {kpp} • ОГРН:{" "}
							{ogrn}
							<br />
							Лицензия на осуществление мед. деятельности:{" "}
							<strong>{license}</strong>
							<br />
							Адрес: {address} • Тел: <strong>{phone}</strong> • {website} •{" "}
							{email}
						</div>
					)}
				</header>
			) : headerStyle === "minimal_clean" ? (
				<header className="doc-header-minimal-clean flex items-start justify-between border-b pb-3 mb-4 border-slate-300">
					<div>
						<div className="doc-brand-title text-lg font-black text-slate-900">
							{actData.clinicName || clinicName}
						</div>
						<div className="doc-clinic-meta text-[11px] text-slate-600">
							{legalName} • ИНН: {inn} • {address}
						</div>
					</div>
					<div className="text-right doc-clinic-meta text-[11px] text-slate-600">
						<div>Лицензия: {license}</div>
						<div>
							Тел: <strong>{phone}</strong> • {website}
						</div>
					</div>
				</header>
			) : (
				/* Modern Magazine Split Header */
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
									<img
										src={logoUrl}
										alt={actData.clinicName || clinicName}
										className="w-full h-full object-contain rounded-2xl"
									/>
								) : (
									<Building2 className="w-8 h-8 text-white" />
								)}
							</div>
						)}
						<div>
							<div
								className="doc-brand-title text-xl font-black tracking-tight"
								style={{ color: palette.primaryDark }}
							>
								{actData.clinicName || clinicName}
							</div>
							{slogan && (
								<div className="doc-brand-slogan text-xs text-slate-500 font-semibold uppercase tracking-wider">
									{slogan}
								</div>
							)}
							<div className="doc-clinic-meta text-xs font-semibold text-slate-700 mt-0.5">
								{legalName}
							</div>
						</div>
					</div>
					{showClinicRequisites && (
						<div className="text-right doc-clinic-meta text-[11px] leading-tight text-slate-600 max-w-sm">
							<div
								className="font-bold text-slate-900"
								style={{ color: palette.primaryDark }}
							>
								Лицензия: {license}
							</div>
							<div className="mt-0.5">
								ИНН: {inn} • КПП: {kpp} • ОГРН: {ogrn}
							</div>
							<div className="mt-0.5">{address}</div>
							<div className="mt-0.5">
								Тел: <strong>{phone}</strong> • {website}
							</div>
						</div>
					)}
				</header>
			)}

			{/* ── 2. Official Document Identification Banner ── */}
			<div
				className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border mb-5 print:mb-3"
				style={{
					backgroundColor: palette.softBg,
					borderColor: palette.accentBorder,
				}}
			>
				<div className="flex items-center gap-2">
					<span
						className="px-3 py-1 rounded-lg font-mono font-bold text-white text-xs inline-flex items-center gap-1.5 shadow-xs"
						style={{ backgroundColor: palette.primaryDark }}
					>
						<FileText className="w-3.5 h-3.5" />
						<span>АКТ&nbsp;№&nbsp;{actData.actNumber}</span>
					</span>
					<span className="text-xs font-bold text-slate-800">
						к&nbsp;Договору на оказание платных медицинских услуг №&nbsp;
						{actData.contractNumber} от {contractDateFormatted}&nbsp;г.
					</span>
				</div>
				<div className="text-xs font-semibold text-slate-600">
					Дата составления:{" "}
					<strong className="text-slate-900 font-mono">
						{actData.actDate}&nbsp;г.
					</strong>
					{address ? ` (${address.split(",")[0]?.trim()})` : ""}
				</div>
			</div>

			{/* ── 3. Official Document Title Box ── */}
			<div className="doc-official-title-box text-center my-4 print:my-2">
				<h1
					className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900"
					style={{ color: palette.primaryDark }}
				>
					АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ
				</h1>
				<div className="doc-form-sub text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
					И НАКЛАДНАЯ НА СПИСАНИЕ МАТЕРИАЛОВ И МЕДИКАМЕНТОВ (ТМЦ) •
					ЭТАП&nbsp;№&nbsp;{actData.stageNumber} («
					{actData.stageTitle.replace(/^Этап\s*\d+\s*[:.—-]\s*/i, "")}»)
				</div>
				<p className="text-[10px] text-slate-500 mt-0.5">
					Составлен во исполнение ст.&nbsp;779–783 ГК&nbsp;РФ, ст.&nbsp;20, 79
					323-ФЗ и Постановления Правительства РФ от 11.05.2023 №&nbsp;736
				</p>
			</div>

			{/* ── 4. Patient Passport & Legal Requisites Matrix Grid ── */}
			<div className="mb-5 print:mb-3 overflow-hidden rounded-xl border border-slate-300 text-xs">
				<table className="w-full border-collapse text-left">
					<tbody>
						<tr className="border-b border-slate-300">
							<td className="w-1/4 p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Исполнитель (Клиника):
							</td>
							<td className="w-1/4 p-2.5 bg-white text-slate-900 border-r border-slate-300 leading-snug">
								<strong className="block text-slate-950 min-w-0 break-words">
									{legalName}
								</strong>
								<span className="text-[11px] text-slate-600 block mt-0.5">
									ИНН:&nbsp;{inn} / КПП:&nbsp;{kpp} • ОГРН:&nbsp;{ogrn}
								</span>
							</td>
							<td className="w-1/4 p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Пациент (Заказчик):
							</td>
							<td className="w-1/4 p-2.5 bg-white text-slate-900 leading-snug">
								<strong className="block text-slate-950">
									{actData.patientName}
								</strong>
								<span className="text-[11px] text-slate-600 block mt-0.5">
									Дата рожд.: {patientDob} ({patientGenderText})
								</span>
							</td>
						</tr>
						<tr className="border-b border-slate-300">
							<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Лицензия клиники:
							</td>
							<td className="p-2.5 bg-white text-slate-900 border-r border-slate-300 text-[11px] leading-snug">
								{license}
							</td>
							<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Паспортные данные:
							</td>
							<td className="p-2.5 bg-white text-slate-900 text-[11px] leading-snug">
								{patientPass}
							</td>
						</tr>
						<tr className="border-b border-slate-300">
							<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Лечащий врач (Исполнитель):
							</td>
							<td className="p-2.5 bg-white text-slate-900 border-r border-slate-300 leading-snug">
								<strong className="block text-slate-950">
									{actData.doctorFullName}
								</strong>
								<span className="text-[11px] text-slate-600 block mt-0.5">
									{doctorSpec} • СНИЛС: {doctorSnilsVal}
								</span>
							</td>
							<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Полис ОМС / СНИЛС / Контакт:
							</td>
							<td className="p-2.5 bg-white text-slate-900 text-[11px] leading-snug">
								<div>
									{patientOmsVal} • СНИЛС: {patientSnilsVal}
								</div>
								<div className="text-slate-600 mt-0.5">
									Тел: {patientContactPhone} • {patientRegAddress}
								</div>
							</td>
						</tr>
						<tr>
							<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								Основание и этап лечения:
							</td>
							<td className="p-2.5 bg-white text-slate-900 border-r border-slate-300 leading-snug">
								Договор № <strong>{actData.contractNumber}</strong> • План
								лечения
							</td>
							<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
								№ Медкарты / ID:
							</td>
							<td className="p-2.5 bg-white text-slate-900 font-mono font-bold leading-snug">
								{patientMedCard} (ID: {actData.patientId})
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</>
	);
};
