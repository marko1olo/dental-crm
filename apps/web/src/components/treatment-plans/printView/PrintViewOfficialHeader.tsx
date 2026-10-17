import React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { PrintViewStamp } from "./PrintViewWatermark";

export interface PrintViewOfficialHeaderProps {
	readonly clinicName: string;
	readonly clinicLicense?: string | undefined;
	readonly clinicLegalName: string;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientId?: string | undefined;
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly todayRu: string;
	readonly effectiveWatermark: string;
	readonly stampColor: string;
}

export const PrintViewOfficialHeader: React.FC<PrintViewOfficialHeaderProps> = ({
	clinicName, clinicLicense, clinicLegalName, clinicInn, clinicOgrn, clinicAddress,
	doctorFullName, doctorSpecialty, patientName, patientBirthDate, patientPhone,
	patientId, selectedTier, getTierLetter, todayRu, effectiveWatermark, stampColor,
}) => (
	<>
		<div className="treatment-appendix-header">
			<div>
				<div className="font-bold text-sm uppercase">{clinicName}</div>
				<div className="text-xs text-slate-600">Лицензия: {clinicLicense}</div>
			</div>
			<div className="text-right">
				<div style={{ marginBottom: "2px" }}><PrintViewStamp text={effectiveWatermark} color={stampColor} /></div>
				<div className="font-bold text-xs">ПРИЛОЖЕНИЕ № 1</div>
				<div className="text-[10px] text-slate-600">к Договору на оказание платных медицинских услуг</div>
				<div className="text-[10px] text-slate-600">Дата: {todayRu} г.</div>
			</div>
		</div>

		<h3 className="treatment-appendix-title">СМЕТА И КОМПЛЕКСНЫЙ ПЛАН ЛЕЧЕНИЯ</h3>
		<div className="treatment-appendix-subtitle">
			План лечения: <strong>{selectedTier.title} ({getTierLetter(selectedTier.tierId)})</strong>
		</div>

		<div className="treatment-appendix-parties-grid">
			<div>
				<div className="font-bold border-b border-black pb-1 mb-1">ИСПОЛНИТЕЛЬ (КЛИНИКА):</div>
				<div>{clinicLegalName}</div>
				{(clinicInn || clinicOgrn) && (
					<div>{[clinicInn ? `ИНН: ${clinicInn}` : "", clinicOgrn ? `ОГРН: ${clinicOgrn}` : ""].filter(Boolean).join(" · ")}</div>
				)}
				{clinicAddress && <div>Адрес: {clinicAddress}</div>}
				{clinicLicense && <div>Лицензия: {clinicLicense}</div>}
				<div>Лечащий врач: {doctorFullName} ({doctorSpecialty})</div>
			</div>
			<div>
				<div className="font-bold border-b border-black pb-1 mb-1">ЗАКАЗЧИК (ПАЦИЕНТ):</div>
				<div>ФИО: <strong>{patientName || "_________________________________"}</strong></div>
				<div>Дата рождения: {patientBirthDate || "«___» _______ 19___ г."}</div>
				<div>Телефон: {patientPhone || "____________________"}</div>
				<div>Номер медицинской карты: {patientId || "____________________"}</div>
			</div>
		</div>
	</>
);
