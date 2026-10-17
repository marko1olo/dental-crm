import React from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { formatWarrantyYearsText, type TreatmentPlanTier, type TreatmentPlanTierId } from "../types";
import { PrintViewStamp } from "./PrintViewWatermark";

export interface PrintViewPatientHeaderProps {
	readonly clinicName: string;
	readonly clinicLicense?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly effectiveWatermark: string;
	readonly stampColor: string;
	readonly displayContractNumber: string;
	readonly todayRu: string;
	readonly patientName: string;
	readonly patientId?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly planAgeDays?: number | undefined;
}

export const PrintViewPatientHeader: React.FC<PrintViewPatientHeaderProps> = ({
	clinicName, clinicLicense, clinicPhone, effectiveWatermark, stampColor,
	displayContractNumber, todayRu, patientName, patientId, patientPhone,
	doctorFullName, doctorSpecialty, selectedTier, getTierLetter, planAgeDays = 0,
}) => (
	<>
		<div className="patient-estimate-header">
			<div>
				<div className="text-base font-black uppercase text-teal-800 tracking-tight">{clinicName}</div>
				<div className="text-xs text-slate-500">Лицензия: {clinicLicense}{clinicPhone ? ` · Тел: ${clinicPhone}` : ""}</div>
			</div>
			<div className="text-right">
				<div style={{ marginBottom: "2px" }}><PrintViewStamp text={effectiveWatermark} color={stampColor} /></div>
				<div className="patient-estimate-title-main">Смета и план лечения</div>
				<div className="text-xs text-slate-500">Договор № <strong>{displayContractNumber}</strong> от {todayRu} г.</div>
			</div>
		</div>

		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs">
			<div>
				<span className="text-slate-500 block text-[10.5px]">Пациент:</span>
				<strong className="text-slate-900 text-sm">{patientName}</strong>
				<div className="text-slate-500 text-[10.5px] mt-0.5">Номер медкарты: {patientId}{patientPhone ? ` · Тел: ${patientPhone}` : ""}</div>
			</div>
			<div>
				<span className="text-slate-500 block text-[10.5px]">Лечащий врач:</span>
				<strong className="text-slate-900 text-sm">{doctorFullName}</strong>
				<div className="text-slate-500 text-[10.5px] mt-0.5">{doctorSpecialty}</div>
			</div>
			<div>
				<span className="text-slate-500 block text-[10.5px]">Выбранный вариант:</span>
				<strong className="text-teal-800 text-sm">{selectedTier.title} ({getTierLetter(selectedTier.tierId)})</strong>
				<div className="text-emerald-700 font-bold text-[10.5px] mt-0.5 inline-flex items-center gap-1">
					<ShieldCheck size={12} className="shrink-0 text-emerald-600" />
					<span>Гарантия клиники: {formatWarrantyYearsText(selectedTier.warrantyYears)}</span>
				</div>
			</div>
		</div>

		{planAgeDays > 30 && (
			<div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold mb-4 flex items-center gap-2">
				<Clock size={15} className="text-amber-600 shrink-0" />
				<span>План составлен более 30 дней назад, цены могут быть скорректированы. Стоимость зафиксирована по согласованию с лечащим врачом. Оказание услуг, оформление нарядов в ЗТЛ и оплата производятся без ограничений.</span>
			</div>
		)}
	</>
);
