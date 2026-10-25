import React from "react";

export interface PrintViewHeaderProps {
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicLicense: string;
	readonly effectivePlanNumber: string;
	readonly todayRu: string;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
}

export const PrintViewHeader: React.FC<PrintViewHeaderProps> = ({
	clinicName,
	clinicLegalName,
	clinicInn,
	clinicAddress,
	clinicPhone,
	clinicLicense,
	effectivePlanNumber,
	todayRu,
	patientName,
	patientBirthDate,
	patientPhone,
	doctorFullName,
	doctorSpecialty,
}) => {
	return (
		<div className="relative z-10 space-y-4">
			<div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
				<div>
					<h1 className="text-xl font-bold tracking-tight text-slate-900">{clinicName}</h1>
					<div className="text-xs text-slate-600 mt-1 space-y-0.5">
						<div>{clinicLegalName} · ИНН {clinicInn}</div>
						<div>{clinicAddress} · Тел: {clinicPhone}</div>
						<div>Лицензия на медицинскую деятельность: {clinicLicense}</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-lg font-black text-slate-900">СМЕТА К ПЛАНУ ЛЕЧЕНИЯ</div>
					<div className="text-xs font-bold text-teal-700 mt-0.5">№ {effectivePlanNumber}</div>
					<div className="text-xs text-slate-500 mt-1">от {todayRu}</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
				<div>
					<span className="text-slate-500 font-medium">Пациент: </span>
					<strong className="text-slate-900">{patientName}</strong>
					{patientBirthDate && <span className="text-slate-600"> ({patientBirthDate})</span>}
					{patientPhone && <div className="text-slate-600 mt-0.5">Тел: {patientPhone}</div>}
				</div>
				<div>
					<span className="text-slate-500 font-medium">Лечащий врач: </span>
					<strong className="text-slate-900">{doctorFullName}</strong>
					<div className="text-slate-600 mt-0.5">{doctorSpecialty}</div>
				</div>
			</div>
		</div>
	);
};
