import { AlertTriangle, HeartPulse } from "lucide-react";
import React from "react";
import type { SomaticFlagItem } from "./patientHeaderTypes";

export interface PatientHeaderAllergiesAlertProps {
	readonly allergyText: string;
	readonly criticalSomaticFlags: SomaticFlagItem[];
}

export const PatientHeaderAllergiesAlert: React.FC<
	PatientHeaderAllergiesAlertProps
> = ({ allergyText, criticalSomaticFlags }) => {
	if (!allergyText && criticalSomaticFlags.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-1.5">
			{allergyText && (
				<div
					className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-2xs"
					data-testid="header-allergy-alert"
					role="alert"
				>
					<AlertTriangle
						size={15}
						className="shrink-0 text-rose-600 dark:text-rose-400"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
						<span className="font-semibold text-rose-800 dark:text-rose-200 shrink-0">
							<span className="sr-only">СТОП-ФАКТОР / АЛЛЕРГИЯ: </span>
							Аллергия / Непереносимость:
						</span>
						<span className="font-medium truncate">{allergyText}</span>
					</div>
				</div>
			)}

			{criticalSomaticFlags.length > 0 && (
				<div
					className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center gap-2 shadow-2xs"
					data-testid="header-somatic-alert"
					role="alert"
				>
					<HeartPulse
						size={15}
						className="text-purple-600 dark:text-purple-400 shrink-0"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
						<span className="font-semibold text-purple-800 dark:text-purple-200 shrink-0">
							<span className="sr-only">СОМАТИЧЕСКИЙ СТАТУС: </span>
							Особый статус:
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{criticalSomaticFlags.map((flag) => (
								<span
									key={flag.id}
									className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/25 text-[11px] font-semibold"
									title={flag.description}
								>
									{flag.titleRu || flag.shortBadge || (flag as { title?: string }).title || flag.id}
								</span>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
