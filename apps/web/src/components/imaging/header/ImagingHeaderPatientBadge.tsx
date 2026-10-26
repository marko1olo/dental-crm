/**
 * ImagingHeaderPatientBadge.tsx — Заголовок и карточка активного пациента (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Scan } from "lucide-react";

export function formatCompactPatientName(rawName: string | null | undefined): string {
	if (!rawName) return "Не выбран";
	const parts = rawName.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 3) {
		return `${parts[0]} ${parts[1]?.[0] ?? ""}. ${parts[2]?.[0] ?? ""}.`;
	}
	return rawName.trim();
}

interface Props {
	patientName: string | null;
	studiesCount: number;
}

export const ImagingHeaderPatientBadge: React.FC<Props> = ({ patientName, studiesCount }) => {
	const compactName = formatCompactPatientName(patientName);

	return (
		<div className="flex items-center gap-2 min-w-0 shrink-0">
			<div className="flex items-center gap-1.5 shrink-0">
				<Scan aria-hidden="true" size={18} className="text-[var(--primary)] shrink-0" />
				<h2 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 tracking-tight whitespace-nowrap">
					Снимки и КТ
				</h2>
			</div>

			<div
				className="imaging-patient-strip flex items-center gap-1.5 px-2.5 h-9 min-h-[36px] rounded-xl bg-[var(--paper)] border border-[var(--line)] whitespace-nowrap shrink-0"
				aria-label="Контекст снимков"
				title={patientName ?? "Пациент не выбран"}
			>
				<span className="text-xs text-[var(--ink-muted)] font-medium">Пациент:</span>
				<strong className="text-xs text-[var(--ink)] font-bold">{compactName}</strong>
			</div>

			<span
				className="px-2 py-0.5 rounded-full bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] font-mono text-xs font-bold shrink-0 leading-normal"
				title="Количество снимков в ленте"
			>
				{studiesCount}
			</span>
		</div>
	);
};
