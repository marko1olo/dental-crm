/**
 * apps/web/src/components/settings/doctor/DoctorPrescriptions107Card.tsx
 * Active Medication Latin Signature & Overdose Protection Card
 * Conforms to Mandate 8b (<= 120 lines).
 */

import { AlertTriangle, Copy, FileText, ShieldCheck } from "lucide-react";
import type React from "react";
import type { FavoriteMedicationOption } from "../../../store/doctorPreferencesStore";

export interface DoctorPrescriptions107CardProps {
	readonly currentMed: FavoriteMedicationOption;
	readonly onCopyLatin: () => void;
}

export const DoctorPrescriptions107Card: React.FC<
	DoctorPrescriptions107CardProps
> = ({ currentMed, onCopyLatin }) => {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper-card)] border border-[var(--line)] space-y-3">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
				<div className="flex items-center gap-2">
					<FileText size={16} className="text-[var(--teal)]" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Рецептурный бланк: {currentMed.tradeName} ({currentMed.mnn})
					</span>
				</div>

				<button
					type="button"
					onClick={onCopyLatin}
					className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--line-strong)] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
					title="Скопировать латинскую пропись"
				>
					<Copy size={12} className="text-[var(--teal)]" />
					<span>Копировать Rp.:</span>
				</button>
			</div>

			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] font-mono text-xs leading-relaxed text-[var(--ink)] select-all whitespace-pre-line">
				{currentMed.rpLatin}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
				<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-1">
					<div className="flex items-center gap-1.5 font-bold text-[var(--teal)]">
						<ShieldCheck size={14} />
						<span>Предельная суточная дозировка:</span>
					</div>
					<p className="m-0 text-[var(--ink)] font-semibold">
						{currentMed.maxDailyDose || "Согласно официальной инструкции"}
					</p>
					<span className="text-[11px] text-[var(--muted)] block">
						Максимальная длительность курса:{" "}
						<strong>
							{currentMed.maxDurationDays
								? `${currentMed.maxDurationDays} дней`
								: "3–5 дней"}
						</strong>
					</span>
				</div>

				<div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
					<div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
						<AlertTriangle size={14} />
						<span>Защита от передозировки и риски:</span>
					</div>
					<p className="m-0 text-[var(--ink)] text-[11px] leading-relaxed">
						{currentMed.overdoseWarning ||
							"Не превышать рекомендованную дозировку. Принимать после еды."}
					</p>
				</div>
			</div>
		</div>
	);
};
