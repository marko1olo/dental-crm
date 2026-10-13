/**
 * DENTE CRM — Patient Header Allergies & Somatic Alert Banners
 * (DOMAIN: Mandate 8e Clinical Safety, Stop-Factors & Allergy Alerts)
 */

import React from "react";
import { AlertOctagon, HeartPulse } from "lucide-react";
import type { SomaticFlagItem } from "./patientHeaderTypes";

export interface PatientHeaderAllergiesAlertProps {
	allergyText: string;
	criticalSomaticFlags: SomaticFlagItem[];
}

export const PatientHeaderAllergiesAlert: React.FC<PatientHeaderAllergiesAlertProps> = ({
	allergyText,
	criticalSomaticFlags,
}) => {
	if (!allergyText && criticalSomaticFlags.length === 0) {
		return null;
	}

	return (
		<>
			{/* Dedicated Allergy Alert Banner (Мандат безопасности 8e) */}
			{allergyText && (
				<div
					className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-600 text-rose-950 dark:text-rose-100 text-xs font-black flex items-center gap-2 shadow-xs"
					data-testid="header-allergy-alert"
					role="alert"
				>
					<AlertOctagon
						size={14}
						className="text-rose-600 dark:text-rose-400 shrink-0 animate-pulse"
					/>
					<div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
						<span className="uppercase tracking-wider font-black text-[10px] text-rose-700 dark:text-rose-300 shrink-0">
							СТОП-ФАКТОР / АЛЛЕРГИЯ:
						</span>
						<span className="truncate font-semibold">{allergyText}</span>
					</div>
				</div>
			)}

			{/* Dedicated Somatic Alert Banner (Антикоагулянты, Сахарный диабет, ЭКС, Беременность) */}
			{criticalSomaticFlags.length > 0 && (
				<div
					className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-950 dark:text-purple-100 text-xs font-black flex items-center gap-2 shadow-xs"
					data-testid="header-somatic-alert"
					role="alert"
				>
					<HeartPulse
						size={14}
						className="text-purple-600 dark:text-purple-400 shrink-0"
					/>
					<div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
						<span className="uppercase tracking-wider font-black text-[10px] text-purple-700 dark:text-purple-300 shrink-0">
							СОМАТИЧЕСКИЙ СТАТУС:
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{criticalSomaticFlags.map((flag) => (
								<span
									key={flag.id}
									className="px-1.5 py-0.2 rounded-md bg-purple-600/20 text-purple-900 dark:text-purple-200 border border-purple-500/30 text-[10px] font-bold"
									title={flag.description}
								>
									{flag.shortBadge || flag.titleRu}
								</span>
							))}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
