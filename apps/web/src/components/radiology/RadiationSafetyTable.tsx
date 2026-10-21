import { dentalRadiologyStudyLabels } from "@dental/shared";
import type React from "react";
import type { RadiationSafetyRecord } from "./radiationSafetyTypes.js";

export const RadiationSafetyTable: React.FC<{
	records: RadiationSafetyRecord[];
}> = ({ records }) => {
	if (records.length === 0) {
		return (
			<div className="text-center py-10 text-[var(--muted)] text-xs">
				Записи о лучевой нагрузке отсутствуют.
			</div>
		);
	}

	return (
		<div className="border border-[var(--line)] rounded-xl overflow-hidden shadow-2xs">
			<table
				className="w-full text-xs text-left border-collapse"
				data-testid="dose-records-table"
			>
				<thead>
					<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
						<th className="py-2.5 px-3">Дата</th>
						<th className="py-2.5 px-3">Исследование</th>
						<th className="py-2.5 px-3">Область</th>
						<th className="py-2.5 px-3">Аппарат</th>
						<th className="py-2.5 px-3 text-right">Доза (мЗв)</th>
						<th className="py-2.5 px-3 text-right">мкЗв</th>
						<th className="py-2.5 px-3">Врач</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line)]">
					{records.map((rec) => (
						<tr
							key={rec.id}
							className="hover:bg-[var(--paper-soft)]/50 transition-colors"
						>
							<td className="py-2.5 px-3 font-mono text-[var(--muted)]">
								{rec.studyDate}
							</td>
							<td className="py-2.5 px-3 font-semibold text-[var(--ink)]">
								{dentalRadiologyStudyLabels[rec.studyType] || rec.studyType}
							</td>
							<td className="py-2.5 px-3 text-[var(--ink)]">
								{rec.anatomicalArea}
							</td>
							<td className="py-2.5 px-3 text-[var(--muted)]">
								{rec.apparatusName}
							</td>
							<td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600">
								{rec.effectiveDoseMsv.toFixed(4)}
							</td>
							<td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
								{rec.effectiveDoseMicrosv.toFixed(1)}
							</td>
							<td className="py-2.5 px-3 text-[var(--muted)]">
								{rec.doctorName}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
