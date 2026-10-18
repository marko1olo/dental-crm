/**
 * apps/web/src/components/billing/receiptPreview/ReceiptTapeHeader.tsx
 *
 * 80mm Tape Header requisites (54-FZ mandatory requisites).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";

interface ReceiptTapeHeaderProps {
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly clinicAddress: string;
	readonly taxationSystemName: string;
	readonly receiptNumber: string;
	readonly shiftNumber: number;
	readonly effectiveDate: string;
	readonly cashierFullName: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly isPrecheck: boolean;
}

export const ReceiptTapeHeader: React.FC<ReceiptTapeHeaderProps> = ({
	clinicLegalName,
	clinicInn,
	clinicKpp,
	clinicAddress,
	taxationSystemName,
	receiptNumber,
	shiftNumber,
	effectiveDate,
	cashierFullName,
	patientName,
	patientPhone,
	isPrecheck,
}) => {
	return (
		<div className="space-y-1.5 text-center pb-2.5 border-b border-dashed border-slate-400 font-mono text-xs text-slate-900">
			<div className="font-extrabold text-sm uppercase tracking-tight text-slate-950">
				{clinicLegalName}
			</div>
			<div className="text-[10px] text-slate-700 leading-tight">
				{clinicAddress}
			</div>
			<div className="text-[10px] text-slate-700 flex justify-center gap-3">
				<span>ИНН: {clinicInn}</span>
				{clinicKpp && <span>КПП: {clinicKpp}</span>}
			</div>
			<div className="text-[10px] text-slate-700">
				СНО: {taxationSystemName}
			</div>

			<div className="pt-1.5">
				<div className="font-bold text-xs uppercase tracking-wide">
					{isPrecheck ? "ПРЕДВАРИТЕЛЬНЫЙ СЧЕТ (ПРЕЧЕК)" : "КАССОВЫЙ ЧЕК / ПРИХОД"}
				</div>
				<div className="flex justify-between text-[10px] text-slate-700 pt-0.5">
					<span>ПРИЗНАК РАСЧЕТА:</span>
					<span className="font-semibold text-slate-950">ПОЛНЫЙ РАСЧЕТ</span>
				</div>
				<div className="flex justify-between text-[10px] text-slate-700 pt-0.5">
					<span>Чек № {receiptNumber}</span>
					<span>Смена № {shiftNumber}</span>
				</div>
				<div className="text-[10px] text-slate-600 text-left pt-0.5">
					Дата: {effectiveDate}
				</div>
			</div>

			<div className="pt-1 text-left text-[10px] text-slate-700 border-t border-slate-200">
				<div>Кассир: <strong className="text-slate-900">{cashierFullName}</strong></div>
				{patientName && (
					<div className="truncate">
						Пациент: <strong className="text-slate-900">{patientName}</strong>
						{patientPhone ? ` (${patientPhone})` : ""}
					</div>
				)}
			</div>
		</div>
	);
};
