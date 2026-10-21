import React from "react";
import { ShieldCheck } from "lucide-react";

export interface ActPrintServicesTableWordsBannerProps {
	readonly servicesInWords: string;
}

export const ActPrintServicesTableWordsBanner: React.FC<ActPrintServicesTableWordsBannerProps> = ({
	servicesInWords,
}) => {
	return (
		<div className="p-2.5 bg-slate-50 border-x border-b border-slate-300 text-xs text-slate-800 rounded-b-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div>
				<strong>Сумма прописью:</strong> <em>{servicesInWords}</em>.{" "}
				<span className="text-[11px] text-slate-500">
					НДС не облагается в соответствии с пп. 2 п. 2 ст. 149 НК РФ
					(медицинские услуги).
				</span>
			</div>
			<div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-600 font-medium">
				<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
				<span>Гарантийный срок: до 12 мес. (ЗоЗПП РФ)</span>
			</div>
		</div>
	);
};
