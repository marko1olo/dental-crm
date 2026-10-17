import React from "react";
import type { FastImplantPassportData } from "../presets/implantPresetTypes";

export const ImplantPassportClinicalGrid: React.FC<{
	readonly data: FastImplantPassportData;
	readonly displayPatientName: string;
	readonly displayDoctor: string;
	readonly formattedDate: string;
	readonly capTypeRu: string;
}> = ({ data, displayPatientName, displayDoctor, formattedDate, capTypeRu }) => {
	const torqueText = data.torqueNcm ? `${data.torqueNcm} Н·см` : "35 Н·см (клиническая норма)";
	const isqText = data.isqDay0 ? `${data.isqDay0} ISQ` : "72 ISQ (первичная фиксация)";

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Пациент:</span>
				<strong className="font-extrabold text-[var(--ink)] block truncate" title={displayPatientName}>
					{displayPatientName}
				</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Лечащий хирург:</span>
				<strong className="font-extrabold text-[var(--ink)] block truncate" title={displayDoctor}>
					{displayDoctor}
				</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Дата операции:</span>
				<strong className="font-extrabold text-[var(--ink)] block">{formattedDate}</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Система:</span>
				<strong className="font-extrabold text-[var(--teal,#0d9488)] block truncate">
					{data.brand} {data.model}
				</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Типоразмер:</span>
				<strong className="font-extrabold text-[var(--ink)] block font-mono">
					Ø {data.diameterMm} × {data.lengthMm} мм
				</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Первичный торк:</span>
				<strong className="font-extrabold text-[var(--ink)] block font-mono">
					{torqueText}
				</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Стабильность ISQ:</span>
				<strong className="font-extrabold text-[var(--teal,#0d9488)] block font-mono">
					{isqText}
				</strong>
			</div>
			<div className="min-w-0">
				<span className="text-[11px] text-[var(--muted)] block">Формирователь:</span>
				<strong className="font-extrabold text-[var(--ink)] block truncate" title={capTypeRu}>
					{capTypeRu}
				</strong>
			</div>
		</div>
	);
};
