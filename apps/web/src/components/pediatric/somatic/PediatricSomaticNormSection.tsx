import React from "react";
import { ShieldCheck, Heart } from "lucide-react";
import type { PediatricSomaticStatus } from "./pediatricSomaticTypes";
import { DEFAULT_PEDIATRIC_SOMATIC_NORM } from "./pediatricSomaticTypes";

interface PediatricSomaticNormSectionProps {
	readonly somaticStatus: PediatricSomaticStatus;
	readonly setSomaticStatus: React.Dispatch<React.SetStateAction<PediatricSomaticStatus>>;
}

export const PediatricSomaticNormSection: React.FC<PediatricSomaticNormSectionProps> = ({
	somaticStatus,
	setSomaticStatus,
}) => {
	const handleSetNorm = () => {
		setSomaticStatus({ ...DEFAULT_PEDIATRIC_SOMATIC_NORM, isNormal: true });
	};

	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-1.5">
					<Heart className="h-4 w-4 text-rose-500 shrink-0" />
					<span className="text-xs font-black uppercase text-[var(--ink,#0f172a)]">
						Соматический статус ребенка:
					</span>
				</div>
				<button
					type="button"
					onClick={handleSetNorm}
					className={`h-7 px-2.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
						somaticStatus.isNormal
							? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/40 shadow-xs"
							: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
					}`}
					data-testid="btn-pediatric-somatic-norm-1click"
				>
					<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>Соматически здоров (Норма)</span>
				</button>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink,#0f172a)] font-medium mb-2">
				<div className="font-bold text-teal-700 dark:text-teal-300 mb-0.5">
					{somaticStatus.isNormal ? "Физиологическая норма:" : "Особый статус:"}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)]">{somaticStatus.summaryRu}</div>
			</div>

			{!somaticStatus.isNormal && (
				<div className="space-y-2 pt-1 animate-in fade-in duration-150">
					<div>
						<label htmlFor="somatic-allergies-input" className="block text-[10px] font-bold text-[var(--muted,#64748b)] mb-0.5">
							Аллергологический анамнез:
						</label>
						<input
							id="somatic-allergies-input"
							type="text"
							value={somaticStatus.allergiesRu}
							onChange={(e) => setSomaticStatus((prev) => ({ ...prev, allergiesRu: e.target.value, isNormal: false }))}
							className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label htmlFor="somatic-chronic-input" className="block text-[10px] font-bold text-[var(--muted,#64748b)] mb-0.5">
							Хронические соматические заболевания:
						</label>
						<input
							id="somatic-chronic-input"
							type="text"
							value={somaticStatus.chronicDiseasesRu}
							onChange={(e) => setSomaticStatus((prev) => ({ ...prev, chronicDiseasesRu: e.target.value, isNormal: false }))}
							className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)]"
						/>
					</div>
				</div>
			)}
		</div>
	);
};
