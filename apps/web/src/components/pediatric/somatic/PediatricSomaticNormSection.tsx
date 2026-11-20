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
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-1.5">
					<Heart className="h-4 w-4 text-[var(--danger)] shrink-0" />
					<span className="text-xs font-semibold text-[var(--ink)]">
						Соматический статус ребенка:
					</span>
				</div>
				<button
					type="button"
					onClick={handleSetNorm}
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer touch-manipulation ${
						somaticStatus.isNormal
							? "bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)] shadow-xs"
							: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-strong)]"
					}`}
					data-testid="btn-pediatric-somatic-norm-1click"
				>
					<ShieldCheck className="h-3.5 w-3.5 text-[var(--success-ink)]" />
					<span>Соматически здоров (Норма)</span>
				</button>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] font-normal mb-2">
				<div className="font-semibold text-[var(--primary)] mb-0.5">
					{somaticStatus.isNormal ? "Физиологическая норма:" : "Особый статус:"}
				</div>
				<div className="text-[11px] text-[var(--ink-muted)]">{somaticStatus.summaryRu}</div>
			</div>

			{!somaticStatus.isNormal && (
				<div className="space-y-2 pt-1 animate-in fade-in duration-150">
					<div>
						<label htmlFor="somatic-allergies-input" className="block text-[10px] font-medium text-[var(--ink-muted)] mb-0.5">
							Аллергологический анамнез:
						</label>
						<input
							id="somatic-allergies-input"
							type="text"
							value={somaticStatus.allergiesRu}
							onChange={(e) => setSomaticStatus((prev) => ({ ...prev, allergiesRu: e.target.value, isNormal: false }))}
							className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
						/>
					</div>
					<div>
						<label htmlFor="somatic-chronic-input" className="block text-[10px] font-medium text-[var(--ink-muted)] mb-0.5">
							Хронические соматические заболевания:
						</label>
						<input
							id="somatic-chronic-input"
							type="text"
							value={somaticStatus.chronicDiseasesRu}
							onChange={(e) => setSomaticStatus((prev) => ({ ...prev, chronicDiseasesRu: e.target.value, isNormal: false }))}
							className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
						/>
					</div>
				</div>
			)}
		</div>
	);
};
