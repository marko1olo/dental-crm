import React from "react";
import { ShieldCheck } from "lucide-react";
import { TreatmentPlanQrCode } from "./qr/TreatmentPlanQrCode";
import type { TreatmentPlanTier } from "./types";

export interface TreatmentPlanContractClinicPatientInfoProps {
	readonly clinicName: string;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly displayContractNumber: string;
	readonly todayRu: string;
	readonly qrPayload: string;
	readonly doctorFullName: string;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientId: string;
	readonly patientPhone?: string | undefined;
	readonly tier: TreatmentPlanTier;
}

export const TreatmentPlanContractClinicPatientInfo: React.FC<TreatmentPlanContractClinicPatientInfoProps> = (props) => {
	const { clinicName, clinicLegalName, clinicInn, clinicOgrn, clinicAddress, clinicLicense, displayContractNumber, todayRu, qrPayload, doctorFullName, patientName, patientBirthDate, patientId, patientPhone, tier } = props;

	return (
		<>
			{/* Top Header: Clinic & Patient Info */}
			<div className="flex items-start justify-between border-b pb-4 border-slate-300 gap-4">
				<div className="space-y-1 max-w-sm">
					<h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">{clinicName}</h1>
					<div className="text-[10px] text-slate-600 space-y-0.5">
						{clinicLegalName && <div className="font-semibold text-slate-800">{clinicLegalName}</div>}
						{(clinicInn || clinicOgrn) && (
							<div>
								{clinicInn && <span>ИНН: {clinicInn}</span>}
								{clinicInn && clinicOgrn && <span className="text-slate-400"> · </span>}
								{clinicOgrn && <span>ОГРН: {clinicOgrn}</span>}
							</div>
						)}
						{clinicAddress && <div>Адрес: {clinicAddress}</div>}
						{clinicLicense && <div>Лицензия: {clinicLicense}</div>}
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div className="text-right space-y-1">
						<div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-800">
							ДОГОВОР № {displayContractNumber}
						</div>
						<p className="text-[10px] text-slate-500 m-0">г. Москва · {todayRu} г.</p>
					</div>
					<div className="p-1.5 rounded-xl bg-white border border-slate-300 shadow-xs shrink-0 text-center">
						<TreatmentPlanQrCode value={qrPayload} size={64} />
					</div>
				</div>
			</div>

			{/* Document Title & Regulatory Compliance Strip */}
			<div className="text-center space-y-1.5 py-1">
				<div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
					<ShieldCheck size={12} className="text-teal-700" />
					<span>Клинические стандарты и протоколы СтАР</span>
				</div>
				<h2 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 m-0">
					Договор на оказание платных медицинских услуг и согласованный план лечения
				</h2>
				<p className="text-[10.5px] text-slate-500 m-0">
					В соответствии с утвержденными клиническими стандартами и Законом об охране здоровья граждан
				</p>
			</div>

			{/* Parties Details */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px]">
				<div>
					<strong className="text-slate-900 block mb-1">Исполнитель (Клиника):</strong>
					<p className="text-slate-700 m-0 leading-relaxed">
						{clinicLegalName} ({clinicName})<br />
						{clinicAddress && <>Адрес: {clinicAddress}<br /></>}
						Лечащий врач: <strong>{doctorFullName}</strong>
					</p>
				</div>
				<div>
					<strong className="text-slate-900 block mb-1">Пациент (Заказчик):</strong>
					<p className="text-slate-700 m-0 leading-relaxed">
						ФИО: <strong>{patientName}</strong><br />
						{patientBirthDate ? `Дата рождения: ${patientBirthDate}` : `Номер медкарты: ${patientId}`}<br />
						Телефон: {patientPhone}
					</p>
				</div>
			</div>

			{/* Section 1: Subject */}
			<div className="space-y-1.5">
				<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
					1. Предмет договора и согласованный вариант лечения
				</h3>
				<p className="text-slate-700 text-justify m-0">
					1.1. Исполнитель обязуется оказать Пациенту комплекс платных стоматологических услуг надлежащего качества по утвержденному варианту: <strong>«{tier.title}»</strong> ({tier.materialsHeadline}), а Пациент обязуется принять и оплатить медицинские услуги в порядке и на условиях, установленных настоящим Договором и приложениями к нему.
				</p>
				<p className="text-slate-700 text-justify m-0">
					1.2. До заключения Договора Пациент уведомлен о возможности получения бесплатной медицинской помощи в рамках государственных гарантий по полису ОМС в государственных и муниципальных учреждениях здравоохранения.
				</p>
			</div>
		</>
	);
};
